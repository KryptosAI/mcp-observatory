import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { draftNote, handleFromRepo, rankTargets, scoreRisk } from "../scripts/public-signal-leads.js";

describe("public-signal leads", () => {
  it("ranks runtime-relevant Safety Index targets and skips reference noise", () => {
    const ranked = rankTargets([
      { id: "everything-server", name: "Official everything", repo: "https://github.com/modelcontextprotocol/servers", riskClass: "Reference compatibility", whyItMatters: "baseline" },
      { id: "kubernetes-server", name: "Kubernetes MCP", repo: "https://github.com/Flux159/mcp-server-kubernetes", riskClass: "Kubernetes control plane", whyItMatters: "cluster mutation" },
      { id: "filesystem-server", name: "Filesystem MCP", repo: "https://github.com/modelcontextprotocol/servers", riskClass: "Filesystem boundary", whyItMatters: "read/write" },
    ]);
    expect(ranked[0]).toMatchObject({ handle: "Flux159", score: 95, offer: "enforce" });
    expect(ranked.some((lead) => lead.riskClass === "Reference compatibility")).toBe(false);
    expect(handleFromRepo("https://github.com/Flux159/mcp-server-kubernetes")).toEqual({ owner: "Flux159", repo: "mcp-server-kubernetes" });
    expect(scoreRisk({ id: "ref", name: "ref", riskClass: "Reference compatibility" })).toBe(0);
    expect(draftNote(ranked[0]!)).toContain("enforce --start-proxy");
  });

  it("surfaces one first scan and one free hosted next action while keeping the leads script unpublished", async () => {
    const readme = await readFile(path.join(process.cwd(), "README.md"), "utf8");
    const site = await readFile(path.join(process.cwd(), "dashboard/index.html"), "utf8");
    const pack = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as { files: string[] };
    expect(readme).toContain("enforce --start-proxy");
    expect(site).toContain("Run in your terminal · no account needed");
    expect(site).toContain("Next: one hosted snapshot free");
    expect(site).toContain("@latest cloud upload");
    expect(site).toContain("<h3>Enforce</h3>");
    expect(pack.files.some((entry) => entry.includes("public-signal-leads"))).toBe(false);
  });
});
