# MCP Safety Report

MCP servers are becoming production dependencies. When agents depend on a
server, that server needs repeatable compatibility checks, security review,
schema drift detection, and visible trust signals.

## What Observatory checks

- tools, prompts, and resources list/respond correctly
- advertised capabilities match observed behavior
- safe read-only tools can be invoked
- schemas are usable by agents
- security footguns are visible before production use
- runs can be compared for regressions and schema drift
- artifacts can be rendered as JSON, Markdown, HTML, JUnit, SARIF, or PR comments

## Common failure classes

- server startup failure
- malformed tools/list, prompts/list, or resources/list responses
- schema quality issues that make tools harder for agents to call correctly
- regressions between two runs
- unexpected drift from a recorded baseline
- broad filesystem, network, or security-sensitive tool surfaces
- slow or unreliable connection behavior

## Maintainer workflow

    npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server"

That creates a GitHub Action and README badge snippet. The action can comment
on pull requests and fail when MCP compatibility or security checks regress.

Production teams can use the private cloud control plane for hosted reporting,
private repository CI history, recurring security reviews, certification,
support, and fleet workflows.
