# Repository boundary

MCP Observatory now has a deliberate open/closed split.

## Public MIT repository

KryptosAI/mcp-observatory contains the open-core product:

- scanner and MCP server tooling
- evidence engine, receipts, schemas, scoring, baselines, and diffs
- public benchmark fixtures and deterministic behavioral evaluation
- local enterprise report generation
- public Safety Index and dashboard content
- a thin hosted compatibility client for explicit cloud upload, login, logout,
  and whoami operations

The public repository does not contain the hosted Worker implementation,
telemetry intelligence, fleet operations, private metrics, internal compliance
policies, hosted secrets, or customer operational data.

## Private cloud repository

KryptosAI/mcp-observatory-cloud owns the hosted control plane, including the
Cloudflare Worker, authentication and organization isolation, artifact storage
and retention, hosted scans, approvals, scheduled rescans, fleet
coordination, blast-radius analysis, enterprise IAM, managed runners, private
indexes, compliance workflows, and hosted decision APIs.

The cloud repository preserves the existing Worker service identity and v1
routes so released public clients remain compatible.

## History and transition

The public repository history contains previously published hosted code. That
material is legacy public history, not a grant of new proprietary
implementation rights. The new proprietary implementation begins in the
private cloud repository, which was initialized from the hosted Worker subtree
as a transition baseline.

Future hosted-only features belong in the cloud repository. Public changes
must remain runnable without a hosted account or private credentials.
