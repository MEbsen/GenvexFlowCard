const CARD_VERSION = "0.2.0-dev.1";

class GenvexFlowCard extends HTMLElement {
  setConfig(config) {
    this.config = { title: "Genvex ventilation", height: 720, ...config };
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.render();
  }
  set hass(hass) { this._hass = hass; this.render(); }
  getCardSize() { return 10; }
  static getStubConfig() { return { type: "custom:genvex-flow-card" }; }
  state(entity, fallback="—") {
    return entity && this._hass?.states?.[entity] ? this._hass.states[entity].state : fallback;
  }
  num(entity, fallback) {
    const v = Number(this.state(entity, fallback));
    return Number.isFinite(v) ? v : Number(fallback);
  }
  tempColor(value) {
    const t=Math.max(-10,Math.min(30,Number(value)||0));
    const stops=[[ -10, "#2b7fff"],[5,"#39bff8"],[14,"#54d6cf"],[18,"#f1b35b"],[22,"#ff824f"],[30,"#ff4f45"]];
    for(let i=1;i<stops.length;i++){
      if(t<=stops[i][0]){
        const [t0,c0]=stops[i-1],[t1,c1]=stops[i],p=(t-t0)/(t1-t0);
        const a=c0.match(/\w\w/g).map(x=>parseInt(x,16)),b=c1.match(/\w\w/g).map(x=>parseInt(x,16));
        return "#"+a.map((x,j)=>Math.round(x+(b[j]-x)*p).toString(16).padStart(2,"0")).join("");
      }
    }
    return stops.at(-1)[1];
  }
  render() {
    if (!this.shadowRoot || !this.config) return;
    const d={
      outside:this.num(this.config.outside_temperature,4.2),
      supply:this.num(this.config.supply_temperature,19.8),
      extract:this.num(this.config.extract_temperature,21.3),
      exhaust:this.num(this.config.exhaust_temperature,7.0),
      humidity:this.num(this.config.humidity,54),
      efficiency:this.num(this.config.efficiency,87),
      supplyFan:this.num(this.config.supply_fan,42),
      extractFan:this.num(this.config.extract_fan,46),
      filter:this.num(this.config.filter_days_left,143),
      fanLevel:this.state(this.config.fan_level,"2"),
      bypass:this.state(this.config.bypass,"off"),
      defrost:this.state(this.config.defrost,"off"),
      summer:this.state(this.config.summer_mode,"off"),
      reheat:this.state(this.config.reheat,"off")
    };
    const on=v=>["on","true","open","active","1"].includes(String(v).toLowerCase());
    const dur=v=>Math.max(.45,3.2-Math.min(100,v)*.025);
    const c={outside:this.tempColor(d.outside),supply:this.tempColor(d.supply),extract:this.tempColor(d.extract),exhaust:this.tempColor(d.exhaust)};
    this.shadowRoot.innerHTML=`
<style>
:host{display:block;container-type:inline-size;font-family:var(--ha-card-header-font-family,inherit)}
ha-card{overflow:hidden;min-height:${this.config.height}px;background:linear-gradient(145deg,var(--ha-card-background,var(--card-background-color)) 0%,color-mix(in srgb,var(--card-background-color) 92%,#12324a) 100%)}
.shell{padding:22px 24px 24px}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.title{font-size:1.35rem;font-weight:650}.running{font-size:.82rem;color:var(--secondary-text-color);display:flex;gap:7px;align-items:center}.dot{width:8px;height:8px;border-radius:50%;background:#55d68b;box-shadow:0 0 9px #55d68b}
.main{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:18px;align-items:stretch}.scene{min-width:0;display:flex;align-items:center}.scene svg{width:100%;height:auto;max-height:620px}
.panel{display:flex;flex-direction:column;gap:10px}.box{background:color-mix(in srgb,var(--card-background-color) 88%,transparent);border:1px solid var(--divider-color);border-radius:15px;padding:15px}.box h3{font-size:.72rem;letter-spacing:.1em;color:var(--secondary-text-color);margin:0 0 12px}.metric{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid color-mix(in srgb,var(--divider-color) 60%,transparent);font-size:.86rem}.metric:last-child{border:0}.metric b{font-weight:650}.pills{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.pill{text-align:center;border:1px solid var(--divider-color);border-radius:9px;padding:7px 0;font-size:.8rem}.pill.active{background:var(--primary-color);color:var(--text-primary-color,#fff);border-color:var(--primary-color)}.tag{display:inline-flex;align-items:center;gap:6px;font-size:.78rem;padding:5px 8px;border-radius:9px;background:color-mix(in srgb,var(--primary-color) 12%,transparent);margin:3px 2px 3px 0}.tag.on{background:color-mix(in srgb,#f4b44b 20%,transparent)}
.house{fill:none;stroke:var(--secondary-text-color);stroke-width:2;opacity:.18}.duct{fill:none;stroke:color-mix(in srgb,var(--secondary-text-color) 17%,transparent);stroke-width:34;stroke-linecap:round;stroke-linejoin:round}.flow{fill:none;stroke-width:11;stroke-linecap:round;stroke-dasharray:3 24;animation:flow linear infinite;filter:url(#glow)}.outside{stroke:${c.outside};animation-duration:${dur(d.supplyFan)}s}.supply{stroke:${c.supply};animation-duration:${dur(d.supplyFan)}s}.extract{stroke:${c.extract};animation-duration:${dur(d.extractFan)}s;animation-direction:reverse}.exhaust{stroke:${c.exhaust};animation-duration:${dur(d.extractFan)}s;animation-direction:reverse}.hx{fill:color-mix(in srgb,var(--card-background-color) 88%,#122c3d);stroke:color-mix(in srgb,var(--primary-color) 70%,white);stroke-width:2}.hxline{stroke:url(#heat);stroke-width:7;stroke-linecap:round;opacity:.85;animation:pulse 2.2s ease-in-out infinite}.val{fill:var(--primary-text-color);font-size:29px;font-weight:700;text-anchor:middle}.lbl{fill:var(--secondary-text-color);font-size:14px;text-anchor:middle}.cap{fill:var(--secondary-text-color);font-size:12px;letter-spacing:.12em;text-anchor:middle}.fan{fill:none;stroke:var(--secondary-text-color);stroke-width:2;opacity:.6;transform-box:fill-box;transform-origin:center;animation:spin linear infinite}.fan.s{animation-duration:${dur(d.supplyFan)*1.8}s}.fan.e{animation-duration:${dur(d.extractFan)*1.8}s}
@keyframes flow{to{stroke-dashoffset:-54}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{50%{opacity:.35}}@media(prefers-reduced-motion:reduce){.flow,.fan,.hxline{animation:none}}
@container(max-width:850px){.main{grid-template-columns:1fr}.panel{display:grid;grid-template-columns:repeat(2,1fr)}ha-card{min-height:auto}.scene svg{max-height:none}}
@container(max-width:520px){.shell{padding:14px}.panel{grid-template-columns:1fr}.title{font-size:1.05rem}.running{font-size:.72rem}.cap{font-size:10px}.lbl{font-size:12px}.val{font-size:25px}}
</style>
<ha-card><div class="shell">
<div class="top"><div class="title">${this.config.title}</div><div class="running"><span class="dot"></span> Normal drift · ${CARD_VERSION}</div></div>
<div class="main"><div class="scene">
<svg viewBox="0 0 900 650" preserveAspectRatio="xMidYMid meet" aria-label="Genvex ventilation airflow">
<defs><filter id="glow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="heat" x1="0" x2="1"><stop offset="0" stop-color="${c.extract}"/><stop offset="1" stop-color="${c.supply}"/></linearGradient></defs>
<path class="house" d="M65 540V265L235 145L405 265V540M405 265L575 145L745 265V540M65 540H745"/>
<path class="duct" d="M245 80V235Q245 280 290 280H385"/><path class="duct" d="M385 365H290Q245 365 245 410V550"/>
<path class="duct" d="M665 550V410Q665 365 620 365H525"/><path class="duct" d="M525 280H620Q665 280 665 235V80"/>
<path class="flow outside" d="M245 80V235Q245 280 290 280H385"/><path class="flow supply" d="M385 365H290Q245 365 245 410V550"/>
<path class="flow extract" d="M665 550V410Q665 365 620 365H525"/><path class="flow exhaust" d="M525 280H620Q665 280 665 235V80"/>
<rect class="hx" x="385" y="235" width="140" height="175" rx="24"/><path class="hxline" d="M410 300L500 345M410 345L500 300"/>
<text class="cap" x="455" y="265">VARMEVEKSLER</text><text class="val" x="455" y="385">${d.efficiency.toFixed(0)}%</text><text class="lbl" x="455" y="405">varmegenvinding</text>
<g transform="translate(245 155)"><circle class="fan s" cx="0" cy="0" r="18"/><path class="fan s" d="M0-17C12-15 13-5 3 0C14 3 12 14 2 17C-4 7-2 3 0 1C-10 8-18 1-16-9C-5-8-2-4 0 0Z"/></g>
<g transform="translate(665 470)"><circle class="fan e" cx="0" cy="0" r="18"/><path class="fan e" d="M0-17C12-15 13-5 3 0C14 3 12 14 2 17C-4 7-2 3 0 1C-10 8-18 1-16-9C-5-8-2-4 0 0Z"/></g>
<text class="val" x="245" y="36">${d.outside.toFixed(1)}°</text><text class="lbl" x="245" y="58">Udeluft</text>
<text class="val" x="665" y="36">${d.exhaust.toFixed(1)}°</text><text class="lbl" x="665" y="58">Afkast</text>
<text class="val" x="245" y="600">${d.supply.toFixed(1)}°</text><text class="lbl" x="245" y="623">Indblæsning · ${d.supplyFan.toFixed(0)}%</text>
<text class="val" x="665" y="600">${d.extract.toFixed(1)}°</text><text class="lbl" x="665" y="623">Udsugning · ${d.extractFan.toFixed(0)}%</text>
<text class="cap" x="455" y="485">INDEKLIMA</text><text class="val" x="455" y="520">${d.humidity.toFixed(0)}%</text><text class="lbl" x="455" y="542">luftfugtighed</text>
</svg></div>
<div class="panel">
<div class="box"><h3>VENTILATION</h3><div class="metric"><span>Indblæsning</span><b>${d.supplyFan.toFixed(0)}%</b></div><div class="metric"><span>Udsugning</span><b>${d.extractFan.toFixed(0)}%</b></div><div class="metric"><span>Ventilatortrin</span><b>${d.fanLevel}</b></div><div class="pills">${["0","1","2","3","4"].map(x=>`<div class="pill ${String(d.fanLevel)===x?"active":""}">${x}</div>`).join("")}</div></div>
<div class="box"><h3>ANLÆGSSTATUS</h3><span class="tag ${on(d.bypass)?"on":""}">Bypass: ${on(d.bypass)?"aktiv":"lukket"}</span><span class="tag ${on(d.defrost)?"on":""}">Defrost: ${on(d.defrost)?"aktiv":"nej"}</span><span class="tag ${on(d.summer)?"on":""}">Sommer: ${on(d.summer)?"ja":"nej"}</span><span class="tag ${on(d.reheat)?"on":""}">Eftervarme: ${on(d.reheat)?"aktiv":"nej"}</span></div>
<div class="box"><h3>LUFT & FILTER</h3><div class="metric"><span>Luftfugtighed</span><b>${d.humidity.toFixed(0)}%</b></div><div class="metric"><span>Filter</span><b>${d.filter.toFixed(0)} dage</b></div><div class="metric"><span>Varmegenvinding</span><b>${d.efficiency.toFixed(0)}%</b></div></div>
</div></div></div></ha-card>`;
  }
}
customElements.define("genvex-flow-card",GenvexFlowCard);
window.customCards=window.customCards||[];window.customCards.push({type:"genvex-flow-card",name:"Genvex Flow Card",description:"Responsive animated ventilation visualization for Home Assistant.",preview:true});
console.info(`%c GENVEX-FLOW-CARD %c ${CARD_VERSION} `,"background:#03a9f4;color:white;padding:3px","background:#555;color:white;padding:3px");
