# Target Gallery

The Target Gallery turns the Safety Index into a maintainer-friendly map of the MCP ecosystem. It is not a leaderboard. It groups examples by the kind of agent dependency risk they represent.

For reproducible evidence, see the [MCP Server Safety Index](./mcp-server-safety-index.md). For contributor credit attached to accepted targets, see [MCP Observatory Contributors](./contributor-recognition.md) and [Contributor Proof Cards](./contributor-proof-cards/).

## Reference And Baseline Servers

| Target | Why Agents Care | Next Step |
| --- | --- | --- |
| Official everything server | Broad MCP protocol surface across tools, prompts, and resources | Keep as a baseline compatibility target |
| Official sequential thinking server | Small tool surface with readable schemas | Use as a simple CI starter target |
| Official memory server | Agent-facing persistent state | Watch schema and write boundaries |

## Filesystem, Browser, And Execution Boundaries

| Target | Why Agents Care | Next Step |
| --- | --- | --- |
| Official filesystem server | File access boundaries need harmless test roots | Review path scope before production |
| BrowserMCP | Browser-control tools can affect live sessions | Add read-only CI before agent rollout |
| Microsoft Playwright MCP | Browser automation can cross into code execution policy | Treat findings as policy review prompts |
| Puppeteer MCP server | Browser automation needs clear execution boundaries | Keep intentional browser checks explicit |
| ExecuteAutomation Playwright MCP | Startup/listing reproducibility affects agent trust | Start with maintainer conversation |

## Retrieval, Documentation, And Prompt Surfaces

| Target | Why Agents Care | Next Step |
| --- | --- | --- |
| Context7 | Retrieval tools can move untrusted text into agent context | Add drift and schema checks |
| Promptopia | Prompt/resource contracts shape agent behavior | Keep generated evidence current |
| Ref tools | Developer-tool inventory should stay stable | Add CI and badge proof |

## Infrastructure And Artifact-Producing Tools

| Target | Why Agents Care | Next Step |
| --- | --- | --- |
| OpenTofu MCP server | Infrastructure tools can influence production changes | Run checks before unattended agents use it |
| AntV chart MCP server | Artifact-producing tools need clear schemas and outputs | Keep CI evidence public |

## Add A Target

Use the [target contribution guide](./target-contribution-guide.md). The best target has a public package, no secrets, no paid dependency, and a harmless startup command.

```bash
npm run safety-index
npm test -- tests/safety-index.test.ts
```

Accepted target PRs can receive a Target Scout or Target Verifier role, an All Contributors entry, and a proof card under `docs/contributor-proof-cards/` that links to the merged PR and generated public evidence.
