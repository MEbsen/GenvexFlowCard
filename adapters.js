/* Ventilation Flow Card provider adapters
 * Providers translate Home Assistant integration-specific entities into
 * the common entity keys consumed by the card.
 */

class VentilationProviderAdapter {
  constructor(card) { this.card = card; }
  get hass() { return this.card._hass; }
  get registry() { return this.card._registry || []; }
  stateName(entityId) {
    const state = this.hass?.states?.[entityId];
    return String(state?.attributes?.friendly_name || entityId || "").toLowerCase();
  }
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
}

class GenvexConnectAdapter extends VentilationProviderAdapter {
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

class DanfossAirAdapter extends VentilationProviderAdapter {
  get id() { return "danfoss_air"; }
  get label() { return "Danfoss Air"; }
  get experimental() { return true; }
  resolve(key, domain) {
    const map = {
      temp_outside:["Danfoss Air Outdoor Temperature"], temp_supply:["Danfoss Air Supply Temperature"],
      temp_extract:["Danfoss Air Extract Temperature"], temp_exhaust:["Danfoss Air Exhaust Temperature"],
      humidity:["Danfoss Air Humidity"], fan_speed:["Danfoss Air Fan Step"],
      filter_remaining:["Danfoss Air Remaining Filter"], boost_enable:["Danfoss Air Boost"],
      bypass_active:["Danfoss Air Bypass"], automatic_bypass:["Danfoss Air Automatic Bypass"],
      supply_fan_rpm:["Danfoss Air Supply Fan Speed"], exhaust_fan_rpm:["Danfoss Air Exhaust Fan Speed"]
    };
    return this.findByFriendlyName(map[key] || [], domain);
  }
  normalizeFanLevel(entityId) {
    const percent = Number(this.hass?.states?.[entityId]?.state);
    if (!Number.isFinite(percent) || percent <= 0) return 0;
    return Math.max(1, Math.min(4, Math.ceil(percent / 25)));
  }
}

window.VentilationFlowProviders = {
  base: VentilationProviderAdapter,
  genvex_connect: GenvexConnectAdapter,
  danfoss_air: DanfossAirAdapter,
  create(card) {
    const requested = card.config?.provider || (card.config?.genvex_entity ? "genvex_connect" : "genvex_connect");
    const Type = requested === "danfoss_air" ? DanfossAirAdapter : GenvexConnectAdapter;
    return new Type(card);
  }
};
