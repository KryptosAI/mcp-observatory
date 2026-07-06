# Clone To CI Campaign

This is the operating campaign for turning anonymous clone/download activity into durable MCP Observatory adoption.

## Campaign Promise

Add MCP CI/security checks in 60 seconds.

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y <server-package>"
```

## Strategy Map

| Strategy | Move | Success Signal |
| --- | --- | --- |
| Passive credibility | Link `CLONED_THIS.md`, proof docs, badges, and sample reports from README/npm | higher repo views per clone |
| Product-led conversion | Prompt `setup-ci` after `test`, `scan`, `diff`, `score`, and `lock verify`; expose `setup-ci --doctor` | more `setup-ci` sessions |
| Ecosystem distribution | Submit directory/listing copy and Action examples to MCP/devtool/security indexes | more qualified clones/downloads |
| Authority | Publish safety field reports and reference evaluations | backlinks, citations, inbound issues |
| Certification | Open small read-only CI PRs against public MCP servers | merged PRs, maintainer replies, badge adoption |
| Revenue | Offer private readiness reviews and hosted history to high-signal teams | pilot calls and paid reviews |

## Weekly Loop

1. Refresh the local metrics dashboard.
2. Record clone/download/view and `setup-ci` conversion.
3. Pick 5 public MCP repos for certification PRs.
4. Submit or refresh 3 directory/listing entries.
5. Publish one short public note from the safety findings.
6. Draft private outreach to 3 high-signal accounts using sanitized evidence only.
7. Generate a sanitized sample enterprise report for pilot conversations:
   `npx @kryptosai/mcp-observatory enterprise-report --sample --format html --output reports/sample-enterprise-report.html`

Use [Agent And MCP Ecosystem Promotion Plan](./agent-ecosystem-promotion-plan.md) for the current MseeP claim flow, directory target list, agent prompts, company outreach copy, and certification PR shape.

## Public Copy

Short:

> MCP Observatory adds CI, compatibility, drift, and security checks for MCP servers before agents depend on them.

Clone conversion:

> Cloned this? Add MCP CI in 60 seconds with `setup-ci --all`.

Security-team angle:

> Treat MCP servers like production dependencies: check startup, schema quality, tool safety, drift, and CI history before agents use them.

## Metrics

Track these in the local dashboard:

- GitHub clones
- npm downloads
- GitHub views
- local validation sessions
- `setup-ci` sessions
- clone/download to CI conversion
- latest version adoption
- external CI sessions

The primary campaign goal is not raw clones. It is increasing `setup-ci` sessions and accepted CI/badge integrations.

## Double-Down Loop

When telemetry or public replies show signal, prioritize depth over a larger cold list.

1. Follow up on warm replies within 24 hours.
2. Ask for one safe, repeatable startup command rather than a broad partnership.
3. Convert that command into a reference target, CI example, or safety-index artifact.
4. Link the public proof back from the original thread.
5. Track whether the follow-up produces `test`, `scan`, `setup-ci`, SARIF, or external CI sessions.

Use this order:

| Priority | Signal | Action |
| --- | --- | --- |
| 1 | Maintainer asks how to contribute | Ask for a CI-safe target command and setup caveats |
| 2 | Existing PR has measurable usage or a passing check | Offer to narrow scope, pin versions, or split the PR |
| 3 | Bot/runtime maintainer replies | Ask what tools the agent depends on and propose a preflight target |
| 4 | Issue gets only an automated welcome reply | Wait for a human response before posting again |
| 5 | Issue is closed as not planned | Thank them only if a response is needed; do not push |

## Warm Reply Template

~~~md
Yes, that would help. The highest-value contribution would be one safe, repeatable MCP target that Observatory can run in CI without secrets or destructive side effects.

Ideal shape:

```text
Project:
Safe startup command:
Needs secrets? yes/no
Expected healthy behavior:
Agent tools/skills that depend on MCP:
What should an autonomous agent know before trusting this tool?
```

If the command is public and safe to run, we can add it as a reference target, CI example, or safety-index artifact. A small PR or issue with the command and setup caveats is enough; no hosted service or account is required.
~~~

## Attribution Hygiene

Public outreach is only useful if we can tell what converted.

- Link to one specific doc or issue per campaign.
- Record public follow-up URLs in the campaign notes.
- Watch for next-day movement in `test`, `scan`, `setup-ci`, external CI, clones, and npm downloads.
- Do not publish private telemetry, account names, hostnames, emails, or customer claims.
- Treat anonymous clone/download spikes as interest, not adoption, until they turn into CI or maintainer replies.
