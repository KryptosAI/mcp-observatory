import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, opendir, realpath, type FileHandle } from "node:fs/promises";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import { Node, Project, SyntaxKind, ts } from "ts-morph";

import { makeCheckResult, type ObservedCheck } from "./base.js";

export type SourceAuditCheckId = "SA-FS-TRAVERSAL" | "SA-SHELL-INJECTION" |
  "SA-SSRF-SINK" | "SA-HARDCODED-SECRET" | "SA-TOOL-POISONING";

export interface SourceAuditFinding {
  checkId: SourceAuditCheckId;
  severity: "high" | "medium";
  confidence: "possible-input-flow" | "literal-pattern";
  disposition: "review";
  file: string;
  line: number;
  description: string;
  evidence: string;
  remediation: string;
}

export interface SourceAuditOptions {
  maxFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
  maxEntries?: number;
  maxFindings?: number;
  maxDurationMs?: number;
}

export interface SourceAuditResult {
  schemaVersion: "source-audit-v1";
  status: "complete" | "incomplete";
  findings: SourceAuditFinding[];
  filesScanned: number;
  durationMs: number;
  coverage: {
    root: string;
    files: Array<{ file: string; sha256: string; bytes: number }>;
    excluded: number;
    diagnostics: Array<{ file: string; reason: string }>;
    limits: Required<SourceAuditOptions>;
    scope: string;
  };
}

const DEFAULTS: Required<SourceAuditOptions> = {
  maxFiles: 2000, maxFileBytes: 1024 * 1024, maxTotalBytes: 20 * 1024 * 1024,
  maxEntries: 20_000, maxFindings: 1000, maxDurationMs: 30_000,
};
const EXCLUDED = new Set([".git", "node_modules", "dist", "build", "coverage", ".venv", "vendor"]);
const EXTENSION = /\.(?:[cm]?[jt]sx?)$/i;
const SCOPE = "Bounded per-file JS/TS syntax and possible input-flow review. No execution, dependency loading, " +
  "cross-file analysis, authorization proof, or safety certification. Guards and sanitizers require human review.";

interface Callable { module: string; member: string }

function declarationInitializer(declaration: Node): Node | undefined {
  if (Node.isVariableDeclaration(declaration)) return declaration.getInitializer();
  if (Node.isBindingElement(declaration)) {
    const owner = declaration.getParent().getParent();
    if (Node.isVariableDeclaration(owner)) return owner.getInitializer();
  }
  return undefined;
}

/** Resolve actual local bindings, so shadowed imports do not become sinks. */
function callable(node: Node, seen = new Set<ts.Node>()): Callable | undefined {
  if (seen.has(node.compilerNode) || seen.size > 32) return undefined;
  seen.add(node.compilerNode);
  if (Node.isPropertyAccessExpression(node) || Node.isElementAccessExpression(node)) {
    const parent = callable(node.getExpression(), seen);
    const argument = Node.isElementAccessExpression(node) ? node.getArgumentExpression() : undefined;
    const member = Node.isPropertyAccessExpression(node) ? node.getName() :
      argument && Node.isStringLiteral(argument) ? argument.getLiteralValue() : undefined;
    if (parent && member) return { module: parent.module, member: [parent.member, member].filter(Boolean).join(".") };
  }
  if (Node.isCallExpression(node) && node.getExpression().getText() === "require") {
    const argument = node.getArguments()[0];
    if (argument && Node.isStringLiteral(argument) && !node.getExpression().getSymbol()?.getDeclarations().length) {
      return { module: argument.getLiteralValue(), member: "" };
    }
  }
  if (!Node.isIdentifier(node)) return undefined;
  const declarations = node.getSymbol()?.getDeclarations() ?? [];
  if (!declarations.length && ["fetch", "eval", "globalThis"].includes(node.getText())) {
    return { module: "global", member: node.getText() === "globalThis" ? "" : node.getText() };
  }
  for (const declaration of declarations) {
    const imported = declaration.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
    if (imported) {
      return { module: imported.getModuleSpecifierValue(),
        member: Node.isImportSpecifier(declaration) ? declaration.getName() : "" };
    }
    const initializer = declarationInitializer(declaration);
    if (!initializer) continue;
    const resolved = callable(initializer, seen);
    if (resolved && Node.isBindingElement(declaration)) {
      const member = declaration.getPropertyNameNode()?.getText() ?? declaration.getName();
      return { module: resolved.module, member: [resolved.member, member].filter(Boolean).join(".") };
    }
    if (resolved) return resolved;
  }
  return undefined;
}

