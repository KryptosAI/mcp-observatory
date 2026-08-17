import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "mcp-observatory-demo",
  version: "1.0.0",
});

server.registerTool(
  "echo",
  { description: "Echoes a fixed demo string." },
  async () => ({
    content: [{ type: "text", text: "echo" }],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
