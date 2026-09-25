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
      boost_enable:["boost"], boost_speed:["boost speed","boost fan speed","boost level","boost step","boost hastighed","boost trin"], boost_duration:["boost duration","boost time","boost timer","boost længde","boost tid"], temp_supply:["temperature supply air","temperatur tilluft"],
      temp_extract:["temperature extract air","temperatur fraluft"], temp_outside:["temperature outside air","temperatur udeluft"],
      temp_exhaust:["temperature exhaust air","temperatur afkastluft"], humidity:["humidity","luftfugtighed"],
      filter_days_left:["days left until filter change","dage til filter skift"], filter_days:["days since filter change","dage siden filter skift","filter days","filterdage"],
      filter_days_setting:["days between filter change","dage mellem filter skift","filter days setting","filter interval"],
      filter_months_setting:["months between filter change","måneder mellem filterskift","filter months setting"],
      filter_reset:["reset filter","nulstil filter"], efficiency:["efficiency","virkningsgrad","varmegenvinding"], bypass_active:["bypass"],
      summer_mode:["summer mode","sommerdrift"], defrost_active:["defrost active","afrimning aktiv"], reheat_active:["reheat active","eftervarme aktiv"],
      fan_rpm_supply:["fan rpm supply","supply fan rpm","indblæsning rpm"], fan_rpm_extract:["fan rpm extract","extract fan rpm","udsugning rpm"],
      cts400_humidity_low_level:["low humidity %","lav luftfugtighed %"],
      cts400_humidity_low_step:["low humidity fan level","lav luftfugtighed trin"],
      cts400_humidity_high_step:["high humidity fan level","høj luftfugtighed trin"],
      cts400_humidity_high_max_time:["high humidity level timeout","høj luftfugtighed trin timeout"]
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
