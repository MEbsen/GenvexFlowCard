export class VentilationProviderAdapter {
  constructor(card) { this.card = card; }
  get hass() { return this.card._hass; }
  get registry() { return this.card._registry || []; }
  findByFriendlyName(names, domain) {
    const wanted = names.map(x => x.toLowerCase());
    for (const [id, state] of Object.entries(this.hass?.states || {})) {
      if (domain && !id.startsWith(domain + ".")) continue;
      const name = String(state.attributes?.friendly_name || "").toLowerCase();
      if (wanted.some(x => name === x || name.includes(x))) return id;
    }
    return null;
  }
  resolve() { return null; }
  normalizeFanLevel(entityId) {
    const value = Number(this.hass?.states?.[entityId]?.state);
    return Number.isFinite(value) ? Math.max(0, Math.min(4, Math.round(value))) : 0;
  }
  get id() { return "generic"; }
  get label() { return "Ventilation"; }
  get experimental() { return false; }

  numeric(entityId) {
    const value = Number(this.hass?.states?.[entityId]?.state);
    return Number.isFinite(value) ? value : NaN;
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

  fanModel(entities) {
    const value = this.numeric(entities.fan_speed);
    const level = Number.isFinite(value) ? Math.max(0, Math.min(4, Math.round(value))) : 0;
    const supplyRpm = this.numeric(entities.fan_rpm_supply), extractRpm = this.numeric(entities.fan_rpm_extract);
    return {
      controlMode:"steps", controlEntity:entities.fan_speed, displayEntity:entities.fan_speed,
      value:level, displayValue:String(level), displayUnit:"trin", normalizedPercent:level*25, legacyLevel:level,
      min:0, max:4, step:1, options:["0","1","2","3","4"], supplyRpm, extractRpm,
      running:[supplyRpm,extractRpm].some(rpm=>Number.isFinite(rpm)&&rpm>0)||level>0,
      setValue:value=>this.hass.callService("select","select_option",{entity_id:entities.fan_speed,option:String(value)})
    };
  }

  model(cardVersion="") {
    const entities=this.entityMap(),fan=this.fanModel(entities);
    const humidityEntities=[entities.humidity_low,entities.humidity_low_step,entities.humidity_high_step,entities.humidity_max_time];
    return {
      provider:{id:this.id,name:this.label,experimental:this.experimental}, card:{version:cardVersion}, entities, fan,
      boost:{entity:entities.boost_enable,speedEntity:entities.boost_speed,durationEntity:entities.boost_duration,setNumber:(entity,value)=>this.hass.callService("number","set_value",{entity_id:entity,value:Number(value)})},
      bypass:{entity:entities.bypass_active,controllable:Boolean(entities.bypass_active?.startsWith("switch.")),toggle:async()=>{const state=String(this.hass?.states?.[entities.bypass_active]?.state||"").toLowerCase();return this.hass.callService("switch",state==="on"?"turn_off":"turn_on",{entity_id:entities.bypass_active})}},
      filter:{daysLeftEntity:entities.filter_days_left,daysEntity:entities.filter_days,daysSettingEntity:entities.filter_days_setting,monthsSettingEntity:entities.filter_months_setting,remainingPercentEntity:entities.filter_remaining,resetEntity:entities.filter_reset},
      humidityControl:{available:humidityEntities.some(Boolean),lowEntity:entities.humidity_low,lowStepEntity:entities.humidity_low_step,highStepEntity:entities.humidity_high_step,maxTimeEntity:entities.humidity_max_time,setNumber:(entity,value)=>this.hass.callService("number","set_value",{entity_id:entity,value:Number(value)}),setOption:(entity,option)=>this.hass.callService("select","select_option",{entity_id:entity,option})},
      operating:{summerEntity:entities.summer_mode,defrostEntity:entities.defrost_active,reheatEntity:entities.reheat_active},
      capabilities:{fanControl:Boolean(fan.controlEntity),fanRpm:[fan.supplyRpm,fan.extractRpm].some(Number.isFinite),boost:Boolean(entities.boost_enable),boostSettings:Boolean(entities.boost_speed||entities.boost_duration),bypass:Boolean(entities.bypass_active),bypassControl:Boolean(entities.bypass_active?.startsWith("switch.")),filter:Boolean(entities.filter_days_left||entities.filter_days||entities.filter_remaining),humidityControl:humidityEntities.some(Boolean)}
    };
  }
}
