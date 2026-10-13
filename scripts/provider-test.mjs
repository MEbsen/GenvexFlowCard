import assert from "node:assert/strict";
import { createProvider, providerDefinitions, registerProvider, VentilationProviderAdapter } from "../src/providers/index.js";
import { measurement, binary } from "../src/ventilation-model.js";
import { controlsView } from "../src/controls-view.js";
import { sceneTemplate } from "../src/card-scene.js";

const state=(state,attributes={})=>({state,attributes});
const calls=[];
const context={config:{provider:"generic",entities:{}},_registry:[],_hass:{states:{},callService:(...args)=>{calls.push(args);return Promise.resolve();}}};
const ui={boostSettings:false,humiditySettings:false,drift:false,filterDetail:true,filterConfirm:true,mobileControls:false,error:""};
let model=createProvider(context).model("test");
assert.equal(model.capabilities.fan,false);
assert.equal(model.filter.supported,false);
assert.equal(controlsView(model,ui),"");
assert.equal(sceneTemplate(model,{title:"<img src=x>",height:720},ui).includes("<img src=x>"),false);
assert.equal(measurement({"sensor.x":state("")},"sensor.x").value,null);
assert.equal(binary({"sensor.x":state("unknown")},"sensor.x").value,null);
assert.equal(measurement({"sensor.x":state("68",{unit_of_measurement:"°F"})},"sensor.x",true).value,20);
context.config.entities={filter_remaining:"sensor.filter",filter_reset:"button.reset",summer_mode:"binary_sensor.summer",temp_outside:"sensor.outside",temp_supply:"sensor.supply",temp_extract:"sensor.extract"};
context._hass.states={"sensor.filter":state("0"),"button.reset":state("2026-01-01"),"binary_sensor.summer":state("unavailable"),"sensor.outside":state("0"),"sensor.supply":state("18"),"sensor.extract":state("20")};
model=createProvider(context).model();
assert.equal(model.filter.overdue,true);
assert.equal(model.measurements.efficiency.value,90);
const html=controlsView(model,ui);
assert.ok(html.includes("0% tilbage"));
assert.ok(html.includes('data-action="filterReset"'));
assert.ok(html.includes("Sommerdrift</span><span>—"));
assert.ok(!html.includes("Defrost"));
assert.ok(!html.includes('data-action="boost"'));
await model.filter.reset();assert.deepEqual(calls.pop(),["button","press",{entity_id:"button.reset"}]);
context._hass.states["button.reset"]=state("unavailable");
model=createProvider(context).model();assert.equal(model.filter.resetAvailable,false);await model.filter.reset();assert.equal(calls.length,0);
context.config.entities={filter_days:"sensor.elapsed",filter_months_setting:"number.interval"};
context._hass.states={"sensor.elapsed":state("40"),"number.interval":state("6")};
model=createProvider(context).model();assert.equal(model.filter.intervalDays,6*30.4375);assert.equal(model.filter.remainingDays,6*30.4375-40);
context.config.filter_interval_days=30;model=createProvider(context).model();assert.equal(model.filter.overdue,true);assert.equal(model.filter.remainingDays,-10);

// Discovery must not mix units, including the exact legacy ID and a suffixed ID.
const ids={fan:"fan.danfoss_air_ventilation",mode:"select.danfoss_air_operation_mode",boost:"switch.danfoss_air_boost"};
context.config={provider:"danfoss_air"};context._registry=[];context._hass.states={};
for(const suffix of ["","_2"])for(const [key,id] of Object.entries(ids)){
  const names={fan:"Danfoss Air Ventilation",mode:"Danfoss Air Operation Mode",boost:"Danfoss Air Boost"};
  context._hass.states[id+suffix]=state(key==="fan"?"on":key==="boost"?"on":"manual",{friendly_name:names[key],percentage:suffix?70:30,percentage_step:5,options:["manual","automatic"]});
  context._registry.push({entity_id:id+suffix,device_id:suffix?"second":"first",platform:"danfoss_air"});
}
assert.equal(createProvider(context).model().fan.supported,false);
context.config.ventilation_entity=ids.fan+"_2";
context.config.fan={min:0,max:100,step:5};
model=createProvider(context).model();
assert.equal(model.fan.displayEntity,ids.fan+"_2");assert.equal(model.fan.normalizedPercent,70);
assert.equal(model.fan.autoSupported,true);assert.equal(model.fan.autoAvailable,true);assert.equal(model.fan.offSupported,true);
await model.fan.setAuto();assert.deepEqual(calls.pop(),["select","select_option",{entity_id:ids.mode+"_2",option:"automatic"}]);
await model.fan.turnOff();assert.deepEqual(calls.pop(),["fan","turn_off",{entity_id:ids.fan+"_2"}]);assert.deepEqual(calls.pop(),["switch","turn_off",{entity_id:ids.boost+"_2"}]);
context._hass.states[ids.mode+"_2"].attributes.options=["manual"];
assert.equal(createProvider(context).model().fan.autoAvailable,false);
context.config.fan={entity:"sensor.custom_speed",min:0,max:5,step:1};
context._hass.states["sensor.custom_speed"]=state("3");
model=createProvider(context).model();assert.equal(model.fan.offSupported,true);assert.equal(model.fan.offAvailable,true);assert.equal(model.fan.writable,false);
context.config.fan={min:0,max:100,step:5};
context._hass.states[ids.fan+"_2"].state="unavailable";
model=createProvider(context).model();assert.equal(model.fan.writable,false);assert.equal(model.fan.running,null);await model.fan.setValue(50);assert.equal(calls.length,0);

