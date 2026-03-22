import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  renderHtml,
  renderMarkdown,
  renderTerminal,
  type TargetConfig,
} from "../index.js";
import { renderJUnit } from "../reporters/junit.js";
import { renderSarif } from "../reporters/sarif.js";
import { validateTargetConfig } from "../validate.js";

// ── ANSI Codes ──────────────────────────────────────────────────────────────

export const ANSI = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
} as const;

// ── ASCII Logo ──────────────────────────────────────────────────────────────

export const LOGO = `
  ███╗   ███╗ ██████╗██████╗
  ████╗ ████║██╔════╝██╔══██╗
  ██╔████╔██║██║     ██████╔╝
  ██║╚██╔╝██║██║     ██╔═══╝
  ██║ ╚═╝ ██║╚██████╗██║
  ╚═╝     ╚═╝ ╚═════╝╚═╝
     O B S E R V A T O R Y
`;

// ── Color helpers ───────────────────────────────────────────────────────────

export function useColor(): boolean {
  return !process.env["NO_COLOR"] && !process.argv.includes("--no-color");
}

export function c(code: string, text: string): string {
  return useColor() ? `${code}${text}${ANSI.reset}` : text;
}

export function colorStatus(status: string): string {
  switch (status) {
    case "pass":
      return c(ANSI.green, status);
    case "fail":
      return c(ANSI.red, status);
    case "partial":
    case "flaky":
      return c(ANSI.yellow, status);
    case "unsupported":
    case "skipped":
      return c(ANSI.dim, status);
    default:
      return status;
  }
}

// ── Target helpers ──────────────────────────────────────────────────────────

export async function readTargetConfig(filePath: string): Promise<TargetConfig> {
  const content = await readFile(filePath, "utf8");
  return validateTargetConfig(JSON.parse(content));
}

export function targetFromCommand(args: string[]): TargetConfig {
  if (args.length === 0) {
    throw new Error("No command provided. Usage: mcp-observatory test <command> [args...]");
  }
  const command = args[0]!;
  const restArgs = args.slice(1);

  // Build a meaningful targetId: for wrapper commands, use the package/script name
  let targetId = command;
  const wrappers = new Set(["npx", "node", "docker", "uvx", "bunx", "pnpx"]);
  if (wrappers.has(command)) {
    const pkg = restArgs.find(a => !a.startsWith("-") && a !== "run");
    if (pkg) targetId = pkg;
  }

  return {
    targetId,
    adapter: "local-process",
    command,
    args: restArgs,
    timeoutMs: 15_000,
  };
}

// Extract args after -- before Commander sees them
const _rawArgv = [...process.argv];
const _dashDashIdx = _rawArgv.indexOf("--");
const _passthroughArgs: string[] = _dashDashIdx !== -1 ? _rawArgv.splice(_dashDashIdx).slice(1) : [];
if (_dashDashIdx !== -1) {
  process.argv = _rawArgv;
}

export function getPassthroughArgs(): string[] {
  return _passthroughArgs;
}

export async function resolveTarget(options: { target?: string }): Promise<TargetConfig> {
  if (options.target) {
    return readTargetConfig(options.target);
  }
  const passthrough = getPassthroughArgs();
  if (passthrough.length > 0) {
    return targetFromCommand(passthrough);
  }
  throw new Error("Provide --target <config.json> or use: mcp-observatory test <command>");
}

// ── Output formatting ───────────────────────────────────────────────────────

export function formatOutput(
  artifact: Parameters<typeof renderTerminal>[0],
  format: "html" | "json" | "junit" | "markdown" | "sarif" | "terminal",
): string {
  if (format === "json") return JSON.stringify(artifact, null, 2);
  if (format === "markdown") return renderMarkdown(artifact);
  if (format === "html") return renderHtml(artifact);
  if (format === "junit" && artifact.artifactType === "run") return renderJUnit(artifact);
  if (format === "sarif" && artifact.artifactType === "run") return renderSarif(artifact);
  return renderTerminal(artifact);
}

export async function writeOutput(content: string, format: string, outputPath?: string): Promise<void> {
  if (outputPath !== undefined) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content + "\n", "utf8");
    process.stdout.write(`Wrote ${format} report to ${outputPath}\n`);
  } else {
    process.stdout.write(`${content}\n`);
  }
}

// ── Invocation detection ────────────────────────────────────────────────────

/** Returns the command the user actually typed, so tips are copy-pasteable. */
export function getBinName(): string {
  const script = process.argv[1] ?? "";
  if (script.includes(".npm/_npx") || script.includes("npx")) {
    return "npx @kryptosai/mcp-observatory";
  }
  return "mcp-observatory";
}
