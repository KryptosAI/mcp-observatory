# MCP Observatory Case Study

## One-Line Summary

MCP Observatory is CI/security infrastructure for production MCP servers.

## Problem

MCP servers are becoming dependencies for AI agents. Teams need to know whether those servers still start, expose usable tools, keep schemas stable, avoid obvious security footguns, and behave consistently as agents depend on them.

## Product

MCP Observatory provides:

- CLI checks for MCP servers
- MCP server mode so agents can inspect other MCP servers
- GitHub Action integration
- PR comments and commit status checks
- JSON, Markdown, HTML, JUnit, SARIF, and PR-comment reports
- schema drift detection
- record/replay/verify workflows
- health score badges
- static enterprise reports
- telemetry intelligence for product and account-level learning

## Architecture

The project is a TypeScript/Node CLI with modular command handlers, MCP adapters, check runners, reporters, artifact schemas, and a GitHub Action wrapper. A Cloudflare Worker handles hosted artifact upload pilots, and a separate telemetry Worker stores private aggregate usage events in D1.

## Technical Proof

As of June 19, 2026:

- 10k+ source lines in `src`
- 40 test files
- 321 passing tests
- npm package published
- GitHub Action available
- MCP server mode available
- telemetry export and company intelligence tooling available

## Traction Snapshot

Safe public and aggregate signals:

- 10,278 telemetry events
- 7,211 telemetry sessions
- 5,368 external sessions after separating internal activity
- 582 GitHub clones and 175 unique cloners in the visible June 2026 traffic window
- 104 npm downloads during June 11-17, 2026

These are early signals. Public social proof is still limited and should be improved through the certification campaign.

## Security And Privacy Posture

The project includes:

- telemetry opt-out controls
- privacy disclosure
- security policy
- token-based hosted artifact upload
- private-network rejection for hosted scans
- sanitized public reporting policy

Public claims should use aggregate metrics and accepted public integrations, not raw telemetry.

## Commercial Path

The free OSS wedge is local testing and public repo CI. Paid value is production/private use:

- hosted CI history
- private repo reporting
- recurring security reports
- certification
- support
- fleet visibility
- enterprise review

Current pilot anchors:

- Team: starts at `$299/month`
- Business: starts at `$999/month`
- Enterprise: starts at `$3k/month`
- Strategic: `$250k+/year`

## Job-Opportunity Value

This project demonstrates ability across:

- AI infrastructure
- developer tooling
- security tooling
- MCP ecosystem work
- CI/CD integrations
- telemetry and product analytics
- commercialization and enterprise packaging

It is strongest as a portfolio asset when paired with public proof: accepted external PRs, badges in other repos, directory listings, and a short demo.

## Next Milestones

1. Publish latest package with `init-ci`.
2. Open first certification PR wave.
3. Capture accepted PRs as public proof.
4. Publish recurring MCP safety reports.
5. Convert serious users into paid pilots.
