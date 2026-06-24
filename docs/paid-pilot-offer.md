# Paid Pilot Offer

## Private MCP Readiness Review

Offer:

> Private MCP readiness review + CI rollout + drift/security report.

This is a manual pilot, not a self-serve SaaS promise.

## Who It Is For

- teams running MCP servers in production or pre-production
- security/platform teams reviewing agent tool dependencies
- companies with private MCP repos
- teams that need proof before agents depend on internal tools

## What The Pilot Includes

- MCP server inventory across selected repos, configs, or agent environments
- reproducible test artifacts for each reviewed server
- private readiness report covering startup, capabilities, schema quality, security findings, and drift risk
- schema/tool drift baseline using MCP lock files
- MCP Observatory CI rollout plan for selected servers
- executive summary with “safe for agent dependency” verdicts
- prioritized remediation notes and owner-ready next steps
- optional certification language for servers that pass agreed checks

## Starting Prices

- Business Pilot: starts at `$999/month`
- Enterprise Pilot: starts at `$3k/month`
- Strategic Accounts: custom, `$250k+/year`

Do not route major platforms, AI labs, or large enterprises to Team/Business pricing. Use a production/security pilot conversation and ask for the owner or procurement path.

## Simple Outreach Copy

Subject: Private MCP readiness review

Hi,

I build MCP Observatory, the CI and security gate for MCP servers before agents depend on them.

I am opening a small number of private MCP readiness pilots for teams running MCP in production or pre-production. The pilot includes CI rollout, schema/security review, drift checks, and a private readiness report for your MCP servers.

If MCP is becoming part of your agent infrastructure, I can help you answer:

- which servers are safe enough for agents to depend on?
- which tool surfaces changed recently?
- where are the schema/security risks?
- what should block a PR before production?

Would it be useful to compare notes this week?

William

## Delivery Shape

Start with static reports and CI setup. The first deliverable should look like an internal security/readiness packet, not a SaaS login.

## Evidence Standard

The public [Safety Methodology](./methodology.md) and [MCP Server Safety Index](./mcp-server-safety-index.md) are the template for private work:

- command/config used
- date and tool version
- JSON artifact
- Markdown or HTML report
- failure class
- verdict
- reproduction notes

Private pilots can include customer-specific details, but public/customer-facing summaries should use sanitized evidence unless the customer approves otherwise.
