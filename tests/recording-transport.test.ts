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
    await recorder.send({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} } as JSONRPCMessage);

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
    await recorder.send({ jsonrpc: "2.0", method: "notifications/initialized" } as JSONRPCMessage);

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
    await recorder.send({ jsonrpc: "2.0", id: 1, method: "tools/list" } as JSONRPCMessage);
    await recorder.send({ jsonrpc: "2.0", id: 2, method: "prompts/list" } as JSONRPCMessage);

    // Responses arrive in order
    inner.simulateResponse({ jsonrpc: "2.0", id: 1, result: { tools: [] } } as unknown as JSONRPCMessage);
    inner.simulateResponse({ jsonrpc: "2.0", id: 2, result: { prompts: [] } } as unknown as JSONRPCMessage);

    const entries = recorder.getEntries();
    const responses = entries.filter((e) => e.direction === "response");
    expect(responses).toHaveLength(2);
    expect(responses[0]!.method).toBe("tools/list");
    expect(responses[1]!.method).toBe("prompts/list");
  });
});
