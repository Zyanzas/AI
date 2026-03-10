const bedrock = require('bedrock-protocol')

const config = {
  host: '157.180.106.62',
  port: 24001,
  username: 'AFKBot'
}

const MIN_ACTION_DELAY_MS = 20_000
const MAX_ACTION_DELAY_MS = 30_000
const RECONNECT_DELAY_MS = 5_000

let client
let actionTimer
let reconnectTimer
let hasScheduledReconnect = false

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

function getRandomDelay() {
  return Math.floor(Math.random() * (MAX_ACTION_DELAY_MS - MIN_ACTION_DELAY_MS + 1)) + MIN_ACTION_DELAY_MS
}

function clearActionLoop() {
  if (actionTimer) {
    clearTimeout(actionTimer)
    actionTimer = null
  }
}

function scheduleAction() {
  clearActionLoop()
  actionTimer = setTimeout(() => {
    if (!client) return

    const shouldJump = Math.random() > 0.5
    if (shouldJump) {
      // Short jump pulse.
      client.queue('player_action', {
        action: 'start_jump',
        runtime_entity_id: client.entityId || 0,
        position: { x: 0, y: 0, z: 0 },
        face: 1
      })
      setTimeout(() => {
        if (client) {
          client.queue('player_action', {
            action: 'stop_jump',
            runtime_entity_id: client.entityId || 0,
            position: { x: 0, y: 0, z: 0 },
            face: 1
          })
        }
      }, 250)
      log('Anti-AFK action: jump')
    } else {
      const yaw = Math.random() * 360
      client.queue('move_player', {
        runtime_id: client.entityId || 0,
        position: client.position || { x: 0, y: 0, z: 0 },
        pitch: 0,
        yaw,
        head_yaw: yaw,
        mode: 0,
        on_ground: true,
        ridden_runtime_id: 0,
        teleport_cause: 0,
        teleport_source_entity_type: 0,
        tick: 0
      })
      log(`Anti-AFK action: rotate to yaw ${yaw.toFixed(2)}`)
    }

    scheduleAction()
  }, getRandomDelay())
}

function scheduleReconnect(reason) {
  if (hasScheduledReconnect) return
  hasScheduledReconnect = true

  clearActionLoop()

  log(`Disconnected (${reason}). Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`)

  reconnectTimer = setTimeout(() => {
    hasScheduledReconnect = false
    connect()
  }, RECONNECT_DELAY_MS)
}

function connect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  log(`Connecting to ${config.host}:${config.port} as ${config.username}...`)

  client = bedrock.createClient({
    host: config.host,
    port: config.port,
    username: config.username,
    offline: true
  })

  client.on('join', () => {
    log('Connected and joined the server.')
    scheduleAction()
  })

  client.on('start_game', packet => {
    client.entityId = packet.runtime_entity_id
    client.position = packet.player_position
  })

  client.on('move_player', packet => {
    if (packet.runtime_id === client.entityId) {
      client.position = packet.position
    }
  })

  client.on('disconnect', packet => {
    const message = typeof packet === 'object' ? JSON.stringify(packet) : String(packet)
    scheduleReconnect(message)
  })

  client.on('close', () => {
    scheduleReconnect('connection closed')
  })

  client.on('error', err => {
    log(`Connection error: ${err.message}`)
    scheduleReconnect('error')
  })
}

process.on('SIGINT', () => {
  log('Shutting down bot...')
  clearActionLoop()
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (client) client.disconnect()
  process.exit(0)
})

connect()
