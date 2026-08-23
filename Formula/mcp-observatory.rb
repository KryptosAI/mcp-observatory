class McpObservatory < Formula
  desc "CI-native security gate for MCP servers"
  homepage "https://github.com/KryptosAI/mcp-observatory"
  url "https://registry.npmjs.org/@kryptosai/mcp-observatory/-/mcp-observatory-1.43.1.tgz"
  sha256 "99a256d4be56e2eae985cba2e59e6d3adbc186eeef74c0e19fb0dc4b3624c08e"
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
