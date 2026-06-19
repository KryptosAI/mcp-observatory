import { describe, expect, it } from "vitest";

import { RecordingTransport } from "../src/transport/recording-transport.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

/** A minimal fake transport for testing the recording decorator. */
function createFakeTransport(): Transport & { simulateResponse(msg: JSONRPCMessage): void } {
  const transport: Transport & { simulateResponse(msg: JSONRPCMessage): void } = {
    async start() { /* no-op */ },
    async send() { /* no-op */ },
    async close() { /* no-op */ },
    simulateResponse(msg: JSONRPCMessage) {
      this.onmessage?.(msg);
    },
  };
  return transport;
}

describe("RecordingTransport", () => {
  it("records outgoing requests and incoming responses", async () => {
    const inner = createFakeTransport();
    const recorder = new RecordingTransport(inner);

    // Install our own onmessage so the recorder forwards to it
    const received: JSONRPCMessage[] = [];
    recorder.onmessage = (msg) => received.push(msg);

    await recorder.start();

    // Send a request
    await recorder.send({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });

    // Simulate response from inner transport
    inner.simulateResponse({ jsonrpc: "2.0", id: 1, result: { tools: [] } } as unknown as JSONRPCMessage);

    const entries = recorder.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]!.direction).toBe("request");
    expect(entries[0]!.method).toBe("tools/list");
    expect(entries[1]!.direction).toBe("response");
    expect(entries[1]!.method).toBe("tools/list");
    expect(entries[1]!.result).toEqual({ tools: [] });

    // Verify the response was forwarded
    expect(received).toHaveLength(1);
  });

  it("records notifications", async () => {
    const inner = createFakeTransport();
    const recorder = new RecordingTransport(inner);
    recorder.onmessage = () => {};
    await recorder.start();

    // Send a notification (no id)
    await recorder.send({ jsonrpc: "2.0", method: "notifications/initialized" });

    const entries = recorder.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.direction).toBe("notification");
    expect(entries[0]!.method).toBe("notifications/initialized");
  });

  it("matches responses to requests by id", async () => {
    const inner = createFakeTransport();
    const recorder = new RecordingTransport(inner);
    recorder.onmessage = () => {};
    await recorder.start();

    // Send two requests
    await recorder.send({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    await recorder.send({ jsonrpc: "2.0", id: 2, method: "prompts/list" });

    // Responses arrive in order
    inner.simulateResponse({ jsonrpc: "2.0", id: 1, result: { tools: [] } } as unknown as JSONRPCMessage);
    inner.simulateResponse({ jsonrpc: "2.0", id: 2, result: { prompts: [] } } as unknown as JSONRPCMessage);

    const entries = recorder.getEntries();
    const responses = entries.filter((e) => e.direction === "response");
    expect(responses).toHaveLength(2);
    expect(responses[0]!.method).toBe("tools/list");
    expect(responses[1]!.method).toBe("prompts/list");
  });

  it("matches responses correctly when they arrive out of order", async () => {
    const inner = createFakeTransport();
    const recorder = new RecordingTransport(inner);
    recorder.onmessage = () => {};
    await recorder.start();

    // Send three concurrent requests
    await recorder.send({ jsonrpc: "2.0", id: 10, method: "tools/list" });
    await recorder.send({ jsonrpc: "2.0", id: 20, method: "prompts/list" });
    await recorder.send({ jsonrpc: "2.0", id: 30, method: "resources/list" });

    // Responses arrive out of order: 20, 30, 10
    inner.simulateResponse({ jsonrpc: "2.0", id: 20, result: { prompts: [] } } as unknown as JSONRPCMessage);
    inner.simulateResponse({ jsonrpc: "2.0", id: 30, result: { resources: [] } } as unknown as JSONRPCMessage);
    inner.simulateResponse({ jsonrpc: "2.0", id: 10, result: { tools: [] } } as unknown as JSONRPCMessage);

    const entries = recorder.getEntries();
    const responses = entries.filter((e) => e.direction === "response");
    expect(responses).toHaveLength(3);
    // Responses should be matched to their original method regardless of arrival order
    expect(responses[0]!.method).toBe("prompts/list");
    expect(responses[0]!.result).toEqual({ prompts: [] });
    expect(responses[1]!.method).toBe("resources/list");
    expect(responses[1]!.result).toEqual({ resources: [] });
    expect(responses[2]!.method).toBe("tools/list");
    expect(responses[2]!.result).toEqual({ tools: [] });
  });
});
