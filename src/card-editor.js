import { providerDefinitions } from "./providers/index.js";
import { escapeHtml as esc } from "./view-format.js";

const mappings = [
  ["temp_outside","Temperatur udeluft"],["temp_supply","Temperatur tilluft"],["temp_extract","Temperatur fraluft"],["temp_exhaust","Temperatur afkast"],
  ["humidity","Luftfugtighed"],["efficiency","Virkningsgrad"],["boost_enable","Boost"],["boost_speed","Boost hastighed"],["boost_duration","Boost varighed"],
  ["bypass_active","Bypass"],["filter_remaining","Filter tilbage (%)"],["filter_days_left","Filter dage tilbage"],["filter_days","Dage siden filterskift"],
  ["filter_days_setting","Filterinterval (dage)"],["filter_months_setting","Filterinterval (måneder)"],["filter_reset","Nulstil filter"],
  ["fan_rpm_supply","Indblæsning RPM"],["fan_rpm_extract","Udsugning RPM"],["summer_mode","Sommerdrift"],["defrost_active","Defrost"],["reheat_active","Eftervarme"],
  ["humidity_low","Lav fugtgrænse"],["humidity_low_step","Trin ved lav fugt"],["humidity_high_step","Trin ved høj fugt"],["humidity_max_time","Maks. tid ved høj fugt"],
  ["operation_mode","Driftstilstand (AUTO)"]
];
export class VentilationFlowCardEditor extends HTMLElement {
  set hass(hass) { this._hass=hass;this.shadowRoot?.querySelectorAll("ha-entity-picker").forEach(picker=>picker.hass=hass); }
  setConfig(config) { this._config={title:"Ventilation",height:720,provider:"genvex_connect",...config};this.render(); }
  update(path,value) {
    const next={...this._config};
    const [group,key]=path.split(".");
    if(key) { next[group]={...next[group]};if(value===""||value===undefined)delete next[group][key];else next[group][key]=value; }
    else if(value===""||value===undefined)delete next[group];else next[group]=value;
    if(path==="provider"){
      // Entity mappings and speed scales belong to the selected integration.
      for(const key of ["ventilation_entity","genvex_entity","ventilation_device","genvex_device","fan","entities","auto_option",
        "outside_temperature","supply_temperature","extract_temperature","exhaust_temperature","humidity","efficiency","fan_level","boost","bypass","filter_days_left","summer_mode","defrost_active","reheat_active"])delete next[key];
    }
    if(path==="filter_interval_days")delete next.filter_days;
    this._config=next;
    this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:next},bubbles:true,composed:true}));
    if(path==="provider")this.render();
  }
  render() {
    if(!this.shadowRoot){this.attachShadow({mode:"open"});
      this.shadowRoot.addEventListener("change",event=>{
        const input=event.target,path=input.dataset.path;if(!path||input.localName==="ha-entity-picker")return;
        this.update(path,input.value===""?undefined:input.type==="number"?Number(input.value):input.value);
      });
      this.shadowRoot.addEventListener("value-changed",event=>{const path=event.target.dataset.path;if(path)this.update(path,event.detail.value);});
    }
    const c=this._config||{},definitions=providerDefinitions(),definition=definitions.find(p=>p.id===c.provider),fan=c.fan||{};
    const picker=(path,value,label)=>`<div class="field"><label>${label}</label><ha-entity-picker data-path="${path}" value="${esc(value)}" allow-custom-entity></ha-entity-picker></div>`;
    this.shadowRoot.innerHTML=`<style>:host{display:block;padding:8px 0}.grid,.field{display:grid;gap:10px}.field{gap:5px}label,summary{font-weight:600}select,input{width:100%;box-sizing:border-box;padding:10px}.hint{font-size:12px;color:var(--secondary-text-color)}.meta{padding:8px;background:var(--secondary-background-color);color:var(--secondary-text-color);font-size:12px}details .grid{margin-top:12px}</style>
      <div class="grid"><div class="meta">${esc(definition?.name||c.provider)}${definition?.experimental?" · Experimental":""} · Card v${esc(this.version)}</div>
      <div class="field"><label>Integration / provider</label><select data-path="provider">${definitions.map(p=>`<option value="${esc(p.id)}" ${p.id===c.provider?"selected":""}>${esc(p.name)}${!p.discovery?" (generisk)":""}${p.experimental?" (experimental)":""}</option>`).join("")}</select></div>
      ${definition?.discovery?picker("ventilation_entity",c.ventilation_entity||c.genvex_entity,"Entity fra det ønskede anlæg")+'<div class="hint">Vælg én entity for at afgrænse automatisk discovery til det anlæg. Tvetydige matches vælges ikke automatisk.</div>':'<div class="hint">Angiv blæser og entity-mapping nedenfor. Grafikken bruger samme model som øvrige providers.</div>'}
      <div class="field"><label>Titel</label><input data-path="title" value="${esc(c.title)}"></div><div class="field"><label>Højde (px)</label><input data-path="height" type="number" min="420" max="1400" value="${c.height}"></div>
      <div class="field"><label>Filterinterval (dage)</label><input data-path="filter_interval_days" type="number" min="-1" step="1" value="${c.filter_interval_days??c.filter_days??-1}"><div class="hint">-1 eller tomt bruger integrationens interval. En positiv værdi overstyrer det.</div></div>
      <details ${!definition?.discovery?"open":""}><summary>Blæser og hastighedsinterval</summary><div class="grid">${picker("fan.entity",fan.entity,"Blæser entity (valgfri ved automatisk discovery)")}
      <div class="field"><label>Visning</label><select data-path="fan.mode"><option value="" ${!fan.mode?"selected":""}>Automatisk</option><option value="steps" ${fan.mode==="steps"?"selected":""}>Trin</option><option value="percentage" ${fan.mode==="percentage"?"selected":""}>Glidende</option></select></div>
      ${["min","max","step"].map(key=>`<div class="field"><label>${{min:"Minimum",max:"Maksimum",step:"Trinstørrelse"}[key]}</label><input type="number" step="any" data-path="fan.${key}" value="${esc(fan[key])}" placeholder="Fra integrationen"></div>`).join("")}
      <div class="field"><label>Tilstandsattribute (valgfri)</label><input data-path="fan.attribute" value="${esc(fan.attribute)}" placeholder="Fx speed"></div>
      ${picker("fan.running_entity",fan.running_entity,"Driftsstatus entity (valgfri)")}
      <div class="hint">Positive minimumsværdier er aktive hastigheder. Navngivne trins individuelle værdier og slukketilstande kan angives som option_values / off_values i YAML.</div></div></details>
      <details ${!definition?.discovery?"open":""}><summary>Entity-mapping / overrides</summary><div class="grid">${mappings.map(([key,label])=>picker("entities."+key,c.entities?.[key],label)).join("")}</div></details></div>`;
    this.hass=this._hass;
  }
}
