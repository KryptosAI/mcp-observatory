#!/usr/bin/env node

import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

run("npm run lint");
run("npm run typecheck");
run("npm test");
run("npm run build");

process.stdout.write("\nRelease checks passed.\n");
process.stdout.write("Next steps:\n");
process.stdout.write("1. Update CHANGELOG or release notes.\n");
process.stdout.write("2. Create a git tag.\n");
process.stdout.write("3. Publish a GitHub release.\n");
