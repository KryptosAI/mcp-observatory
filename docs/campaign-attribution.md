# Campaign Attribution

Campaign attribution helps the maintainer understand which launch, maintainer, bot, or paid-readiness paths lead to real MCP Observatory usage.

Telemetry remains opt-out and private to the project owner. Campaign values are safe slugs only and are not written into public reports, SARIF artifacts, or generated adoption kit files.

## CLI Flag

```bash
npx @kryptosai/mcp-observatory test npx -y my-mcp-server --campaign maintainer-pr
```

The flag is supported by:

- `test`
- `scan`
- `scan deep`
- `run`
- `setup-ci`
- `init-ci`

For `test`, `--campaign` can appear after the MCP command and is stripped before launching the target server.

## Environment Variable

```bash
MCP_OBSERVATORY_CAMPAIGN=bot-runtime-review npx @kryptosai/mcp-observatory scan
```

Use the environment variable when a bot, CI workflow, or documentation snippet cannot safely add another CLI flag.

## Slug Rules

Campaign slugs must be 2-64 characters and use only:

- letters
- numbers
- `.`
- `_`
- `-`

Examples:

- `maintainer-pr`
- `code-scanning-demo`
- `agent-ci`
- `paid-readiness`

## Suggested Campaigns

| Campaign | Use |
| --- | --- |
| `maintainer-pr` | Read-only CI PRs to existing MCP projects |
| `code-scanning-demo` | SARIF and GitHub Code Scanning launch snippets |
| `agent-ci` | Bot or coding-agent generated CI adoption |
| `safety-index` | Target Gallery and Safety Index contribution flow |
| `paid-readiness` | MCP Readiness Review CTA |

