import type { ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";

import { runResourcesCheck } from "../src/checks/resources.js";
import type { CheckContext } from "../src/checks/base.js";
import { makeContext as makeBaseContext } from "./fixtures/test-helpers.js";

function makeContext(overrides: {
  listResources?: CheckContext["client"]["listResources"];
  listResourceTemplates?: CheckContext["client"]["listResourceTemplates"];
}): CheckContext {
  return makeBaseContext({
    client: {
      listResources:
        overrides.listResources ??
        (() => Promise.resolve({
          resources: [{ uri: "demo://resource/one", name: "one" }]
        })),
      listResourceTemplates:
        overrides.listResourceTemplates ??
        (() => Promise.resolve({
          resourceTemplates: []
        }))
    } as unknown as CheckContext["client"],
    serverCapabilities: {
      resources: {}
    } as unknown as ServerCapabilities,
    target: {
      targetId: "resources-test",
      adapter: "local-process",
      command: "node",
      args: [],
      cwd: "."
    },
    timeoutMs: 1000,
  });
}

describe("runResourcesCheck", () => {
  it("treats unsupported optional resource-template endpoints as pass when resources/list works", async () => {
    const check = await runResourcesCheck(
      makeContext({
        listResourceTemplates: () => {
          throw new Error("Method not found");
        }
      }),
    );

    expect(check.result.status).toBe("pass");
    expect(check.result.message).toContain("optional resource endpoint appears unsupported");
    expect(check.result.evidence).toHaveLength(2);
  });

  it("treats unexpected resource endpoint failures as partial when another endpoint still responds", async () => {
    const check = await runResourcesCheck(
      makeContext({
        listResourceTemplates: () => {
          throw new Error("Request timed out");
        }
      }),
    );

    expect(check.result.status).toBe("partial");
    expect(check.result.message).toContain("failed unexpectedly");
    expect(check.result.evidence).toHaveLength(2);
  });
});
