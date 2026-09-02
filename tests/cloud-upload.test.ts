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
    expect(output.at(-1)).toContain("setup-ci --all --command");
    expect(output.at(-1)).not.toContain("--cloud");
  });
});
