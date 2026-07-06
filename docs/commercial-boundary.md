# Open Core And Commercial Boundary

MCP Observatory should be easy to adopt and hard to replace.

The public project is the evidence engine: it gives maintainers, agents, and security teams reproducible MCP checks they can run locally or in CI. The commercial product is the intelligence and workflow layer around that evidence: private fleet context, account-level prioritization, buyer-ready reports, and hosted review operations.

## What Stays Open

These surfaces are intentionally public because they increase trust, integrations, and maintainer adoption:

- local CLI and MCP server mode
- safe `attack-sim` checks
- `audit --profile nsa-mcp`
- public artifact schemas
- public MCP risk graph JSON/Markdown/HTML generation
- JSON, Markdown, HTML, JUnit, and SARIF reporters
- GitHub Actions setup and generated CI workflows
- public health scores and badges
- public Safety Index evidence
- public methodology, field guides, and contribution docs

Open evidence creates distribution. A maintainer should be able to rerun a public receipt without asking for permission.

## What Stays Proprietary

These surfaces should remain private unless there is a deliberate licensing or customer agreement:

- private telemetry exports, raw events, emails, hostnames, and account identifiers
- company/account intelligence derived from telemetry or usage patterns
- proprietary Safety Index ranking weights, confidence models, and lead prioritization
- private fleet graph workflows, commercial scoring weights, and buyer-specific prioritization
- commercial report templates beyond sanitized public samples
- buyer-specific evidence packs, remediation notes, and procurement packets
- hosted dashboard workflows, retention logic, and fleet visibility
- runtime/flight-recorder storage, alerting, SIEM export, and incident timelines
- sales scripts, pricing exceptions, lead lists, and partnership notes

The public health score in this repository is open source. Commercial scoring can add portfolio context, usage confidence, buyer priority, repeat drift, account fit, and fleet risk without publishing those weights in the OSS repo.

## Public Safety Index Rule

The public Safety Index should publish reproducible readiness evidence, not a cloneable business engine.

Publish:

- target name and safe startup command
- tool version and run date
- generated JSON/Markdown/SARIF artifacts
- verdict and action receipt
- maintainer note and CI command

Keep private:

- raw private telemetry behind target selection
- exact commercial prioritization weights
- buyer-specific interpretation
- unapproved customer names, emails, domains, hostnames, or internal repos
- any claim that a public guidance mapping is an official agency endorsement

## Paid Product Wedge

The paid product should package the same evidence into decisions a buyer can act on:

- private MCP dependency inventory
- private MCP fleet risk graph
- safe-mode attack simulation evidence pack
- CI/SARIF gate rollout
- drift and schema-change review
- owner-ready remediation backlog
- executive summary and procurement-friendly due diligence packet
- recurring review cadence for production MCP fleets

Pricing anchors:

- `$2,500+` narrow readiness review
- `$15,000+` attack simulation evidence pack
- `$50,000+` private fleet risk graph pilot

The open source project proves the method. The commercial product saves a team time, reduces review risk, and gives leadership a defensible record.

## Handling Clones

Assume visible CLI features can be copied. The moat should come from:

- being the canonical receipt format maintainers already recognize
- accumulating public Safety Index evidence and maintainer conversations
- knowing which adoption signals matter through private telemetry
- turning noisy artifacts into buyer-ready reports quickly
- building trust with security teams through careful privacy and non-destructive defaults

Do not respond to clones by hiding the core OSS loop. Respond by making the public evidence standard more useful and keeping the commercial intelligence layer private.
