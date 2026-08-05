# Privacy

The MIT/open-core CLI does not transmit usage telemetry. Scans, artifacts,
reports, receipts, baselines, and diffs remain local unless an operator
explicitly runs a hosted upload or another integration.

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

Telemetry and company intelligence are operated separately from the MIT
repository. The public package does not contain telemetry export, intelligence,
fleet-monitoring, or private metrics commands.
