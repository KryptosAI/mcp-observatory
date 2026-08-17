import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";

import { resolveAuditTarget, runAudit } from "../audit.js";
import { buildMcpReceipt, generateReceiptKeyPair, receiptFormatFromPath, renderReceipt, signReceipt, verifyReceipt, type McpReceipt, type ReceiptEnvironmentClass, type ReceiptFormat } from "../receipt.js";
import { buildEvent, recordEvent } from "../command-events.js";
import { ANSI, c } from "./helpers.js";

interface ReceiptOptions {
  profile: string;
  format: ReceiptFormat;
  output?: string;
  environmentClass?: ReceiptEnvironmentClass;
  topFindings?: string;
  signKey?: string;
  signer?: string;
}

function extractTrailingReceiptFlags(args: string[], options: ReceiptOptions): { targetArgs: string[]; options: ReceiptOptions } {
  const targetArgs: string[] = [];
  const nextOptions: ReceiptOptions = { ...options };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg === "--profile") {
      const next = args[i + 1];
      if (!next) throw new Error("--profile requires a value.");
      nextOptions.profile = next;
      i += 1;
    } else if (arg === "--format") {
      const next = args[i + 1];
      if (!next) throw new Error("--format requires a value.");
      nextOptions.format = next as ReceiptFormat;
      i += 1;
    } else if (arg === "--output") {
      const next = args[i + 1];
      if (!next) throw new Error("--output requires a value.");
      nextOptions.output = next;
      i += 1;
    } else if (arg === "--environment-class") {
      const next = args[i + 1];
      if (!next) throw new Error("--environment-class requires a value.");
      nextOptions.environmentClass = next as ReceiptEnvironmentClass;
      i += 1;
    } else if (arg === "--top-findings") {
      const next = args[i + 1];
      if (!next) throw new Error("--top-findings requires a value.");
      nextOptions.topFindings = next;
      i += 1;
    } else if (arg === "--sign-key") {
      const next = args[i + 1];
      if (!next) throw new Error("--sign-key requires a value.");
      nextOptions.signKey = next;
      i += 1;
    } else if (arg === "--signer") {
      const next = args[i + 1];
      if (!next) throw new Error("--signer requires a value.");
      nextOptions.signer = next;
      i += 1;
    } else if (arg === "--no-color") {
      // Commander handles color globally; keep it out of the target command.
    } else {
      targetArgs.push(arg);
    }
  }
  return { targetArgs, options: nextOptions };
}

