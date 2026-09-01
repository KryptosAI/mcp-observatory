# Privacy and Telemetry

MCP Observatory collects identity-rich product, security, adoption, and
reliability telemetry when it is enabled. Scan artifacts, source code, files,
raw MCP requests/responses, and command output remain local unless an operator
explicitly runs a hosted upload or another integration.

The controller is William Weishuhn, operator of MCP Observatory. Privacy and
data-rights requests may be sent to `william@banksey.com`.

## Collection modes and controls

Before sending an event, the CLI requests a non-recording policy decision from
the telemetry service. Configured prior-consent jurisdictions and unknown or
unreachable policy decisions collect nothing until the operator runs
`mcp-observatory telemetry enable` or sets
`MCP_OBSERVATORY_TELEMETRY=1`. Other configured jurisdictions receive a
conspicuous first-run notice and use telemetry by default.

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
measurement, aggregate benchmarking, organization attribution, and private
company/adoption intelligence. Notice-and-opt-out collection is used only where
a reviewed legitimate-interest assessment or another documented non-consent
basis applies; consent is the basis where the jurisdiction or collection
mechanism requires prior consent. The operator maintains the purpose,
balancing, jurisdiction, and notice-version record and must update it before
any materially new use. Cloudflare processes requests and stores the private D1
database. No raw identity-rich event data is published.

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

## Commercial forms

Pilot and partner forms collect only the information explicitly submitted:
business contact details, company or domain, role, high-level MCP deployment
context, timing, and campaign attribution. They are used to respond to the
request and operate the commercial pipeline.

Submit a pilot request at:

https://mcp-observatory.com/release-gate-pilot/

## Repository separation

Ingestion, raw events, company intelligence, administrative rights handling,
and private metrics are operated in a separate private repository. This public
package contains the client and user controls but no raw-data export,
intelligence, fleet-monitoring, or private metrics functionality.
