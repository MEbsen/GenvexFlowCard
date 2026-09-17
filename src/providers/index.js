import { GenvexConnectAdapter } from "./genvex-connect.js";
import { DanfossAirAdapter } from "./danfoss-air.js";

const PROVIDERS = {
  genvex_connect: GenvexConnectAdapter,
  danfoss_air: DanfossAirAdapter,
};

export function createProvider(card) {
  const id = card.config?.provider || "genvex_connect";
  const Provider = PROVIDERS[id] || GenvexConnectAdapter;
  return new Provider(card);
}

export { GenvexConnectAdapter, DanfossAirAdapter };

// Optional boost tuning. Open/closed state belongs to the card instance so
// Home Assistant state updates can re-render without closing the editor.
queueMicrotask(()=>{
  const Card=customElements.get("genvex-flow-card");
  if(!Card||Card.prototype.__boostSettingsInstalled)return;
  Card.prototype.__boostSettingsInstalled=true;
  const previousRender=Card.prototype.render;
  Card.prototype.render=function(){
    previousRender.call(this);
    const root=this.shadowRoot;if(!root||!this.config)return;
    const p=createProvider(this),speed=p.resolve("boost_speed","number"),duration=p.resolve("boost_duration","number");
    if(!speed&&!duration)return;
    const boost=root.querySelector("button.boost:not(.danfossAuto):not(.danfossOff)");
    if(!boost||root.querySelector(".boostSettingsRow"))return;
    const row=document.createElement("div");row.className="boostSettingsRow";
    boost.parentNode.insertBefore(row,boost);row.appendChild(boost);
    const gear=document.createElement("button");gear.className="boostConfig";gear.type="button";gear.title="Boost indstillinger";gear.setAttribute("aria-label","Boost indstillinger");gear.textContent="⚙";row.appendChild(gear);
    const panel=document.createElement("div");panel.className="boostSettings";
    const field=(id,label)=>{if(!id)return"";const st=this._hass?.states?.[id],a=st?.attributes||{},value=st?.state??"",min=Number.isFinite(Number(a.min))?`min="${a.min}"`:"",max=Number.isFinite(Number(a.max))?`max="${a.max}"`:"",step=Number.isFinite(Number(a.step))?`step="${a.step}"`:'step="1"',unit=a.unit_of_measurement||"";return `<label>${label}<span><input type="number" data-boost-entity="${id}" ${min} ${max} ${step} value="${value}"><em>${unit}</em></span></label>`};
    panel.innerHTML=`<div class="boostSettingsTitle">BOOST INDSTILLINGER</div>${field(speed,"Boost hastighed")}${field(duration,"Boost længde")}`;
    row.insertAdjacentElement("afterend",panel);
    const applyOpen=()=>{panel.classList.toggle("open",this._boostConfigOpen===true);gear.classList.toggle("on",this._boostConfigOpen===true);gear.setAttribute("aria-expanded",String(this._boostConfigOpen===true))};
    applyOpen();
    gear.addEventListener("click",e=>{e.stopPropagation();this._boostConfigOpen=!(this._boostConfigOpen===true);applyOpen()});
    panel.querySelectorAll("[data-boost-entity]").forEach(input=>input.addEventListener("change",async e=>{const value=Number(e.target.value);if(!Number.isFinite(value))return;await this._hass.callService("number","set_value",{entity_id:e.target.dataset.boostEntity,value})}));
    if(!root.querySelector("style[data-boost-settings]")){const style=document.createElement("style");style.dataset.boostSettings="";style.textContent=`.boostSettingsRow{display:grid;grid-template-columns:1fr 42px;gap:6px;margin-top:12px}.boostSettingsRow>.boost{margin-top:0}.boostConfig{border:1px solid #285777;background:#0b2033;color:#dcefff;border-radius:10px;cursor:pointer;font-size:18px;line-height:1}.boostConfig:hover,.boostConfig.on{background:#15527d;border-color:#4b83aa}.boostSettings{display:none;margin-top:7px;padding:10px;border:1px solid #244866;border-radius:10px;background:#081a29}.boostSettings.open{display:grid;gap:9px}.boostSettingsTitle{color:#9db7ca;font-size:10px;font-weight:700;letter-spacing:.08em}.boostSettings label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:#cfe2f2}.boostSettings label span{display:flex;align-items:center;gap:5px}.boostSettings input{width:68px;box-sizing:border-box;border:1px solid #355b78;border-radius:7px;background:#102b42;color:#eaf6ff;padding:5px}.boostSettings em{min-width:20px;color:#7f9db5;font-size:10px;font-style:normal}`;root.appendChild(style)}
  };
});
