import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  renderHtml,
  renderMarkdown,
  renderTerminal,
  type TargetConfig,
} from "../index.js";
import { renderJUnit } from "../reporters/junit.js";
import { renderPrComment } from "../reporters/pr-comment.js";
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

let _noColor = false;

export function setNoColor(value: boolean): void {
  _noColor = value;
}

export function useColor(): boolean {
  return !process.env["NO_COLOR"] && !_noColor;
}

let _quiet = false;

export function setQuiet(value: boolean): void {
  _quiet = value;
}

export function isQuiet(): boolean {
  return _quiet;
}

export function c(code: string, text: string): string {
  return useColor() ? `${code}${text}${ANSI.reset}` : text;
}

/**
 * Suggests a one-line remediation for a raw error message, so scan/test
 * failures tell the user how to fix the problem, not just state it.
 *
 * Note: connection failures during MCP session startup already get a much
 * richer diagnosis (diagnosis/likely causes/next steps) from
 * `formatConnectionFailureDiagnosis` via `RunArtifact.fatalError` — this
 * covers the lighter-weight cases outside that path (thrown exceptions,
 * config parsing errors) where no such diagnosis exists.
 */
export function suggestFix(message: string): string | undefined {
  const lower = message.toLowerCase();
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return "Try increasing timeout with --timeout 30000";
  }
  if (lower.includes("econnrefused") || lower.includes("connection refused")) {
    return "Check that the server is running. Try: npx -y <server-package>";
  }
  if (lower.includes("enoent") || lower.includes("spawn")) {
    return "Check that the command is installed and on PATH. Try: npx -y <server-package>";
  }
  if (lower.includes("unexpected token") || lower.includes("invalid config") || lower.includes("is not valid json")) {
    return "Check target JSON format. Run: cat <config-file>";
  }
  return undefined;
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
  format: string,
  options: { artifactUri?: string } = {},
): string {
  const knownFormats = new Set(["html", "json", "junit", "markdown", "pr-comment", "sarif", "terminal"]);

  if (format === "json") return JSON.stringify(artifact, null, 2);
  if (format === "markdown") return renderMarkdown(artifact);
  if (format === "pr-comment") return renderPrComment(artifact);
  if (format === "html") return renderHtml(artifact);
  if (format === "junit" && artifact.artifactType === "run") return renderJUnit(artifact);
  if (format === "sarif" && artifact.artifactType === "run") return renderSarif(artifact, options);
  if (!knownFormats.has(format)) {
    process.stderr.write(`Warning: unknown format '${format}'. Supported: terminal, markdown, html, sarif, junit. Falling back to terminal.\n`);
  }
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

export function quoteShell(value: string): string {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) return value;
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

export function setupCiHint(target?: TargetConfig, targetPath?: string, bin = "npx @kryptosai/mcp-observatory"): string {
  if (targetPath) {
    return `${bin} setup-ci --all --target ${quoteShell(targetPath)}`;
  }
  if (target?.adapter === "local-process") {
    const command = [target.command, ...target.args].map(quoteShell).join(" ");
    return `${bin} setup-ci --all --command ${quoteShell(command)}`;
  }
  return `${bin} setup-ci --all --target mcp-observatory.target.json`;
}

export function shouldPrintConversionCta(): boolean {
  return process.stdout.isTTY && process.env["CI"] !== "true";
}

export function printCiConversionCta(options: {
  bin?: string;
  context?: string;
  target?: TargetConfig;
  targetPath?: string;
}): void {
  if (isQuiet() || !shouldPrintConversionCta()) return;
  const bin = options.bin ?? "npx @kryptosai/mcp-observatory";
  process.stdout.write(`  ${c(ANSI.bold, "Next:")} ${options.context ?? "keep this passing in CI"}\n`);
  process.stdout.write(`  ${c(ANSI.dim, "$")} ${c(ANSI.cyan, setupCiHint(options.target, options.targetPath, bin))}\n`);
  process.stdout.write(`  ${c(ANSI.dim, `Check adoption: ${bin} setup-ci --doctor`)}\n`);
  process.stdout.write(`  ${c(ANSI.dim, "Public trust: add the badge, and star https://github.com/KryptosAI/mcp-observatory if it saved time.")}\n\n`);
}
