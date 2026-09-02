# MCP Observatory Commercial Offering

Local CLI use stays free and unlimited. Every signed-in user can upload one hosted snapshot before paying. Retained history and hosted CI ingestion are paid.

## Self-serve

| Plan | Price | Start |
| --- | --- | --- |
| Individual Pro | $29/month | https://app.mcp-observatory.com/pricing?plan=individual |

Run a local scan, then use `npx @kryptosai/mcp-observatory cloud upload`. The CLI signs in with GitHub and uploads the free snapshot before showing the optional Individual Pro upgrade.

Individual Pro is for one user and includes 90-day history, hosted CI ingestion, regression markers, score and gate history, and artifact downloads. See the [subscription and hosted-service terms](./TERMS.md).

## Release Gate Pilot

**$15,000 · 1–3 critical MCP servers · 10 business days**

A human approve / gate / defer decision with private evidence, remediation, and CI/SARIF handoff. Use this when a named owner needs a production decision in the next 60 days.

See the [full offer](./docs/paid-pilot-offer.md) or request one at [mcp-observatory.com/release-gate-pilot](https://mcp-observatory.com/release-gate-pilot/).

## What stays free

- Local CLI checks, attack simulation, audit profiles, SARIF, and the public Safety Index
- Self-managed artifacts and public-project CI
- MIT-licensed source and methodology

Hosted authentication, retention, and private intelligence stay in the [open core and commercial boundary](./docs/commercial-boundary.md).
