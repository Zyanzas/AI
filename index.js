const http = require('node:http')
const bedrock = require('bedrock-protocol')

const config = {
  host: '157.180.106.62',
  port: 24001,
  username: 'AFKBot'
}

const MIN_ACTION_DELAY_MS = 20_000
const MAX_ACTION_DELAY_MS = 30_000
const MIN_MOVE_DELAY_MS = 2_000
const MAX_MOVE_DELAY_MS = 5_000
const RECONNECT_DELAY_MS = 5_000
const WALK_STEP_MIN = 0.25
const WALK_STEP_MAX = 0.7

let client
let actionTimer
let movementTimer
let reconnectTimer
let hasScheduledReconnect = false
let keepAliveServer

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min
}

function clearActionLoop() {
  if (actionTimer) {
    clearTimeout(actionTimer)
    actionTimer = null
  }
}

function clearMovementLoop() {
  if (movementTimer) {
    clearTimeout(movementTimer)
    movementTimer = null
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

function pulsePlayerAction(startAction, stopAction, label) {
  const didStart = safeQueue('player_action', {
    action: startAction,
    runtime_entity_id: client.entityId || 0,
    position: client.position || { x: 0, y: 0, z: 0 },
    face: 1
  })

  if (!didStart) return false

  setTimeout(() => {
    safeQueue('player_action', {
      action: stopAction,
      runtime_entity_id: client.entityId || 0,
      position: client.position || { x: 0, y: 0, z: 0 },
      face: 1
    })
  }, 250)

  log(`Player action: ${label}`)
  return true
}

function sendMovePacket(position, yaw, pitch = 0) {
  return safeQueue('move_player', {
    runtime_id: client.entityId || 0,
    position,
    pitch,
    yaw,
    head_yaw: yaw,
    mode: 0,
    on_ground: true,
    ridden_runtime_id: 0,
    teleport_cause: 0,
    teleport_source_entity_type: 0,
    tick: 0
  })
}

function rotateToRandomYaw(label = 'look around') {
  const yaw = getRandomFloat(0, 360)
  const pitch = getRandomFloat(-12, 12)
  const didRotate = sendMovePacket(client.position || { x: 0, y: 0, z: 0 }, yaw, pitch)

  if (didRotate) {
    client.yaw = yaw
    log(`Player action: ${label} (yaw ${yaw.toFixed(1)})`)
  }

  return didRotate
}

function moveLikePlayer() {
  if (!client || !client.position) return false

  const currentYaw = Number.isFinite(client.yaw) ? client.yaw : getRandomFloat(0, 360)
  const yawDelta = getRandomFloat(-55, 55)
  const yaw = (currentYaw + yawDelta + 360) % 360
  const radians = (yaw * Math.PI) / 180
  const step = getRandomFloat(WALK_STEP_MIN, WALK_STEP_MAX)

  const position = {
    x: client.position.x + Math.cos(radians) * step,
    y: client.position.y,
    z: client.position.z + Math.sin(radians) * step
  }

  const didMove = sendMovePacket(position, yaw, getRandomFloat(-8, 8))

  if (didMove) {
    client.position = position
    client.yaw = yaw
    log(`Player action: walk step (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`)
  }

  return didMove
}

function runRandomAntiAfkAction() {
  const actions = [
    () => pulsePlayerAction('start_jump', 'stop_jump', 'jump'),
    () => pulsePlayerAction('start_sneaking', 'stop_sneaking', 'sneak'),
    () => rotateToRandomYaw('rotate in place'),
    () => moveLikePlayer()
  ]

  const selectedAction = actions[getRandomInt(0, actions.length - 1)]
  selectedAction()
}

function scheduleAction() {
  clearActionLoop()

  actionTimer = setTimeout(() => {
    if (!client) {
      scheduleAction()
      return
    }

    runRandomAntiAfkAction()
    scheduleAction()
  }, getRandomInt(MIN_ACTION_DELAY_MS, MAX_ACTION_DELAY_MS))
}

function scheduleMovement() {
  clearMovementLoop()

  movementTimer = setTimeout(() => {
    if (!client) {
      scheduleMovement()
      return
    }

    moveLikePlayer()

    if (Math.random() < 0.2) {
      rotateToRandomYaw('look around while walking')
    }

    scheduleMovement()
  }, getRandomInt(MIN_MOVE_DELAY_MS, MAX_MOVE_DELAY_MS))
}

function scheduleReconnect(reason) {
  if (hasScheduledReconnect) return
  hasScheduledReconnect = true

  clearActionLoop()
  clearMovementLoop()

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
    scheduleMovement()
    scheduleAction()
  })

  client.on('start_game', packet => {
    client.entityId = packet.runtime_entity_id
    client.position = packet.player_position
    client.yaw = packet.yaw || 0
    log(`Spawned at (${client.position.x.toFixed(2)}, ${client.position.y.toFixed(2)}, ${client.position.z.toFixed(2)})`)
  })

  client.on('move_player', packet => {
    if (packet.runtime_id === client.entityId) {
      client.position = packet.position
      client.yaw = packet.yaw
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
  clearMovementLoop()

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
