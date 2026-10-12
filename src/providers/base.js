import { fanModel, finite } from "../fan-model.js";
import { buildModel, binary, measurement, field } from "../ventilation-model.js";

export class VentilationProviderAdapter {
  constructor(context) { this.context = context; }
  get hass() { return this.context._hass; }
  get config() { return this.context.config || {}; }
  get registry() { return this.context._registry || []; }
  get id() { return this.definition?.id || "generic"; }
  get label() { return this.definition?.name || "Ventilation"; }
  get experimental() { return this.definition?.experimental || false; }
  selectedDeviceId() {
    const selected = this.config.ventilation_entity || this.config.genvex_entity;
    if (selected) return this.registry.find(x => x.entity_id === selected)?.device_id || null;
    return this.config.ventilation_device || this.config.genvex_device || null;
  }
  candidates(domain) {
    const selected = this.config.ventilation_entity || this.config.genvex_entity;
    const device = this.selectedDeviceId();
    if (selected && !device) return [];
    return Object.entries(this.hass?.states || {}).filter(([id]) => (!domain || id.startsWith(domain + ".")) && (!device || this.registry.some(x => x.entity_id === id && x.device_id === device)));
  }
  discover(key, names, domain, exact) {
    const candidates = this.candidates(domain);
    const metadata = candidates.filter(([id]) => this.registry.some(r => r.entity_id === id && r.platform === this.id && (r.translation_key === key || String(r.unique_id || "").toLowerCase().endsWith("_" + key) || id.endsWith("_" + key.replace(/_enable$/, "")))));
    if (metadata.length) return metadata.length === 1 ? metadata[0][0] : null;
    const wanted = names.map(x => x.toLowerCase());
    const matches = candidates.filter(([id,state]) => id === exact || wanted.some(name => String(state.attributes?.friendly_name || "").toLowerCase().includes(name)));
    return matches.length === 1 ? matches[0][0] : null;
  }
  resolve(key) { return this.config.entities?.[key] || null; }
  numeric(entity) { return measurement(this.hass?.states || {}, entity).value; }
  callService(...args) { return this.hass?.callService(...args); }
  known(entity) { const state=this.hass?.states?.[entity];return Boolean(state) && state.state != null && !["unknown","unavailable", ""].includes(String(state.state)); }
  toggle(entity) {
    const status = binary(this.hass?.states || {}, entity);
    if (!status.available || !entity?.startsWith("switch.")) return;
    return this.callService("switch", status.value ? "turn_off" : "turn_on", {entity_id:entity});
  }
  setField(entity, raw) {
    const model=field(this.hass?.states || {},entity), domain=entity?.split(".")[0];
    if (!model.writable) return;
    if(domain === "select") { if(!model.options.includes(String(raw))) return;return this.callService("select","select_option",{entity_id:entity,option:String(raw)}); }
    if(!finite(raw)) return;
    const min=model.min ?? -Infinity,max=model.max ?? Infinity;
    const origin=Number.isFinite(min)?min:0;
    const value=Math.max(min,Math.min(max,Number((origin+Math.round((Number(raw)-origin)/model.step)*model.step).toFixed(8))));
    return this.callService(domain,"set_value",{entity_id:entity,value});
  }
  entityMap() {
    return {
      temp_outside:this.resolve("temp_outside","sensor"), temp_supply:this.resolve("temp_supply","sensor"),
      temp_extract:this.resolve("temp_extract","sensor"), temp_exhaust:this.resolve("temp_exhaust","sensor"),
      humidity:this.resolve("humidity","sensor"), efficiency:this.resolve("efficiency","sensor"),
      fan_speed:this.resolve("fan_speed","select"), fan_control:this.resolve("fan_control","fan"),
      fan_rpm_supply:this.resolve("fan_rpm_supply","sensor")||this.resolve("supply_fan_rpm","sensor"),
      fan_rpm_extract:this.resolve("fan_rpm_extract","sensor")||this.resolve("exhaust_fan_rpm","sensor"),
      boost_enable:this.resolve("boost_enable","switch"), boost_speed:this.resolve("boost_speed","number"),
      boost_duration:this.resolve("boost_duration","number"), bypass_active:this.resolve("bypass_active","binary_sensor")||this.resolve("bypass_active","switch"),
      filter_days_left:this.resolve("filter_days_left","sensor"), filter_days:this.resolve("filter_days","sensor"),
      filter_days_setting:this.resolve("filter_days_setting","number"), filter_months_setting:this.resolve("filter_months_setting","number"),
      filter_remaining:this.resolve("filter_remaining","sensor"), filter_reset:this.resolve("filter_reset","button"),
      summer_mode:this.resolve("summer_mode","binary_sensor"), defrost_active:this.resolve("defrost_active","binary_sensor"),
      reheat_active:this.resolve("reheat_active","binary_sensor"), operation_mode:this.resolve("operation_mode","select"),
      humidity_low:this.resolve("cts400_humidity_low_level","number"), humidity_low_step:this.resolve("cts400_humidity_low_step","select"),
      humidity_high_step:this.resolve("cts400_humidity_high_step","select"), humidity_max_time:this.resolve("cts400_humidity_high_max_time","number")
    };
  }

