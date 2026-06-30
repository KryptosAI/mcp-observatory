# MCP Observatory Commercial Pilots

MCP Observatory is the CI and security gate for MCP servers before agents depend on them.

The open source CLI and MCP server remain free for local OSS use under the MIT license. Paid pilots are for production use cases where a team needs hosted reporting, private repository CI, security reports, certification, support, or fleet visibility.

## Pilot Pricing

These are starting points for current pilots, not permanent fixed plans.

| Pilot | Starting Price | Best Fit |
| --- | ---: | --- |
| Team Pilot | $299/month | Small teams adding MCP regression checks to CI |
| Business Pilot | $999/month | Private repos, recurring security reports, and shared reporting |
| Enterprise Pilot | $3k/month | Private MCP readiness reports, support, and fleet visibility |
| Strategic Accounts | Custom, $250k+/year | Major platforms, AI labs, and companies running MCP in production at scale |

Contact: william@banksey.com

Primary pilot offer: [Private MCP readiness review + CI rollout + drift/security report](./docs/paid-pilot-offer.md).

## Paid Production Use

Paid pilots can include:

- Hosted CI history and private-repo reporting
- MCP security reports and controlled drift review
- Fleet inventory across teams, repos, and environments
- Static enterprise reports generated from existing run artifacts
- Certification language for MCP servers that pass agreed checks
- Support for production incidents and rollout planning
- Manual account review and implementation guidance

## Conversion Ladder

The OSS product should make adoption useful before a buyer talks to us:

1. **Local proof**: run `test`, `scan`, `diff`, `lock`, or `serve` with no account.
2. **CI proof**: run `setup-ci --all` to add a GitHub Action, badge snippets, and maintainer copy.
3. **Adoption proof**: run `setup-ci --doctor` to verify the workflow, target, badge, and maintainer assets are in place.
4. **Public trust**: add an MCP Observatory badge or health score badge to a public MCP server.
5. **Private readiness**: request a private MCP readiness review for internal servers, schemas, or agent environments.
6. **Hosted production**: use hosted history, drift/security reports, certification, support, and fleet visibility.

Good paid-fit signals include private repos, production MCP usage, repeated CI runs, security review needs, schema drift concerns, multiple teams/agents, and requests for historical reporting or certification.

Public issue templates exist for certification and pilot requests, but sensitive context should go by email rather than public issues.

## What Stays Free

- Local OSS use of the CLI and MCP server
- Running checks in public open source projects
- Self-managed artifacts and local reports
- Existing MIT-licensed code

## Upgrade Path

The CLI recognizes `MCP_OBSERVATORY_CLOUD_TOKEN` as the future hosted-upload credential. During pilots, hosted reports and account mapping may be enabled manually before any self-serve SaaS flow exists.

Run:

```bash
npx @kryptosai/mcp-observatory cloud
```

Generate the first report before a hosted dashboard exists:

```bash
npx @kryptosai/mcp-observatory enterprise-report --account "Customer Name" --format html --output observatory-report.html
```

For account-level pilot reporting in CI:

```bash
MCP_OBSERVATORY_ORG=customer.com
MCP_OBSERVATORY_CONTACT=mcp-owner@customer.com
```

Use the [enterprise outreach playbook](./docs/enterprise-outreach-playbook.md) to route high-confidence company usage to manual pilots without sending generic low-tier pricing to major accounts.
Use [public proof](./docs/proof.md) and the [project case study](./docs/project-case-study.md) for customer-safe credibility. Do not expose private telemetry rows in outreach.

## Enterprise Framing

For production MCP usage, private repo CI, compliance/security reporting, or large company deployments, contact us before selecting a plan. Major company usage is routed to Enterprise or Strategic pricing rather than Team or Business pilots.
