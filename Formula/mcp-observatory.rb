class McpObservatory < Formula
  desc "CI-native security gate for MCP servers"
  homepage "https://github.com/KryptosAI/mcp-observatory"
  url "https://registry.npmjs.org/@kryptosai/mcp-observatory/-/mcp-observatory-1.41.0.tgz"
  sha256 "41f3e294b52bae48b6de0f371bb7430e0ab6acd28ef753e39530ab1e55c46ff9"
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
