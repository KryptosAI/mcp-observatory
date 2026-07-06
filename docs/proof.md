# MCP Observatory Proof

MCP Observatory is early, but it is already a working MCP testing/security stack rather than a landing page.

## Current Public Surface

- npm package: `@kryptosai/mcp-observatory`
- GitHub Action: `KryptosAI/mcp-observatory/action@v0.28.0`
- Latest release: `v0.28.0`
- CLI command count: scan, test, record, replay, verify, diff, watch, suggest, serve, lock, history, setup-ci, init-ci, ci-report, enterprise-report, score, badge, cloud
- Test suite: 348 passing tests across 45 test files as of July 1, 2026
- GitHub traffic snapshot: 745 clones and 232 unique cloners in the visible June 2026 traffic window
- GitHub page views snapshot: 12 views and 9 unique visitors in the visible June 2026 traffic window
- npm downloads snapshot: 511 downloads for June 11-20, 2026
- Security guide: [MCP Server Security Field Guide](./mcp-security-field-guide.md)
- Safety methodology: [MCP Observatory Safety Methodology](./methodology.md)
- Safety index: [MCP Server Safety Index](./mcp-server-safety-index.md)
- Public examples: [Reference Evaluations](./reference-evaluations.md)
- Lock-file CI primitive: [MCP Lock Files](./mcp-lock-files.md)
- Public post drafts: [Launch Post Drafts](./public-post-drafts.md)
- Pilot offer: [Private MCP Readiness Review](./paid-pilot-offer.md)

## Safe Aggregate Telemetry Snapshot

Internal telemetry is used for product analytics and account-level outreach. Public reporting uses only aggregate or sanitized data.

As of the latest local export on June 21, 2026:

- 11,481 telemetry events
- 7,571 total sessions
- 5,389 external sessions after separating internal/personal activity
- 2,446 external CI sessions
- 148 attributed company/org sessions
- 12 attributed company/org candidates
- latest external activity: June 21, 2026
- top external commands: `serve`, `run`, `diff`, `test`, `scan`, `history`

Raw emails, hostnames, private URLs, tokens, and response bodies are not published.

## Product Proof

MCP Observatory can:

- install as an npm CLI
- run as an MCP server
- test local-process and HTTP MCP targets
- run in GitHub Actions
- post PR comments
- generate JSON, Markdown, HTML, JUnit, SARIF, and PR-comment reports
- generate health badges
- record/replay/verify MCP sessions
- detect schema drift
- run lightweight MCP security checks
- create static enterprise reports from artifacts

## Certification Proof

The certification campaign is designed to create public proof through accepted maintainer PRs.

Open and accepted third-party integrations are tracked here:

| Repo | PR | Check Added | Badge Added | Status |
| --- | --- | --- | --- | --- |
| `modelcontextprotocol/servers` | [#4392](https://github.com/modelcontextprotocol/servers/pull/4392) | Yes | No | Open, mergeable, MCP Observatory check passing |
| `microsoft/playwright-mcp` | [#1657](https://github.com/microsoft/playwright-mcp/pull/1657) | Yes | No | Closed, unmerged |
| `upstash/context7` | [#2800](https://github.com/upstash/context7/pull/2800) | Yes | No | Closed, maintainer declined third-party CI |
| `executeautomation/mcp-playwright` | [#225](https://github.com/executeautomation/mcp-playwright/pull/225) | Yes | No | Open |
| `kazuph/mcp-taskmanager` | [#11](https://github.com/kazuph/mcp-taskmanager/pull/11) | Yes | No | Open |
| `cyanheads/filesystem-mcp-server` | [#19](https://github.com/cyanheads/filesystem-mcp-server/pull/19) | Yes | No | Closed, unmerged |
| `antvis/mcp-server-chart` | [#312](https://github.com/antvis/mcp-server-chart/pull/312) | Yes | No | Open |
| `BrowserMCP/mcp` | [#189](https://github.com/BrowserMCP/mcp/pull/189) | Yes | No | Open |
| `UI5/mcp-server` | [#348](https://github.com/UI5/mcp-server/pull/348) | Yes | No | Closed, maintainer declined third-party CI |
| `makenotion/notion-mcp-server` | [#324](https://github.com/makenotion/notion-mcp-server/pull/324) | Yes | No | Closed after policy-style CI failure |

## Public Discovery Snapshot

GitHub code search shows public references outside the main repo. These are discovery/listing signals, not customer claims:

- PulseMCP has a maintainer-recognized `io.github.KryptosAI/mcp-observatory` listing with `server.json` visibility.
- Smithery, Glama, LobeHub, Yarn/Vibehackers, and other MCP catalogs surface MCP Observatory install or scorecard pages.
- MseeP has an unclaimed listing for MCP Observatory. Treat it as a directory opportunity until ownership, scan evidence, and badge wording are reviewed.
- `punkpeye/awesome-mcp-devtools` lists MCP Observatory in an MCP developer-tools index.
- `linny006/mcp-servers-live` mirrors a public MCP Observatory listing page.
- `gabrielmoreira/awesome-ai-rabbit-holes` catalogs the GitHub project.
- `fmfg03/supermcp` includes an `apps/mcp-observatory` package path.
- `vellankikoti/mcp-observatory`, `LuKrlier/mcp-observatory`, and `shigeki7777/sasame-mcp-observatory` appear as separate public repos referencing or experimenting with the Observatory name/code surface.

## Commercial Proof

Current paid positioning is pilot-first:

- Team Pilot: starts at `$299/month`
- Business Pilot: starts at `$999/month`
- Enterprise Pilot: starts at `$3k/month`
- Strategic Accounts: custom

Paid value is production use: hosted reporting, private repo CI history, security reports, certification, support, fleet visibility, and enterprise review.

## Claims Policy

Use public proof for public claims. Company-domain telemetry signals are private and should only be used internally for outreach unless a customer gives permission or there is independent public evidence.
