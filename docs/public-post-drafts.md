# Public Post Drafts

Use these as launch posts, GitHub Discussion posts, LinkedIn posts, or short blog drafts. The framing is about MCP safety patterns, not “look at my tool.”

## Flagship Post: I Tested Popular MCP Servers. The Failure Pattern Was Not What I Expected.

MCP servers are becoming production dependencies for agents, but many of them still ship without the kind of CI gate we expect from normal software dependencies.

The main pattern I saw while building the first MCP Server Safety Index was simple: the risky part is rarely that a server exists. The risky part is that agents may depend on a tool surface nobody is testing for startup reliability, schema quality, security posture, or drift.

The industry does not need another vibes-based directory. It needs reproducible readiness evidence:

- exact command/config
- date and package version where available
- JSON artifact
- Markdown report
- verdict
- failure class
- reproduction notes

The checks that matter most:

- does the server start cleanly in CI?
- do tools, prompts, and resources respond as advertised?
- are tool schemas precise enough for agents to call safely?
- did a release add, remove, or broaden a tool?
- are destructive tools clearly identifiable?

My takeaway: MCP needs a package-lock moment. Commit the agent-facing contract, then make drift visible before agents depend on it.

I am publishing the Safety Methodology and the first MCP Server Safety Index as a small evidence standard, not a leaderboard. If your team is putting MCP into private or production agent workflows, I am doing a small number of private MCP readiness reviews: inventory, CI rollout, schema/tool drift baseline, security findings, and safe-for-agent-dependency verdicts.

## Supporting Angle: Browser MCP Servers Need A Different Security Bar

Browser automation MCP servers are powerful because agents can navigate pages, click, type, inspect state, and sometimes execute scripts.

That is exactly why they need explicit CI and security gates.

For browser MCP servers, a useful review should separate:

- harmless inventory checks
- state-mutating browser actions
- code execution or page-evaluation tools
- network/navigation controls
- tool schemas that are too broad for safe agent planning

The goal is not to block browser MCP. The goal is to make the trust boundary visible before an agent gets browser-control powers.

## Supporting Angle: Filesystem MCP Servers Should Always Test In A Sandbox

Filesystem MCP servers are one of the clearest examples of why MCP CI needs context.

A server can be useful and still dangerous if the test command points at the wrong directory, if read/write boundaries are unclear, or if a tool schema makes broad path access look harmless.

The minimum safety pattern:

- run CI against a temporary harmless directory
- verify tools/resources respond as advertised
- flag broad filesystem access
- document which operations are read-only vs write-capable
- treat changes to path schemas as contract drift

Agents need tools. They do not need accidental access to everything.

## Supporting Angle: Token-Backed SaaS MCP Servers Need Issue-First Certification

Many SaaS, cloud, payments, database, and developer-platform MCP servers cannot be safely checked with a drive-by PR because meaningful startup requires tokens or live services.

For those repos, the right move is usually not a workflow PR first. It is an issue or maintainer question:

“What is the safest CI startup command for this server?”

Once maintainers provide a token-safe target config, the useful checks are:

- does startup fail cleanly without credentials?
- are auth requirements documented?
- are destructive tools obvious?
- are schemas narrow enough for agent use?
- can the repo publish a safe compatibility/security badge?

Security adoption works better when it starts by respecting maintainer context.

## Supporting Angle: MCP Drift Is An AI Supply Chain Problem

When a package dependency changes, teams have lock files, diffs, review, and release notes.

When an MCP server changes its tool surface, an agent dependency changed too.

That means tool additions, tool removals, schema broadening, new write actions, and prompt/resource changes should be visible in pull requests.

The useful primitive is an MCP lock file:

```bash
npx @kryptosai/mcp-observatory lock
npx @kryptosai/mcp-observatory lock verify
```

The point is not bureaucracy. It is to make the agent-facing contract reviewable before production workflows quietly depend on something new.

## Supporting Angle: I Safely Simulated MCP Tool Poisoning Against Real Servers

The useful MCP security demo is not “this scanner found risk.”

It is:

> here is the exact metadata, schema, or drift pattern that could steer an agent into unsafe behavior.

MCP Attack Simulator runs safe, inert simulations for:

- tool poisoning in tool/prompt/resource metadata
- fake canary and credential-like exposure in captured evidence
- broad permission boundaries around destructive tools
- contract drift when a server changes its agent-facing surface

It does not execute destructive payloads or exfiltrate real data. The goal is reproducible evidence maintainers can fix and security teams can review.

```bash
npx @kryptosai/mcp-observatory attack-sim --target ./target.json --sarif attack-results.sarif
```
