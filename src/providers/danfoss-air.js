import { VentilationProviderAdapter } from "./base.js";

export class DanfossAirAdapter extends VentilationProviderAdapter {
  get id() { return "danfoss_air"; }
  get label() { return "Danfoss Air"; }
  get experimental() { return true; }
  resolve(key, domain) {
    const map = {
      temp_outside:["Danfoss Air Outdoor Temperature"],
      temp_supply:["Danfoss Air Supply Temperature"],
      temp_extract:["Danfoss Air Extract Temperature"],
      temp_exhaust:["Danfoss Air Exhaust Temperature"],
      humidity:["Danfoss Air Humidity"],
      fan_speed:["Danfoss Air Fan Step"],
      fan_control:["Danfoss Air Ventilation"],
      operation_mode:["Danfoss Air Operation Mode"],
      filter_remaining:["Danfoss Air Remaining Filter","Remaining Filter"],
      boost_enable:["Danfoss Air Boost"],
      boost_speed:["Danfoss Air Maximum Boost Step"],
      boost_duration:["Danfoss Air Boost Duration"],
      bypass_active:["Danfoss Air Bypass"],
      automatic_bypass:["Danfoss Air Automatic Bypass"],
      supply_fan_rpm:["Danfoss Air Supply Fan Speed","Supply Fan Speed"],
      exhaust_fan_rpm:["Danfoss Air Exhaust Fan Speed","Exhaust Fan Speed"]
    };
    const exact={
      filter_remaining:"sensor.danfoss_air_remaining_filter",
      boost_enable:"switch.danfoss_air_boost",
      boost_speed:"number.danfoss_air_maximum_boost_step",
      boost_duration:"number.danfoss_air_boost_duration",
      bypass_active:"switch.danfoss_air_bypass",
      automatic_bypass:"switch.danfoss_air_automatic_bypass",
      fan_control:"fan.danfoss_air_ventilation",
      operation_mode:"select.danfoss_air_operation_mode",
      supply_fan_rpm:"sensor.danfoss_air_supply_fan_speed",
      exhaust_fan_rpm:"sensor.danfoss_air_exhaust_fan_speed"
    };
    const id=exact[key];
    if(id&&(!domain||id.startsWith(domain+"."))&&this.hass?.states?.[id]) return id;
    return this.findByFriendlyName(map[key] || [], domain);
  }
  normalizeFanLevel(entityId) {
    const percent = Number(this.hass?.states?.[entityId]?.state);
    if (!Number.isFinite(percent) || percent <= 0) return 0;
    return Math.max(1, Math.min(4, Math.ceil(percent / 25)));
  }
  fanPercentage(entityId) {
    const state=this.hass?.states?.[entityId];
    const pct=Number(state?.attributes?.percentage);
    if(Number.isFinite(pct)) return Math.max(0,Math.min(100,pct));
    const step=Number(this.hass?.states?.[this.resolve("fan_speed","sensor")]?.state);
    return Number.isFinite(step)?Math.max(0,Math.min(100,step)):0;
  }
  setFanPercentage(entityId,percentage) {
    return this.hass.callService("fan","set_percentage",{entity_id:entityId,percentage:Number(percentage)});
  }
  turnFanOff(entityId) { return this.hass.callService("fan","turn_off",{entity_id:entityId}); }

  entityMap() {
    const entities=super.entityMap();
    entities.fan_speed=this.resolve("fan_speed","sensor");
    entities.bypass_active=this.resolve("bypass_active","switch");
    return entities;
  }

  fanModel(entities) {
    const controlEntity=entities.fan_control,percentage=this.fanPercentage(controlEntity),
      supplyRpm=this.numeric(entities.fan_rpm_supply),extractRpm=this.numeric(entities.fan_rpm_extract),
      state=String(this.hass?.states?.[controlEntity]?.state||"").toLowerCase(),running=Boolean(controlEntity)&&!["off","unavailable","unknown",""] .includes(state);
    const modeEntity=entities.operation_mode,boostEntity=entities.boost_enable;
    return {
      controlMode:"percentage",controlEntity,displayEntity:entities.fan_speed,value:percentage,
      displayValue:String(Math.round(percentage)),displayUnit:"%",normalizedPercent:percentage,
      legacyLevel:this.normalizeFanLevel(entities.fan_speed),min:0,max:100,step:10,supplyRpm,extractRpm,running,
      setValue:value=>Number(value)<=0?this.turnFanOff(controlEntity):this.setFanPercentage(controlEntity,value),
      turnOff:async()=>{if(boostEntity&&["on","true","active","1"].includes(String(this.hass?.states?.[boostEntity]?.state||"").toLowerCase()))await this.hass.callService("switch","turn_off",{entity_id:boostEntity});return this.turnFanOff(controlEntity)},
      setAuto:async()=>{const options=this.hass?.states?.[modeEntity]?.attributes?.options||[],option=options.find(value=>/auto/i.test(String(value)));if(option)return this.hass.callService("select","select_option",{entity_id:modeEntity,option});throw new Error(`AUTO option not found: ${options.join(", ")}`)},
      autoAvailable:Boolean(modeEntity)
    };
  }
}
