# Target Contribution Guide

This guide turns MCP Observatory contribution into one small, repeatable action: add one safe MCP server target.

## The Goal

Add a target that another person or agent can reproduce later.

Success means:

- the command is public
- the command is safe to run in CI
- the target has a clear risk class
- generated evidence is checked in
- the PR is small enough to review quickly

## Step 1: Pick A Candidate

Look for MCP servers in:

- GitHub repos with `mcp-server` or `model-context-protocol`
- npm packages ending in `-mcp` or `mcp-server`
- agent runtime docs that mention MCP tools
- existing issues where maintainers ask for compatibility evidence

Prefer targets with a simple command:

```bash
npx -y package-name
```

If a target needs a fixture, keep it harmless and checked in under `examples/`.

## Step 2: Run A Quick Check

From the repo root:

```bash
npx @kryptosai/mcp-observatory test npx -y package-name --security
```

If that works, add the target to:

```text
docs/safety-index/targets.json
```

## Step 3: Write Useful Metadata

Use plain language. The metadata should help an agent decide whether this tool is worth trusting.

- `riskClass`: what kind of power this server gives an agent
- `failureClass`: what kind of breakage would matter most
- `whyItMatters`: why agent users care
- `reproductionNotes`: how to run it safely

Examples:

```text
Browser control
Browser/code execution boundary
Agents may use this to navigate pages and inspect web state.
Zero-config public package; security findings are policy-review prompts, not vulnerability claims.
```

## Step 4: Generate Evidence

Run:

```bash
npm run safety-index
```

This updates:

```text
docs/mcp-server-safety-index.md
docs/safety-index/artifacts/<target-id>.json
docs/safety-index/artifacts/<target-id>.md
```

## Step 5: Validate

Run the fast checks:

```bash
npm run lint
npm run typecheck
npm test -- tests/safety-index.test.ts
```

Use broader checks for larger changes:

```bash
npm test
npm run smoke
```

## Step 6: Open A Tight PR

Good PR title:

```text
Add Safety Index target for Example MCP
```

Good PR body:

```md
## Summary

- add a no-secret Safety Index target for Example MCP
- include generated JSON and Markdown evidence

## Validation

- npm run safety-index
- npm run lint
- npm run typecheck
- npm test -- tests/safety-index.test.ts
```

## Maintainer Follow-Up

After the PR lands, you can ask the upstream maintainer:

```md
I added a read-only MCP Observatory target for your MCP server so agent users can verify startup, schemas, and common safety footguns.

The check is local-first and does not require secrets. If you want, the same target can become an advisory GitHub Action or README badge.
```

## What Not To Do

- do not add broad scraping
- do not include secrets or private URLs
- do not run destructive tools
- do not combine many targets in one first PR
- do not frame warnings as vulnerabilities unless the evidence clearly supports that
