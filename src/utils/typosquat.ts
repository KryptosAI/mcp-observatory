import path from "node:path";
import npa from "npm-package-arg";
import { PACKAGE_REFERENCES, type PackageEcosystem, type PackageReference } from "./package-references.js";
export type {PackageEcosystem,PackageReference} from "./package-references.js";

export interface PackageIdentity {ecosystem:PackageEcosystem;name:string}
export interface PackageExtraction {
  status:"parsed"|"not-applicable"|"unsupported";
  packages:PackageIdentity[];
  diagnostics:string[];
}
export interface TyposquatMatch {
  packageName:string;
  ecosystem:PackageEcosystem;
  closestKnown:string;
  distance:number;
  severity:"warning";
  confidence:"name-similarity";
  disposition:"review";
  reference:PackageReference;
  recommendation:string;
}
export interface PackageNameReview extends PackageExtraction {
  schemaVersion:"package-name-review-v1";
  findings:TyposquatMatch[];
  referenceCount:number;
  scope:string;
}
const SCOPE="Lexical comparison of explicit registry-package requests against a limited source-backed reference list. " +
  "No registry/network lookup, ownership verification, package execution, dependency scan or safety certification. " +
  "Local installs, registry configuration, resolution overrides and current publisher control are unverified.";
const LIMITS={args:256,totalCharacters:65536,specCharacters:4096,packages:64,references:256,nameCharacters:214};
function isArgv(value:unknown):value is readonly string[] {
  return Array.isArray(value) && value.every((arg:unknown)=>typeof arg==="string" && !arg.includes("\0"));
}
function normalizePython(name:string):string {return name.toLowerCase().replace(/[-_.]+/g,"-");}
function pythonName(spec:string,commandVersion=false):string|undefined {
  const pattern=commandVersion
    ? /^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)(?:@(?:latest|[A-Za-z0-9][A-Za-z0-9.+!-]*))?$/
    : /^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)(?:\[[A-Za-z0-9._-]+(?:,[A-Za-z0-9._-]+)*\])?(?:\s*(?:===|==|!=|~=|<=|>=|<|>)\s*[A-Za-z0-9.*+!-]+(?:\s*,\s*(?:===|==|!=|~=|<=|>=|<|>)\s*[A-Za-z0-9.*+!-]+)*)?$/;
  // JavaScript '$' permits a final newline, which is not part of a valid name.
  if (/[\r\n\0]/.test(spec)) return undefined;
  const match=pattern.exec(spec);
  return match?.[1] && match[1].length<=LIMITS.nameCharacters ? normalizePython(match[1]):undefined;
}
function packageIdentity(spec:string,ecosystem:PackageEcosystem,commandVersion=false):PackageIdentity|undefined {
  if (!spec || spec.length>LIMITS.specCharacters || /[\r\n\0]/.test(spec)) return undefined;
  if(ecosystem==="pypi") {const name=pythonName(spec,commandVersion);return name?{ecosystem,name}:undefined;}
  try {
    let parsed=npa(spec,"/");
    if(parsed.type==="alias") parsed=(parsed as npa.AliasResult).subSpec;
    if(!parsed.registry || !["tag","version","range"].includes(parsed.type) || !parsed.name || parsed.name.length>LIMITS.nameCharacters) return undefined;
    return {ecosystem,name:parsed.name};
  } catch {return undefined;}
}

