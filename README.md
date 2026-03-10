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
- Performs an anti-AFK action every **20–30 seconds**:
  - Jump pulse, or
  - Small rotate/update movement packet.

## Render deployment note

If Render reports `ENOENT: no such file or directory, open '/opt/render/project/src/package.json'`, make sure the service points at the repository root.

This repo includes `render.yaml` configured as a **Worker** service with:

- `rootDir: .`
- `buildCommand: npm install`
- `startCommand: npm start`

You can deploy using Blueprint so Render picks up these settings automatically.
