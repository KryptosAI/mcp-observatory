# Enterprise Outreach Playbook

Use this playbook after running:

```bash
npm run telemetry:intelligence -- --input telemetry-exports/events-flat-full.json --out-dir reports
```

Do not include raw personal emails in public issues, posts, or docs. Use account domains, GitHub orgs, and aggregate telemetry evidence.

## Priority Accounts

| Priority | Account | Evidence | Motion |
| ---: | --- | --- | --- |
| 1 | `thinkingdata.cn` | High-confidence external usage, repeated sessions, private-network target signal, Feishu/Lark MCP targets | Enterprise pilot |
| 2 | `kimquy.capital` | Recent light usage across multiple sessions | Business pilot / design partner |
| 3 | `paperstreetdata.com` | Small usage cluster | Business pilot / testimonial ask |
| 4 | `cyberneticsplus.com` | Single company signal | Team pilot / feedback ask |
| 5 | GitHub org/user signals | CI or repo-based usage | Team pilot unless company identity is confirmed |

## ThinkingData First Email

Subject: MCP security reporting for Feishu/Lark production workflows

Hi,

I build MCP Observatory, an open source tool for testing, securing, and monitoring MCP servers before agents depend on them.

We are seeing serious production-style usage patterns around Feishu/Lark MCP workflows and internal HTTP MCP targets. I am opening a small number of enterprise pilots for teams that want hosted MCP security reports, private-repo CI history, and fleet visibility across agent environments.

If your team is running MCP servers in production, I can prepare a short evidence-based report and a pilot proposal focused on:

- Feishu/Lark MCP compatibility
- private HTTP MCP health checks
- security findings and schema drift
- CI history and production monitoring
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

- event count
- unique sessions
- first seen / last seen
- commands used
- targets seen
- CI/private-network/security signals
- recommended pilot tier

Do not include raw hostnames, personal emails, tokens, or private URLs in external outreach.