context.config={provider:"genvex_connect",genvex_entity:"select.unit_fan"};
context._registry=[{entity_id:"select.unit_fan",platform:"genvex_connect",device_id:"unit",translation_key:"fan_speed"},{entity_id:"number.fan_rpm",device_id:"other",platform:"genvex_connect"}];
context._hass.states={"select.unit_fan":state("1",{options:["1","2","3","4","5"]})};
model=createProvider(context).model();assert.equal(model.fan.normalizedPercent,20);assert.equal(model.fan.running,true);assert.equal(model.fan.options.length,5);
await model.fan.setValue("5");assert.deepEqual(calls.pop(),["select","select_option",{entity_id:"select.unit_fan",option:"5"}]);
context.config={provider:"generic",fan:{entity:"sensor.speed",min:0,max:1,step:.05},entities:{temp_outside:"sensor.outside"},outside_temperature:"sensor.legacy"};
context._hass.states={"sensor.speed":state("0.25"),"sensor.outside":state("5"),"sensor.legacy":state("99")};
model=createProvider(context).model();assert.equal(model.fan.normalizedPercent,25);assert.equal(model.fan.writable,false);assert.equal(model.measurements.temperatures.outside.value,5);
// One registration supplies both discovery factory and editor metadata.
registerProvider({id:"test_provider",name:"Test Provider",Adapter:VentilationProviderAdapter,discovery:false});
context.config.provider="test_provider";assert.equal(createProvider(context).model().provider.name,"Test Provider");
assert.ok(providerDefinitions().some(x=>x.id==="test_provider"));
assert.throws(()=>registerProvider({id:"test_provider",name:"Duplicate",Adapter:VentilationProviderAdapter}));
// A large HA registry must be indexed, never scanned for every candidate/field.
// Count registry reads rather than using a machine-dependent timing threshold.
const large={config:{provider:"danfoss_air"},_registry:[],_hass:{states:{}}};
let registryReads=0;
const size=6000;
for(let i=0;i<size;i++) {
  const id=`sensor.unrelated_${i}`;
  large._hass.states[id]=state("1",{friendly_name:`Unrelated ${i}`});
  large._registry.push({get entity_id(){assert.ok(++registryReads<size*3,"Discovery rescans the HA registry");return id;},device_id:"other",platform:"other"});
}
large._hass.states[ids.fan]=state("on",{friendly_name:"Danfoss Air Ventilation",percentage:30});
large._registry.push({entity_id:ids.fan,device_id:"danfoss",platform:"danfoss_air"});
const largeProvider=createProvider(large);
assert.equal(largeProvider.model().fan.displayEntity,ids.fan);
assert.equal(registryReads,size);
large.config.ventilation_entity=ids.fan;
for(let i=0;i<50;i++) {
  large._hass.states={...large._hass.states,[ids.fan]:state("on",{percentage:i})};
  assert.ok(Math.abs(largeProvider.model().fan.normalizedPercent-i)<1e-10);
}
assert.equal(registryReads,size,"Unchanged registry must reuse its index");
// New registry data and changed device selection must take effect immediately.
large._registry=[...large._registry,{entity_id:"fan.second",device_id:"second",platform:"danfoss_air",translation_key:"fan_control"}];
large._hass.states={...large._hass.states,"fan.second":state("on",{percentage:80})};
large.config.ventilation_entity="fan.second";
assert.equal(largeProvider.model().fan.displayEntity,"fan.second");
assert.equal(registryReads,size*2);
large._registry=[];
assert.equal(largeProvider.model().fan.supported,false);
console.log("Provider contract, capability rendering, discovery and large-registry regression tests OK");
