import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { scanForTargets } from "../src/discovery.js";

const dirs: string[] = [];
async function config(content: string) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "observatory-toml-")); dirs.push(dir);
  const file = path.join(dir, "config.toml"); await writeFile(file, content); return file;
}
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });

describe("Codex TOML parsing", () => {
  it("handles quoted dotted names, inline tables, comment-bearing arrays and disabled entries", async () => {
    const file = await config(`
[mcp_servers."server.with.dots"] # table comment
command = 'node'
args = [
  "server.js", # first argument
  "--label=a#b", # hash inside a string
]
env = { MODE = "test" }
[mcp_servers.disabled] # keep disabled
command = "never-execute"
enabled = false
`);
    const targets = await scanForTargets(file);
    expect(targets.length).toBe(1);
    expect(targets[0]?.config).toMatchObject({ targetId: "server.with.dots", command: "node", args: ["server.js", "--label=a#b"], env: { MODE: "test" } });
  });
  it("rejects malformed TOML as a whole, without recovering partial runnable entries", async () => {
    for (const suffix of ['args = ["one" "two"]', 'enabled = falze', 'command = "duplicate"']) {
      const file = await config(`[mcp_servers.x]\ncommand = "node"\n${suffix}\n`);
      expect((await scanForTargets(file)).length).toBe(0);
    }
  });
  it("resolves explicitly named bearer-token environment variables", async () => {
    vi.stubEnv("OBSERVATORY_FIXTURE_BEARER", "fixture-only-value");
    const file = await config('[mcp_servers.http]\nurl="https://example.test/mcp"\nbearer_token_env_var="OBSERVATORY_FIXTURE_BEARER"\n');
    const targets = await scanForTargets(file);
    expect(targets[0]?.config).toMatchObject({ authToken: "fixture-only-value" });
  });
});
