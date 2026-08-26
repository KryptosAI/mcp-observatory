class McpObservatory < Formula
  desc "CI-native security gate for MCP servers"
  homepage "https://github.com/KryptosAI/mcp-observatory"
  url "https://registry.npmjs.org/@kryptosai/mcp-observatory/-/mcp-observatory-1.44.1.tgz"
  sha256 "4a48ced4647098b72bc5c95f1056de2576aba441589fbf5558f0bd610dca6e52"
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
