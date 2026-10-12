import fs from "node:fs";

const version = fs.readFileSync("VERSION", "utf8").trim();
if (!/^\d+\.\d+\.\d+(?:-dev\.\d+)?$/.test(version)) {
  throw new Error(`Invalid VERSION: ${version}`);
}

const path = "dist/genvex-flow-card.js";
const source = fs.readFileSync(path, "utf8");

if (source.includes("1.0.1") || source.includes("VENTILATION-FLOW-CARD")) {
  throw new Error("Private legacy version/banner leaked into release bundle");
}
if (!source.includes(version)) {
  throw new Error(`Built bundle does not contain public version ${version}`);
}

// VERSION is injected during compilation; validation must never rewrite it.
