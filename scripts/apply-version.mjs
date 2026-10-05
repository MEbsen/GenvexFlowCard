import fs from "node:fs";

const version = fs.readFileSync("VERSION", "utf8").trim();
if (!/^\d+\.\d+\.\d+(?:-dev\.\d+)?$/.test(version)) {
  throw new Error(`Invalid VERSION: ${version}`);
}

const path = "dist/genvex-flow-card.js";
let source = fs.readFileSync(path, "utf8");
source = source.replace(/1\.1\.2-dev\.4/g, version);

if (source.includes("1.0.1") || source.includes("VENTILATION-FLOW-CARD")) {
  throw new Error("Private legacy version/banner leaked into release bundle");
}
if (!source.includes(version)) {
  throw new Error(`Built bundle does not contain public version ${version}`);
}

fs.writeFileSync(path, source);
