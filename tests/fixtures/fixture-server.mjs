import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "fixture-server",
  version: "1.0.0"
});

server.registerTool(
  "echo",
  {
    description: "Echoes the provided text."
  },
  async () => ({
    content: [
      {
        type: "text",
        text: "echo"
      }
    ]
  }),
);

server.registerPrompt(
  "daily-brief",
  {
    description: "Returns a simple briefing prompt.",
    argsSchema: {
      topic: z.string().optional()
    }
  },
  async ({ topic = "MCP regression intelligence" }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Prepare a short brief about ${topic}.`
        }
      }
    ]
  }),
);

server.registerResource(
  "roadmap",
  "file://fixture/roadmap.txt",
  {
    description: "Static roadmap resource.",
    mimeType: "text/plain",
    title: "Roadmap"
  },
  async () => ({
    contents: [
      {
        uri: "file://fixture/roadmap.txt",
        text: "Phase 1: CLI. Phase 2: corpus. Phase 3: optional site."
      }
    ]
  }),
);

server.registerResource(
  "case-study",
  new ResourceTemplate("memory://cases/{id}", {
    list: async () => ({
      resources: [
        {
          name: "Fixture Case",
          title: "Fixture Case",
          uri: "memory://cases/fixture"
        }
      ]
    })
  }),
  {
    description: "Templated case-study resources.",
    mimeType: "text/plain",
    title: "Case Study"
  },
  async (uri, variables) => ({
    contents: [
      {
        uri: uri.toString(),
        text: `Case study for ${variables.id}.`
      }
    ]
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
