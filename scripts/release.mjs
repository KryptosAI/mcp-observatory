#!/usr/bin/env node

import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

run("npm run lint");
run("npm run typecheck");
run("npm test");
run("npm run build");
run("npm run verify:packed-install");

process.stdout.write("\nRelease checks passed.\n");
process.stdout.write("Next steps:\n");
process.stdout.write("1. Update CHANGELOG or release notes.\n");
process.stdout.write("2. Confirm the repo has an NPM_TOKEN secret or local npm auth if this release should publish to npm.\n");
process.stdout.write("3. Create and push the git tag.\n");
process.stdout.write("4. Verify the GitHub release asset and, when configured, the npm package install path.\n");
