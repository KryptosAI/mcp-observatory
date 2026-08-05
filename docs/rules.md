# Evidence-Backed Rule Reference

Rules produce evidence from a local MCP run. A finding is a reproducible signal for the tested target and configuration, not a guarantee that a server is safe in every workflow.

| Rule | Evidence source | Default severity | Tool decision | Limitation |
| --- | --- | --- | --- | --- |
| `shell-injection` | Tool name, description, and input property names | high | block | Indicates command-execution capability; it does not prove exploitability. |
| `broad-filesystem` | Path-like input properties, annotations, and description | medium | review | Scope is inferred from metadata; runtime path enforcement is not verified by this rule. |
| `permissive-schema` | Missing or permissive input schema on destructive tools | low | review | A schema can be strict while implementation behavior is unsafe. |
| `unicode-obfuscation-description` | Hidden Unicode characters in tool descriptions | high | block | Hidden characters can be intentional; inspect the raw description before acting. |
| `credential-pattern` | JSON-serialized tool invocation response snapshots | high | block | Pattern matching can miss transformed secrets and may require a deeper invocation run. |
| `no-auth-http` | HTTP target URL and configured auth headers/token | medium | review | This only checks Observatory configuration, not authentication performed inside a proxy. |

## Evidence contract

Each finding carries:

- a stable `id` suitable for replay and SARIF fingerprints;
- a `ruleId`, severity, category, and subject (`tool`, `target`, or `check`);
- the originating check ID;
- the raw structured evidence when the check provides it;
- a recommendation and control references when available.

Tool-level decisions are derived from these findings. They are intentionally conservative and deterministic: a high-severity finding blocks that tool, a low- or medium-severity finding requires review, and a tool without findings is allowed. Target-level startup or transport failures remain run-level decisions.

## Reproducing a rule

Use the seeded fixtures under [`benchmarks/fixtures`](../benchmarks/fixtures/) for deterministic checks. For a live server, run a safe scan with `--security`, save the JSON artifact, and inspect the `checks[].evidence[].findings[]` records before relying on the terminal summary.
