# Local source review

`mcp-observatory source-audit <path>` reviews local JavaScript and TypeScript with
five recovered prototype rules. It does not execute the selected project, resolve
its dependencies, or load its tsconfig, compiler plugins, package scripts, or MCP
configuration. Use it before deciding whether to launch an unfamiliar server.

```sh
mcp-observatory source-audit ./server --format json
mcp-observatory source-audit ./server --fail-on-findings
mcp-observatory scan --config ./mcp.json --source-audit ./server
```

The standalone command emits one JSON document with `--format json`. The optional
`scan` flag adds a terminal source review before configured servers are checked;
it runs even if the explicit MCP configuration contains no targets. The ordinary
`scan` command still starts configured MCP servers; use the standalone command
when only source inspection is wanted.

## Findings and decisions

| Rule | Evidence | Review needed |
| --- | --- | --- |
| SA-FS-TRAVERSAL | Possible parameter/environment flow to an imported filesystem operation | Canonical containment, symlinks, authorization |
| SA-SHELL-INJECTION | Possible input flow to a shell, dynamic executable, or eval | Fixed executable, argument boundaries and allowed operations |
| SA-SSRF-SINK | Possible input flow to a supported network call | Destination control, DNS, redirects and egress policy |
| SA-HARDCODED-SECRET | A literal matches a credential pattern | Private inspection of validity and exposure |
| SA-TOOL-POISONING | A tool description contains override/hidden-text patterns | Description intent and caller policy |

Findings have `disposition: review`. They are syntactic signals, not proven
vulnerabilities. Tool names and descriptions do not establish actual agent data
flow. Path normalization, a generic `if`, or constructing a URL do not prove a
guard is adequate. The scanner therefore leaves guard and sanitizer evaluation
to review. Parameter values are conservatively considered possible inputs.
Network option objects may carry data without controlling the destination;
the finding explicitly does not establish host control.

Imports, CommonJS bindings, simple aliases, lexical shadowing, templates,
destructured parameters and preceding assignments are inspected within each file.
There is no inter-file call graph, runtime resolution, full control-flow model,
computed dynamic member analysis, or proof of authorization. Python and other
languages are outside this implementation's scope.

No source excerpt, credential value, or suspicious description is emitted.
Findings include a relative filename and line; terminal filenames are JSON-escaped
to prevent control-character injection. Error diagnostics omit underlying source
contents. The API check adapter preserves findings and coverage in run artifacts.

## Coverage and exit codes

`status: complete` means the supported files within the documented exclusions
were processed without a reported read, parse, or resource-limit failure. It is
not a safety certification or a statement that all vulnerabilities were detected.
The JSON report records each analyzed file's SHA256 and byte length, excluded-entry
count, diagnostics, limits and scope. Failed syntax analysis remains visible in
coverage; a zero-file, missing or unreadable input is incomplete.

| Exit | Meaning |
| --- | --- |
| 0 | Complete scan; findings are advisory by default |
| 1 | Complete scan with findings and explicit `--fail-on-findings` |
| 2 | Incomplete source coverage, with or without findings |

Nested symlinks, `.git`, `node_modules`, `dist`, `build`, `coverage`, `.venv`,
`vendor`, declaration files and minified `.min.js` files are excluded. A directly
selected symlink root is resolved explicitly. The API defaults to 2,000 files,
1 MiB per file, 20 MiB total source, 20,000 traversal entries, 1,000 findings and
a cooperative 30-second elapsed limit. Limit exhaustion is incomplete, never a
clean pass. These bounds limit work; they are not a hard wall-clock sandbox.

Regression tests include all five categories, alias/shadowing counterexamples,
redaction, invalid syntax/UTF-8, symlink and dependency exclusions, resource limits,
artifact serialization, actual CLI JSON/exit codes and empty-config integration.
