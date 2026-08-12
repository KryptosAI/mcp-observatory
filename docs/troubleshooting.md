# Troubleshooting

Common failures when pointing `mcp-observatory` at an MCP server, and what to do
about them.

Every example below uses `scan`, but the same applies to `score`, `test` and
`check` — they all launch the target the same way.

---

## Server fails to start

### `command not found`

The target command isn't on `PATH`. Either install the server, or let `npx`
fetch it:

```bash
mcp-observatory scan npx -y @modelcontextprotocol/server-filesystem /tmp
```

If you're pointing at a local build, give the interpreter and an **absolute**
path rather than relying on the shell:

```bash
mcp-observatory scan node /abs/path/to/server/dist/index.js
```

### `EACCES permission denied`

The entry point isn't executable, or a path in the server's arguments isn't
readable by your user.

- `chmod +x` the entry script if it's invoked directly.
- Check the directories you pass as server arguments are readable.
- Don't reach for `sudo`. Running an untrusted MCP server as root hands it root,
  which is exactly the risk this tool exists to measure.

### `port already in use` / `EADDRINUSE`

Only affects servers that bind a port (HTTP targets, or `mcp-observatory serve`).
Something is already listening — usually a previous run that didn't exit.

```bash
# find it, then stop it
lsof -i :3000        # macOS / Linux
netstat -ano | findstr :3000   # Windows
```

### The process starts, then exits immediately

Most often a missing required environment variable — many servers exit on
startup when a key is absent. See *Tool listing returns empty* below.

---

## Scan times out

The default per-target timeout is **10 seconds** (`runner.ts`), and a slow
`npx` cold start alone can eat that.

There is **no `--timeout` CLI flag** on `scan` / `score` / `test`. The timeout is
a per-target field in a target config file, which you pass with `--target`:

```json
{
  "targetId": "my-server",
  "adapter": "local-process",
  "command": "npx",
  "args": ["-y", "my-mcp-server"],
  "timeoutMs": 30000
}
```

```bash
mcp-observatory scan --target ./my-server.json
```

`timeoutMs` works for both `local-process` and `http` adapters.

Other things to check:

- **Warm the package cache first.** `npx -y my-mcp-server` on a cold cache
  downloads before it starts; run it once by hand so the download isn't inside
  the timed window.
- **HTTP targets:** confirm the URL is reachable from this machine, and that any
  `authToken` / `headers` in the config are correct — some servers hang rather
  than reject when auth is missing.

---

## Tool listing returns empty

A server that starts but advertises nothing is nearly always missing
configuration.

- **Required environment variables.** API keys, config paths, workspace roots.
  Put them in the target config so the run is reproducible:

  ```json
  {
    "targetId": "my-server",
    "adapter": "local-process",
    "command": "npx",
    "args": ["-y", "my-mcp-server"],
    "env": { "MY_API_KEY": "${MY_API_KEY}" }
  }
  ```

  `${VAR}` is expanded from your environment, so no secret is written to the
  file.

- **Try the server standalone first.** If it doesn't list tools outside
  `mcp-observatory`, the problem is the server or its config, not the scan:

  ```bash
  npx -y my-mcp-server
  ```

- **Read the raw evidence.** There is no `--verbose` flag; use the JSON output,
  which carries per-check evidence and any fatal error the run captured:

  ```bash
  mcp-observatory scan --format json npx -y my-mcp-server
  ```

- **Some servers only expose tools after a workspace argument** (a directory, a
  repository, a database URL). Check the server's own README for required
  positional arguments.

---

## Rate limiting errors

Usually the *upstream API* a server wraps, not `mcp-observatory` itself.

- Scans invoke tools when `--invoke-tools` (or `score`, which enables it) is
  used. If the tools call a metered API, each run costs quota.
- Use `skipInvoke: true` in the target config to check capability listings
  without calling any tool.
- If you're scanning many servers, space the runs out rather than looping
  immediately — `watch --interval <seconds>` exists for scheduled re-scans.

---

## Still stuck?

Include the following when opening an issue:

- the exact command you ran,
- `mcp-observatory --version` and `node --version`,
- the JSON output (`--format json`), with any secrets redacted.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to file a good report.
