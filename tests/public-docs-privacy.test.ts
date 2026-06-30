import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicProofDocs = [
  "CLONED_THIS.md",
  "docs/proof.md",
  "docs/clone-to-ci-campaign.md",
  "docs/ecosystem-distribution-kit.md",
  "docs/certification-pr-campaign.md",
  "docs/mcp-safety-field-report-2026-06.md",
  "docs/setup-ci-doctor.md",
  "docs/mcp-safety-report-latest.md",
  "docs/project-case-study.md",
  "docs/enterprise-outreach-playbook.md",
  "docs/reference-evaluations.md",
  "docs/mcp-server-safety-index.md",
  "docs/methodology.md",
  "docs/safety-index/maintainer-note-template.md",
  "docs/mcp-lock-files.md",
];

const forbiddenPatterns = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /telemetry-exports\//,
  /events-flat-full/,
  /thinkingdata\.cn/i,
  /kimquy\.capital/i,
  /paperstreetdata\.com/i,
  /cyberneticsplus\.com/i,
  /gitEmail/,
  /gitRemoteUrl/,
  /serverCommands/,
  /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
  /token\s*[:=]\s*["'][A-Za-z0-9_\-.]{16,}["']/i,
  /https?:\/\/(?:localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.)/i,
];

describe("public proof docs privacy guardrails", () => {
  it("does not expose private telemetry exports or raw telemetry field names", async () => {
    for (const docPath of publicProofDocs) {
      const content = await readFile(path.join(process.cwd(), docPath), "utf8");
      for (const pattern of forbiddenPatterns) {
        expect(content).not.toMatch(pattern);
      }
    }
  });

  it("keeps README action examples read-only and pinned", async () => {
    const content = await readFile(path.join(process.cwd(), "README.md"), "utf8");
    expect(content).toContain("KryptosAI/mcp-observatory/action@v0.25.1");
    expect(content).not.toContain("KryptosAI/mcp-observatory/action@main");
    expect(content).not.toContain("pull-requests: write\n  statuses: write");
  });
});
