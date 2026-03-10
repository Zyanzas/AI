const http = require('node:http')
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
let keepAliveServer

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

function safeQueue(packetName, payload) {
  if (!client) return false

  try {
    client.queue(packetName, payload)
    return true
  } catch (error) {
    log(`Failed to send packet '${packetName}': ${error.message}`)
    return false
  }
}

function scheduleAction() {
  clearActionLoop()

  actionTimer = setTimeout(() => {
    if (!client) {
      scheduleAction()
      return
    }

    const shouldJump = Math.random() > 0.5

    if (shouldJump) {
      const didStartJump = safeQueue('player_action', {
        action: 'start_jump',
        runtime_entity_id: client.entityId || 0,
        position: client.position || { x: 0, y: 0, z: 0 },
        face: 1
      })

      if (didStartJump) {
        setTimeout(() => {
          safeQueue('player_action', {
            action: 'stop_jump',
            runtime_entity_id: client.entityId || 0,
            position: client.position || { x: 0, y: 0, z: 0 },
            face: 1
          })
        }, 250)
        log('Anti-AFK action: jump')
      }
    } else {
      const yaw = Math.random() * 360
      const didRotate = safeQueue('move_player', {
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

      if (didRotate) {
        log(`Anti-AFK action: rotate to yaw ${yaw.toFixed(2)}`)
      }
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

function startOptionalKeepAliveServer() {
  const portFromEnv = Number.parseInt(process.env.PORT || '', 10)
  if (!portFromEnv) return

  keepAliveServer = http.createServer((_, response) => {
    response.writeHead(200, { 'content-type': 'text/plain' })
    response.end('AFK bot is running\n')
  })

  keepAliveServer.listen(portFromEnv, '0.0.0.0', () => {
    log(`Keep-alive HTTP server listening on 0.0.0.0:${portFromEnv}`)
  })
}

function shutdown() {
  log('Shutting down bot...')

  clearActionLoop()

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (keepAliveServer) {
    keepAliveServer.close()
  }

  if (client) {
    try {
      client.disconnect()
    } catch (error) {
      log(`Error while disconnecting client: ${error.message}`)
    }
  }
}

process.on('uncaughtException', error => {
  log(`Uncaught exception: ${error.stack || error.message}`)
})

process.on('unhandledRejection', reason => {
  log(`Unhandled rejection: ${String(reason)}`)
})

process.on('SIGINT', () => {
  shutdown()
  process.exit(0)
})

process.on('SIGTERM', () => {
  shutdown()
  process.exit(0)
})

startOptionalKeepAliveServer()
connect()
