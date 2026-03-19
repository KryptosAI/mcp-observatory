# Proof Index

These checked-in files are evidence, not decorative samples.

## Passing Matrix

| Target | Package | Version | Run Date | Why it matters | Artifact | Report |
| --- | --- | --- | --- | --- | --- | --- |
| `context7-server` | `@upstash/context7-mcp` | `2.1.4` | `2026-03-19T04:26:51.781Z` | Zero-config third-party tools server that keeps the matrix grounded in real package usage. | [JSON](./examples/artifacts/context7-server.json) | [Markdown](./examples/artifacts/context7-server-report.md) |
| `everything-server` | `@modelcontextprotocol/server-everything` | `2.0.0` | `2026-03-19T04:26:53.732Z` | Broad official reference target that exercises tools, prompts, and resources in one run. | [JSON](./examples/artifacts/everything-server.json) | [Markdown](./examples/artifacts/everything-server-report.md) |
| `filesystem-server` | `@modelcontextprotocol/server-filesystem` | `0.2.0` | `2026-03-19T04:26:55.002Z` | Baseline passing tools server that proves unsupported prompts and resources are not treated as failures. | [JSON](./examples/artifacts/filesystem-server.json) | [Markdown](./examples/artifacts/filesystem-server-report.md) |
| `opentofu-server` | `@opentofu/opentofu-mcp-server` | `0.1.0` | `2026-03-19T04:26:55.684Z` | Resource-capable third-party target that broadens the matrix beyond the everything server. | [JSON](./examples/artifacts/opentofu-server.json) | [Markdown](./examples/artifacts/opentofu-server-report.md) |
| `promptopia-server` | `promptopia-mcp` | `1.1.0` | `2026-03-19T04:26:56.579Z` | Filesystem-backed prompts server that gives the matrix a second third-party prompts-capable target. | [JSON](./examples/artifacts/promptopia-server.json) | [Markdown](./examples/artifacts/promptopia-server-report.md) |
| `puppeteer-server` | `puppeteer-mcp-server` | `0.1.0` | `2026-03-19T04:26:59.241Z` | Browser-oriented third-party target that passes resources while surfacing an optional endpoint caveat. | [JSON](./examples/artifacts/puppeteer-server.json) | [Markdown](./examples/artifacts/puppeteer-server-report.md) |
| `ref-tools-server` | `ref-tools-mcp` | `3.0.3` | `2026-03-19T04:26:59.997Z` | Third-party prompts-capable target that proves prompt support is not limited to official example servers. | [JSON](./examples/artifacts/ref-tools-server.json) | [Markdown](./examples/artifacts/ref-tools-server-report.md) |

## Commands Used

- `context7-server`: `npx -y @upstash/context7-mcp`
- `everything-server`: `npx -y @modelcontextprotocol/server-everything`
- `filesystem-server`: `npx -y @modelcontextprotocol/server-filesystem examples/filesystem-fixture`
- `opentofu-server`: `npx -y @opentofu/opentofu-mcp-server`
- `promptopia-server`: `npx -y promptopia-mcp`
- `puppeteer-server`: `npx -y puppeteer-mcp-server`
- `ref-tools-server`: `npx -y ref-tools-mcp`

## Canonical Failure Proof

- Startup diagnosis: [`server-pdf-startup-fail.json`](./artifacts/server-pdf-startup-fail.json) and [`server-pdf-startup-fail-report.md`](./artifacts/server-pdf-startup-fail-report.md)
