# Field Notes

These notes are the opposite of launch fluff. They exist to record what the repo learned from actual runs.

## 2026-03-19: Launch hardening matrix

### Passing targets

| Target | Observed result | Why it mattered |
| --- | --- | --- |
| `@modelcontextprotocol/server-filesystem` | `tools=pass`, `prompts=unsupported`, `resources=unsupported` | proved that `unsupported` is a useful stable state, not an embarrassment |
| `@modelcontextprotocol/server-everything` | `tools=pass`, `prompts=pass`, `resources=pass` | gave the repo one wide capability reference target |
| `ref-tools-mcp` | `tools=pass`, `prompts=pass`, `resources=unsupported` | proved the matrix was not only made of official example servers |
| `@upstash/context7-mcp` | `tools=pass`, `prompts=unsupported`, `resources=unsupported` | added a zero-config third-party server that is clearly useful and reproducible |
| `promptopia-mcp` | `tools=pass`, `prompts=pass`, `resources=unsupported` | added a second third-party prompts-capable server with seeded prompt data instead of an empty prompt list |
| `@opentofu/opentofu-mcp-server` | `tools=pass`, `prompts=unsupported`, `resources=pass` | added a second third-party resources-capable server beyond the everything reference target |
| `puppeteer-mcp-server` | `tools=pass`, `prompts=unsupported`, `resources=pass` | proved the tool can show a useful caveat without overcalling it as failure |

### Failed probes

| Package | Observed behavior | What it taught us |
| --- | --- | --- |
| `@modelcontextprotocol/server-map` | timed out during local-process startup | not every MCP package is a drop-in stdio target |
| `@modelcontextprotocol/server-pdf` | timed out during local-process startup | startup diagnosis needs to be actionable, not just raw timeout text |
| `@modelcontextprotocol/server-threejs` | connection closed before initialization completed | app-oriented packages need clearer transport assumptions |
| `@jsonresume/mcp` | connection closed before initialization completed | startup failures should be presented as ecosystem signal, not only raw failure |
| `@demotime/mcp` | passed only `tools` and did not add resources coverage | a target is only worth keeping if it adds a distinct capability shape, not just another green check |

### What changed because of these runs

- the repo now treats `unsupported` and `failed` as meaningfully different states
- the real-server matrix is part of the public story, not a hidden validation step
- the README now leads with observed behavior instead of generic positioning
- clearer CLI startup failure messaging is now a real priority, not a hypothetical enhancement
- one zero-config third-party target is not enough; the coverage bar should be small but credible
- a second prompts-capable and a second resources-capable third-party target make the matrix feel materially more trustworthy
- rerunning a promising target with a simpler invocation can turn a “broken” probe into useful passing evidence
- a passing check can still carry a meaningful caveat, especially around optional resource endpoints

### What still feels uncertain

- how many ecosystem packages should be expected to work as plain local-process stdio targets
- whether the next useful adapter improvement is transport-related or message-quality-related
- how broad the real-server matrix should become before it turns into maintenance theater