/** Reads argv only; it never evaluates a shell or launches a package manager. */
export function extractCommandPackages(command:string,args:readonly string[]=[]):PackageExtraction {
  const result:PackageExtraction={status:"parsed",packages:[],diagnostics:[]};
  const unsupported=(reason:string)=>{result.status="unsupported";if(!result.diagnostics.includes(reason))result.diagnostics.push(reason);};
  if(typeof command!=="string" || !isArgv(args) || args.length>LIMITS.args || command.includes("\0") ||
      command.length+args.reduce((n,arg)=>n+arg.length,0)>LIMITS.totalCharacters) {
    unsupported("Command exceeds supported argv limits or contains invalid arguments.");return result;
  }
  const executable=path.win32.basename(path.basename(command)).replace(/\.(?:exe|cmd|bat)$/i,"").toLowerCase();
  let wrapper=executable, offset=0;
  if(executable==="npm") {
    if(args[0]?.startsWith("-")){unsupported("Options before the npm subcommand require explicit launch review.");return result;}
    if(!["exec","x"].includes(args[0]??"")) {
      result.status="not-applicable";result.diagnostics.push("npm scripts and installation commands do not identify a supported tool launch.");return result;
    }
    wrapper="npm-exec";offset=1;
  } else if(executable==="pnpm" || executable==="yarn") {
    if(args[0]?.startsWith("-")){unsupported("Options before the package-manager subcommand require explicit launch review.");return result;}
    if(args[0]!=="dlx") {result.status="not-applicable";result.diagnostics.push("Only the dlx tool-launch subcommand is analyzed for this wrapper.");return result;}
    wrapper=executable+"-dlx";offset=1;
  } else if(executable==="bun") {
    if(args[0]?.startsWith("-")){unsupported("Options before the bun subcommand require explicit launch review.");return result;}
    if(args[0]!=="x") {result.status="not-applicable";result.diagnostics.push("Only bun x tool launches are analyzed.");return result;}
    wrapper="bunx";offset=1;
  } else if(executable==="uv") {
    if(args[0]?.startsWith("-")){unsupported("Options before the uv subcommand require explicit launch review.");return result;}
    if(args[0]!=="tool" || args[1]!=="run") {result.status="not-applicable";result.diagnostics.push("Only uv tool run launches are analyzed.");return result;}
    wrapper="uvx";offset=2;
  }
  if(!["npx","npm-exec","pnpm-dlx","pnpx","pnx","yarn-dlx","bunx","uvx"].includes(wrapper)) {
    result.status=["sh","bash","zsh","fish","cmd","powershell","pwsh","env"].includes(executable)?"unsupported":"not-applicable";
    result.diagnostics.push(result.status==="unsupported"?"Shell and environment-wrapper commands need explicit argv review.":"Direct executables and local scripts do not identify a registry package.");
    return result;
  }
  const python=wrapper==="uvx", ecosystem:PackageEcosystem=python?"pypi":"npm";
  const specs:Array<{spec:string;commandVersion:boolean}>=[];
  let from:string|undefined, positional:string|undefined, explicit=false;
  const add=(spec:string,commandVersion=false)=>{specs.push({spec,commandVersion});};
  const argv=args.slice(offset);
  for(let i=0;i<argv.length;i++) {
    const arg=argv[i]!;
    if(arg==="--") {positional??=argv[i+1];break;}
    if(!arg.startsWith("-")) {
      positional??=arg;
      // npm exec processes options even after positional arguments until '--'.
      if(wrapper!=="npm-exec") break;
      continue;
    }
    const equal=arg.indexOf("="), key=equal<0?arg:arg.slice(0,equal);
    const value=()=>{
      const found=equal<0?argv[++i]:arg.slice(equal+1);
      if(found===undefined || found==="" || found.startsWith("--")) unsupported("A wrapper option is missing its value.");
      return found;
    };
    const packageFlag=key==="--package" || key==="-p" && ["npx","bunx","yarn-dlx"].includes(wrapper);
    if(!python && packageFlag) {explicit=true;const spec=value();if(spec)add(spec);continue;}
    if(python && ["--from","--with"].includes(key)) {
      const spec=value();if(spec){if(key==="--from"){if(from!==undefined)unsupported("Repeated --from options require review.");from=spec;}else add(spec);}continue;
    }
    if((python && ["-p","--python","--cache-dir","--directory","--project"].includes(key)) ||
      (!python && ["--cache","--loglevel","--userconfig","--prefix","--cwd","--allow-build"].includes(key))) {
      value();
      if(["--userconfig","--prefix","--cwd","--directory","--project"].includes(key)) unsupported("Launch context or configuration override requires separate resolution review.");
      continue;
    }
    if(["--registry","--index","--index-url","--default-index","--extra-index-url","--find-links","--with-requirements","--with-executables-from"].includes(key)) {
      value();unsupported("Alternate sources or dependency-file inputs are not resolved by name review.");continue;
    }
    if(["-c","--call","--shell-mode","--script-shell","--shell"].includes(key)) {
      unsupported("Shell-mode execution is outside argv package-name analysis.");break;
    }
    const bools=python
      ? ["--isolated","--offline","--no-cache","--no-config","--no-progress","--refresh","--quiet","-q","--verbose","-v","--no-python-downloads"]
      : wrapper==="npm-exec"
        ? ["--yes","-y","--no","--no-install","--quiet","-q","--silent","--offline","--prefer-offline","--ignore-scripts","--parseable","-p"]
        : ["--yes","-y","--no","--no-install","--quiet","-q","--silent","-s","--offline","--prefer-offline","--ignore-scripts","--bun"];
    if(bools.includes(key) && (equal<0 || ["true","false"].includes(arg.slice(equal+1)))) continue;
    unsupported("Unrecognized wrapper option; package selection may be incomplete.");
    break;
  }
  if(python) {
    if(from!==undefined)add(from);
    else if(positional)add(positional,true);
  } else if(!explicit && positional) add(positional);
  if(!positional) unsupported("No executable/package positional argument was found.");
  if(specs.length>LIMITS.packages)unsupported("Explicit package limit reached.");
  const seen=new Set<string>();
  for(const {spec,commandVersion} of specs.slice(0,LIMITS.packages)) {
    const parsed=packageIdentity(spec,ecosystem,commandVersion);
    if(!parsed){unsupported("A package request is invalid or uses an unsupported non-registry source/specifier.");continue;}
    // pnpm 12 can provision these runtimes instead of resolving the same npm name.
    if(["pnx","pnpx","pnpm-dlx"].includes(wrapper) && ["node","deno","npm","yarn","bun"].includes(parsed.name)) {
      unsupported("Runtime/package-manager provisioning is version-dependent and not analyzed.");continue;
    }
    const key=JSON.stringify([parsed.ecosystem,parsed.name]);if(seen.has(key))continue;
    seen.add(key);result.packages.push(parsed);
  }
  if(!result.packages.length && result.status==="parsed")unsupported("No explicit registry package could be identified.");
  return result;
}

