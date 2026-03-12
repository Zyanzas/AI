# Minecraft Bedrock AFK Bot

A simple Node.js bot that connects to a Minecraft Bedrock server with `bedrock-protocol` and performs random anti-AFK actions.

## Configuration

This bot is preconfigured with:

- **Server IP:** `157.180.106.62`
- **Server Port:** `24001`
- **Bot Username:** `AFKBot`

## Install dependencies

```bash
npm install
```

## Run the bot

```bash
npm start
```

## Behavior

- Connects to the Bedrock server.
- Logs connection/disconnection status to console.
- Automatically reconnects 5 seconds after disconnect.
- Moves like a player with frequent randomized walk steps every 0.7–1.5 seconds.
- Spams left click (arm swing) every 0.25–0.5 seconds to mimic active combat/input.
- Performs an anti-AFK action every **20–30 seconds**:
  - Jump pulse,
  - Sneak pulse,
  - Rotate in place, or
  - Extra walk/look movement update.

## Render deployment note

If Render reports `ENOENT: no such file or directory, open '/opt/render/project/src/package.json'`, make sure the service points at the repository root.

This repo includes `render.yaml` configured as a **Worker** service with:

- `rootDir: .`
- `buildCommand: npm install`
- `startCommand: npm start`

You can deploy using Blueprint so Render picks up these settings automatically.


## Render runtime behavior

- Preferred: deploy as a **Worker** service (as configured in `render.yaml`).
- Safety fallback: if Render injects a `PORT` env var (common for Web services), the bot now also starts a tiny HTTP server on `0.0.0.0:$PORT` so the process is not terminated for “no open HTTP ports detected”.


- Includes compatibility movement updates for server-authoritative Bedrock servers (sends both `move_player` and `player_auth_input`), so movement is more likely to be visible in-game.
