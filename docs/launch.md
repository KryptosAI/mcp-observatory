# MCP Observatory Launch Page

```
  ███╗   ███╗ ██████╗██████╗
  ████╗ ████║██╔════╝██╔══██╗
  ██╔████╔██║██║     ██████╔╝
  ██║╚██╔╝██║██║     ██╔═══╝
  ██║ ╚═╝ ██║╚██████╗██║
  ╚═╝     ╚═╝ ╚═════╝╚═╝
     O B S E R V A T O R Y
```

MCP Observatory is the GitHub-native CI and security gate for MCP servers before agents depend on them.

It turns a local MCP check into evidence maintainers already understand: GitHub Actions, SARIF, Code Scanning findings, score badges, reproducible run artifacts, and maintainer-ready PR copy.

## The Fast Path

1. Test one MCP server locally.

```bash
npx @kryptosai/mcp-observatory test npx -y my-mcp-server --campaign launch-proof
```

2. Convert the passing check into CI.

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif --campaign launch-proof
```

3. Verify the adoption kit.

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor
```

## Why Maintainers Use It

- Catch MCP startup, tool listing, prompt, resource, schema, and drift failures before agents rely on a server.
- Convert a one-off local check into a repeatable GitHub Action without hand-writing workflow YAML.
- Emit normalized SARIF so MCP findings can appear in GitHub Code Scanning.
- Share reproducible JSON and Markdown evidence without exposing private telemetry.
- Let coding agents run Observatory as an MCP server and inspect other MCP tools autonomously.

## Public Proof

- [GitHub Code Scanning for MCP servers](./github-code-scanning-for-mcp.md)
- [Code Scanning demo](./code-scanning-demo.md)
- [MCP Server Safety Index](./mcp-server-safety-index.md)
- [Target gallery](./target-gallery.md)
- [Public proof log](./proof.md)
- [Agent task pack](./agent-tasks.md)

## For Teams Running MCP In Production

If MCP servers are becoming production dependencies, use the same evidence model privately:

- CI rollout for selected MCP servers
- SARIF and GitHub Code Scanning setup
- private readiness review
- prioritized fixes and owner-ready next steps
- Safety Index-style report for internal agent dependencies

See the [MCP Readiness Review](./paid-pilot-offer.md). The default package starts at `$2,500`.
