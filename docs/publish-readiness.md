# Publish And Distribution Readiness

Use this checklist before a commercialization push. The goal is to increase distribution and start paid conversations without locking the project into a permanent licensing or product shape.

## Release Gate

Run:

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run validate:artifacts
npm audit --json
```

Confirm:

- GitHub Action target scans support `deep`, `security`, and baseline drift failure.
- `schemas/run-artifact.schema.json` and `schemas/diff-artifact.schema.json` validate current artifacts.
- HTTP target examples use env references instead of inline tokens.
- Security findings appear in artifact evidence as structured `findings`.
- Hosted upload is available through `mcp-observatory cloud upload <artifact>` when `MCP_OBSERVATORY_CLOUD_TOKEN` is set.

## Public Distribution

- Merge the health/commercialization PR.
- Update the GitHub repo homepage to the README or commercial page.
- Publish npm only after the release gate is green.
- Refresh MCP directory listings with: “MCP Observatory helps teams test, secure, and monitor MCP servers before agents depend on them.”
- Include “free for local OSS use; paid for hosted reporting, private repo CI, security reports, production monitoring, certification, support, and fleet visibility.”
- Link production users to `COMMERCIAL.md` and `william@banksey.com`.

## Sales Operating Loop

1. Export telemetry rows privately.
2. Run:

```bash
npx tsx scripts/telemetry-company-intelligence.ts --input telemetry-events.jsonl --out-dir reports
```

3. Review `reports/telemetry-company-intelligence.html`.
4. Contact the top 25 high-confidence company/org candidates.
5. For large or strategic domains, quote Strategic only and ask for a security/procurement path.
6. Use hosted artifact upload or static enterprise reports before building a full SaaS dashboard.

## Hosted Upload

CLI:

```bash
export MCP_OBSERVATORY_CLOUD_TOKEN="pilot-token"
export MCP_OBSERVATORY_ORG="customer.com"
npx @kryptosai/mcp-observatory cloud upload .mcp-observatory/runs/<run>.json
```

Worker:

- `POST /api/v1/artifacts` stores a run artifact behind bearer-token auth.
- `GET /api/v1/artifacts/:org` returns the org artifact index behind the same auth.
- Hosted scans reject localhost/private-network targets; use local CLI for internal MCP servers.

## What Not To Do Yet

- Do not change the MIT license until paid signal demands it.
- Do not hard-paywall existing local OSS checks.
- Do not build a full dashboard before a buyer asks for dashboard workflows.
- Do not publish raw telemetry emails or individual PII in public materials.
