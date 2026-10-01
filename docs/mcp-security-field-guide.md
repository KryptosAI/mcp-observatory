# MCP Server Security Field Guide

MCP servers are becoming part of AI agent infrastructure. They expose tools that agents can call, often with access to files, browsers, cloud APIs, databases, documents, and internal systems. That makes MCP security a practical engineering problem: teams need to know which tools exist, what they can touch, how their schemas change, and whether they are safe enough for production agent workflows.

MCP Observatory is built around that control point. It gives maintainers and platform teams a repeatable way to test production MCP servers, add MCP server CI, detect schema drift, and surface agent security risk before agents depend on a tool.

## Why MCP Servers Are An Agent-Facing Attack Surface

Traditional libraries run inside an application boundary. MCP servers sit beside an agent and expose capabilities the model may choose to call. A small schema mistake, broad tool surface, or unreliable startup path can become an operational risk when the server is wired into an autonomous workflow.

Important MCP risk patterns include:

- **Tool overreach:** tools that expose shell, browser, filesystem, network, or data-write behavior with weak constraints.
- **Schema ambiguity:** vague names, missing parameter descriptions, permissive object schemas, or unclear required fields that make agent calls less predictable.
- **Prompt injection paths:** tools that retrieve untrusted content and return it directly to an agent context.
- **Secret exposure:** responses, logs, headers, or environment-backed tools that can leak credentials or internal details.
- **Schema drift:** changed tool names, parameters, or capabilities that break dependent agents without warning.
- **Unreliable startup:** packages that work locally but hang, exit early, or fail under CI and production runners.
- **Capability mismatch:** servers that advertise tools, prompts, or resources but do not return valid MCP responses.

## What Can Go Wrong When Agents Depend On Tools

An MCP server can look harmless during manual evaluation and still fail in production agent infrastructure. The most common failure modes are not exotic. They are basic integration risks amplified by agent autonomy:

- a tool disappears or changes shape after an upgrade
- a server starts on a laptop but fails in GitHub Actions
- a broad filesystem or browser automation tool is exposed without a clear trust boundary
- a tool returns untrusted text that gets treated as instruction-like context
- a schema is technically valid but too vague for reliable model use
- a private or credential-backed tool is added without audit visibility

For security and platform teams, the goal is not to block every MCP server. The goal is to make tool invocation observable, testable, auditable, and safe enough for the workflow that depends on it.

## What MCP Observatory Checks Today

MCP Observatory focuses on model context protocol testing that can run locally, in CI, or through its own MCP server mode. It checks:

- tools, prompts, and resources list/respond correctly
- advertised capabilities match observed behavior
- safe read-only tools can be invoked
- schemas have enough structure for agents to call them reliably
- risky schema patterns are surfaced before production use
- runs can be compared for regressions and schema drift detection
- artifacts can be rendered as JSON, Markdown, HTML, JUnit, SARIF, or PR comments
- health scores and badges can create visible trust signals for MCP maintainers

This is intentionally practical. It is not a formal proof of semantic safety. It is a CI-friendly control that helps teams find obvious compatibility, drift, and security issues before they become agent failures.

## What CI Should Catch Before Deployment

A useful MCP server CI gate should answer a few operational questions:

- Does the server start reliably in a clean environment?
- Do tools, prompts, and resources respond with valid MCP shapes?
- Did any tool, parameter, prompt, or resource drift from the previous known-good run?
- Are there broad filesystem, shell, browser, network, or credential-sensitive tools?
- Are generated reports readable by maintainers and security reviewers?
- Can the run produce artifacts for later audit, diffing, or enterprise review?

MCP Observatory is designed to make that a one-command adoption path:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server"
```

For a direct check:

```bash
npx @kryptosai/mcp-observatory test --security npx -y my-mcp-server
```

## How Security And Platform Teams Can Adopt MCP Checks

For open source maintainers, start with the generated GitHub Action and a public badge. This creates a visible compatibility/security signal without requiring an account.

For private teams, start with static artifacts:

- run MCP checks in CI
- store JSON and Markdown artifacts
- compare releases with `diff`
- use SARIF where security review tools expect it
- generate a static enterprise report for owner review

For one developer, the next layer is Individual Pro hosted history and CI ingestion. Teams needing a production decision can use the fixed `$15,000`, 1-3-server, ten-business-day Release Gate Pilot.

## Future Direction

The next generation of secure agentic systems will need more than ad hoc tool installs. Useful controls will include:

- policy for which tools agents may call
- provenance for MCP packages and server configurations
- schema locks and controlled drift review
- runtime monitoring for production agent tool use
- evidence-backed approval signals for high-trust MCP servers
- fleet inventory across teams, repositories, and hosts

MCP Observatory starts with the smallest durable wedge: make MCP servers testable, visible, and auditable before agents depend on them.
