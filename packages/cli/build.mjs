// Bundles the CLI and the repository's runner (scripts/runner.ts) into packages/cli/dist.
// Run from the repository root: node packages/cli/build.mjs
import { build } from "esbuild";
import { readFileSync, rmSync, chmodSync } from "node:fs";

const pkg = JSON.parse(readFileSync("packages/cli/package.json", "utf8"));
rmSync("packages/cli/dist", { recursive: true, force: true });
const common = {
  bundle: true, platform: "node", format: "esm", target: "node18", logLevel: "warning",
  external: ["playwright-core"], alias: { playwright: "playwright-core" }, legalComments: "none"
};
await build({ ...common, entryPoints: ["packages/cli/src/cli.ts"], outfile: "packages/cli/dist/cli.js", external: [...common.external, "./runner.js"], banner: { js: "#!/usr/bin/env node" }, define: { __VERSION__: JSON.stringify(pkg.version) } });
await build({ ...common, entryPoints: ["scripts/runner.ts"], outfile: "packages/cli/dist/runner.js" });
chmodSync("packages/cli/dist/cli.js", 0o755);
console.log(`built lazy-apply ${pkg.version}`);
