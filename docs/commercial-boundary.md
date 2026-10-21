# Open-source policy

All MCP Observatory product features are MIT licensed. There is no open-core or proprietary Observatory feature tier. New scan, report, history, integration, hosting and remediation features belong in the public repository and must work without private credentials, except credentials needed to operate your own optional deployment.

ClearFrame is a separate optional agent product. Observatory links to its CLI and Mac app and prepares local tasks, but never requires it to inspect evidence, changes a scan verdict to drive conversion, or automatically starts inference.

Customer records, credentials, and production telemetry are private data, not source code to publish. The [public hosting source](../hosting/README.md) excludes ClearFrame-only inference, account integrations, billing and production configuration. The existing shared managed account service remains available for compatibility; self-hosting does not merge identities or migrate its records.
