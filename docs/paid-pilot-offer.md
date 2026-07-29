# MCP Release Gate Pilot

## Offer

In ten business days, we give a team an evidence-backed approve, gate, or defer decision for 1-3 critical MCP servers before production agents depend on them. The fixed-scope pilot includes private evidence, CI rollout, SARIF/Code Scanning setup, drift baseline, and owner-ready remediation.

For work that requires a broader attack-simulation or fleet scope, begin with this pilot; any follow-on work is scoped after the release decision is complete.

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
- optional customer-approved public evidence summary after delivery

## Starting Package

MCP Release Gate Pilot: `$15,000` fixed scope for 1-3 critical MCP servers. The first two founding design partners may receive a `$10,000` rate in exchange for structured feedback and permission to publish an anonymized outcome.

Good fit:

- a team is adding MCP tools to an agent runtime
- a platform team needs CI evidence before approving MCP servers
- a security team wants MCP findings in GitHub Code Scanning
- a maintainer wants public trust signals for an MCP project
- a company has private MCP servers and needs owner-ready remediation notes

Large fleets, recurring reviews, hosted history, support, or customer-approved public evidence programs can move into a separately scoped follow-on engagement.

## Simple Outreach Copy

Subject: MCP Release Gate Pilot

Hi,

I build MCP Observatory, the CI and security gate for MCP servers before agents depend on them.

I am offering a fixed-scope MCP Release Gate Pilot for teams running MCP in production or pre-production. It produces an approve, gate, or defer decision for 1-3 critical servers, plus CI rollout, SARIF/Code Scanning setup, safe-mode evidence, and a private owner-ready report.

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
