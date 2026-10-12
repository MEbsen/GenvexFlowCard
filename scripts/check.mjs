import { spawnSync } from "node:child_process";

// Stop at the first failure; use the current Node runtime on every platform.
for(const args of [
  ["scripts/model-test.mjs"],
  ["scripts/provider-test.mjs"],
  ["scripts/animation-test.mjs"],
  ["scripts/build.mjs"],
  ["--check","dist/genvex-flow-card.js"],
  ["scripts/smoke-test.mjs","dist/genvex-flow-card.js"],
  ["scripts/browser-test.mjs"]
]) {
  const result=spawnSync(process.execPath,args,{stdio:"inherit",env:process.env});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
