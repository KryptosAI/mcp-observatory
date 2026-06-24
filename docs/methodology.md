# MCP Observatory Safety Methodology

MCP Observatory treats MCP servers as agent-facing dependencies. The Safety Index is designed to answer one practical question:

> Is this server ready for agents and teams to depend on, and what evidence supports that answer?

The index is not a leaderboard. It is a reproducible evidence standard for maintainers, security teams, platform teams, and buyers evaluating MCP servers.

## What Gets Tested

Each public evaluation runs MCP Observatory against a public repository or package command. A useful entry includes:

- server name and public source
- exact command and arguments
- run date
- MCP Observatory version
- JSON run artifact
- Markdown report
- verdict
- failure class
- reproduction notes

The default public check verifies startup, tools, prompts, resources, schema quality, and lightweight security findings. Some entries also include deeper security checks when the target can be evaluated without private credentials.

## Verdicts

- **Ready for CI:** the server starts, lists expected MCP surfaces, and has no high- or medium-severity security finding in the generated artifact.
- **Needs review before production:** the server is reproducible but has findings or partial results a maintainer/security reviewer should inspect before production use.
- **Not reproducible:** the server cannot complete a basic startup or listing check from the documented public command.
- **Unsafe default posture:** the artifact contains high-severity security findings that deserve explicit policy review before agent dependency.
- **Could not evaluate:** the public command cannot be evaluated without credentials, private infrastructure, or maintainer-provided safe configuration.

These verdicts are intentionally operational. They are not formal vulnerability claims.

## Scoring Inputs

MCP Observatory uses the same run artifact model across CLI, CI, reports, and the Safety Index. The health score considers:

- protocol compliance
- schema quality
- security and security-lite checks
- reliability/startup behavior
- performance where latency data is available

The Safety Index does not rank by score. Scores are supporting evidence; failure classes are the story.

## Failure Classes

Common MCP readiness patterns include:

- startup/listing reproducibility
- browser/code execution boundary
- filesystem boundary
- prompt-injection-sensitive retrieval
- persistent state tools
- infrastructure or cloud control surfaces
- artifact-producing tools
- schema clarity and drift
- token-safe configuration

The first public index emphasizes these classes so maintainers can improve concrete surfaces rather than argue about a single trust score.

## Reproducibility Rules

An index row should be included only when it can be reproduced from public information:

- public repo, package, or container reference
- no private telemetry
- no private customer evidence
- no raw emails, hostnames, private URLs, tokens, or response bodies
- a generated JSON artifact and Markdown report
- clear notes when credentials or maintainer context are required

If the safe public command is not known, the right next step is a maintainer note, not a drive-by CI PR.

## Maintainer Posture

The index is constructive by default:

- send the report first
- describe the failure class, not the maintainer
- offer a CI PR only if the target can run safely and the maintainer wants it
- prefer read-only workflows and pinned action refs for third-party repos
- use issue-first outreach for token-backed SaaS, cloud, payments, database, and browser-control servers

## Limitations

MCP Observatory cannot prove semantic safety. A passing result does not mean a server is safe for every workflow. It means the server produced reproducible evidence for compatibility, schema quality, and common security footguns under the tested command.

Production teams should pair these checks with their own threat model, policy, credential boundaries, sandboxing, approvals, and runtime monitoring.
