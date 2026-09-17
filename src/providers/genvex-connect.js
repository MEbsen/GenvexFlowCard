import { VentilationProviderAdapter } from "./base.js";

export class GenvexConnectAdapter extends VentilationProviderAdapter {
  get id() { return "genvex_connect"; }
  get label() { return "Genvex Connect"; }
  selectedDeviceId() {
    const selected = this.card.config?.ventilation_entity || this.card.config?.genvex_entity;
    if (selected) {
      const reg = this.registry.find(x => x.entity_id === selected);
      if (reg?.device_id) return reg.device_id;
    }
    return this.card.config?.genvex_device || null;
  }
  resolve(key, domain) {
    if (!this.hass) return null;
    const deviceId = this.selectedDeviceId();
    const aliases = {
      fan_speed:["fan level","fan speed","ventilator trin","ventilator hastighed"],
      boost_enable:["boost"], temp_supply:["temperature supply air","temperatur tilluft"],
      temp_extract:["temperature extract air","temperatur fraluft"], temp_outside:["temperature outside air","temperatur udeluft"],
      temp_exhaust:["temperature exhaust air","temperatur afkastluft"], humidity:["humidity","luftfugtighed"],
      filter_days_left:["days left until filter change","dage til filter skift"], filter_days:["days since filter change","dage siden filter skift","filter days","filterdage"],
      filter_days_setting:["days between filter change","dage mellem filter skift","filter days setting","filter interval"],
      filter_reset:["reset filter","nulstil filter"], efficiency:["efficiency","virkningsgrad","varmegenvinding"], bypass_active:["bypass"]
    };
    for (const m of this.registry) {
      if (deviceId && m.device_id !== deviceId) continue;
      const id = m.entity_id;
      if (!id || (domain && !id.startsWith(domain + "."))) continue;
      const uid = String(m.unique_id || "").toLowerCase();
      const tk = String(m.translation_key || "").toLowerCase();
      if (m.platform === "genvex_connect" && (tk === key || uid.endsWith("_" + key) || id.endsWith("_" + key.replace(/_enable$/, "")))) return id;
    }
    for (const [id, st] of Object.entries(this.hass.states || {})) {
      if (domain && !id.startsWith(domain + ".")) continue;
      if (deviceId) {
        const reg = this.registry.find(r => r.entity_id === id);
        if (reg?.device_id !== deviceId) continue;
      }
      const name = String(st.attributes?.friendly_name || "").toLowerCase();
      if ((aliases[key] || []).some(a => name.includes(a))) return id;
    }
    return null;
  }
}
