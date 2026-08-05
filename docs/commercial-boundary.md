# Open core and hosted control plane

The MIT repository is the portable evidence product. The private cloud
repository is the hosted workflow and intelligence product.

## What Stays Open

- local scanner and MCP server mode
- evidence engine, receipts, schemas, scoring, baselines, diffs
- deterministic behavioral evaluations and public benchmarks
- JSON, Markdown, HTML, JUnit, SARIF, and CI reports
- local enterprise report generation
- public Safety Index content and dashboard
- thin hosted upload/login/whoami compatibility client

Anyone can run the open-core loop locally or in public CI without an account.

## What Stays Proprietary

KryptosAI/mcp-observatory-cloud owns hosted authentication, organization
isolation, storage and retention, hosted scans, approvals, scheduled rescans,
fleet coordination, blast-radius analysis, enterprise IAM, managed runners,
private indexes, compliance workflows, and hosted decision APIs.

Private telemetry and company intelligence remain in the separate
KryptosAI/mcp-observatory-telemetry system. They are not part of the public
package or public command surface.

The public health score in this repository is open source and locally
reproducible. Hosted decisions and private intelligence are separate products.

## History note

The public Git history contains previously published hosted code. It is legacy
history and is retained for historical integrity. New proprietary hosted
implementation starts in the private cloud repository.
