import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicProofDocs = [
  "docs/proof.md",
  "docs/mcp-safety-report-latest.md",
  "docs/project-case-study.md",
  "docs/reference-evaluations.md",
  "docs/mcp-server-safety-index.md",
  "docs/mcp-lock-files.md",
];

describe("public proof docs privacy guardrails", () => {
  it("does not expose private telemetry exports or raw telemetry field names", async () => {
    for (const docPath of publicProofDocs) {
      const content = await readFile(path.join(process.cwd(), docPath), "utf8");
      expect(content).not.toContain("telemetry-exports/");
      expect(content).not.toContain("events-flat-full");
      expect(content).not.toContain("gitEmail");
      expect(content).not.toContain("gitRemoteUrl");
      expect(content).not.toContain("serverCommands");
    }
  });
});
