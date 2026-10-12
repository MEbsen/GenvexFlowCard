import fs from "node:fs";
import { build } from "esbuild";
const version=fs.readFileSync("VERSION","utf8").trim();
if(!/^\d+\.\d+\.\d+(?:-dev\.\d+)?$/.test(version))throw new Error(`Invalid VERSION: ${version}`);
await build({entryPoints:["src/ventilation-flow-card.js"],bundle:true,format:"iife",target:"es2020",minify:true,outfile:"dist/genvex-flow-card.js",define:{__CARD_VERSION__:JSON.stringify(version)}});
await import("./apply-version.mjs");
