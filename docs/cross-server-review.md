# Cross-server capability review

The recovered toxic-flow prototype now reports advisory combinations with actual
target and tool identities. A file reader and a network tool may warrant joint
review, but their names alone do not demonstrate exfiltration. Every finding says
that data flow, shared agent access and namespacing are unverified.

```sh
mcp-observatory toxic-flow first-run.json second-run.json --format json
mcp-observatory scan --config ./mcp.json --no-attack-sim
```

The standalone command reads saved run artifacts without launching their target
commands. Multi-target `scan` includes this review after collecting observations.
The ordinary scan still starts the configured servers. Findings are advisory and
do not independently fail a gate. An incomplete inventory review exits 2; other
server checks retain their own gate behavior.

## Evidence

Each finding includes a stable identifier, rule/category, direction, actual tool
names, target IDs, source run IDs and a short classification basis. The possible
combinations include file/query/secret/environment reads followed by network use,
network use followed by writing or execution, and container capabilities paired
with writing or execution. Container combinations request boundary review; they
do not assert container escape or host compromise. Both directions and distinct
tool pairs are preserved even when they share a risk category.

Classification uses normalized tool names and a small set of top-level input field
names. Descriptions, defaults and invocation responses are not scanned for arbitrary
keywords. A credential input is not evidence that a tool can read credentials.
Exact name collisions are reported separately; case-only differences are not
treated as identical names. Whether the caller namespaces tools remains unknown.

No scanner can establish a runtime attack path from this metadata alone. The
report is a list of review leads and includes no proven-exploit severity claims.
Names and diagnostic target identifiers are escaped in terminal output. Raw
artifact errors, schemas, credential values and response contents are omitted.

## Coverage

`status: complete` describes analysis of the supplied snapshots, not proof that
the snapshots contain every paginated or dynamically changing server tool.
The report records observed target/run IDs, timestamps, tool counts, comparisons,
limits and diagnostics. It requires at least two unambiguous target inventories.
Missing expected targets, duplicate target identities, failed/partial enumeration,
inconsistent counts or limits make coverage incomplete. Existing findings survive
an incomplete report. An explicitly unadvertised tools capability contributes a
zero-tool inventory rather than a fabricated successful list call.

Defaults are 100 artifacts, 1,000 tools, 100,000 cross-target tool-pair comparisons
and 1,000 findings. The file CLI also limits each input to 10 MiB. Resource limits
are reported rather than silently dropping the remainder. Use the public
`analyzeToxicFlows` API for decisions involving coverage; the convenience
`detectToxicFlows` function returns only findings.

Discovery deduplicates identical effective startup contexts, retaining argument
boundaries, environment differences and HTTP authentication differences. The
private comparison digest is never emitted. This prevents distinct configured
contexts from disappearing before analysis.

Tests exercise every combination, direction and tool-identity retention,
non-capability schema counterexamples, exact collisions, incomplete inventories,
bounds, redaction, artifact serialization, saved-artifact JSON and actual
multi-server CLI scans, including a server that cannot start.
