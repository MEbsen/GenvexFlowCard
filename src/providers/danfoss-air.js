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
      filter_remaining:["Danfoss Air Remaining Filter"],
      boost_enable:["Danfoss Air Boost"],
      bypass_active:["Danfoss Air Bypass"],
      automatic_bypass:["Danfoss Air Automatic Bypass"],
      supply_fan_rpm:["Danfoss Air Supply Fan Speed"],
      exhaust_fan_rpm:["Danfoss Air Exhaust Fan Speed"]
    };
    return this.findByFriendlyName(map[key] || [], domain);
  }
  normalizeFanLevel(entityId) {
    const percent = Number(this.hass?.states?.[entityId]?.state);
    if (!Number.isFinite(percent) || percent <= 0) return 0;
    return Math.max(1, Math.min(4, Math.ceil(percent / 25)));
  }
}
