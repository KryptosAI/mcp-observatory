# MCP Observatory case study

MCP Observatory is CI and security infrastructure for production MCP servers.
It turns a server command into repeatable evidence that maintainers, platform
engineers, and security reviewers can inspect.

## Product

The open-core product provides:

- CLI checks for MCP servers
- MCP server mode
- GitHub Action integration
- JSON, Markdown, HTML, JUnit, SARIF, and PR-comment reports
- schema drift detection
- record/replay/verify workflows
- health score badges
- static enterprise reports
- deterministic behavioral evaluation fixtures

## System design

The public repository is a TypeScript/Node CLI with modular command handlers,
MCP adapters, check runners, reporters, artifact schemas, and a GitHub Action
wrapper. It supports local-process and HTTP targets and keeps the evidence
loop runnable without an account or private credentials.

The private cloud repository handles hosted authentication, organization
isolation, retention, hosted scans, approvals, scheduled rescans, private
indexes, and enterprise workflow coordination. The separate telemetry
repository handles telemetry and intelligence operations.

## Commercial path

The free OSS wedge is unlimited local testing, public repository CI, and one
latest hosted snapshot. Individual Pro adds one-user 90-day history, hosted CI,
regression markers, and artifact downloads. The separate fixed-scope Release
Gate Pilot provides an owner-ready decision for 1–3 critical servers.

The public repository keeps its historical record, including previously
published hosted code. New proprietary implementation belongs in the private
cloud repository.
