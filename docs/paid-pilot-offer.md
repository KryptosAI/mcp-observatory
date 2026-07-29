# MCP Readiness Review

## Offer

In seven business days, we tell a team which MCP servers its agents may depend on, what should block a pull request, and what owners need to fix. The fixed-scope review includes private evidence, CI rollout, SARIF/Code Scanning setup, and drift/security findings.

For teams that need a higher-confidence security deliverable before production agent dependency, use the [MCP Attack Simulation Evidence Pack](./attack-simulation-pilot.md). That package starts at `$15,000` and adds safe-mode attack simulation, executive evidence, and owner-ready remediation notes.

This is a fixed-scope services package for teams that are starting to depend on MCP servers in production or pre-production. It uses the same evidence model as the public Safety Index, but the reviewed targets, findings, and recommendations stay private unless the customer approves otherwise.

The public CLI produces reproducible evidence. The paid review packages that evidence with private fleet context, account-specific risk prioritization, remediation planning, and buyer-ready due diligence. See the [open core and commercial boundary](./commercial-boundary.md).

## Who It Is For

- teams running MCP servers in production or pre-production
- security/platform teams reviewing agent tool dependencies
- companies with private MCP repos
- teams that need proof before agents depend on internal tools

## What It Includes

- MCP server inventory across selected repos, configs, or agent environments
- reproducible test artifacts for each reviewed server
- private readiness report covering startup, capabilities, schema quality, security findings, and drift risk
- GitHub Actions rollout for selected MCP servers
- optional SARIF upload into GitHub Code Scanning
- schema/tool drift baseline using MCP lock files
- executive summary with “safe for agent dependency” verdicts
- prioritized remediation notes and owner-ready next steps
- maintainer PR support for public or partner-owned MCP repos
- optional certification language for servers that pass agreed checks

## Starting Package

MCP Readiness Review: `$5,000` fixed scope for 1-5 MCP servers. The first two design partners may receive a `$2,500` pilot rate in exchange for structured feedback and permission to publish an anonymized outcome.

Higher-confidence attack simulation packages:

- Attack Simulation Quickstart: `$15,000`
- Attack Simulation Evidence Pack: `$25,000`
- Platform Attack Simulation Pilot: `$50,000`

Good fit:

- a team is adding MCP tools to an agent runtime
- a platform team needs CI evidence before approving MCP servers
- a security team wants MCP findings in GitHub Code Scanning
- a maintainer wants public trust signals for an MCP project
- a company has private MCP servers and needs owner-ready remediation notes

Large fleets, recurring reviews, hosted history, support, or certification programs can move into a custom production pilot.

## Simple Outreach Copy

Subject: MCP readiness review

Hi,

I build MCP Observatory, the CI and security gate for MCP servers before agents depend on them.

I am offering a fixed-scope MCP Readiness Review for teams running MCP in production or pre-production. It includes CI rollout, SARIF/Code Scanning setup, schema/security review, drift checks, and a private readiness report for selected MCP servers.

If MCP is becoming part of your agent infrastructure, I can help answer which servers are ready for agents, what should block a PR, and which findings need owner attention first.

Would it be useful to compare notes this week?

## Delivery Shape

Start with static reports, CI setup, SARIF, and owner-ready remediation notes. The first deliverable should look like an internal security/readiness packet, not a SaaS login.

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
