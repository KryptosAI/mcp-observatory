import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerReceiptCommands } from "../../src/commands/receipt.js";
import { signReceipt } from "../../src/receipt.js";
import type { McpReceipt } from "../../src/receipt.js";

function makeProgram(): Command {
  const program = new Command();
  program.enablePositionalOptions(); // matches src/cli.ts's root Command config; receipt's passThroughOptions() requires it
  program.exitOverride(); // throw instead of calling process.exit on parse errors
  registerReceiptCommands(program);
  return program;
}

async function run(program: Command, args: string[]): Promise<void> {
  await program.parseAsync(["node", "cli", ...args], { from: "node" });
}

describe("receipt keygen", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "mcp-observatory-keygen-"));
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it("writes a PEM public and private key pair", async () => {
    const pub = path.join(dir, "test.pub");
    const priv = path.join(dir, "test.key");
    const program = makeProgram();

    await run(program, ["receipt", "keygen", "--public", pub, "--private", priv]);

    const publicKey = await readFile(pub, "utf8");
    const privateKey = await readFile(priv, "utf8");
    expect(publicKey).toContain("BEGIN PUBLIC KEY");
    expect(privateKey).toContain("BEGIN PRIVATE KEY");
  });

  it("restricts the private key file to owner-only permissions", async () => {
    if (process.platform === "win32") return; // POSIX mode bits aren't meaningful on Windows.
    const pub = path.join(dir, "test.pub");
    const priv = path.join(dir, "test.key");
    const program = makeProgram();

    await run(program, ["receipt", "keygen", "--public", pub, "--private", priv]);

    const mode = (await stat(priv)).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("defaults to mcp-observatory.pub / mcp-observatory.key in the current directory", async () => {
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      const program = makeProgram();
      await run(program, ["receipt", "keygen"]);
      const publicKey = await readFile(path.join(dir, "mcp-observatory.pub"), "utf8");
      expect(publicKey).toContain("BEGIN PUBLIC KEY");
    } finally {
      process.chdir(cwd);
    }
  });

  it("refuses to overwrite an existing key file without --force", async () => {
    const pub = path.join(dir, "test.pub");
    const priv = path.join(dir, "test.key");
    const first = makeProgram();
    await run(first, ["receipt", "keygen", "--public", pub, "--private", priv]);
    const originalPublicKey = await readFile(pub, "utf8");

    const second = makeProgram();
    await expect(run(second, ["receipt", "keygen", "--public", pub, "--private", priv])).rejects.toThrow("process.exit(1)");

    expect(await readFile(pub, "utf8")).toBe(originalPublicKey); // untouched by the rejected run
  });

  it("overwrites existing key files when --force is passed", async () => {
    const pub = path.join(dir, "test.pub");
    const priv = path.join(dir, "test.key");
    const first = makeProgram();
    await run(first, ["receipt", "keygen", "--public", pub, "--private", priv]);
    const originalPublicKey = await readFile(pub, "utf8");

    const second = makeProgram();
    await run(second, ["receipt", "keygen", "--public", pub, "--private", priv, "--force"]);

    expect(await readFile(pub, "utf8")).not.toBe(originalPublicKey); // genuinely regenerated
  });

  it("refuses when --public and --private point to the same file, even with --force", async () => {
    const samePath = path.join(dir, "test.key");
    const program = makeProgram();
    await expect(run(program, ["receipt", "keygen", "--public", samePath, "--private", samePath, "--force"])).rejects.toThrow("process.exit(1)");
  });
});

describe("receipt verify", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "mcp-observatory-verify-"));
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  async function makeSignedReceiptFile(signerId = "test@example.com"): Promise<{ file: string; publicKeyPath: string }> {
    const program = makeProgram();
    const pub = path.join(dir, "signer.pub");
    const priv = path.join(dir, "signer.key");
    await run(program, ["receipt", "keygen", "--public", pub, "--private", priv]);

    const privateKey = await readFile(priv, "utf8");
    const receipt = { receipt_type: "mcp-observatory-receipt" as const } as unknown as McpReceipt;
    const signed = signReceipt(receipt, privateKey, signerId);
    const file = path.join(dir, "receipt.json");
    await writeFile(file, JSON.stringify(signed), "utf8");
    return { file, publicKeyPath: pub };
  }

  it("verifies a correctly signed JSON receipt", async () => {
    const { file, publicKeyPath } = await makeSignedReceiptFile("maintainer@example.com");
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const program = makeProgram();
    await run(program, ["receipt", "verify", file, "--key", publicKeyPath]);
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining("✓ Receipt verified — signed by maintainer@example.com"));
    expect(writeSpy).toHaveBeenCalledWith(expect.stringMatching(/public key fingerprint: [0-9a-f]{32}/));
  });

  it("fails verification against the wrong public key", async () => {
    const { file } = await makeSignedReceiptFile();
    const otherProgram = makeProgram();
    const otherPub = path.join(dir, "other.pub");
    const otherPriv = path.join(dir, "other.key");
    await run(otherProgram, ["receipt", "keygen", "--public", otherPub, "--private", otherPriv]);

    const program = makeProgram();
    await expect(run(program, ["receipt", "verify", file, "--key", otherPub])).rejects.toThrow("process.exit(1)");
  });

  it("fails cleanly on a non-JSON (markdown) receipt instead of throwing an unhandled parse error", async () => {
    const file = path.join(dir, "receipt.md");
    await writeFile(file, "# MCP Observatory Receipt\n\nNot JSON.\n", "utf8");
    const { publicKeyPath } = await makeSignedReceiptFile();

    const program = makeProgram();
    await expect(run(program, ["receipt", "verify", file, "--key", publicKeyPath])).rejects.toThrow("process.exit(1)");
  });
});
