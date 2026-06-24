# Maintainer Note Template

Subject: Reproducible MCP readiness report for `<server>`

Hi,

I ran MCP Observatory against `<server>` as part of the MCP Server Safety Index. This is not a vulnerability report or a drive-by badge request. It is a reproducible compatibility/security-readiness check for MCP servers before agents depend on them.

Report:

- command: `<command>`
- verdict: `<verdict>`
- failure class: `<failure-class>`
- JSON artifact: `<artifact-link>`
- Markdown report: `<report-link>`

The main thing the report shows is:

> `<one-sentence-finding>`

If useful, I can open a small PR that adds a read-only GitHub Action for this check. If the published package is not the right target, I can instead use the repo's local build/start command so CI validates pull request code.

No account is required. The generated workflow is read-only by default, and strict repos can pin the action to a full commit SHA.

Thanks for maintaining the MCP ecosystem.
