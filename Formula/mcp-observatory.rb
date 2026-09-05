class McpObservatory < Formula
  desc "CI-native security gate for MCP servers"
  homepage "https://github.com/KryptosAI/mcp-observatory"
  url "https://registry.npmjs.org/@kryptosai/mcp-observatory/-/mcp-observatory-1.45.5.tgz"
  sha256 "55a6bb54d36a6128bd48bc08bce8eef8e2f7e3dbedc7c16cfdad069aa475163e"
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