export function levenshteinDistance(a:string,b:string):number {
  if(a.length>512 || b.length>512)throw new RangeError("Edit-distance inputs exceed the supported length.");
  const s=a.toLowerCase(),t=b.toLowerCase();
  let previous=Array.from({length:t.length+1},(_,i)=>i);
  for(let i=1;i<=s.length;i++) {
    const current=[i];
    for(let j=1;j<=t.length;j++)current[j]=Math.min(previous[j]!+1,current[j-1]!+1,previous[j-1]!+(s[i-1]===t[j-1]?0:1));
    previous=current;
  }
  return previous[t.length]!;
}
export function checkTyposquat(spec:string,ecosystem:PackageEcosystem="npm",references:readonly PackageReference[]=PACKAGE_REFERENCES):TyposquatMatch[] {
  const identity=packageIdentity(spec,ecosystem);
  if(!identity)return [];
  const eligible=references.slice(0,LIMITS.references).filter(ref=>ref.ecosystem===ecosystem && ref.name.length<=LIMITS.nameCharacters);
  const canonical=(name:string)=>ecosystem==="pypi"?normalizePython(name):name.toLowerCase();
  if(eligible.some(ref=>canonical(ref.name)===canonical(identity.name)))return [];
  return eligible.flatMap(reference=>{
    if(Math.abs(identity.name.length-canonical(reference.name).length)>2)return [];
    const distance=levenshteinDistance(identity.name,canonical(reference.name));
    if(distance===0 || distance>2)return [];
    return [{packageName:identity.name,ecosystem,closestKnown:reference.name,distance,severity:"warning" as const,
      confidence:"name-similarity" as const,disposition:"review" as const,reference,
      recommendation:"Compare the intended package with its upstream manifest and registry publisher before running it. Similarity does not establish typosquatting; no replacement is verified."}];
  }).sort((a,b)=>a.distance-b.distance || a.closestKnown.localeCompare(b.closestKnown));
}
export function checkAllTargets(names:string[],ecosystem:PackageEcosystem="npm"):TyposquatMatch[] {
  return [...new Set(names)].flatMap(name=>checkTyposquat(name,ecosystem));
}
export function reviewCommandPackages(command:string,args:readonly string[]=[],references:readonly PackageReference[]=PACKAGE_REFERENCES):PackageNameReview {
  const parsed=extractCommandPackages(command,args);
  if(!references.length){parsed.status="unsupported";parsed.diagnostics.push("No package reference catalogue was supplied.");}
  if(references.length>LIMITS.references){parsed.status="unsupported";parsed.diagnostics.push("Reference catalogue limit reached.");}
  return {...parsed,schemaVersion:"package-name-review-v1",referenceCount:Math.min(references.length,LIMITS.references),scope:SCOPE,
    findings:parsed.packages.flatMap(pkg=>checkTyposquat(pkg.name,pkg.ecosystem,references))};
}
export function renderTyposquatWarnings(matches:TyposquatMatch[]):string {
  return matches.map(match=>`REVIEW package name (${match.ecosystem}): ${JSON.stringify(match.packageName)} resembles ${JSON.stringify(match.closestKnown)} (edit distance ${match.distance}).\n`+
    `  Reference: ${JSON.stringify(match.reference.sourceUrl)}\n  ${match.recommendation}`).join("\n");
}
export function renderPackageNameReview(review:PackageNameReview):string {
  return [`Package-name review: ${review.status}; ${review.packages.length} package requests; ${review.findings.length} advisory similarities.`,
    SCOPE,renderTyposquatWarnings(review.findings),...review.diagnostics.map(reason=>`COVERAGE: ${reason}`)].filter(Boolean).join("\n")+"\n";
}

/** Legacy convenience for simple quoted POSIX command text. Structured argv is preferred. */
export function extractPackageName(command:string,args?:readonly string[]):string {
  if(args!==undefined)return extractCommandPackages(command,args).packages[0]?.name??"";
  const words:string[]=[];let word="",quote="",escape=false;
  for(const char of command.trim()) {
    if(escape){word+=char;escape=false;continue;}
    if(char==="\\" && quote!=="'"){escape=true;continue;}
    if(quote){if(char===quote)quote="";else {if(quote==='"' && /[$`]/.test(char))return "";word+=char;}continue;}
    if(char==="'" || char==='"'){quote=char;continue;}
    if(/[|;&<>$`\r\n]/.test(char))return "";
    if(/\s/.test(char)){if(word){words.push(word);word="";}}else word+=char;
  }
  if(quote || escape)return "";if(word)words.push(word);
  const executable=words.shift();return executable?extractCommandPackages(executable,words).packages[0]?.name??"":"";
}
