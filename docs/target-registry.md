# MCP Target Registry

<p align="center">
  <img src="./logo.svg" alt="MCP Observatory" width="760">
</p>

The easiest way to help MCP Observatory grow is to add one safe MCP target.

A target is a public MCP server that can be installed, started, and evaluated without private credentials or destructive side effects. Each target teaches agents and maintainers what healthy MCP behavior looks like.

## Why This Can Compound

Every accepted target creates several useful surfaces:

- a reproducible startup command
- a public safety-index row
- JSON and Markdown evidence artifacts
- a maintainer conversation starter
- a badge or CI adoption path
- a small contribution that another agent can copy

That means one tiny PR can produce docs, evidence, search surface, backlinks, and future issues.

## Registry Source

Current Safety Index targets live in:

```text
docs/safety-index/targets.json
```

Generated evidence lives in:

```text
docs/safety-index/artifacts/
docs/mcp-server-safety-index.md
```

## Best Targets

Good first targets:

- start with `npx -y package-name` or another public no-secret command
- expose at least one real MCP tool, prompt, or resource
- avoid production accounts, OAuth, private tokens, and paid services
- use a harmless fixture directory when filesystem access is needed
- represent something agents actually use: browser, files, memory, docs, databases, search, code, CI, or infrastructure

Avoid targets that need:

- private OAuth
- live destructive actions
- paid-only APIs
- customer data
- private repositories
- long-running background services

## Target Entry Shape

Add one object to `docs/safety-index/targets.json`:

```json
{
  "id": "example-server",
  "name": "Example MCP Server",
  "repo": "https://github.com/example/example-mcp",
  "packageName": "example-mcp",
  "category": "Developer Tools",
  "command": "npx",
  "args": ["-y", "example-mcp"],
  "timeoutMs": 60000,
  "riskClass": "Developer tool access",
  "failureClass": "Startup/listing reproducibility",
  "whyItMatters": "Agents may rely on this tool during coding workflows.",
  "reproductionNotes": "Zero-config public package."
}
```

## Contributor Loop

1. Pick one public MCP server.
2. Confirm it starts without secrets.
3. Add one target entry.
4. Run the Safety Index locally.
5. Open a small PR with the target and generated evidence.
6. Optionally ask the maintainer if they want an Observatory badge or CI check.

Use the detailed walkthrough in [Target Contribution Guide](./target-contribution-guide.md).

## Contribution Queue

Ready-made target tasks live under the [`target-registry` label](https://github.com/KryptosAI/mcp-observatory/issues?q=is%3Aissue%20is%3Aopen%20label%3Atarget-registry). Pick one issue, make one small PR, and include generated evidence.

## Maintainer-Friendly Ask

When contacting a maintainer, keep it concrete:

```md
I added a read-only MCP Observatory target for this server so agent users can verify startup, listed tools/prompts/resources, schema shape, and common safety footguns.

It does not require an account, hosted service, or secrets. If you prefer a different safe startup command, I can adjust the target.
```

## Agent-Friendly Task

For autonomous coding agents:

```text
Find one public MCP server with a no-secret startup command. Add a single Safety Index target entry, run npm run safety-index, and open a PR that includes the generated JSON/Markdown evidence.
```
