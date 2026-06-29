# Enterprise Outreach Playbook

Use this playbook after running:

```bash
npm run telemetry:intelligence -- --input <private-telemetry-export.jsonl> --out-dir reports
```

Start from `reports/telemetry-usage-summary.html` to confirm external usage before reading account rankings. Do not treat first-party CI, release workflows, or internal/personal sessions as market traction.

Raw telemetry is allowed for internal account intelligence only. Do not include personal emails, hostnames, private URLs, target commands, tokens, proprietary schemas, customer names, or private telemetry exports in public issues, posts, docs, or customer-facing outreach without explicit permission. Keep account-specific rankings in ignored `reports/` outputs or private notes.

## Priority Accounts

| Priority | Account | Evidence | Motion |
| ---: | --- | --- | --- |
| 1 | Private account A | Repeated external sessions, CI usage, private-target signal, or security workflow evidence | Enterprise pilot |
| 2 | Private account B | Recent usage across multiple sessions or repos | Business pilot / design partner |
| 3 | Private account C | Small usage cluster with clear owner signal | Business pilot / testimonial ask |
| 4 | Private account D | Single company or team signal | Team pilot / feedback ask |
| 5 | GitHub org/user signals | CI or repo-based usage | Team pilot unless company identity is confirmed |

## First Email Template

Subject: MCP security reporting for production agent workflows

Hi,

I build MCP Observatory, an open source tool for testing, securing, and monitoring MCP servers before agents depend on them.

I am opening a small number of enterprise pilots for teams that want hosted MCP security reports, private-repo CI history, and fleet visibility across agent environments.

If your team is running MCP servers in production, I can prepare a short evidence-based report and a pilot proposal focused on:

- MCP compatibility
- private HTTP MCP health checks
- security findings and schema drift
- CI history and controlled drift review
- MCP fleet visibility across teams

Would it be useful to compare notes this week?

William

## Pilot Routing

- Repeated sessions + internal/private target: Enterprise Pilot, starts at `$3k/month`.
- Major platform, AI lab, or very large company: Strategic only, `$250k+/year` anchor.
- Light but recent company usage: Business Pilot, starts at `$999/month`.
- GitHub-user-only or hobby-looking usage: Team Pilot, starts at `$299/month`.

## Call Agenda

1. Confirm whether MCP is already in production or only evaluation.
2. Identify the owner: platform, security, AI infra, developer productivity, or app team.
3. Ask which value matters most: CI, security report, dashboard, certification, fleet inventory, or private deployment.
4. Offer to generate a static enterprise report from their first pilot run.
5. Quote manually. Do not route large companies to self-serve Team/Business pricing.

## Evidence Packet

Prepare this before outreach:

```bash
npx @kryptosai/mcp-observatory enterprise-report \
  --account "Account Name" \
  --format html \
  --output reports/account-enterprise-report.html
```

Include only aggregate facts:

- company or GitHub organization domain
- event count
- unique sessions
- first seen / last seen
- commands used
- targets seen
- CI/private-network/security signals
- confidence
- recommended pilot tier

Do not include raw hostnames, personal emails, tokens, or private URLs in external outreach.
