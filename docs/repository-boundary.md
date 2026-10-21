# Repository scope

This MIT repository owns all MCP Observatory product functionality: scanning, audits, receipts, schemas, scoring, diffs, record/replay, CI, local history, reports, dashboards, exports, and ClearFrame task preparation. No local feature requires a private service or paid license.

The [hosting implementation](../hosting/README.md) includes the Worker, authentication, private artifact storage, account isolation, hosted HTTP checks, reports, free access policy, schema and retention cleanup. It is independently deployable with your own configuration. No production secrets or customer records are included.

Telemetry is explicitly opt-in. Keep real events, keys, administrative data and customer records out of source control. `npm run boundary:check` checks for accidentally restored operational data and secret configuration; hosting source is public product code.

The existing managed account service also handles ClearFrame. Its ClearFrame-only identity integrations, inference and billing implementation remain outside Observatory. Existing accounts and records are not automatically moved by self-hosting. The managed service grants Observatory access independently of ClearFrame billing; the local product and public hosting implementation remain independently usable.