function inspectFile(content: string, file: string): { findings: SourceAuditFinding[]; parseErrors: number } {
  // In-memory files and no resolution prevent tsconfig, ancestor configuration,
  // imported packages, project plugins or other files from being loaded.
  const project = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true, noResolve: true, noLib: true, target: ts.ScriptTarget.ES2022 } });
  const source = project.createSourceFile(`/audit/${file}`, content);
  const parseErrors = project.getProgram().compilerObject.getSyntacticDiagnostics(source.compilerNode).length;
  if (parseErrors) return { findings: [], parseErrors };
  const assignments = new Map<ts.Symbol, Node[]>();
  for (const expression of source.getDescendantsOfKind(SyntaxKind.BinaryExpression)) {
    const kind = expression.getOperatorToken().getKind();
    const left = expression.getLeft();
    if (kind >= SyntaxKind.FirstAssignment && kind <= SyntaxKind.LastAssignment && Node.isIdentifier(left)) {
      const symbol = left.getSymbol()?.compilerSymbol;
      if (symbol) assignments.set(symbol, [...assignments.get(symbol) ?? [], expression.getRight()]);
    }
  }
  function flows(node: Node | undefined, position: number, seen = new Set<ts.Node>()): boolean {
    if (!node || seen.has(node.compilerNode) || seen.size > 64) return false;
    seen.add(node.compilerNode);
    if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node) || Node.isNumericLiteral(node)) return false;
    if (Node.isArrowFunction(node) || Node.isFunctionExpression(node) || Node.isFunctionDeclaration(node)) return false;
    if (Node.isIdentifier(node) || Node.isShorthandPropertyAssignment(node)) {
      const symbol = Node.isShorthandPropertyAssignment(node)
        ? project.getTypeChecker().getShorthandAssignmentValueSymbol(node) : node.getSymbol();
      for (const declaration of symbol?.getDeclarations() ?? []) {
        if (Node.isParameterDeclaration(declaration) || Node.isBindingElement(declaration) &&
            Node.isParameterDeclaration(declaration.getParent().getParent())) return true;
        if (flows(declarationInitializer(declaration), position, seen)) return true;
      }
      return (symbol ? assignments.get(symbol.compilerSymbol) ?? [] : [])
        .some(value => value.getStart() < position && flows(value, position, seen));
    }
    if (Node.isPropertyAccessExpression(node) && node.getExpression().getText() === "process.env" &&
        !node.getExpression().getFirstDescendantByKind(SyntaxKind.Identifier)?.getSymbol()?.getDeclarations().length) return true;
    return node.forEachChildAsArray().some(child => flows(child, position, seen));
  }
  const findings: SourceAuditFinding[] = [];
  const add = (node: Node, checkId: SourceAuditCheckId, description: string, evidence: string,
    remediation: string, confidence: SourceAuditFinding["confidence"] = "possible-input-flow") => {
    findings.push({ checkId, severity: checkId === "SA-TOOL-POISONING" ? "medium" : "high",
      confidence, disposition: "review", file, line: node.getStartLineNumber(), description, evidence, remediation });
  };
  for (const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const resolved = callable(call.getExpression());
    if (!resolved) continue;
    const member = resolved.member.split(".").at(-1) ?? "";
    const args = call.getArguments();
    const firstFlows = flows(args[0], call.getStart());
    const module = resolved.module.replace(/^node:/, "");
    if (["fs", "fs/promises"].includes(module) &&
        /^(?:readFile|writeFile|appendFile|open|readdir|unlink|rm|mkdir|rmdir|stat|lstat|access|createReadStream|createWriteStream)(?:Sync)?$/.test(member) && firstFlows) {
      add(call, "SA-FS-TRAVERSAL", "Runtime input may reach a filesystem path; containment needs review.",
        `${module}.${member} receives a possible input-derived path. Source text omitted.`,
        "Review containment after canonicalization, path-segment boundaries, symlinks and authorization before this operation.");
    }
    if (module === "child_process") {
      const shellCommand = ["exec", "execSync"].includes(member) && firstFlows;
      const options = [...args].reverse().find(arg => Node.isObjectLiteralExpression(arg));
      const shell = options && Node.isObjectLiteralExpression(options) ? options.getProperty("shell") : undefined;
      const shellEnabled = shell && (!Node.isPropertyAssignment(shell) || shell.getInitializer()?.getText() !== "false");
      const processCommand = ["spawn", "spawnSync", "execFile", "execFileSync"].includes(member) &&
        (firstFlows || shellEnabled && args.some(arg => flows(arg, call.getStart())));
      if (shellCommand || processCommand) {
        add(call, "SA-SHELL-INJECTION", "Runtime input may select a program or reach a shell command.",
          `${module}.${member} has a possible input flow. Source text omitted.`,
          "Prefer a fixed executable and separate arguments with shell disabled; review executable and argument allowlists.");
      }
    }
    if (module === "global" && member === "eval" && firstFlows) {
      add(call, "SA-SHELL-INJECTION", "Runtime input may reach dynamic code evaluation.", "Input-derived eval argument; source text omitted.",
        "Replace dynamic evaluation with explicit operations on validated data.");
    }
    const network = module === "global" && member === "fetch" ||
      ["node-fetch", "undici", "axios", "http", "https", "request"].includes(module) &&
      ["", "default", "fetch", "request", "get", "post", "put", "delete", "patch"].includes(member);
    if (network && firstFlows) {
      add(call, "SA-SSRF-SINK", "Runtime input may reach a network destination; SSRF controls need review.",
        `${module}.${member || "default"} receives a possible input-derived destination. Source text omitted.`,
        "Review allowed schemes, hosts, resolved addresses, redirects and egress controls. This signal does not establish host control.");
    }
  }
  for (const literal of source.getDescendants().filter(node => Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node))) {
    if (!Node.isStringLiteral(literal) && !Node.isNoSubstitutionTemplateLiteral(literal)) continue;
    const value = literal.getLiteralValue();
    const tokenPattern = /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-(?:proj-)?[A-Za-z0-9_-]{24,})\b/;
    const parent = literal.getParent();
    const name = Node.isVariableDeclaration(parent) || Node.isPropertyAssignment(parent) ? parent.getName() : "";
    const credentialLiteral = /(?:password|secret|api[_-]?key|access[_-]?token)/i.test(name) &&
      value.length >= 20 && !/example|placeholder|your[_-]|changeme|\$\{/i.test(value);
    if (tokenPattern.test(value) || credentialLiteral) {
      add(literal, "SA-HARDCODED-SECRET", "A literal resembles an embedded credential; validity is unverified.",
        "Credential-like literal detected. Entire value and source line redacted.",
        "Inspect privately, move credentials to a secret provider, and revoke an exposed credential if it is real.", "literal-pattern");
    }
    const description = Node.isPropertyAssignment(parent) && parent.getName() === "description";
    const registration = literal.getAncestors().some(node => Node.isCallExpression(node) &&
      /\.(?:registerTool|tool)$/.test(node.getExpression().getText()));
    const legacyDescription = Node.isCallExpression(parent) && /\.tool$/.test(parent.getExpression().getText()) &&
      parent.getArguments()[1] === literal;
    const owner = parent.getParent();
    const definition = Node.isPropertyAssignment(parent) && owner && Node.isObjectLiteralExpression(owner) &&
      owner.getProperty("inputSchema") !== undefined;
    if ((description && (registration || definition) || legacyDescription) &&
        /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|<\/?(?:system|override|exfil|prompt_override)>|[\u200B-\u200D\u202E\u2060\uFEFF]/i.test(value)) {
      add(literal, "SA-TOOL-POISONING", "An advertised tool description contains instruction-override or hidden-text patterns.",
        "Suspicious description literal; entire contents redacted.",
        "Review the description's intent and remove instructions that attempt to override the caller's policies.", "literal-pattern");
    }
  }
  return { findings, parseErrors: 0 };
}

