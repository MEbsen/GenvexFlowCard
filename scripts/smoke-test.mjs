import fs from "node:fs";
const file=process.argv[2]||"dist/genvex-flow-card.js";
const source=fs.readFileSync(file,"utf8");
for(const required of ["customElements.define(\"genvex-flow-card\"","class DanfossAirAdapter","class GenvexConnectAdapter","VENTILATION FLOW CARD"]){if(!source.includes(required))throw new Error(`Missing ${required}`)}
if(/import\s*\(/.test(source)||/^\s*import\s/m.test(source))throw new Error("Bundle contains unresolved import");
const registry=[];
globalThis.HTMLElement=class{};
globalThis.window=globalThis;
globalThis.customElements={define(name,type){if(registry.includes(name))throw new Error(`Duplicate custom element ${name}`);registry.push(name)},get(){return undefined}};
globalThis.document={createElement(){return {}}};
try{new Function(source)()}catch(error){throw new Error(`Bundle boot smoke test failed: ${error.stack||error}`)}
if(!registry.includes("genvex-flow-card"))throw new Error("Card did not register genvex-flow-card");
console.log("Bundle smoke test OK",registry);
