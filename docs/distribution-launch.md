# Distribution And Pilot Launch

Use this as the reversible launch motion for MCP Observatory commercialization.

For the release gate and publication checklist, see [Publish And Distribution Readiness](./publish-readiness.md).
For listing copy, use [Directory And Marketplace Listing Copy](./directory-listing-copy.md).
For public proof, use [MCP Observatory Proof](./proof.md).

## Positioning

MCP Observatory is the CI and security gate for MCP servers before agents depend on them.

Launch wedge: MCP Observatory turns MCP server checks into GitHub Code Scanning findings.

## Public Surface Checklist

- README pricing and enterprise CTA
- npm description and keywords
- GitHub repository homepage pointing to the README or commercial page
- MCP directory listings updated with production/security language
- Launch post published
- Badge or certification language available for passing servers
- Certification distribution loop published at [`docs/certification-distribution.md`](./certification-distribution.md)

## Launch Post Draft

MCP servers are becoming production dependencies. If an agent depends on a server, that server needs regression tests, security checks, and drift gates before it breaks workflows.

MCP Observatory scans MCP servers, verifies capabilities, detects schema drift, records/replays sessions, and can run in CI or as an MCP server itself. It now emits GitHub Code Scanning friendly SARIF so MCP compatibility, startup, schema-quality, and security findings can appear in the same security review surface teams already use.

One command:

```bash
npx @kryptosai/mcp-observatory test npx -y my-mcp-server --sarif mcp-observatory.sarif
```

CI setup with Code Scanning upload:

```bash
npx @kryptosai/mcp-observatory setup-ci --all --command "npx -y my-mcp-server" --sarif
```

Free for local OSS use. Paid pilots are available for hosted reporting, private repo CI, recurring security reports, certification, support, and fleet visibility.

Production MCP usage? Open a pilot request from the GitHub issue chooser.

## Outreach Template

Subject: MCP production testing and security checks

Hi,

I noticed signals that your team may be evaluating or using MCP servers. MCP Observatory is the CI and security gate for MCP servers before agents depend on them.

We are running a small number of production pilots for hosted reports, private repo CI, recurring security reviews, certification, support, and fleet visibility.

Would it be useful to compare what your MCP servers look like today and where regressions or production risk could show up?

William

## Helpful Maintainer PR Motion

For popular MCP server repositories, open small PRs that add:

- `.github/workflows/mcp-observatory.yml`
- optional README badge
- a short PR body explaining the security/compatibility benefit

Frame this as free OSS safety infrastructure:

> I added a lightweight MCP Observatory check so users can see this server is tested for compatibility, schema drift, and common security issues. It runs in GitHub Actions, comments a readable report on PRs, and does not require an account.

Use the full template in [`certification-distribution.md`](./certification-distribution.md).

Track each outbound wave with [`certification-campaign-template.md`](./certification-campaign-template.md).

## Account Ranking Inputs

Rank prospects with:

- Company domain or GitHub organization
- Evidence source: git email domain, git remote URL, hostname domain, CI provider
- Event count and unique sessions
- Commands used
- Targets or servers seen
- Production signals: CI, private repo naming, repeated scans, security checks, matrix scans
- Confidence: high, medium, low
- Tier recommendation: Team, Business, Enterprise, Strategic

Do not publish raw emails. Keep account evidence internal.
