import { describe, expect, it } from "vitest";

import { emitCloudUploadResponse } from "../src/cloud-upload.js";

const context = {
  artifactPath: "run.json",
  dashboardUrl: "https://app.mcp-observatory.com",
  pricingUrl: "https://app.mcp-observatory.com/pricing",
  binName: "mcp-observatory",
};

describe("cloud upload response", () => {
  it("prints no dashboard or upgrade CTA when the upload fails", async () => {
    const output: string[] = [];
    const response = {
      ok: false,
      status: 429,
      text: () => Promise.resolve(JSON.stringify({ code: "quota_exceeded" })),
    };

    await expect(emitCloudUploadResponse(response, context, line => output.push(line)))
      .rejects.toThrow("Cloud upload failed (429)");
    expect(output).toEqual([]);
  });

  it("shows the hosted result before the optional Individual Pro upgrade", async () => {
    const output: string[] = [];
    const response = {
      ok: true,
      status: 201,
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    };

    await emitCloudUploadResponse(response, context, line => output.push(line));

    const dashboardIndex = output.findIndex(line => line.startsWith("Hosted dashboard:"));
    const upgradeIndex = output.findIndex(line => line.includes("Review Individual Pro"));
    expect(dashboardIndex).toBeGreaterThan(-1);
    expect(upgradeIndex).toBeGreaterThan(dashboardIndex);
    expect(output[0]).toContain("Upload complete");
    expect(output.at(-1)).toContain("https://mcp-observatory.com/start/");
    expect(output.at(-1)).not.toContain("--cloud");
  });

  it("explains how to recover from an expired sign-in without losing the receipt", async () => {
    await expect(emitCloudUploadResponse(new Response("Unauthorized", { status: 401 }), context))
      .rejects.toThrow("mcp-observatory cloud login. Then retry the same upload");
  });

  it("gives quota recovery and keeps gateway HTML out of terminal output", async () => {
    await expect(emitCloudUploadResponse(new Response(JSON.stringify({ code: "quota_exceeded", message: "Monthly limit reached." }), { status: 429 }), context))
      .rejects.toThrow("Your local receipt is safe. Review your usage and plan");
    await expect(emitCloudUploadResponse(new Response("<html>gateway debug output</html>", { status: 503 }), context))
      .rejects.toThrow("Retry the same upload");
  });
});
