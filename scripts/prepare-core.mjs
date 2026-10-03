import fs from "node:fs";

// Transitional compatibility step: keep the proven renderer as a normal
// source module while the UI is split into smaller modules. The build no
// longer generates/imports a file named legacy-card-core.
const source = fs.readFileSync("genvex-flow-card-core.js", "utf8")
  .replace(/^const CARD_VERSION=.*?;\s*/m, "")
  .replace(/console\.(?:info|log)\([^\n]*VENTILATION-FLOW-CARD[^\n]*\);?/g, "");

fs.writeFileSync("src/card-core.js", source);
