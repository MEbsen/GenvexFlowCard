import { binary } from "../ventilation-model.js";
import { VentilationProviderAdapter } from "./base.js";

export class DanfossAirAdapter extends VentilationProviderAdapter {
  get id() { return "danfoss_air"; }
  get label() { return "Danfoss Air"; }
  get experimental() { return true; }
  get discoveryPlatforms() { return ["danfoss_air","danfoss_air_ccm"]; }
  resolve(key, domain) {
    const explicit = this.config?.entities?.[key];
    if (explicit) return explicit;
    const map = {
      temp_outside:["Danfoss Air Outdoor Temperature"],
      temp_supply:["Danfoss Air Supply Temperature"],
      temp_extract:["Danfoss Air Extract Temperature"],
      temp_exhaust:["Danfoss Air Exhaust Temperature"],
      humidity:["Danfoss Air Humidity"],
      fan_speed:["Danfoss Air Fan Step"],
      fan_control:["Danfoss Air Ventilation"],
      operation_mode:["Danfoss Air Operation Mode","Danfoss Air Run Mode"],
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
    return this.discover(key, map[key] || [], domain, exact[key],key==="operation_mode"?["operation_mode","run_mode"]:[key]);
  }

  entityMap() {
    const entities=super.entityMap();
    entities.fan_speed=this.resolve("fan_speed","sensor");
    entities.bypass_active=this.resolve("bypass_active","switch");
    return entities;
  }

  fanModel(entities) {
    const fan=super.fanModel(entities),modeEntity=entities.operation_mode;
    const options=this.hass?.states?.[modeEntity]?.attributes?.options || [];
    const matches=options.filter(value=>/^(auto(?:matic|matisk)?(?:\s|$)|demand$)/i.test(String(value).trim()));
    const auto=this.config.auto_option ? options.find(value=>value===this.config.auto_option) : matches.length===1?matches[0]:null;
    const offEntity=fan.displayEntity?.startsWith("fan.")?fan.displayEntity:entities.fan_control;
    const offSupported=Boolean(offEntity?.startsWith("fan.")),offStatus=binary(this.hass?.states||{},offEntity);
    const resumeSpeeds=this.context._danfossResumeSpeeds??=new Map();
    const percentage=Number(this.hass?.states?.[offEntity]?.attributes?.percentage);
    if(offStatus.value===true&&Number.isFinite(percentage)&&percentage>0&&percentage<=100)resumeSpeeds.set(offEntity,percentage);
    // Some integrations retain the requested speed even while their fan is off.
    const stopped=offStatus.available&&offStatus.value===false;
    const resume=resumeSpeeds.get(offEntity) || (Number.isFinite(percentage)&&percentage>0&&percentage<=100?percentage:null);
    const autoAvailable=Boolean(modeEntity?.startsWith("select.")&&this.known(modeEntity)&&auto);
    const autoReason=!modeEntity?"Driftsmode-entity mangler":!this.known(modeEntity)?"Driftsmode er utilgængelig":!auto?"Angiv AUTO-værdien med auto_option":"";
    return {...fan,...(stopped?{value:0,displayValue:"0",normalizedPercent:0,running:false}:offSupported&&!offStatus.available?{running:null}:{}),offSupported,offAvailable:offSupported&&offStatus.available,
      startAvailable:offSupported&&offStatus.available&&stopped,resumePercent:resume,
      turnOn:()=>{if(!offStatus.available||!stopped)return;return this.callService("fan","turn_on",{entity_id:offEntity,...(resume?{percentage:resume}:{})});},
      autoSupported:true,autoAvailable,autoReason,autoActive:autoAvailable&&this.hass?.states?.[modeEntity]?.state===auto,
      setAuto:()=>autoAvailable&&this.callService("select","select_option",{entity_id:modeEntity,option:auto}),
      turnOff:offSupported?async()=>{if(!offStatus.available)return;const boost=binary(this.hass?.states||{},entities.boost_enable);if(boost.available&&boost.value)await this.toggle(entities.boost_enable);return this.callService("fan","turn_off",{entity_id:offEntity})}:null
    };
  }

}
