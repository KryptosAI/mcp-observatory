# Privacy And Telemetry

MCP Observatory collects product usage telemetry unless telemetry is disabled. Telemetry helps us understand which commands are used, where the tool fails, and whether teams need CI, security, reporting, or fleet-monitoring support.

## Telemetry May Include

- Command names and feature flags
- MCP target or server names
- MCP target command strings, command arguments, or HTTP target URLs provided to the tool
- Counts of tools, prompts, resources, servers, checks, and failures
- CI environment signals such as provider and GitHub Actions metadata when available, including repository, workflow, run ID, run number, event name, ref, and actor
- Declared account attribution from `MCP_OBSERVATORY_ORG` and `MCP_OBSERVATORY_CONTACT` when operators set them
- Git identity and remote metadata when available
- Hostname and operating system metadata
- Machine fingerprint (anonymous hash of platform, arch, Node version, and home directory — no PII)
- Feature chain (list of commands this machine has used over time)
- Command sequence (last 5 commands run)
- User journey stage (install → first_scan → recurring → ci_setup → power_user → paid_intent)
- Referrer channel (how the tool was first discovered: npm, GitHub CI, etc.)
- Opt-in email when provided via `telemetry identify`
- Session identifiers and timestamps
- Error categories, check statuses, security finding counts, health scores, and scan outcomes

Telemetry does not intentionally collect secrets, tool response bodies, environment variable values, cassette contents, or full private source code.

## Identity Exchange (Opt-In)

You can optionally associate an email with your usage to receive benchmarks, insights, and early access:

```bash
npx @kryptosai/mcp-observatory telemetry identify
```

This is entirely optional. Without it, your usage remains associated only with an anonymous machine fingerprint.

## Opt Out

Disable telemetry with:

```bash
npx @kryptosai/mcp-observatory telemetry off
```

Inspect telemetry status with:

```bash
npx @kryptosai/mcp-observatory telemetry --verbose
```

Production teams can make account reporting clearer without relying on inferred git metadata:

```bash
MCP_OBSERVATORY_ORG=example.com
MCP_OBSERVATORY_CONTACT=mcp-owner
```

## Internal Account Intelligence

We may use telemetry internally to identify likely company or organization usage, including by deriving company domains from git metadata, repository metadata, CI usage, target names, repeated sessions, and production-looking command patterns.

Raw telemetry may include git identity metadata, repository metadata, hostnames, target commands, HTTP target URLs, CI metadata, target IDs, and command outcomes. These fields are retained for internal product analytics, account intelligence, support, and outreach prioritization.

Raw emails, hostnames, private URLs, target commands, and private telemetry exports are not intended for public reporting. Account intelligence outputs should use company domains, GitHub organizations, aggregate counts, confidence levels, and outreach status rather than raw personal identifiers.

Internal usage reports separate first-party MCP Observatory project activity from external usage. Events from `KryptosAI/mcp-observatory` GitHub Actions are treated as first-party CI so release and test workflows are not counted as external traction.

## Enterprise Controls

Enterprise customers can request telemetry review, reduced collection, private deployment, or enterprise-controlled telemetry modes as part of a paid pilot.

Contact: open an issue or pilot request from the GitHub issue chooser.
