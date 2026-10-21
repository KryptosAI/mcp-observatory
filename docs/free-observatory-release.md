# Free Observatory release

Observatory's scanner, local history dashboard, reports, CI integration, and
self-hosted service are free and MIT licensed. The hosting implementation and
deployment instructions are in [`hosting/`](../hosting/README.md).

Start with a local example or a configured MCP server:

```sh
npx -y @kryptosai/mcp-observatory@latest
npx -y @kryptosai/mcp-observatory@latest dashboard
npx -y @kryptosai/mcp-observatory@latest clearframe
```

Scanning and local history need no account or upload. Telemetry stays off until
explicitly enabled. The `clearframe` command prepares a private local instruction
file and a copy of the selected receipt. Review them before using the printed
ClearFrame CLI command or pasting the instructions into the Mac app. Preparation
does not launch inference or upload the files.

[ClearFrame CLI and Mac downloads](https://clearframecode.com/download/?utm_source=mcp-observatory&utm_medium=release&utm_campaign=opensource)
are optional. ClearFrame uses its own account and usage terms.

Existing hosted accounts remain supported, with Observatory's former paid feature
gates removed. Hosted operation still has capacity and retention limits; local
scanning remains independent of the hosted service.
