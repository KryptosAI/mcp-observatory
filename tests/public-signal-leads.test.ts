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

  it("teaches the local product before offering a clearly labelled sample demo or hosted history", async () => {
    const readme = await readFile(path.join(process.cwd(), "README.md"), "utf8");
    const site = await readFile(path.join(process.cwd(), "dashboard/index.html"), "utf8");
    const pack = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8")) as { files: string[] };
    expect(readme).toContain("enforce --start-proxy");
    expect(site).toContain("Find MCP problems before they break your agents.");
    expect(site).toContain("Runs locally. No account required. Nothing uploaded unless you choose to share a snapshot.");
    expect(site).toContain("Run a free sample scan.");
    expect(site).toContain("Copy demo command");
    expect(site).toContain("demo --example");
    expect(site).toContain("Keep evidence with Individual Pro.");
    expect(site.indexOf('id="demo"')).toBeLessThan(site.indexOf('id="install"'));
    expect(site.indexOf('id="install"')).toBeLessThan(site.indexOf('class="hosted-section"'));
    expect(pack.files.some((entry) => entry.includes("public-signal-leads"))).toBe(false);
  });
});
