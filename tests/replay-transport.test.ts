import { describe, expect, it } from "vitest";

import { ReplayTransport } from "../src/transport/replay-transport.js";
import type { CassetteEntry } from "../src/cassette.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

function makeEntries(): CassetteEntry[] {
  return [
    { direction: "request", method: "initialize", params: {}, timestampMs: 0 },
    { direction: "response", method: "initialize", result: { capabilities: { tools: {} } }, timestampMs: 5 },
    { direction: "request", method: "tools/list", params: {}, timestampMs: 10 },
    { direction: "response", method: "tools/list", result: { tools: [{ name: "echo" }] }, timestampMs: 15 },
  ];
}

describe("ReplayTransport", () => {
  it("replays responses matching by method", async () => {
    const transport = new ReplayTransport(makeEntries());

    const responses: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => responses.push(msg);

    await transport.start();

    // Send initialize request
    await transport.send({ jsonrpc: "2.0", id: 42, method: "initialize", params: {} });

    // Wait for microtask
    await new Promise((r) => setTimeout(r, 0));

    expect(responses).toHaveLength(1);
    const resp = responses[0] as Record<string, unknown>;
    expect(resp["id"]).toBe(42); // ID remapped from cassette
    expect((resp["result"] as Record<string, unknown>)["capabilities"]).toBeDefined();
  });

  it("handles repeated calls to the same method", async () => {
    const entries: CassetteEntry[] = [
      { direction: "response", method: "tools/list", result: { tools: [{ name: "a" }] }, timestampMs: 0 },
      { direction: "response", method: "tools/list", result: { tools: [{ name: "b" }] }, timestampMs: 5 },
    ];

    const transport = new ReplayTransport(entries);
    const responses: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => responses.push(msg);
    await transport.start();

    await transport.send({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    await new Promise((r) => setTimeout(r, 0));

    await transport.send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    await new Promise((r) => setTimeout(r, 0));

    expect(responses).toHaveLength(2);
    expect(((responses[0] as Record<string, unknown>)["result"] as Record<string, unknown>)["tools"]).toEqual([{ name: "a" }]);
    expect(((responses[1] as Record<string, unknown>)["result"] as Record<string, unknown>)["tools"]).toEqual([{ name: "b" }]);
  });

  it("throws when no matching response exists", async () => {
    const transport = new ReplayTransport([]);
    transport.onmessage = () => {};
    await transport.start();

    await expect(
      transport.send({ jsonrpc: "2.0", id: 1, method: "unknown/method" }),
    ).rejects.toThrow("no recorded response");
  });

  it("ignores notifications (no response needed)", async () => {
    const transport = new ReplayTransport([]);
    transport.onmessage = () => {};
    await transport.start();

    // Should not throw — notifications don't expect responses
    await transport.send({ jsonrpc: "2.0", method: "notifications/initialized" });
  });
});
