# Package-name review

`package-check` compares explicit package requests in a launch command with a
small, source-backed reference catalogue. It does not run the command, install
packages, contact a registry, initialize telemetry or perform update checks.

```bash
mcp-observatory package-check --format json -- npx -y @modelcontextprotocol/server-filesytem@latest
mcp-observatory package-check -- uvx --from 'mcp-server-fetc[extra]>=1,<2' renamed-command
mcp-observatory package-check -- npm exec --package=@playwright/mcp -- playwright-mcp
```

Put reviewer options before the first `--`, then supply the executable and its
arguments as separate shell arguments. Normal shell quoting preserves a requirement
or path containing spaces. Observatory does not evaluate a nested shell command.
Separators inside the launch arguments remain part of that launch command.

## Results and exit codes

JSON uses `schemaVersion: "package-name-review-v1"` and includes `status`,
`packages`, `findings`, `diagnostics`, `referenceCount` and `scope`.

| Status | Meaning | Exit |
| --- | --- | --- |
| `parsed` | Explicit registry package names were extracted within the supported grammar. | 0 |
| `not-applicable` | A direct executable, local script or unsupported launch family does not identify a package for this check. | 0 |
| `unsupported` | A supported wrapper could not be fully interpreted, uses another source, or exceeds a bound. Shell/environment wrappers also require review. | 2 |

Invalid reviewer options or a missing launch command exit 1. Similarity findings
remain advisory and do not change an otherwise successful exit code. A finding
includes the requested name, ecosystem, reference name, edit distance, pinned
manifest URL and verification date. It has `confidence: "name-similarity"` and
`disposition: "review"`; it does not establish a malicious publisher or recommend
an automatic installation or replacement.

No finding means only that no near-match was found in the finite catalogue. Exact
reference matches are also not a safety approval. A valid package can be absent
from the catalogue, share a similar name, be compromised, or resolve differently
because of local installations, configuration, registry overrides or dependencies.
Raw source URLs, credentials, command arguments and version strings are omitted
from results; identified package names are included and terminal-escaped.

`scan` and `scan deep` display this advisory review for discovered local-process
targets before their normal MCP checks. **Those commands still start the configured
servers.** Use `package-check` for inspection without execution. Name similarities
and unsupported name-review coverage do not add a scan failure gate.

## Launch grammar

Supported launch families are `npx`, `npm exec`/`npm x`, `pnpm dlx`, `pnpx`, `pnx`,
`yarn dlx`, `bunx`/`bun x`, and `uvx`/`uv tool run`. Executable paths, including
Windows `.cmd`, `.bat` and `.exe` names, are recognized by their basename; this is
not executable identity verification.

- npm names, scopes, versions, tags and ranges are parsed using `npm-package-arg`.
  npm aliases are compared using their actual registry package, not the alias.
  Explicit `--package` requests can select a different package from the binary.
- `npx` options precede its positional command. `npm exec` options can follow
  positional arguments until its `--`; its `-p` means parseable output, whereas
  `npx -p` selects a package.
- Python names use lowercase and collapse runs of `-`, `_` and `.` into `-`.
  `uvx name@version`, `--from` requirements and `--with` requests are recognized;
  requirements support extras and simple version comparison lists. The command
  after `--from` is not treated as another package. Python names are compared only
  with Python references, never with npm references.
- Known wrapper flags that take values are consumed before identifying a package.
  Unknown flags, options before a multiword wrapper subcommand, shell modes,
  custom registries/indexes, configuration or directory overrides, dependency
  files, direct URLs, git/local sources and unsupported requirement syntax are
  reported as unsupported. Package names identified before a limitation are
  retained alongside that status.
- Version-dependent pnpm runtime/package-manager provisioning (`node`, `deno`,
  `npm`, `yarn`, `bun`) is not classified as an ordinary npm package request.

This is a bounded extraction grammar, not a replacement for each package
manager's complete command-line validation or dependency resolver.

The parser accepts at most 256 arguments and 65,536 combined command/argument
characters; each specification is at most 4,096 characters and each package name
at most 214. At most 64 explicit requests and 256 supplied reference entries are
analyzed. Reaching a request/reference bound yields unsupported coverage. Similarity
means Levenshtein distance 1 or 2 after ecosystem-specific normalization.

## Reference provenance and API

The default catalogue contains nine names checked on 2026-09-06 against pinned
upstream manifests: six npm packages and three Python packages. See
[`src/utils/package-references.ts`](../src/utils/package-references.ts) for every
name, exact commit, manifest and date. A manifest proves that the upstream source
used that name at that commit; it does not establish current registry ownership
or safety. The old prototype's unsupported “official package” list is not used.

`reviewCommandPackages(command, args, references?)` is the programmatic entrypoint
when coverage matters. Callers can supply additional dated, source-backed
`PackageReference` entries. Updating the default catalogue requires verifying
the ecosystem and manifest name at an immutable commit and recording the source.
Tests do not refresh this catalogue or consult live registries.

The legacy `checkTyposquat`, `checkAllTargets` and `extractPackageName` helpers are
available for name-only callers. Their empty results do not communicate coverage;
use the full review API for decisions. The text-only `extractPackageName` overload
handles simple POSIX quoting and rejects shell syntax; structured argv is preferred.

Parsing semantics are grounded in the primary documentation for
[npm npx/npm exec](https://docs.npmjs.com/cli/v11/commands/npx/),
[npm-package-arg](https://github.com/npm/npm-package-arg),
[uv tools](https://docs.astral.sh/uv/guides/tools/),
[Python name normalization](https://packaging.python.org/en/latest/specifications/name-normalization/),
[pnpm pnx](https://pnpm.io/cli/pnx),
[Yarn dlx](https://yarnpkg.com/cli/dlx), and
[Bun bunx](https://bun.sh/docs/pm/bunx).