async function writeMaybe(filePath: string | undefined, content: string): Promise<void> {
  if (!filePath) {
    process.stdout.write(`${content}\n`);
    return;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${content}\n`, "utf8");
  process.stdout.write(`Wrote MCP receipt to ${filePath}\n`);
}

export function registerReceiptCommands(program: Command): void {
  const receiptCmd = program
    .command("receipt")
    .passThroughOptions()
    .description("Emit a portable MCP trust receipt for a target.")
    .argument("<target...>", "Target directory/config path or server command.")
    .option("--profile <profile>", "Security profile to apply.", "nsa-mcp")
    .option("--format <format>", "json or markdown.", "markdown")
    .option("--output <file>", "Write receipt to a file instead of stdout.")
    .option("--environment-class <class>", "local, ci, public_safety_index, or private_fleet.")
    .option("--top-findings <count>", "Number of top findings to include.", "5")
    .option("--no-color", "Disable colored output.")
    .option("--sign-key <path>", "Path to Ed25519 private key file (DER/PEM) to sign the receipt.")
    .option("--signer <identity>", "Identity label for the signer (e.g., email). Required when --sign-key is used.")
    .action(async (targetArgs: string[], options: ReceiptOptions) => {
      const extracted = extractTrailingReceiptFlags(targetArgs, options);
      targetArgs = extracted.targetArgs;
      options = extracted.options;
      const startedAt = Date.now();
      const target = await resolveAuditTarget(targetArgs);
      if (options.output) {
        process.stdout.write(`${c(ANSI.dim, "⟳")} Building receipt for ${c(ANSI.bold, target.targetId)} with profile ${c(ANSI.bold, options.profile)}...\n`);
      }
      const report = await runAudit(target, options.profile);
      let receipt = await buildMcpReceipt(report, target, {
        commandInvoked: `mcp-observatory receipt ${targetArgs.join(" ")} --profile ${options.profile} --format ${options.format}${options.output ? ` --output ${options.output}` : ""}`,
        environmentClass: options.environmentClass,
        outputPath: options.output,
        topFindingsLimit: Number.parseInt(options.topFindings ?? "5", 10),
      });
      if (options.signKey) {
        if (!options.signer) {
          process.stderr.write("Error: --signer is required when --sign-key is used.\n");
          process.exit(1);
        }
        const keyContent = await readFile(options.signKey);
        receipt = signReceipt(receipt, keyContent, options.signer);
      }
      const format = receiptFormatFromPath(options.output, options.format);
      if (format !== "json" && format !== "markdown") {
        throw new Error("Unsupported receipt format. Use json or markdown.");
      }
      await writeMaybe(options.output, renderReceipt(receipt, format));
      recordEvent(buildEvent("command_complete", "receipt", "cli", {
        serversScanned: 1,
        gateResult: receipt.verdict.status,
        executionMs: Date.now() - startedAt,
        securityFlag: true,
        securityFindingCount: report.summary.finding_count,
        targetIds: [target.targetId],
        receiptGenerated: true,
        receiptFormat: format,
        receiptProfile: options.profile,
        receiptEnvironmentClass: options.environmentClass,
        receiptTopFindings: receipt.findings.length,
      }));
    });

  receiptCmd
    .command("keygen")
    .description("Generate an Ed25519 key pair for signing and verifying MCP receipts.")
    .option("--public <path>", "Output path for the public key.", "mcp-observatory.pub")
    .option("--private <path>", "Output path for the private key.", "mcp-observatory.key")
    .option("--force", "Overwrite existing key files if they already exist.")
    .action(async (options: { public: string; private: string; force?: boolean }) => {
      if (path.resolve(options.public) === path.resolve(options.private)) {
        process.stderr.write("Error: --public and --private must not point to the same file.\n");
        process.exit(1);
      }
      if (!options.force) {
        for (const target of [options.public, options.private]) {
          const exists = await access(target).then(() => true, () => false);
          if (exists) {
            process.stderr.write(`Error: ${target} already exists. Use --force to overwrite (this invalidates any receipts signed with the old key).\n`);
            process.exit(1);
          }
        }
      }
      const { publicKey, privateKey } = generateReceiptKeyPair();
      await writeFile(options.public, publicKey, "utf8");
      await writeFile(options.private, privateKey, { encoding: "utf8", mode: 0o600 });
      process.stdout.write(
        `Public key saved:  ${options.public}\n`
        + `Private key saved: ${options.private}\n\n`
        + "Keep the private key secure. Share the public key with anyone who needs to verify your receipts.\n",
      );
    });

  receiptCmd
    .command("verify")
    .description("Verify a signed MCP receipt against a public key. Requires a JSON-format receipt; markdown receipts do not carry the signature.")
    .argument("<file>", "Path to the receipt JSON file.")
    .requiredOption("--key <path>", "Path to the Ed25519 public key file.")
    .action(async (file: string, options: { key: string }) => {
      const receiptText = await readFile(file, "utf8");
      let receipt: McpReceipt;
      try {
        receipt = JSON.parse(receiptText) as McpReceipt;
      } catch {
        process.stderr.write(
          `Error: could not parse ${file} as JSON. receipt verify requires a JSON-format receipt `
          + "(generate one with --format json) — markdown receipts do not include the signature.\n",
        );
        process.exit(1);
      }
      const publicKey = await readFile(options.key);
      if (!verifyReceipt(receipt, publicKey)) {
        process.stderr.write(`✗ Receipt verification failed against ${options.key} — signature does not match, or the receipt is unsigned.\n`);
        process.exit(1);
      }
      process.stdout.write(`✓ Receipt verified — signed by ${receipt.signer ?? "unknown"}\n`);
    });
}
