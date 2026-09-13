export type PackageEcosystem = "npm" | "pypi";
export interface PackageReference {
  ecosystem:PackageEcosystem;
  name:string;
  sourceUrl:string;
  verifiedAt:string;
}
const servers="https://github.com/modelcontextprotocol/servers/blob/d73f99efbfd40c3aa1b61e88728b3d49fb52608f/src/";
const checked="2026-09-06";
/** Names checked against upstream manifests. This is not an ownership or safety allowlist. */
export const PACKAGE_REFERENCES:readonly PackageReference[] = Object.freeze([
  {ecosystem:"npm",name:"@modelcontextprotocol/server-filesystem",sourceUrl:servers+"filesystem/package.json",verifiedAt:checked},
  {ecosystem:"npm",name:"@modelcontextprotocol/server-memory",sourceUrl:servers+"memory/package.json",verifiedAt:checked},
  {ecosystem:"npm",name:"@modelcontextprotocol/server-sequential-thinking",sourceUrl:servers+"sequentialthinking/package.json",verifiedAt:checked},
  {ecosystem:"npm",name:"@modelcontextprotocol/server-everything",sourceUrl:servers+"everything/package.json",verifiedAt:checked},
  {ecosystem:"pypi",name:"mcp-server-fetch",sourceUrl:servers+"fetch/pyproject.toml",verifiedAt:checked},
  {ecosystem:"pypi",name:"mcp-server-git",sourceUrl:servers+"git/pyproject.toml",verifiedAt:checked},
  {ecosystem:"pypi",name:"mcp-server-time",sourceUrl:servers+"time/pyproject.toml",verifiedAt:checked},
  {ecosystem:"npm",name:"@playwright/mcp",sourceUrl:"https://github.com/microsoft/playwright-mcp/blob/8a13ef8e9f7385a0f89477922127f31cbfde9761/package.json",verifiedAt:checked},
  {ecosystem:"npm",name:"@upstash/context7-mcp",sourceUrl:"https://github.com/upstash/context7/blob/6836bb4720a44fbce87f71548576c3145892d75f/packages/mcp/package.json",verifiedAt:checked},
].map(reference=>Object.freeze(reference as PackageReference)));
