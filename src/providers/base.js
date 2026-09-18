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
}
