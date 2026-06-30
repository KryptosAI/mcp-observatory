# MCP Safety Field Report: June 2026

This field report summarizes recurring MCP readiness patterns observed while building and testing MCP Observatory against public examples, reference servers, and generated safety-index artifacts. It is not a leaderboard and does not rank maintainers.

## What Is Working

- MCP maintainers increasingly expose package-level startup commands that can be checked in CI.
- Read-only GitHub Actions are a low-friction way to introduce compatibility and security checks.
- Health badges and PR reports make MCP readiness understandable to users who are not deep in MCP internals.
- Lock files are a natural fit for schema/tool drift because MCP servers behave like production dependencies.

## Common Readiness Gaps

1. **No CI proof for MCP startup**
   Repos may publish a server without a pull-request check that verifies the server starts and responds to MCP capability discovery.

2. **Schema descriptions are thin**
   Tool and property descriptions are often good enough for demos but weak for production agents deciding when and how to call tools.

3. **Filesystem and network boundaries need clearer evidence**
   Path, URL, shell, and token-adjacent inputs need explicit review because agents can amplify small schema ambiguities into risky behavior.

4. **Drift is not reviewed like dependency drift**
   MCP tool surfaces can change between releases without a lock-file-style review step.

5. **Badges exist for build status, not agent readiness**
   Users need visible signals that a server was checked for MCP compatibility, drift, and common security issues.

## Recommended Baseline

Every production-facing MCP server should have:

- startup check in CI
- `deep: true` capability exercise where safe
- lightweight security/schema checks
- artifact output for review
- optional score badge
- lock-file verification for stable server surfaces
- a documented safe startup command for CI

## One-Command Adoption

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"
```

Then verify the adoption kit:

```bash
npx @kryptosai/mcp-observatory setup-ci --doctor
```

## Buyer-Safe Claim

MCP Observatory is an evidence standard for MCP readiness. Public claims should use public artifacts, public PRs, and aggregate/sanitized metrics only. Private telemetry, hostnames, emails, target URLs, and account names stay private.
