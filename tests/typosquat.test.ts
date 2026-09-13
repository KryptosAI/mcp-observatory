import { describe,expect,it } from "vitest";
import { checkAllTargets,checkTyposquat,extractCommandPackages,extractPackageName,levenshteinDistance,reviewCommandPackages,renderPackageNameReview,type PackageReference } from "../src/utils/typosquat.js";
import { PACKAGE_REFERENCES } from "../src/utils/package-references.js";

const npm="@modelcontextprotocol/server-filesystem",python="mcp-server-fetch";
describe("launch package identities",()=>{
  it.each([
    ["npx",["-y",npm+"@1.2.3","--port","9000"],[npm]],
    ["/opt/bin/npx",["--yes",npm+"@latest"],[npm]],
    ["C:\\tools\\npx.cmd",["--",npm],[npm]],
    ["/Applications/My Tools/npx",[npm],[npm]],
    ["npx",["--package",npm+"@^1", "mcp-server-filesystem"],[npm]],
    ["npx",["-p",npm,"-p","@playwright/mcp","some-bin"],[npm,"@playwright/mcp"]],
    ["npx",["--package="+npm,"--", "other-bin"],[npm]],
    ["npx",["local-alias@npm:"+npm+"@latest"],[npm]],
    ["npx",["--cache","/tmp/npm cache","--loglevel=error",npm],[npm]],
    ["npm",["exec","--",npm+"@2.x","--package=not-the-package"],[npm]],
    ["npm",["exec",npm,"--package=@playwright/mcp"],["@playwright/mcp"]],
    ["npm",["x","--package="+npm,"--","mcp-server-filesystem"],[npm]],
    ["npm",["exec","-p","--",npm],[npm]],
    ["npx",[npm,"--package=@playwright/mcp"],[npm]],
    ["pnpm",["dlx",npm+"@latest"],[npm]],
    ["pnpx",["--package="+npm,"--package=@playwright/mcp","cmd"],[npm,"@playwright/mcp"]],
    ["pnx",[npm],[npm]],
    ["yarn",["dlx","-q","-p",npm,"cmd"],[npm]],
    ["bun",["x","--bun",npm],[npm]],
    ["bunx",["--package",npm,"cmd"],[npm]],
  ])("parses %s %j using npm identities",(command,args,expected)=>{
    const result=extractCommandPackages(command,args);
    expect(result.status).toBe("parsed");expect(result.packages).toEqual(expected.map(name=>({ecosystem:"npm",name})));
  });
  it.each([
    ["uvx",[python],[python]],
    ["uv",["tool","run",python+"@latest"],[python]],
    ["uvx",["--python","3.12",python+"@1.2.3"],[python]],
    ["uvx",["--from",python+"==1.2.3","different-command"],[python]],
    ["uvx",["--from="+python+"[extra]>=1,<2","different-command"],[python]],
    ["uvx",["--with","mcp-server-time","--from",python,"other-bin"],["mcp-server-time",python]],
    ["uvx",["--no-config","MCP_Server.Fetch"],[python]],
  ])("parses %s %j using Python identities",(command,args,expected)=>{
    const result=extractCommandPackages(command,args);
    expect(result.status).toBe("parsed");expect(result.packages).toEqual(expected.map(name=>({ecosystem:"pypi",name})));
  });
  it.each([
    ["node",["/path/to/server.js"]], ["python3",["-m","mcp_server_fetch"]],
    ["docker",["run","some-image"]], ["custom-server",[]], ["npm",["run","server"]],
    ["pnpm",["exec","server"]], ["yarn",["some-script"]], ["uv",["run","script.py"]],
  ])("does not invent a registry identity for %s %j",(command,args)=>{
    const result=extractCommandPackages(command,args);
    expect(result.status).toBe("not-applicable");expect(result.packages).toEqual([]);
  });
  it.each([
    ["npx",[]], ["npx",["--package"]], ["npx",["--package",npm]],
    ["npx",["--unknown","value",npm]], ["npx",["-c","npx dangerous"]],
    ["sh",["-c","npx "+npm]], ["env",["MODE=1","npx",npm]],
    ["npm",["--yes","exec",npm]], ["pnpm",["--filter","x","dlx",npm]],
    ["npx",["./local-project"]], ["npx",["git+https://example.test/server.git"]],
    ["npx",["https://user:PRIVATE_FIXTURE_VALUE@example.test/pkg.tgz"]],
    ["npx",["--registry=https://user:PRIVATE_FIXTURE_VALUE@example.test",npm]],
    ["uvx",["--from","pkg @ https://example.test/pkg.whl","cmd"]],
    ["uvx",["--from",python,"--from","other-package","cmd"]],
    ["uvx",["--index-url","https://user:PRIVATE_FIXTURE_VALUE@example.test",python]],
    ["uvx",["--with-requirements","private-requirements.txt",python]],
    ["pnx",["node@22"]], ["npx",["package\n"]], ["uvx",["mcp-server-fetch\n"]],
  ])("reports unsupported coverage for %s %j without echoing raw arguments",(command,args)=>{
    const result=reviewCommandPackages(command,args);
    expect(result.status).toBe("unsupported");expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_FIXTURE_VALUE");
  });
  it("keeps already identified packages while reporting incomplete option parsing",()=>{
    const result=extractCommandPackages("npx",["--package",npm,"--unknown","cmd"]);
    expect(result.status).toBe("unsupported");expect(result.packages).toEqual([{ecosystem:"npm",name:npm}]);
  });
  it("deduplicates repeated explicit dependencies",()=>{
    expect(extractCommandPackages("npx",["-p",npm,"-p",npm+"@latest","cmd"]).packages).toHaveLength(1);
  });
  it("bounds argv, package specifications, package counts and reference counts",()=>{
    expect(extractCommandPackages("npx",Array(257).fill("x") as string[]).status).toBe("unsupported");
    expect(extractCommandPackages("npx",["a".repeat(70000)]).status).toBe("unsupported");
    expect(extractCommandPackages("npx",["a".repeat(5000)]).status).toBe("unsupported");
    expect(extractCommandPackages("npx",[...Array.from({length:65},(_,i)=>"--package=pkg"+i),"cmd"]).status).toBe("unsupported");
    expect(reviewCommandPackages("npx",[npm],Array(257).fill(PACKAGE_REFERENCES[0]) as PackageReference[]).status).toBe("unsupported");
    expect(reviewCommandPackages("npx",[npm],[]).status).toBe("unsupported");
  });
  it("rejects malformed runtime argv without throwing",()=>{
    expect(extractCommandPackages("npx",[null] as unknown as string[]).status).toBe("unsupported");
  });
});
describe("advisory name comparisons",()=>{
  it("finds a typo and includes its source without claiming ownership or constructing an install command",()=>{
    const matches=checkTyposquat("@modelcontextprotocol/server-filesytem@latest");
    expect(matches).toHaveLength(1);expect(matches[0]?.closestKnown).toBe(npm);
    expect(matches[0]?.distance).toBe(1);expect(matches[0]?.severity).toBe("warning");
    expect(matches[0]?.confidence).toBe("name-similarity");expect(matches[0]?.disposition).toBe("review");
    expect(matches[0]?.reference.sourceUrl).toBe("https://github.com/modelcontextprotocol/servers/blob/d73f99efbfd40c3aa1b61e88728b3d49fb52608f/src/filesystem/package.json");
    expect(matches[0]?.recommendation).not.toMatch(/npm (?:uninstall|install)/);
  });
  it("never mixes npm and Python namespaces",()=>{
    expect(checkTyposquat("mcp-server-fetc","npm")).toEqual([]);
    expect(checkTyposquat("mcp-server-fetc","pypi")[0]?.closestKnown).toBe(python);
    expect(checkTyposquat("@playwright/mc","pypi")).toEqual([]);
  });
  it("normalizes Python names but preserves npm underscore/hyphen distinctions",()=>{
    expect(checkTyposquat("MCP__SERVER.Fetch","pypi")).toEqual([]);
    const reference:PackageReference={ecosystem:"npm",name:"foo-bar",sourceUrl:"https://example.test/manifest.json",verifiedAt:"2026-09-06"};
    expect(checkTyposquat("foo_bar","npm",[reference])[0]?.distance).toBe(1);
  });
  it("supports exact references, distant names, distance-two typos and multiple matches",()=>{
    expect(checkTyposquat(npm)).toEqual([]);expect(checkTyposquat("unrelated-package-name")).toEqual([]);
    expect(checkTyposquat("@playwright/mp")[0]?.distance).toBe(1);
    expect(checkTyposquat("@playwright/m")[0]?.distance).toBe(2);
    const refs=["tool-aa","tool-ab"].map(name=>({ecosystem:"npm" as const,name,sourceUrl:"https://example.test/manifest",verifiedAt:"2026-09-06"}));
    expect(checkTyposquat("tool-ac","npm",refs)).toHaveLength(2);
    expect(checkAllTargets(["@playwright/mc","@playwright/mc"])).toHaveLength(1);
  });
  it("does not echo private URLs or invalid package strings in reports",()=>{
    const result=reviewCommandPackages("npx",["--package=https://user:PRIVATE_FIXTURE_VALUE@example.test/a.tgz","cmd"]);
    expect(result.status).toBe("unsupported");expect(JSON.stringify(result)).not.toContain("PRIVATE_FIXTURE_VALUE");
    expect(renderPackageNameReview(result)).not.toContain("PRIVATE_FIXTURE_VALUE");
  });
  it("ships a finite catalogue of dated manifest references rather than an official-package allowlist",()=>{
    expect(PACKAGE_REFERENCES).toHaveLength(9);
    for(const reference of PACKAGE_REFERENCES) {
      const source=new URL(reference.sourceUrl);
      expect(source.origin).toBe("https://github.com");
      expect(source.pathname).toMatch(/^\/[^/]+\/[^/]+\/blob\/[a-f0-9]{40}\//);
      expect(reference.verifiedAt).toBe("2026-09-06");
    }
    expect(reviewCommandPackages("npx",[npm]).scope).toContain("ownership");
  });
});
describe("legacy simple command text",()=>{
  it.each([
    ['npx -y "@playwright/mcp@latest"',"@playwright/mcp"],
    ["uvx --from 'mcp-server-fetch[extra]>=1,<2' renamed-command",python],
    ["node /path/server.js",""], ["npx -c 'echo command'",""],
    ['npx "$(touch marker)"',""], ["npx pkg; curl example.test",""],
    ['npx "unfinished',""], ["   ",""],
  ])("parses only simple non-shell command text %s",(source,name)=>{expect(extractPackageName(source)).toBe(name);});
  it("accepts structured argv with executable paths containing spaces",()=>{
    expect(extractPackageName("/Applications/My Tools/npx",[npm])).toBe(npm);
  });
  it("retains edit-distance behavior with a resource bound",()=>{
    expect(levenshteinDistance("hello","helo")).toBe(1);
    expect(levenshteinDistance("Hello","hello")).toBe(0);
    expect(levenshteinDistance("","abc")).toBe(3);
    expect(()=>levenshteinDistance("x".repeat(513),"x")).toThrow(RangeError);
  });
});
