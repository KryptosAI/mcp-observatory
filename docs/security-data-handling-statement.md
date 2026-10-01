# MCP Observatory Security and Data-Handling Statement

This statement describes the default data boundary for an MCP Release Gate Pilot. It is not a substitute for a signed customer agreement or a security questionnaire.

## Default boundary

- The public website stores commercial contact data only when a person explicitly submits a buyer or partner form.
- Marketing attribution is limited to submitted UTM/referrer/landing-page context. Website forms do not send private repository data, hostnames, credentials, source code, or telemetry into the CRM.
- The open-source CLI’s telemetry boundary remains separate from commercial intake. Raw telemetry and inferred identity are not used as CRM contacts or public commercial proof.
- Pilot evidence is private to the customer unless the customer gives written publication permission.

## Safe-mode delivery

The default pilot does not request production credentials, execute destructive commands, write to production systems, exfiltrate customer data, or contact attacker infrastructure. It uses the agreed server interfaces and existing artifacts necessary to produce the scoped evidence.

## Access and retention

Access is limited to the people needed to scope and deliver the pilot. The parties must define customer-specific access, storage, retention, deletion, and incident-notification requirements in the executed agreement before sensitive materials are exchanged.

## Contact

Do not include secrets, private URLs, credentials, or source code in the website form. Submit a scoped request through the [Release Gate page](https://mcp-observatory.com/release-gate-pilot/) and MCP Observatory will reply within one business day.
