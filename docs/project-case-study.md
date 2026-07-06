# MCP Observatory Case Study

## One-Line Summary

MCP Observatory is CI/security infrastructure for production MCP servers.

## Project Narrative

MCP Observatory identifies an emerging risk in AI agent infrastructure and turns it into a practical OSS control: CI checks, security reports, drift detection, telemetry intelligence, and certification workflows for production MCP servers.

The project is strongest as a signal because it connects product intuition with implementation depth. It starts from a real infrastructure shift, builds a working developer tool around that shift, instruments usage, and creates a credible path from open source adoption to production security workflows.

## Problem Discovery

MCP servers are becoming dependencies for AI agents. They expose tools, prompts, resources, and data access that agents can call directly. When those servers drift, fail to start, expose broad capabilities, or return ambiguous schemas, the failure can propagate into agent workflows.

The control gap is simple: teams need a way to test MCP servers before agents depend on them. They also need artifacts that maintainers, platform engineers, and security reviewers can understand.

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

## System Design

The project is a TypeScript/Node CLI with modular command handlers, MCP adapters, check runners, reporters, artifact schemas, and a GitHub Action wrapper.

The system supports local-process and HTTP MCP targets, stores run artifacts, compares runs for regressions, generates reports for humans and CI systems, and can run as an MCP server itself. A Cloudflare Worker handles hosted artifact upload pilots. A separate telemetry Worker stores private aggregate usage events in D1 for product and account intelligence.

## Security Model

MCP Observatory treats MCP servers as agent-facing infrastructure. The goal is not to claim formal semantic safety. The goal is to make compatibility, drift, and obvious security risk visible before deployment.

Current controls include:

- lightweight security checks for risky schema patterns
- schema quality analysis for agent usability
- SARIF output for security review workflows
- support for security suppressions when broad tools are intentional
- private-network rejection for hosted scans
- privacy disclosure and telemetry opt-out controls
- sanitized public reporting policy

For deeper context, see the [MCP Server Security Field Guide](./mcp-security-field-guide.md).

## Telemetry Intelligence

Telemetry is used privately to understand product usage and identify account-level signals without publishing raw personal data.

As of the latest local export on June 21, 2026:

- 11,481 telemetry events
- 7,571 total sessions
- 5,389 external sessions after separating internal activity
- 2,446 external CI sessions
- 148 attributed company/org sessions
- 12 attributed company/org candidates
- latest external activity: June 21, 2026

Public claims use aggregate or sanitized data only. Raw emails, hostnames, private URLs, tokens, and response bodies are not published.

## Distribution Strategy

The distribution wedge is useful CI for other MCP repositories. The certification campaign opens small, helpful PRs that add MCP compatibility/security checks and leave maintainers with a public trust signal.

Current public distribution proof includes:

- latest release: `v1.28.0`
- npm package: `@kryptosai/mcp-observatory`
- GitHub Action: `KryptosAI/mcp-observatory/action@v1.28.0`
- npm downloads snapshot: 511 downloads for June 11-20, 2026
- visible GitHub traffic window: 745 clones and 232 unique cloners
- visible GitHub page-view window: 12 views and 9 unique visitors
- public code-search references in MCP indexes, listing mirrors, and external experiment repos
- official MCP reference PR open and green: [`modelcontextprotocol/servers#4392`](https://github.com/modelcontextprotocol/servers/pull/4392)
- open certification PRs for Microsoft Playwright MCP, Upstash Context7, ExecuteAutomation Playwright MCP, AntV, BrowserMCP, UI5, Notion, and other MCP projects

See [reference evaluations](./reference-evaluations.md) and [public proof](./proof.md).

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
- Strategic: custom

## Professional Signal

MCP Observatory demonstrates applied work across:

- AI agent infrastructure
- developer tooling
- secure tool invocation
- software supply chain thinking
- CI/CD integrations
- telemetry and product analytics
- open source distribution
- enterprise packaging

It is designed to be evaluated through public work: code, docs, CI integrations, reference evaluations, proof surfaces, and real maintainer PRs.

## Future Roadmap

Near-term milestones:

1. Convert certification PRs into accepted public integrations.
2. Publish recurring MCP safety reports.
3. Add stronger policy/provenance language for production MCP adoption.
4. Improve hosted artifact upload into a simple pilot workflow.
5. Convert serious production users into paid pilots.

Longer-term opportunities:

- policy controls for agent tool use
- provenance for MCP packages and configurations
- schema locks and controlled drift review
- runtime monitoring for production agent tool calls
- fleet inventory across teams, repositories, and hosts
