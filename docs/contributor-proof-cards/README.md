# Contributor Proof Cards

Contributor proof cards are small Markdown records for accepted MCP Observatory contributions. They are designed to be linked from the contributor page, target gallery, GitHub profile badges, and maintainer PRs.

Each proof card must point to public proof only: a merged PR, generated Safety Index artifact, public report, upstream workflow, or maintainer-visible issue. Do not include private telemetry, secrets, local paths, unpublished maintainer data, or private repo details.

## Proof Card Template

Copy this template into a new file named after the target or contribution:

```md
# MCP Observatory Proof: <target or contribution name>

| Field | Value |
| --- | --- |
| Contributor | [@username](https://github.com/username) |
| Role | Target Verifier |
| Target | Example MCP Server |
| Date | YYYY-MM-DD |
| Observatory Version | v1.28.0 or later |
| Verdict | Ready for CI / Needs maintainer review / Not reproducible yet |
| Merged PR | https://github.com/KryptosAI/mcp-observatory/pull/000 |
| Generated Evidence | docs/safety-index/artifacts/example-server.md |
| Public Report | docs/mcp-server-safety-index.md |
```

## Badge Link Pattern

After the proof card is merged, contributors can link a badge directly to the proof card:

```md
[![MCP Observatory Safety Index Contributor](https://img.shields.io/badge/MCP%20Observatory-Safety%20Index%20Contributor-16a34a)](https://github.com/KryptosAI/mcp-observatory/blob/main/docs/contributor-proof-cards/example-server.md)
```
