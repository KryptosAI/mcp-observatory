class McpObservatory < Formula
  desc "CI-native security gate for MCP servers"
  homepage "https://github.com/KryptosAI/mcp-observatory"
  url "https://registry.npmjs.org/@kryptosai/mcp-observatory/-/mcp-observatory-1.43.0.tgz"
  sha256 "6ac5d7fb0e973fffbb7ac872749f77322c15cc5d47449355b4448b56b9e1ebd5"
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
