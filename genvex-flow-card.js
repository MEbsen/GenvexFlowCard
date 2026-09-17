const CARD_VERSION="1.1.0-dev.1";

(async()=>{
  const base=new URL(".",import.meta.url);
  await import(new URL("adapters.js",base));
  await import(new URL("genvex-flow-card-core.js",base));

  const Card=customElements.get("genvex-flow-card");
  if(!Card||!window.VentilationFlowProviders){
    console.error("Ventilation Flow Card: provider layer failed to load");
    return;
  }

  const providerFor=card=>window.VentilationFlowProviders.create(card);

  // Keep old Genvex configurations working while routing discovery through adapters.
  Card.prototype.selectedDeviceId=function(){
    const provider=providerFor(this);
    return typeof provider.selectedDeviceId==="function"?provider.selectedDeviceId():null;
  };
  Card.prototype.entityByKey=function(key,domain){
    const provider=providerFor(this);
    if(provider.id==="danfoss_air"){
      // Danfoss Air exposes fan step as a sensor and bypass as a switch.
      if(key==="fan_speed") return provider.resolve(key,"sensor");
      if(key==="bypass_active") return provider.resolve(key,"switch");
      if(key==="filter_days_left"||key==="filter_days"||key==="filter_days_setting"||key==="filter_reset"||key==="efficiency") return null;
    }
    return provider.resolve(key,domain);
  };

  const originalState=Card.prototype.state;
  Card.prototype.state=function(entity,f="—"){
    const provider=providerFor(this);
    if(provider.id==="danfoss_air"&&entity&&entity===provider.resolve("fan_speed","sensor")){
      return String(provider.normalizeFanLevel(entity));
    }
    return originalState.call(this,entity,f);
  };

  const originalRender=Card.prototype.render;
  Card.prototype.render=function(){
    originalRender.call(this);
    if(!this.shadowRoot||!this.config)return;
    const provider=providerFor(this);
    const status=this.shadowRoot.querySelector(".status b");
    if(status) status.textContent=provider.label+(provider.experimental?" · Experimental":"");

    // Danfoss reports remaining filter life as a percentage. The 1.0 UI is
    // day-based, so expose the value separately instead of pretending it is days.
    if(provider.id==="danfoss_air"){
      const filter=provider.resolve("filter_remaining","sensor");
      const filterBox=this.shadowRoot.querySelector("[data-filterbox]");
      if(filterBox&&filter){
        const raw=Number(this._hass?.states?.[filter]?.state);
        if(Number.isFinite(raw)){
          filterBox.innerHTML=`<h3>FILTER</h3><div><b>${Math.max(0,Math.min(100,raw)).toFixed(0)}% tilbage</b></div><div class="filterbar"><i style="width:${Math.max(0,Math.min(100,raw))}%"></i></div><div class="filterdetail open"><div class="row"><span>Kilde</span><span>Danfoss Air</span></div></div>`;
        }
      }
      const levelLabel=this.shadowRoot.querySelector(".level span:last-child");
      if(levelLabel) levelLabel.textContent="Ventilationsniveau (fra fan step %)";
    }

    // A Danfoss bypass is a real writable switch. Make the existing BYPASS
    // indicator a control without changing Genvex read-only behaviour.
    const bypass=provider.resolve("bypass_active",provider.id==="danfoss_air"?"switch":"binary_sensor");
    const bypassCtl=this.shadowRoot.querySelector(".bypassCtl");
    if(provider.id==="danfoss_air"&&bypass&&bypassCtl){
      bypassCtl.classList.add("clickable");
      bypassCtl.setAttribute("role","button");
      bypassCtl.setAttribute("tabindex","0");
      bypassCtl.setAttribute("aria-label","Skift bypass");
      const toggle=async e=>{
        e?.stopPropagation?.();
        const state=String(this._hass?.states?.[bypass]?.state||"").toLowerCase();
        await this._hass.callService("switch",state==="on"?"turn_off":"turn_on",{entity_id:bypass});
      };
      bypassCtl.addEventListener("click",toggle);
      bypassCtl.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle(e)}});
    }
  };

  const originalBind=Card.prototype._bindControls;
  Card.prototype._bindControls=function(auto,d){
    const provider=providerFor(this);
    if(provider.id==="danfoss_air"){
      // Danfoss Air's fan step is read-only in the HA integration. Do not send
      // select.select_option calls to a sensor; Boost remains a writable switch.
      auto={...auto,fan:null};
    }
    return originalBind.call(this,auto,d);
  };

  class VentilationFlowCardEditor extends HTMLElement{
    set hass(h){this._hass=h;this._sync()}
    setConfig(c){this._config={title:"Ventilation",height:720,provider:c?.provider||(c?.genvex_entity?"genvex_connect":"genvex_connect"),...c};this.render()}
    _fire(next){this._config=next;this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:next},bubbles:true,composed:true}))}
    _sync(){this.shadowRoot?.querySelectorAll("ha-entity-picker").forEach(p=>p.hass=this._hass)}
    render(){
      if(!this.shadowRoot)this.attachShadow({mode:"open"});
      const c=this._config||{};
      const danfoss=c.provider==="danfoss_air";
      const selected=c.ventilation_entity||c.genvex_entity||"";
      this.shadowRoot.innerHTML=`<style>:host{display:block;padding:8px 0}.grid{display:grid;gap:14px}.field{display:grid;gap:6px}.field label{font-weight:600}.hint{font-size:12px;color:var(--secondary-text-color)}input,select{box-sizing:border-box;width:100%;padding:12px;border:1px solid var(--divider-color);border-radius:10px;background:var(--card-background-color);color:var(--primary-text-color)}.experimental{padding:10px;border-radius:9px;background:var(--warning-color,#e6a23c22);border:1px solid var(--warning-color,#e6a23c);font-size:12px}</style><div class="grid"><div class="field"><label>Integration / provider</label><select data-provider><option value="genvex_connect" ${!danfoss?"selected":""}>Genvex Connect</option><option value="danfoss_air" ${danfoss?"selected":""}>Danfoss Air (experimental)</option></select></div>${danfoss?`<div class="experimental">Danfoss Air support is experimental because it has not yet been tested on physical Danfoss hardware. Entities are discovered from the names exposed by Home Assistant.</div>`:""}<div class="field"><label>${danfoss?"Danfoss Air entity (optional)":"Genvex-anlæg"}</label><ha-entity-picker data-entity value="${selected}" allow-custom-entity></ha-entity-picker><div class="hint">${danfoss?"Danfoss Air is discovered automatically. The picker is reserved for future multi-system selection.":"Vælg én entity fra det ønskede Genvex Connect-anlæg. Resten findes automatisk."}</div></div><div class="field"><label>Titel</label><input data-key="title" value="${c.title||""}"></div><div class="field"><label>Højde (px)</label><input data-key="height" type="number" min="420" max="1400" step="20" value="${c.height||720}"></div>${!danfoss?`<div class="field"><label>Filter serviceinterval (dage)</label><input data-key="filter_interval_days" type="number" min="1" max="3650" step="1" value="${c.filter_interval_days||""}"></div>`:""}</div>`;
      this.shadowRoot.querySelector("[data-provider]")?.addEventListener("change",e=>this._fire({...c,provider:e.target.value,ventilation_entity:""}));
      this.shadowRoot.querySelectorAll("[data-key]").forEach(el=>el.addEventListener("change",e=>{let v=e.target.type==="number"?Number(e.target.value):e.target.value;this._fire({...this._config,[e.target.dataset.key]:v})}));
      const picker=this.shadowRoot.querySelector("[data-entity]");if(picker){picker.hass=this._hass;picker.addEventListener("value-changed",e=>{const v=e.detail.value;const next={...this._config,ventilation_entity:v};if(this._config.provider!=="danfoss_air")next.genvex_entity=v;this._fire(next)})}
    }
  }
  if(!customElements.get("ventilation-flow-card-editor"))customElements.define("ventilation-flow-card-editor",VentilationFlowCardEditor);
  Card.getConfigElement=()=>document.createElement("ventilation-flow-card-editor");

  // Preserve the existing custom element type so current dashboards keep working.
  const entry=(window.customCards||[]).find(x=>x.type==="genvex-flow-card");
  if(entry){entry.name="Ventilation Flow Card";entry.description="Animated heat-recovery ventilation card for Genvex Connect and Danfoss Air";}
  console.info("%c VENTILATION FLOW CARD %c "+CARD_VERSION,"background:#078ee6;color:white;padding:3px","background:#333;color:white;padding:3px");
})();
