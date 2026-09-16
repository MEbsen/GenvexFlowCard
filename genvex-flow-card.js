const CARD_VERSION = "0.1.0-dev.1";

class GenvexFlowCard extends HTMLElement {
  setConfig(config) {
    this.config = { title: "Genvex ventilation", height: 560, ...config };
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() { return 8; }

  static getStubConfig() {
    return { type: "custom:genvex-flow-card" };
  }

  state(entity, fallback = "—") {
    return entity && this._hass?.states?.[entity]
      ? this._hass.states[entity].state
      : fallback;
  }

  render() {
    if (!this.shadowRoot || !this.config) return;

    const data = {
      outside: this.state(this.config.outside_temperature, "4.2"),
      supply: this.state(this.config.supply_temperature, "19.8"),
      extract: this.state(this.config.extract_temperature, "21.3"),
      exhaust: this.state(this.config.exhaust_temperature, "7.0"),
      humidity: this.state(this.config.humidity, "54"),
      efficiency: this.state(this.config.efficiency, "87"),
      supplyFan: Number(this.state(this.config.supply_fan, "42")),
      extractFan: Number(this.state(this.config.extract_fan, "46")),
    };

    const supplyDuration = Math.max(.45, 3.2 - Math.min(100, data.supplyFan) * .025);
    const extractDuration = Math.max(.45, 3.2 - Math.min(100, data.extractFan) * .025);

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; container-type:inline-size; }
        ha-card { overflow:hidden; min-height:${this.config.height}px; }
        .wrap { padding:20px; }
        header { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:8px; }
        h2 { margin:0; font-size:1.35rem; font-weight:600; }
        .status { opacity:.65; font-size:.8rem; }
        svg { width:100%; height:auto; max-height:calc(${this.config.height}px - 75px); display:block; }
        .house { fill:none; stroke:var(--secondary-text-color); stroke-width:2; opacity:.35; }
        .duct { fill:none; stroke:var(--divider-color); stroke-width:24; stroke-linecap:round; }
        .flow { fill:none; stroke-width:9; stroke-linecap:round; stroke-dasharray:4 22; animation:flow linear infinite; }
        .outside-flow { stroke:#31a8ff; animation-duration:${supplyDuration}s; }
        .supply-flow { stroke:#ff9b45; animation-duration:${supplyDuration}s; }
        .extract-flow { stroke:#ff5d4a; animation-duration:${extractDuration}s; animation-direction:reverse; }
        .exhaust-flow { stroke:#55c7ff; animation-duration:${extractDuration}s; animation-direction:reverse; }
        .exchange { fill:var(--card-background-color); stroke:var(--primary-color); stroke-width:2; }
        .value { fill:var(--primary-text-color); font-size:28px; font-weight:650; text-anchor:middle; }
        .label { fill:var(--secondary-text-color); font-size:16px; text-anchor:middle; }
        .small { fill:var(--secondary-text-color); font-size:14px; text-anchor:middle; }
        @keyframes flow { to { stroke-dashoffset:-52; } }
        @media (prefers-reduced-motion: reduce) { .flow { animation:none; } }
        @container (max-width:560px) {
          .wrap { padding:12px; }
          h2 { font-size:1.05rem; }
          .label { font-size:13px; }
          .value { font-size:23px; }
        }
      </style>
      <ha-card>
        <div class="wrap">
          <header>
            <h2>${this.config.title}</h2>
            <div class="status">Genvex Flow Card · ${CARD_VERSION}</div>
          </header>
          <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet">
            <path class="house" d="M120 475 V245 L300 115 L480 245 V475 M480 245 L660 115 L840 245 V475 M120 475 H840"/>
            <path class="duct" d="M280 90 V235 Q280 270 315 270 H430"/>
            <path class="duct" d="M430 330 H315 Q280 330 280 365 V475"/>
            <path class="duct" d="M720 475 V365 Q720 330 685 330 H570"/>
            <path class="duct" d="M570 270 H685 Q720 270 720 235 V90"/>
            <path class="flow outside-flow" d="M280 90 V235 Q280 270 315 270 H430"/>
            <path class="flow supply-flow" d="M430 330 H315 Q280 330 280 365 V475"/>
            <path class="flow extract-flow" d="M720 475 V365 Q720 330 685 330 H570"/>
            <path class="flow exhaust-flow" d="M570 270 H685 Q720 270 720 235 V90"/>
            <rect class="exchange" x="430" y="230" width="140" height="140" rx="18"/>
            <text class="small" x="500" y="275">VARMEVEKSLER</text>
            <text class="value" x="500" y="320">${data.efficiency}%</text>
            <text class="small" x="500" y="345">genvinding</text>
            <text class="value" x="280" y="42">${data.outside}°</text>
            <text class="label" x="280" y="66">Udeluft</text>
            <text class="value" x="720" y="42">${data.exhaust}°</text>
            <text class="label" x="720" y="66">Afkast</text>
            <text class="value" x="280" y="520">${data.supply}°</text>
            <text class="label" x="280" y="545">Indblæsning · ${data.supplyFan}%</text>
            <text class="value" x="720" y="520">${data.extract}°</text>
            <text class="label" x="720" y="545">Udsugning · ${data.extractFan}%</text>
            <text class="small" x="500" y="430">Fugtighed ${data.humidity}%</text>
          </svg>
        </div>
      </ha-card>`;
  }
}

customElements.define("genvex-flow-card", GenvexFlowCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "genvex-flow-card",
  name: "Genvex Flow Card",
  description: "Responsive animated ventilation visualization for Home Assistant.",
  preview: true
});
console.info(`%c GENVEX-FLOW-CARD %c ${CARD_VERSION} `, "background:#03a9f4;color:white;padding:3px", "background:#555;color:white;padding:3px");
