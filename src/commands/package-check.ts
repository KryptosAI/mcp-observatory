import { Option,type Command } from "commander";
import { renderPackageNameReview,reviewCommandPackages } from "../utils/typosquat.js";
import { getPassthroughArgs } from "./helpers.js";

export function registerPackageCheckCommands(program:Command):void {
  program.command("package-check [command...]")
    .description("Review package-name similarity in a launch command without executing it. Put reviewer options before '--'.")
    .addOption(new Option("--format <format>","Output format.").choices(["terminal","json"]).default("terminal"))
    .passThroughOptions()
    .action((argv:string[],options:{format:string})=>{
      // Shared CLI helpers remove the first '--' before Commander runs. When
      // the executable preceded it, restore that separator for the wrapper.
      const passthrough=getPassthroughArgs();
      const launch=argv.length ? [...argv,...(passthrough.length?["--",...passthrough]:[])] : passthrough;
      if(!launch.length)throw new Error("Provide a launch command after package-check --.");
      const result=reviewCommandPackages(launch[0]!,launch.slice(1));
      process.stdout.write(options.format==="json"?JSON.stringify(result,null,2)+"\n":renderPackageNameReview(result));
      if(result.status==="unsupported")process.exitCode=2;
    });
}
