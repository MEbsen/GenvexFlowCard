import fs from "node:fs";
const source=fs.readFileSync("genvex-flow-card-core.js","utf8");
fs.mkdirSync("src/generated",{recursive:true});
fs.writeFileSync("src/generated/legacy-card-core.js",source);