export async function auditSource(sourcePath: string, options: SourceAuditOptions = {}): Promise<SourceAuditResult> {
  const startedAt = performance.now();
  const limits = { ...DEFAULTS, ...options };
  const result: SourceAuditResult = { schemaVersion: "source-audit-v1", status: "complete", findings: [], filesScanned: 0,
    durationMs: 0, coverage: { root: path.resolve(sourcePath), files: [], excluded: 0, diagnostics: [], limits, scope: SCOPE } };
  const problem = (file: string, reason: string) => {
    result.status = "incomplete";
    result.coverage.diagnostics.push({ file, reason });
  };
  if (Object.values(limits).some(value => !Number.isSafeInteger(value) || value <= 0)) {
    problem(".", "All resource limits must be positive safe integers.");
    return result;
  }
  let root: string;
  let entries = 0, bytes = 0, stopped = false;
  let rootStat;
  try { root = await realpath(sourcePath); rootStat = await lstat(root); }
  catch { problem(".", "Source path is missing or unreadable."); return result; }
  const base = rootStat.isDirectory() ? root : path.dirname(root);
  const within = (candidate: string) => {
    const relative = path.relative(base, candidate);
    return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };
  const visit = async (candidate: string): Promise<void> => {
    if (stopped) return;
    const file = path.relative(base, candidate) || ".";
    if (++entries > limits.maxEntries || performance.now() - startedAt > limits.maxDurationMs) {
      problem(file, "Traversal or elapsed-time limit reached."); stopped = true; return;
    }
    let handle:FileHandle | undefined;
    try {
      // Open first. Type, identity and size checks below apply to the descriptor
      // actually read, rather than authorizing a later pathname-based open.
      handle=await open(candidate,constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const opened=await handle.stat();
      const named=await lstat(candidate);
      if (named.isSymbolicLink()) { result.coverage.excluded++; return; }
      if (named.dev !== opened.dev || named.ino !== opened.ino) {
        problem(file,"Source identity changed after opening.");return;
      }
      if (!within(await realpath(candidate))) { problem(file, "Path escapes the selected source root."); return; }
      if (opened.isDirectory()) {
        if (candidate !== root && EXCLUDED.has(path.basename(candidate))) { result.coverage.excluded++; return; }
        await handle.close();handle=undefined;
        const names: string[] = [];
        for await (const entry of await opendir(candidate)) {
          if (names.length + entries >= limits.maxEntries) {
            problem(file, "Directory entry limit reached."); stopped = true; return;
          }
          names.push(entry.name);
        }
        for (const name of names.sort()) {
          await visit(path.join(candidate, name));
          if (stopped) break;
        }
        return;
      }
      if (!opened.isFile() || !EXTENSION.test(candidate) || /\.d\.[cm]?ts$|\.min\.js$/.test(candidate)) { result.coverage.excluded++; return; }
      if (result.filesScanned >= limits.maxFiles) { problem(file, "Source file limit reached."); stopped = true; return; }
      if (opened.size > limits.maxFileBytes || bytes + opened.size > limits.maxTotalBytes) {
        problem(file, "Source byte limit reached."); return;
      }
      let buffer = Buffer.alloc(Math.min(limits.maxFileBytes, limits.maxTotalBytes - bytes) + 1);
      let bytesRead = 0;
      while (bytesRead < buffer.length) {
        const chunk = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
        if (chunk.bytesRead === 0) break;
        bytesRead += chunk.bytesRead;
      }
      buffer = buffer.subarray(0, bytesRead);
      const finished=await handle.stat();
      if (bytesRead > limits.maxFileBytes || bytes + bytesRead > limits.maxTotalBytes || bytesRead !== opened.size ||
          finished.size !== opened.size || finished.mtimeMs !== opened.mtimeMs || finished.ctimeMs !== opened.ctimeMs) {
        problem(file, "Source changed or exceeded byte limits while reading."); return;
      }
      await handle.close();handle=undefined;
      bytes += buffer.length;
      const content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      const checked = inspectFile(content, file);
      result.filesScanned++;
      result.coverage.files.push({ file, sha256: createHash("sha256").update(buffer).digest("hex"), bytes: buffer.length });
      if (checked.parseErrors) problem(file, "Syntax errors prevented analysis; source text omitted.");
      const remaining = limits.maxFindings - result.findings.length;
      result.findings.push(...checked.findings.slice(0, remaining));
      if (checked.findings.length > remaining) { problem(file, "Finding limit reached."); stopped = true; }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ELOOP") result.coverage.excluded++;
      else problem(file, "Source could not be read or analyzed; error details omitted to protect source contents.");
    } finally {
      if (handle) await handle.close().catch(() => { problem(file,"Source handle could not be closed."); });
    }
  };
  await visit(root);
  if (!result.filesScanned) problem(".", "No supported source files were analyzed.");
  result.durationMs = performance.now() - startedAt;
  if (result.durationMs > limits.maxDurationMs && result.status === "complete") problem(".", "Elapsed-time limit exceeded during analysis.");
  return result;
}

export function getFindingSummary(result: SourceAuditResult): string {
  return `${result.filesScanned} files analyzed; ${result.findings.length} review signals; coverage ${result.status}. No safety certification.`;
}

export async function runSourceAuditCheck(sourcePath: string): Promise<ObservedCheck> {
  const audit = await auditSource(sourcePath);
  return { result: makeCheckResult("source-audit", audit.status === "incomplete" || audit.findings.length ? "partial" : "pass",
    audit.durationMs, getFindingSummary(audit), [{ endpoint: "source-audit", advertised: true,
      responded: audit.filesScanned > 0, minimalShapePresent: audit.status === "complete", itemCount: audit.findings.length,
      diagnostics: [SCOPE, ...audit.coverage.diagnostics.map(d => `${JSON.stringify(d.file)}: ${d.reason}`)],
      responseSnapshots: { coverage: audit.coverage }, findings: audit.findings.map(f => ({ ...f })) }]) };
}
