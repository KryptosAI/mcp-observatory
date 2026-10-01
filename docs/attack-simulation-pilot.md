# MCP Attack Simulation Evidence Pack

## Offer

Private, safe-mode MCP attack simulation for teams that need evidence before agents depend on internal or third-party MCP servers.

This is a fixed-scope security and platform package. It does not run destructive exploits, exfiltrate real data, contact attacker infrastructure, or mutate production systems. It turns MCP Observatory artifacts into an owner-ready evidence pack: attack-sim results, SARIF, CI gate, executive verdict, and remediation notes.

See the [sample attack simulation evidence pack](./sample-attack-simulation-evidence-pack.md) for the buyer-facing deliverable shape.

## Why This Exists

MCP servers are becoming part of the AI software supply chain. A scanner can say “risk exists.” An evidence pack shows:

- which tools and schemas create real agent risk
- what can safely go into CI today
- which findings should block production agent dependency
- what a maintainer or internal owner should change first
- how to keep re-running the evidence after MCP servers update

## Engagement model

The public entry offer is the [MCP Release Gate Pilot](./paid-pilot-offer.md): 1-3 critical servers, ten business days, and an evidence-backed release decision. Broader attack-simulation work is scoped only after that pilot establishes the customer's actual authority boundaries, fixtures, and decision owners.

## What It Includes

- private MCP target inventory from provided configs, repositories, or startup commands
- safe attack simulation for tool poisoning, canary exposure, permission-boundary risk, and drift readiness
- startup and capability evidence for each reviewed MCP server
- JSON artifacts, Markdown reports, and optional HTML executive report
- SARIF output suitable for GitHub Code Scanning
- GitHub Actions CI gate using `setup-ci --all --sarif --schedule weekly`
- drift baseline and recommended blocking policy
- owner-ready remediation notes for internal teams or public maintainers
- executive verdict: ready for CI, needs review before production, or unsafe default posture
- optional maintainer PR/issue support when a public dependency needs a safer default

## Safe-Mode Boundary

The default pilot uses only safe-mode checks:

- no destructive tool calls
- no production credentials
- no secret exfiltration
- no writes/deletes against customer systems
- no external attacker infrastructure
- no vulnerability disclosure claims without customer review

For servers that require credentials, live databases, cloud accounts, cluster access, or write-capable tools, the evidence pack uses a customer-approved fixture, sandbox, or metadata-only review unless a safer harness is provided.

## Buyer Outcomes

At the end of the engagement, the buyer should have:

- a defensible internal answer to “which MCP servers can our agents depend on?”
- a CI gate that keeps re-running after dependency updates
- Code Scanning findings that security teams can triage in an existing workflow
- a prioritized owner list for MCP schema, permission, drift, and credential risks
- a reusable evidence pattern for future MCP servers

## Fast Start

Send:

1. the MCP server package names, repos, or startup commands
2. whether the servers are public, private, or internal
3. the agent runtime or MCP client that depends on them
4. whether GitHub Code Scanning/SARIF is desired
5. the owner contact for remediation notes

Do not send secrets, tokens, customer data, private schemas, or production URLs in a public issue.

Open a pilot request from the GitHub issue chooser or email `william@banksey.com`.

## Release Gate Pilot Outreach Copy

Subject: A release decision before agents depend on MCP tools

Hi,

I build MCP Observatory, a GitHub-native security and CI gate for MCP servers.

I am opening a small number of fixed $15,000 MCP Release Gate Pilots for teams adopting 1–3 critical MCP servers in production or pre-production. The ten-business-day work is safe-mode only: no destructive tool calls, no real data exfiltration, and no attacker infrastructure. The deliverable is an owner-ready approve, gate, or defer decision with attack-sim results, SARIF/Code Scanning, a CI gate, drift baseline, and remediation notes.

If your agents depend on MCP servers, this answers: which servers are safe enough for CI, which need production review, and what should block a PR before the next schema/tool change ships.

Would it be useful to compare notes this week?
