#!/usr/bin/env node

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  process.stderr.write("Usage: node scripts/update-homebrew-formula.mjs <semver>\n");
  process.exit(1);
}

const url = `https://registry.npmjs.org/@kryptosai/mcp-observatory/-/mcp-observatory-${version}.tgz`;
const response = await fetch(url);
if (!response.ok) {
  process.stderr.write(`Failed to download ${url} (${response.status})\n`);
  process.exit(1);
}
const body = Buffer.from(await response.arrayBuffer());
const sha256 = createHash("sha256").update(body).digest("hex");

const formula = `class McpObservatory < Formula
  desc "CI-native security gate for MCP servers"
  homepage "https://github.com/KryptosAI/mcp-observatory"
  url "${url}"
  sha256 "${sha256}"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/mcp-observatory --version")
  end
end
`;

writeFileSync(path.join("Formula", "mcp-observatory.rb"), formula);
process.stdout.write(`Updated Formula/mcp-observatory.rb to ${version} (${sha256})\n`);
