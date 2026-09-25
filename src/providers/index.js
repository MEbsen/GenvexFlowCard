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

// Keep interactive disclosure state on the card instance. HA may render the
// card frequently; data updates must never decide what the user has opened.
queueMicrotask(()=>{
  const Card=customElements.get("genvex-flow-card");
  if(!Card||Card.prototype.__persistentUiInstalled)return;
  Card.prototype.__persistentUiInstalled=true;
  const previousRender=Card.prototype.render;
  Card.prototype.render=function(){
    previousRender.call(this);
    const root=this.shadowRoot;if(!root||!this.config)return;

    // BOOST configuration: provider capability driven and persistent.
    const model=createProvider(this).model(),speed=model.boost.speedEntity,duration=model.boost.durationEntity;
    if(speed||duration){
      const boost=root.querySelector("button.boost:not(.fanAuto):not(.fanOff):not(.danfossAuto):not(.danfossOff)");
      if(boost&&!root.querySelector(".boostSettingsRow")){
        const row=document.createElement("div");row.className="boostSettingsRow";
        boost.parentNode.insertBefore(row,boost);row.appendChild(boost);
        const gear=document.createElement("button");gear.className="boostConfig";gear.type="button";gear.title="Boost indstillinger";gear.setAttribute("aria-label","Boost indstillinger");gear.textContent="⚙";row.appendChild(gear);
        const panel=document.createElement("div");panel.className="boostSettings";
        const field=(id,label)=>{if(!id)return"";const st=this._hass?.states?.[id],a=st?.attributes||{},value=st?.state??"",min=Number.isFinite(Number(a.min))?`min="${a.min}"`:"",max=Number.isFinite(Number(a.max))?`max="${a.max}"`:"",step=Number.isFinite(Number(a.step))?`step="${a.step}"`:'step="1"',unit=a.unit_of_measurement||"";return `<label>${label}<span><input type="number" data-boost-entity="${id}" ${min} ${max} ${step} value="${value}"><em>${unit}</em></span></label>`};
        panel.innerHTML=`<div class="boostSettingsTitle">BOOST INDSTILLINGER</div>${field(speed,"Boost hastighed")}${field(duration,"Boost længde")}`;
        row.insertAdjacentElement("afterend",panel);
        const applyBoost=()=>{const open=this._boostConfigOpen===true;panel.classList.toggle("open",open);gear.classList.toggle("on",open);gear.setAttribute("aria-expanded",String(open))};
        applyBoost();
        gear.addEventListener("click",e=>{e.stopPropagation();this._boostConfigOpen=!(this._boostConfigOpen===true);applyBoost()});
        panel.querySelectorAll("[data-boost-entity]").forEach(input=>input.addEventListener("change",async e=>{const value=Number(e.target.value);if(!Number.isFinite(value))return;await model.boost.setNumber(e.target.dataset.boostEntity,value)}));
      }
    }

    // CTS400 humidity regulation is configuration, not a daily control. Keep
    // it behind a capability-driven settings button like the Boost settings.
    const humidityLow=model.humidityControl.lowEntity,
      humidityLowStep=model.humidityControl.lowStepEntity,
      humidityHighStep=model.humidityControl.highStepEntity,
      humidityMaxTime=model.humidityControl.maxTimeEntity;
    if(model.capabilities.humidityControl){
      const ui=root.querySelector(".ui");
      if(ui&&!root.querySelector(".humiditySettingsRow")){
        const row=document.createElement("div");row.className="humiditySettingsRow";
        const button=document.createElement("button");button.className="humidityConfig";button.type="button";button.innerHTML="<span>Fugtstyring</span><span aria-hidden=\"true\">⚙</span>";button.setAttribute("aria-label","Fugtstyring indstillinger");row.appendChild(button);
        const panel=document.createElement("div");panel.className="humiditySettings";
        const numberField=(id,label)=>{if(!id)return"";const st=this._hass?.states?.[id],a=st?.attributes||{},value=st?.state??"",min=Number.isFinite(Number(a.min))?`min="${a.min}"`:"",max=Number.isFinite(Number(a.max))?`max="${a.max}"`:"",step=Number.isFinite(Number(a.step))?`step="${a.step}"`:'step="1"',unit=a.unit_of_measurement||"";return `<label>${label}<span><input type="number" data-humidity-number="${id}" ${min} ${max} ${step} value="${value}"><em>${unit}</em></span></label>`};
        const selectField=(id,label)=>{if(!id)return"";const st=this._hass?.states?.[id],options=st?.attributes?.options||[];return `<label>${label}<select data-humidity-select="${id}">${options.map(option=>`<option value="${option}" ${String(option)===String(st?.state)?"selected":""}>${option}</option>`).join("")}</select></label>`};
        panel.innerHTML=`<div class="humiditySettingsTitle">FUGTSTYRING</div>${numberField(humidityLow,"Lav fugtgrænse")}${selectField(humidityLowStep,"Trin ved lav fugt")}${selectField(humidityHighStep,"Trin ved høj fugt")}${numberField(humidityMaxTime,"Maks. tid ved høj fugt")}`;
        const firstSeparator=ui.querySelector(".sep");
        if(firstSeparator){firstSeparator.insertAdjacentElement("beforebegin",row);row.insertAdjacentElement("afterend",panel)}else{ui.append(row,panel)}
        const applyHumidity=()=>{const open=this._humidityConfigOpen===true;panel.classList.toggle("open",open);button.classList.toggle("on",open);button.setAttribute("aria-expanded",String(open))};
        applyHumidity();button.addEventListener("click",e=>{e.stopPropagation();this._humidityConfigOpen=!(this._humidityConfigOpen===true);applyHumidity()});
        panel.querySelectorAll("[data-humidity-number]").forEach(input=>input.addEventListener("change",async e=>{const value=Number(e.target.value);if(!Number.isFinite(value))return;await model.humidityControl.setNumber(e.target.dataset.humidityNumber,value)}));
        panel.querySelectorAll("[data-humidity-select]").forEach(select=>select.addEventListener("change",async e=>{await model.humidityControl.setOption(e.target.dataset.humiditySelect,e.target.value)}));
      }
    }

    // DRIFT is reference information, so keep it collapsed by default.
    const ui=root.querySelector(".ui"),drift=[...(ui?.querySelectorAll("h3")||[])].find(h=>h.textContent.trim()==="DRIFT");
    if(drift&&!root.querySelector(".driftAccordion")){
      const body=document.createElement("div");body.className="driftAccordion";
      let node=drift.nextElementSibling;
      while(node&&!node.classList.contains("sep")){const next=node.nextElementSibling;body.appendChild(node);node=next}
      drift.insertAdjacentElement("afterend",body);
      drift.classList.add("accordionHead");drift.setAttribute("role","button");drift.setAttribute("tabindex","0");
      const applyDrift=()=>{const open=this._driftInfoOpen===true;body.classList.toggle("open",open);drift.classList.toggle("open",open);drift.setAttribute("aria-expanded",String(open));drift.textContent=`DRIFT ${open?"▴":"▾"}`};
      const toggle=e=>{e?.stopPropagation?.();this._driftInfoOpen=!(this._driftInfoOpen===true);applyDrift()};
      applyDrift();drift.addEventListener("click",toggle);drift.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle(e)}});
    }

    // FILTER details/confirmation: restore state after every HA render. Core
    // handlers still own the actions; these listeners only remember UI state.
    const fb=root.querySelector("[data-filterbox]"),fd=root.querySelector("[data-filterdetail]"),fw=root.querySelector("[data-filterhouse]"),confirm=root.querySelector("[data-confirm]");
    if(fd){fd.classList.toggle("open",this._filterDetailOpen===true);ui?.classList.toggle("filterExpanded",this._filterDetailOpen===true)}
    if(confirm)confirm.classList.toggle("open",this._filterConfirmOpen===true);
    fb?.addEventListener("click",e=>{if(!e.target.closest("button")){queueMicrotask(()=>{this._filterDetailOpen=fd?.classList.contains("open")===true})}});
    fw?.addEventListener("click",()=>{this._filterDetailOpen=true;this._filterConfirmOpen=true});
    root.querySelector("[data-filterreset]")?.addEventListener("click",()=>{this._filterConfirmOpen=true});
    root.querySelector("[data-cancel]")?.addEventListener("click",()=>{this._filterConfirmOpen=false});
    root.querySelector("[data-confirmreset]")?.addEventListener("click",()=>{this._filterConfirmOpen=false});

    if(!root.querySelector("style[data-persistent-ui]")){const style=document.createElement("style");style.dataset.persistentUi="";style.textContent=`.boostSettingsRow{display:grid;grid-template-columns:1fr 42px;gap:6px;margin-top:12px}.boostSettingsRow>.boost{margin-top:0}.boostConfig,.humidityConfig{border:1px solid #285777;background:#0b2033;color:#dcefff;border-radius:10px;cursor:pointer;font-size:18px;line-height:1}.boostConfig:hover,.boostConfig.on,.humidityConfig:hover,.humidityConfig.on{background:#15527d;border-color:#4b83aa}.boostSettings,.humiditySettings{display:none;margin-top:7px;padding:10px;border:1px solid #244866;border-radius:10px;background:#081a29}.boostSettings.open,.humiditySettings.open{display:grid;gap:9px}.boostSettingsTitle,.humiditySettingsTitle{color:#9db7ca;font-size:10px;font-weight:700;letter-spacing:.08em}.boostSettings label,.humiditySettings label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:#cfe2f2}.boostSettings label span,.humiditySettings label span{display:flex;align-items:center;gap:5px}.boostSettings input,.humiditySettings input,.humiditySettings select{width:68px;box-sizing:border-box;border:1px solid #355b78;border-radius:7px;background:#102b42;color:#eaf6ff;padding:5px}.boostSettings em,.humiditySettings em{min-width:20px;color:#7f9db5;font-size:10px;font-style:normal}.humiditySettingsRow{margin-top:8px}.humidityConfig{display:flex;align-items:center;justify-content:space-between;width:100%;padding:9px 11px;font-size:12px;font-weight:600}.accordionHead{display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;padding:2px 0}.accordionHead:hover{color:#cfe8fa}.driftAccordion{display:none}.driftAccordion.open{display:block}`;root.appendChild(style)}
  };
});
