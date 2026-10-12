import { binary } from "../ventilation-model.js";
import { VentilationProviderAdapter } from "./base.js";

export class DanfossAirAdapter extends VentilationProviderAdapter {
  get id() { return "danfoss_air"; }
  get label() { return "Danfoss Air"; }
  get experimental() { return true; }
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
    return this.discover(key, map[key] || [], domain, exact[key]);
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
    const auto=this.config.auto_option ? options.find(value=>value===this.config.auto_option) : options.find(value=>/^auto(?:matic)?(?:\s|$)/i.test(String(value)));
    const offEntity=fan.displayEntity?.startsWith("fan.")?fan.displayEntity:entities.fan_control;
    const offSupported=Boolean(offEntity?.startsWith("fan.")),offStatus=binary(this.hass?.states||{},offEntity);
    return {...fan,offSupported,offAvailable:offSupported&&offStatus.available,autoSupported:Boolean(modeEntity),autoAvailable:this.known(modeEntity)&&Boolean(auto),
      setAuto:()=>this.known(modeEntity)&&auto&&this.callService("select","select_option",{entity_id:modeEntity,option:auto}),
      turnOff:offSupported?async()=>{if(!offStatus.available)return;const boost=binary(this.hass?.states||{},entities.boost_enable);if(boost.available&&boost.value)await this.toggle(entities.boost_enable);return this.callService("fan","turn_off",{entity_id:offEntity})}:null
    };
  }

}
