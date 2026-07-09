import { readFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";

export type SkillScanSeverity = "high" | "medium" | "low" | "info";

export interface SkillScanRule {
  id: string;
  severity: SkillScanSeverity;
  name: string;
  /** Regex patterns to match in file content */
  patterns: RegExp[];
}

export interface SkillScanMatch {
  line: number;
  column: number;
  pattern: string;
  matchText: string;
}

export interface SkillScanFinding {
  ruleId: string;
  severity: SkillScanSeverity;
  filePath: string;
  message: string;
  matches: SkillScanMatch[];
}

export interface SkillScanResult {
  filePath: string;
  findings: SkillScanFinding[];
}

export interface SkillScanSummary {
  totalFiles: number;
  totalFindings: number;
  healthScore: number;
  results: SkillScanResult[];
}

// ── Rule Definitions ────────────────────────────────────────────────────────

const CREDENTIAL_PATTERNS: RegExp[] = [
  /\.env\b/gi,
  /process\.env/gi,
  /\bcredentials\b/gi,
  /\bsecrets?\b/gi,
  /\bAPI_KEY\b/gi,
  /\bapi[_-]?key\b/gi,
  /\btoken\s*[:=]\s*['"][^'"]{8,}['"]/gi,
  /\bpassword\s*[:=]\s*['"][^'"]{4,}['"]/gi,
  /\bSECRET\b/g,
  /\baccess[_-]?key\b/gi,
  /\bprivate[_-]?key\b/gi,
  /export\s+\w*SECRET\w*\s*=/g,
  /export\s+\w*TOKEN\w*\s*=/g,
  /export\s+\w*KEY\w*\s*=/g,
];

const EXFILTRATION_PATTERNS: RegExp[] = [
  /webhook\.site/gi,
  /discord\.com\/api\/webhooks/gi,
  /slack\.com\/api\/chat\.postMessage/gi,
  /curl\s+.*https?:\/\//gi,
  /fetch\s*\(\s*['"]https?:\/\/[^'"]*/gi,
  /XMLHttpRequest/gi,
  /https?:\/\/.*requestbin/gi,
  /https?:\/\/.*hook\.site/gi,
  /https?:\/\/.*webhook/gi,
  /https?:\/\/.*beeceptor/gi,
  /send\s*\(.*https?:\/\//gi,
  /\.post\s*\(\s*['"]https?:\/\/[^'"]*/gi,
  /\.put\s*\(\s*['"]https?:\/\/[^'"]*/gi,
];

const REMOTE_EXEC_PATTERNS: RegExp[] = [
  /curl\s+.*\|\s*(?:bash|sh)\b/gi,
  /curl\s+.*\|\s*(?:sudo\s+)?(?:bash|sh)\b/gi,
  /wget\s+.*\|\s*(?:bash|sh)\b/gi,
  /eval\s*\(\s*(?:fetch|curl|wget)/gi,
  /eval\s*\(\s*(?:atob|Buffer\.from.*base64)/gi,
  /npx\s+.*-y\b/gi,
  /npm\s+(?:install|i)\s+-g\b/gi,
  /pip\s+install\s+(?!.*(?:--index-url|--extra-index-url))/gi,
  /child_process\b/gi,
  /exec\s*\(\s*['`].*(?:curl|wget|bash|sh|python)/gi,
  /execSync\s*\(/gi,
  /spawn\s*\(/gi,
  /fork\s*\(/gi,
  /new\s+Function\s*\(/gi,
  /vm\.runIn/gi,
  /deno\.run\b/gi,
  /Deno\.run\b/gi,
];

const HIDDEN_INSTRUCTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:previous|all|above)\s+(?:instructions?|directions?|prompts?|rules?)/gi,
  /disregard\s+(?:previous|all|above)\s+(?:instructions?|directions?)/gi,
  /override\s+(?:system\s+|user\s+)?(?:instructions?|prompts?|rules?)/gi,
  /bypass\s+(?:safety|security|restrictions?|filters?|policies?)/gi,
  /you\s+must\s+(?:always|never)\s+(?:ignore|disregard|override|bypass)/gi,
  /your\s+(?:primary|main|only)\s+(?:purpose|goal|directive)\s+is/gi,
  /system\s+prompt\s+(?:override|injection|manipulation)/gi,
  /jailbreak/i,
  /act\s+as\s+(?:DAN|developer\s+mode)/i,
  /pretend\s+(?:you\s+are|to\s+be)/gi,
  /do\s+not\s+(?:follow|obey)\s+(?:your\s+)?(?:rules?|instructions?|guidelines?)/gi,
  /forget\s+(?:everything|all)\s+(?:you|we)\s+(?:know|discussed|said)/gi,
  /start\s+your\s+response\s+with/gi,
  /respond\s+(?:only|always)\s+with/gi,
  /do\s+not\s+(?:mention|reveal|disclose)/gi,
  /hidden\s+(?:instruction|prompt|directive)/gi,
];

const FILESYSTEM_PATTERNS: RegExp[] = [
  /~\/\./g,
  /\/etc\//g,
  /\/var\//g,
  /\.ssh\//g,
  /\/root\//g,
  /\/tmp\//g,
  /\/proc\//g,
  /\/sys\//g,
  /\/dev\//g,
  /\/boot\//g,
  /\/mnt\//g,
  /\/opt\//g,
  /\/usr\/local\//g,
  /readFile\s*\(\s*['"`]~\//gi,
  /writeFile\s*\(\s*['"`]~\//gi,
  /rm\s+.*-rf\b/gi,
  /rmdir\b/gi,
  /unlink\s*\(/gi,
  /chmod\s+/gi,
  /chown\s+/gi,
  /fs\.readFileSync/gi,
  /fs\.writeFileSync/gi,
  /fs\.appendFileSync/gi,
  /require\(['"`]fs['"`]\)/gi,
  /import\s+.*\s+from\s+['"`]fs['"`]/gi,
];

export const SKILL_SCAN_RULES: SkillScanRule[] = [
  {
    id: "credential-access",
    severity: "high",
    name: "Credential access patterns",
    patterns: CREDENTIAL_PATTERNS,
  },
  {
    id: "exfiltration-vector",
    severity: "high",
    name: "Data exfiltration vectors",
    patterns: EXFILTRATION_PATTERNS,
  },
  {
    id: "remote-execution",
    severity: "high",
    name: "Remote execution patterns",
    patterns: REMOTE_EXEC_PATTERNS,
  },
  {
    id: "hidden-instruction",
    severity: "medium",
    name: "Hidden instruction / prompt injection",
    patterns: HIDDEN_INSTRUCTION_PATTERNS,
  },
  {
    id: "filesystem-manipulation",
    severity: "medium",
    name: "Filesystem manipulation",
    patterns: FILESYSTEM_PATTERNS,
  },
];

// ── Unsigned/unaudited check ─────────────────────────────────────────────────

interface PackageJsonShape {
  _integrity?: string;
  dist?: { shasum?: string; integrity?: string };
  signatures?: Array<unknown>;
}

const ATTESTATION_INDICATORS = [
  /^signed\s*(?:by|with)?/im,
  /^\w+:sig:/m,
  /^-----BEGIN\s+PGP\s+SIGNED\s+MESSAGE-----/m,
  /^-----BEGIN\s+PGP\s+SIGNATURE-----/m,
  /attestation\s*(?:hash|digest|checksum|fingerprint)\s*[:=]?\s*[a-f0-9]{32,}/im,
  /^version:\s*\d+\s*$/im,
  /^hash:\s*[a-f0-9]{32,}\s*$/im,
  /^digest:\s*[a-f0-9]{32,}\s*$/im,
  /^sha256:\s*[a-f0-9]{64}\s*$/im,
  /^sha512:\s*[a-f0-9]{128}\s*$/im,
  /-----BEGIN\s+CERTIFICATE-----/m,
  /-----BEGIN\s+SIGNATURE-----/m,
];

function checkUnsigned(filePath: string, content: string): SkillScanFinding | undefined {
  const hasAttestation = ATTESTATION_INDICATORS.some((r) => r.test(content));

  const isPackageJson = basename(filePath) === "package.json";
  const name = basename(filePath);
  const isSkillFile = /^SKILL\.md$/i.test(name) || /^skill\.md$/i.test(name);

  // Only check skill-specific files and package.json for missing attestation
  if (!isSkillFile && !isPackageJson) return undefined;

  if (hasAttestation) return undefined;

  if (isPackageJson) {
    try {
      const pkg = JSON.parse(content) as PackageJsonShape;
      if (pkg._integrity || pkg.dist?.shasum || pkg.dist?.integrity || pkg.signatures?.[0]) {
        return undefined;
      }
    } catch {
      // Invalid JSON — will be caught by other checks
    }
    return {
      ruleId: "unsigned-skill",
      severity: "medium",
      filePath,
      message: `Skill package.json has no integrity hash, signatures, or attestation.`,
      matches: [],
    };
  }

  if (isSkillFile || extname(filePath) === ".md") {
    return {
      ruleId: "unsigned-skill",
      severity: "medium",
      filePath,
      message: `Skill file has no attestation, verification hash, or signature.`,
      matches: [],
    };
  }

  return undefined;
}

// ── Scanner ──────────────────────────────────────────────────────────────────

const SKILL_FILE_NAMES = new Set([
  "skill.md",
  "SKILL.md",
  "skill.mdx",
  "SKILL.mdx",
]);

const SKILL_RELATED_FILES = new Set([
  "package.json",
]);

function isSkillFile(filePath: string): boolean {
  const name = basename(filePath);
  if (SKILL_FILE_NAMES.has(name)) return true;
  return false;
}

function isSkillRelatedFile(filePath: string): boolean {
  const name = basename(filePath);
  return SKILL_RELATED_FILES.has(name);
}

export function findLineColumn(content: string, matchIndex: number): { line: number; column: number } {
  const before = content.slice(0, matchIndex);
  const line = (before.match(/\n/g) ?? []).length + 1;
  const lastNewline = before.lastIndexOf("\n");
  const column = matchIndex - (lastNewline >= 0 ? lastNewline : 0);
  return { line, column };
}

export function scanContent(
  filePath: string,
  content: string,
  rules: SkillScanRule[],
): SkillScanFinding[] {
  const findings: SkillScanFinding[] = [];
  const lines = content.split("\n");

  for (const rule of rules) {
    const matches: SkillScanMatch[] = [];

    for (const pattern of rule.patterns) {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(content)) !== null) {
        const { line, column } = findLineColumn(content, m.index);
        matches.push({
          line,
          column,
          pattern: pattern.source,
          matchText: lines[line - 1]?.trim().slice(0, 120) ?? m[0].slice(0, 120),
        });
      }
    }

    if (matches.length > 0) {
      findings.push({
        ruleId: rule.id,
        severity: rule.severity,
        filePath,
        message: `Found ${matches.length} match(es) for "${rule.name}" in ${basename(filePath)}.`,
        matches,
      });
    }
  }

  const unsigned = checkUnsigned(filePath, content);
  if (unsigned) findings.push(unsigned);

  return findings;
}

export async function scanFile(filePath: string): Promise<SkillScanResult> {
  const content = await readFile(filePath, "utf8");
  const findings = scanContent(filePath, content, SKILL_SCAN_RULES);
  return { filePath, findings };
}

export async function scanDirectory(dirPath: string): Promise<SkillScanResult[]> {
  const { readdir } = await import("node:fs/promises");
  const results: SkillScanResult[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const full = resolve(currentPath, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        await walk(full);
      } else if (entry.isFile()) {
        if (isSkillFile(full) || isSkillRelatedFile(full) || (entry.name.endsWith(".md") && /skill/i.test(entry.name))) {
          results.push(await scanFile(full));
        }
      }
    }
  }

  await walk(dirPath);
  return results;
}

export async function scanPath(inputPath: string): Promise<SkillScanResult[]> {
  const { stat } = await import("node:fs/promises");
  const s = await stat(inputPath);
  if (s.isDirectory()) {
    return scanDirectory(inputPath);
  }
  if (s.isFile()) {
    return [await scanFile(inputPath)];
  }
  return [];
}

// ── Health Score ─────────────────────────────────────────────────────────────

export function computeSkillHealthScore(results: SkillScanResult[]): number {
  const allFindings = results.flatMap((r) => r.findings);
  if (allFindings.length === 0) return 100;

  const deductions: Record<SkillScanSeverity, number> = {
    high: 25,
    medium: 15,
    low: 5,
    info: 0,
  };

  let score = 100;
  for (const f of allFindings) {
    score -= deductions[f.severity] ?? 0;
  }

  return Math.max(0, score);
}

export function summarizeScan(results: SkillScanResult[]): SkillScanSummary {
  const totalFindings = results.reduce((sum, r) => sum + r.findings.length, 0);
  return {
    totalFiles: results.length,
    totalFindings,
    healthScore: computeSkillHealthScore(results),
    results,
  };
}

// ── Renderers ────────────────────────────────────────────────────────────────

export function renderSkillScanTerminal(results: SkillScanResult[], healthScore: number): string {
  const lines: string[] = [];

  const allFindings = results.flatMap((r) => r.findings);
  const highCount = allFindings.filter((f) => f.severity === "high").length;
  const mediumCount = allFindings.filter((f) => f.severity === "medium").length;
  const lowCount = allFindings.filter((f) => f.severity === "low").length;

  const scoreColor = healthScore >= 80 ? "\x1b[32m" : healthScore >= 50 ? "\x1b[33m" : "\x1b[31m";
  const reset = "\x1b[0m";

  lines.push(`${"\x1b[1m"}Skill Scan Report${reset}`);
  lines.push(`Health Score: ${scoreColor}${healthScore}/100${reset}`);
  lines.push(`Files: ${results.length}, Findings: ${allFindings.length} (${highCount} high, ${mediumCount} medium, ${lowCount} low)`);
  lines.push("");

  for (const result of results) {
    lines.push(`${"\x1b[1m"}${result.filePath}${reset} (${result.findings.length} finding${result.findings.length === 1 ? "" : "s"})`);
    if (result.findings.length === 0) {
      lines.push(`  ${"\x1b[32m"}✓ No issues${reset}`);
      lines.push("");
      continue;
    }
    for (const finding of result.findings) {
      const sevColor = finding.severity === "high" ? "\x1b[31m"
        : finding.severity === "medium" ? "\x1b[33m"
        : "\x1b[2m";
      lines.push(`  ${sevColor}[${finding.severity}]${reset} ${finding.ruleId}: ${finding.message}`);
      for (const match of finding.matches.slice(0, 5)) {
        lines.push(`    ${"\x1b[2m"}L${match.line}:${match.column}${reset} ${match.matchText.slice(0, 80)}`);
      }
      if (finding.matches.length > 5) {
        lines.push(`    ${"\x1b[2m"}...and ${finding.matches.length - 5} more matches${reset}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function renderSkillScanMarkdown(results: SkillScanResult[], healthScore: number): string {
  const allFindings = results.flatMap((r) => r.findings);
  const highCount = allFindings.filter((f) => f.severity === "high").length;
  const mediumCount = allFindings.filter((f) => f.severity === "medium").length;
  const lowCount = allFindings.filter((f) => f.severity === "low").length;

  const grade = healthScore >= 80 ? "A" : healthScore >= 60 ? "B" : healthScore >= 40 ? "C" : healthScore >= 20 ? "D" : "F";

  const lines = [
    `# Skill Scan Report`,
    ``,
    `**Health Score: ${healthScore}/100 (${grade})**`,
    ``,
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Files scanned | ${results.length} |`,
    `| Total findings | ${allFindings.length} |`,
    `| High | ${highCount} |`,
    `| Medium | ${mediumCount} |`,
    `| Low | ${lowCount} |`,
    ``,
  ];

  for (const result of results) {
    lines.push(`## ${result.filePath}`, ``);
    if (result.findings.length === 0) {
      lines.push(`✓ No issues found.`, ``);
      continue;
    }
    lines.push(`${result.findings.length} finding${result.findings.length === 1 ? "" : "s"}:`, ``);

    lines.push(`| Rule | Severity | Line | Match |`);
    lines.push(`| --- | --- | --- | --- |`);
    for (const finding of result.findings) {
      for (const match of finding.matches.slice(0, 3)) {
        lines.push(`| ${finding.ruleId} | ${finding.severity} | ${match.line}:${match.column} | \`${match.matchText.slice(0, 60).replace(/\|/g, "\\|")}\` |`);
      }
    }
    lines.push(``);
  }

  return lines.join("\n");
}

export function renderSkillScanJson(summary: SkillScanSummary): string {
  return JSON.stringify(summary, null, 2);
}

export function renderSkillScanSarif(results: SkillScanResult[], healthScore: number): string {
  const sarifResults: unknown[] = [];
  const rules: unknown[] = [];
  const seenRules = new Set<string>();

  for (const result of results) {
    for (const finding of result.findings) {
      if (!seenRules.has(finding.ruleId)) {
        seenRules.add(finding.ruleId);
        rules.push({
          id: finding.ruleId,
          name: finding.ruleId,
          shortDescription: { text: finding.message },
          defaultConfiguration: {
            level: finding.severity === "high" ? "error" : finding.severity === "medium" ? "warning" : "note",
          },
          properties: {
            tags: ["skill-scan", "mcp-observatory", finding.ruleId],
          },
        });
      }

      for (const match of finding.matches) {
        sarifResults.push({
          ruleId: finding.ruleId,
          level: finding.severity === "high" ? "error" : finding.severity === "medium" ? "warning" : "note",
          message: { text: `${finding.ruleId}: ${match.matchText}` },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: result.filePath },
              region: { startLine: match.line, startColumn: match.column },
            },
          }],
          properties: {
            ruleId: finding.ruleId,
            severity: finding.severity,
            filePath: result.filePath,
          },
        });
      }

      if (finding.matches.length === 0) {
        sarifResults.push({
          ruleId: finding.ruleId,
          level: finding.severity === "high" ? "error" : finding.severity === "medium" ? "warning" : "note",
          message: { text: finding.message },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: result.filePath },
              region: { startLine: 1 },
            },
          }],
          properties: {
            ruleId: finding.ruleId,
            severity: finding.severity,
            filePath: result.filePath,
          },
        });
      }
    }
  }

  const sarif = {
    $schema: "https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/schemas/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: {
        driver: {
          name: "mcp-observatory-skill-scan",
          version: "1.0.0",
          informationUri: "https://github.com/KryptosAI/mcp-observatory",
          rules,
        },
      },
      results: sarifResults,
      properties: {
        healthScore,
      },
    }],
  };

  return JSON.stringify(sarif, null, 2);
}
