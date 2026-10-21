# Privacy and Telemetry

MCP Observatory collects identity-rich product, security, adoption, and
reliability telemetry when it is enabled. Scan artifacts, source code, files,
raw MCP requests/responses, and command output remain local unless an operator
explicitly runs a hosted upload or another integration.

The controller is William Weishuhn, operator of MCP Observatory. Privacy and
data-rights requests may be sent to `william@banksey.com`.

## Collection modes and controls

Telemetry is off by default in every jurisdiction. The CLI makes no telemetry policy or event request and does not inspect Git identity for telemetry until you explicitly run `mcp-observatory telemetry enable` or set `MCP_OBSERVATORY_TELEMETRY=1`. Existing automatic notice-and-opt-out preferences do not carry over as consent. An enabled installation may request the service policy and show a changed notice before sending events.

The following always disable collection and remove unsent queued events:

- `mcp-observatory telemetry disable`
- `MCP_OBSERVATORY_TELEMETRY=0`
- `DO_NOT_TRACK=1`
- the legacy `MCP_OBSERVATORY_TELEMETRY_DISABLED=1`

Use `mcp-observatory telemetry status --verbose` to inspect the effective mode,
or `mcp-observatory telemetry preview` to see an exact unsent event. The local
configuration and bounded retry queue are stored with owner-only permissions.

## Fields collected when available

Identity and provenance:

- `installationId`, `machineId`, `machineFingerprint`, `sessionId`, `runId`,
  `eventId`, `schemaVersion`, `noticeVersion`, and timestamps;
- `hostname`, `gitEmail`, `gitRemoteUrl`, `gitRepoHost`, `gitRepoOrg`,
  `gitRepoName`, `gitEmailDomain`, `hostnameDomain`, `org`, `contact`, and
  `isEnterprise`; and
- `githubRepository`, `githubWorkflow`, `githubRunId`, `githubRunNumber`,
  `githubEventName`, `githubRef`, `githubActor`, `isCI`, `ciName`, `ciProvider`,
  `environmentKind`, `distributionChannel`, `isFirstParty`, `isFixture`,
  `isAutomation`, `telemetrySource`, `campaign`, `stage`, and `referrer`.

Usage and results:

- event, command, transport, package/Node/OS/architecture versions, feature
  chain, recent command sequence, session duration, and feature flags;
- target IDs, installed servers, sanitized server commands, detected languages
  and frameworks, and tool/prompt/resource/server counts; and
- health score/grade, gate/check status, finding and severity counts, security
  mode, connection/execution latency, classified fatal error, receipt/risk
  graph/lock/matrix/CI-setup outcomes, and other bounded historical result
  metadata documented by `telemetry preview`.

`optedInEmail` and the optional `firstContactChannel` are collected only after
`telemetry identify --email <email> [--channel <slug>]`. That command also
explicitly enables telemetry for the installation. These fields are used for
private analytics and are not an authorization for automated outreach.

## Data deliberately excluded

The client allowlists telemetry fields and removes recognized credentials from
remote URLs, server commands, and errors. It does not intentionally transmit
tokens, passwords, environment-variable values, source code, file contents,
raw MCP messages, scan artifacts, command output, or unknown enrichment fields.
Telemetry failures never change the command result. Delivery has a three-second
ceiling and a bounded owner-only retry queue.

## Purposes, recipients, access, and retention

Data supports product analytics, security and reliability research, adoption
measurement and aggregate benchmarking when you explicitly opt in. Cloudflare processes requests and stores the private D1 database. No raw identity-rich event data is published. Enabling telemetry is optional and does not affect any feature or scan verdict.

Events have no scheduled expiry while these purposes remain active, subject to
an annual necessity review and valid access, correction, objection, or deletion
requests. Deleted data expires from provider recovery copies according to the
provider's backup window.

## Explicit hosted operations

The cloud upload command sends the selected RunArtifact to the configured
endpoint. Cloud login stores credentials locally for the hosted client. The
hosted control plane is responsible for authentication, organization
isolation, retention, storage, and hosted workflow policy.

Do not upload secrets, production credentials, private URLs, source code, or
customer data unless the agreed hosted workflow specifically requires it.

## Local dashboard and ClearFrame tasks

The dashboard binds only to 127.0.0.1, loads no remote assets, and reads local run receipts. Reports and JSON may contain private evidence; review them before sharing. Local retention is controlled by your disk and deletion choices.

The ClearFrame task command creates an owner-readable instruction file. It includes check statuses and excludes target names, commands, arguments, paths, URLs, check messages, and raw evidence payloads. The selected receipt is copied into a private, git-ignored review folder inside the project; it may contain sensitive evidence and is not embedded in the instruction text. It does not launch an agent or upload data. When you separately run ClearFrame, its account, model-use, and privacy terms apply.

## Source and operational data

All Observatory product features belong in the MIT repository. Customer records, real telemetry, credentials, and account administration remain private operational data. The legacy shared account service also operates ClearFrame; its Observatory-only source migration is documented separately.
