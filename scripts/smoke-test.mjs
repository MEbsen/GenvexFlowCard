import fs from "node:fs";
const file=process.argv[2]||"dist/genvex-flow-card.js";
const source=fs.readFileSync(file,"utf8");

// esbuild is free to rename/minify class declarations, so test observable
// bundle behaviour instead of requiring source-level class names.
for(const required of ["genvex-flow-card","Danfoss Air","Genvex Connect","VENTILATION FLOW CARD"]){
  if(!source.includes(required)) throw new Error(`Missing bundled capability: ${required}`);
}
for(const capability of ["filter_months_setting","fan_rpm_supply","fan_rpm_extract","cts400_humidity_low_level","cts400_humidity_high_max_time"]){
  if(!source.includes(capability)) throw new Error(`Missing Genvex capability: ${capability}`);
}
for(const contract of ["controlMode","normalizedPercent","capabilities","Card v"]){
  if(!source.includes(contract)) throw new Error(`Missing common provider-model contract: ${contract}`);
}
if(/import\s*\(/.test(source)||/^\s*import\s/m.test(source)) throw new Error("Bundle contains unresolved import");

const registry=new Map();
globalThis.HTMLElement=class{};
globalThis.window=globalThis;
globalThis.customCards=[];
globalThis.customElements={
  define(name,type){if(registry.has(name))throw new Error(`Duplicate custom element ${name}`);registry.set(name,type)},
  get(name){return registry.get(name)}
};
globalThis.document={createElement(){return {}}};

try{new Function(source)()}catch(error){throw new Error(`Bundle boot smoke test failed: ${error.stack||error}`)}
if(!registry.has("genvex-flow-card")) throw new Error("Card did not register genvex-flow-card");
const cardEntry=globalThis.customCards.find(entry=>entry.type==="genvex-flow-card");
if(!cardEntry) throw new Error("Card did not register in window.customCards");
if(cardEntry.name!=="Ventilation Flow Card") throw new Error(`Unexpected card name: ${cardEntry.name}`);
console.log("Bundle smoke test OK",[...registry.keys()],cardEntry.name);
