# Public Guidance Crosswalk For MCP Security Audits

MCP Observatory maps MCP server evidence to public security guidance so security teams can review agent tool dependencies with familiar language.

This crosswalk is not a certification, endorsement, authorization to operate, or claim of compliance with any government program. It is a practical mapping from MCP Observatory checks to public guidance themes.

## Sources

Primary public sources used for this crosswalk:

- NSA, **Model Context Protocol (MCP): Security Design Considerations for Organizations Adopting MCP** (May 2026)
- NSA and partners, **Deploying AI Systems Securely: Best Practices for Deploying Secure and Resilient AI Systems** (April 2024)
- NSA, NCSC-UK, CISA, and partners, **Guidelines for Secure AI System Development** (November 2023)
- CISA and partners, **Careful Adoption of Agentic AI Services** (May 2026)
- NIST, **AI Risk Management Framework 1.0** and **Generative AI Profile NIST AI 600-1**
- OMB, **M-25-21 Accelerating Federal Use of AI through Innovation, Governance, and Public Trust**
- OMB, **M-25-22 Driving Efficient Acquisition of Artificial Intelligence in Government**

## Crosswalk

| MCP Observatory control | What Observatory checks | Public guidance theme | Audit evidence |
|---|---|---|---|
| `trust_boundaries` | Whether a server exposes risky tools, prompt/resource surfaces, or agent-steering metadata without clear boundaries. | Agentic AI systems need explicit governance, accountability, and threat-model-aware deployment. | Tool inventory, attack simulation findings, profile trust status. |
| `tool_permissions` | Command, filesystem, browser, network, database, secrets, and broad destructive tool surfaces. | MCP servers create new execution and permission boundaries that should be constrained and reviewed. | Security findings, permission-boundary findings, schema evidence. |
| `tool_description_integrity` | Hidden instructions, unsafe autonomous behavior, exfiltration language, and tool poisoning patterns in metadata. | AI system components should be secure by design and resistant to manipulation across the lifecycle. | Attack simulator findings with evidence excerpts. |
| `authentication` | Missing authentication on HTTP targets and target-level auth configuration gaps. | AI services and integrations should enforce identity and access controls appropriate to deployment context. | Target config evidence, normalized finding `mcp-observatory/security/no-auth-http`. |
| `secrets_exposure` | Secret-like environment variables and credential-like tool output. | Sensitive data used by AI systems needs protection throughout collection, processing, storage, and operation. | Redacted env-var evidence, canary/credential findings, SARIF results. |
| `schema_validation` | Weak, missing, broad, or permissive schemas and contract drift. | AI system inputs and interfaces should be validated, monitored, and constrained. | Schema quality findings, lock/diff evidence, contract-drift findings. |
| `input_validation` | Arbitrary command/code/file/path parameters and unconstrained additional properties. | Secure development guidance emphasizes input validation and least privilege. | Security findings and SARIF rule metadata. |
| `auditability` | Whether audit logging, structured event output, and review artifacts are present. | Government and enterprise adoption needs traceability, monitoring, and evidence for risk management. | Markdown report, JSON report, SARIF, CI artifacts, score JSON. |
| `runtime_safety` | Startup reliability, conformance, safe tool invocation behavior, and high-risk runtime boundaries. | Secure deployment guidance emphasizes resilient operation, monitoring, incident response, and recovery. | Run artifacts, check statuses, fatal errors, performance evidence. |
| `supply_chain` | Added destructive tools, broadened schemas, removed required fields, and future dependency indicators. | AI systems inherit software supply-chain risk and need continuous review of updates. | Drift findings, lock files, repeatable CI gates. |

## Why This Matters For MCP

MCP servers are not just libraries. They are agent-facing tool endpoints. A server can expose command execution, filesystem access, browser automation, database operations, cloud APIs, or internal business workflows through tool descriptions and schemas. That makes MCP server review a practical release-gate problem.

MCP Observatory turns that review into:

- one command a maintainer can run locally
- normalized findings a security reviewer can triage
- SARIF results GitHub Code Scanning can display
- trust status JSON a CI gate or badge generator can consume
- repeatable evidence for remediation tracking

## Review Boundary

MCP Observatory does not prove semantic safety and does not replace human authorization decisions. A passing audit means the tested target produced reproducible evidence for the mapped checks under the tested command and profile.
