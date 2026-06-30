# Cloned This?

MCP Observatory is most useful when it becomes a CI gate for an MCP server, not just a repo someone checks out once.

## Fast Path

Run a local check:

```bash
npx @kryptosai/mcp-observatory test npx -y <server-package>
```

Then add the check to GitHub Actions:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"
```

Check whether the repo is ready:

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor
```

## What To Commit

- `.github/workflows/mcp-observatory.yml`
- `mcp-observatory.target.json` when the server needs args, cwd, or env placeholders
- `docs/mcp-observatory-badge.md` if you want a README trust badge
- `docs/mcp-observatory-pr-body.md` when opening a maintainer PR

The generated workflow is read-only by default. Maintainers can opt into PR comments or commit statuses later.

## Why This Matters

MCP servers are becoming production dependencies for agents. CI should catch compatibility regressions, schema drift, and common security footguns before agents depend on a release.

Production teams can request private readiness reviews, hosted CI history, recurring drift/security reports, certification, support, and fleet visibility through [COMMERCIAL.md](./COMMERCIAL.md).
