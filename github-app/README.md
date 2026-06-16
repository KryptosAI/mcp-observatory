# MCP Observatory GitHub App

> **Status**: Config-lint prototype. It is not the production monitoring surface yet.

This app detects MCP configuration changes in pull requests and posts lightweight config review comments. For production MCP testing today, use the GitHub Action, CLI artifacts, enterprise reports, or hosted artifact upload.

## Setup

### 1. Register the GitHub App

1. Go to **Settings > Developer settings > GitHub Apps > New GitHub App**
2. Use `app.yml` as reference for permissions and events
3. Set the webhook URL to `https://<your-host>/api/webhooks`
4. Generate a private key and download it

### 2. Environment Variables

```bash
export GITHUB_APP_ID="123456"
export GITHUB_PRIVATE_KEY="$(cat path/to/private-key.pem)"
export GITHUB_WEBHOOK_SECRET="your-webhook-secret"
export PORT="3000"  # optional, defaults to 3000
```

### 3. Install and Run

```bash
npm install
npm run build
npm start
```

### 4. Install on Repositories

Install the app on target repositories via **Settings > Developer settings > GitHub Apps > Install**.

## Development

```bash
npm install
npm run dev
```

Use a tunnel (e.g. ngrok, cloudflared) to expose your local server for webhook delivery during development:

```bash
ngrok http 3000
```

## What It Checks Today

The app detects MCP config files (`.mcp.json`, `mcp-config.json`, etc.) in PR diffs and runs:

- **Syntax**: Valid JSON parsing
- **Schema**: Presence of `mcpServers` key, valid server entries
- **Transport**: Each server has a `command` (stdio) or `url` (http)
- **Security**: Detects potential hardcoded secrets in environment variables

It does not currently execute MCP servers, invoke tools, generate Observatory run artifacts, or perform hosted fleet monitoring.

## Production Path

- Use `KryptosAI/mcp-observatory/action` for CI enforcement.
- Use `mcp-observatory enterprise-report` for pilot-ready reports.
- Use `mcp-observatory cloud upload <artifact>` after a pilot token is issued.
- Treat this GitHub App as a future distribution channel once it can run or ingest real Observatory artifacts.

## Comment Behavior

- Comments are **idempotent**: pushing new commits updates the existing comment
- Comments are identified by a hidden HTML marker (`<!-- mcp-observatory -->`)
- PRs without MCP config changes are silently skipped
