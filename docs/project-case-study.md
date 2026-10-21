# MCP Observatory case study

MCP Observatory is CI and security infrastructure for production MCP servers.
It turns a server command into repeatable evidence that maintainers, platform
engineers, and security reviewers can inspect.

## Product

The free MIT-licensed product provides:

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

The public hosting source provides GitHub sign-in, account isolation, artifact storage, multi-target history, hosted HTTP checks, downloads and retention cleanup. It uses the operator’s own configuration and includes no production secrets or customer data. ClearFrame-only account, inference and billing implementation remains separate.

## Open-source adoption path

All Observatory features are free and MIT licensed. Run a scan, inspect reports and local history with `mcp-observatory dashboard`, then prepare a review task with `mcp-observatory clearframe`.

ClearFrame CLI and Mac are optional agent tools with their own account and usage terms. Observatory does not require them. See [the project policy](../COMMERCIAL.md) and [ClearFrame workflow](./clearframe.md).