  mappedEntities() {
    const entities=this.entityMap(),legacy={outside_temperature:"temp_outside",supply_temperature:"temp_supply",extract_temperature:"temp_extract",exhaust_temperature:"temp_exhaust",humidity:"humidity",efficiency:"efficiency",fan_level:"fan_speed",boost:"boost_enable",bypass:"bypass_active",filter_days_left:"filter_days_left",summer_mode:"summer_mode",defrost_active:"defrost_active",reheat_active:"reheat_active"};
    for(const [configKey,key] of Object.entries(legacy)) if(this.config[configKey]) entities[key]=this.config[configKey];
    for(const [key,value] of Object.entries(this.config.entities || {})) entities[key]=value;
    return entities;
  }
  fanModel(entities) {
    const entity=this.config.fan?.entity || entities.fan_control || entities.fan_speed;
    const runningEntity=this.config.fan?.running_entity;
    const runningState=runningEntity ? binary(this.hass?.states || {},runningEntity).value : undefined;
    const model=fanModel({entity,state:this.hass?.states?.[entity],config:this.config.fan,callService:(...args)=>this.callService(...args),runningState});
    const rpm={supply:measurement(this.hass?.states||{},entities.fan_rpm_supply),extract:measurement(this.hass?.states||{},entities.fan_rpm_extract)};
    return {...model,rpm,supplyRpm:rpm.supply.value,extractRpm:rpm.extract.value};
  }
  model(version="") {
    const states=this.hass?.states || {},entities=this.mappedEntities(),fan=this.fanModel(entities);
    const controllable=entity=>Boolean(entity?.startsWith("switch."));
    const definition=this.definition;
    return buildModel({states,entities,config:this.config,fan,provider:{id:definition?.id||this.id,name:definition?.name||this.label,experimental:definition?.experimental??this.experimental},version,actions:{
      boost:{controllable:controllable(entities.boost_enable),toggle:()=>this.toggle(entities.boost_enable),setValue:(entity,value)=>this.setField(entity,value)},
      bypass:{controllable:controllable(entities.bypass_active),toggle:()=>this.toggle(entities.bypass_active)},
      filter:{resetSupported:Boolean(entities.filter_reset?.startsWith("button.")),resetAvailable:entities.filter_reset?.startsWith("button.") && this.known(entities.filter_reset),reset:()=>this.known(entities.filter_reset) && entities.filter_reset?.startsWith("button.") && this.callService("button","press",{entity_id:entities.filter_reset})},
      setField:(entity,value)=>this.setField(entity,value)
    }});
  }
}
