(() => {
  // src/providers/base.js
  var VentilationProviderAdapter = class {
    constructor(card) {
      this.card = card;
    }
    get hass() {
      return this.card._hass;
    }
    get registry() {
      return this.card._registry || [];
    }
    findByFriendlyName(names, domain) {
      const wanted = names.map((x) => x.toLowerCase());
      for (const [id, state] of Object.entries(this.hass?.states || {})) {
        if (domain && !id.startsWith(domain + ".")) continue;
        const name = String(state.attributes?.friendly_name || "").toLowerCase();
        if (wanted.some((x) => name === x || name.includes(x))) return id;
      }
      return null;
    }
    resolve() {
      return null;
    }
    normalizeFanLevel(entityId) {
      const value = Number(this.hass?.states?.[entityId]?.state);
      return Number.isFinite(value) ? Math.max(0, Math.min(4, Math.round(value))) : 0;
    }
    get id() {
      return "generic";
    }
    get label() {
      return "Ventilation";
    }
    get experimental() {
      return false;
    }
  };

  // src/providers/genvex-connect.js
  var GenvexConnectAdapter = class extends VentilationProviderAdapter {
    get id() {
      return "genvex_connect";
    }
    get label() {
      return "Genvex Connect";
    }
    selectedDeviceId() {
      const selected = this.card.config?.ventilation_entity || this.card.config?.genvex_entity;
      if (selected) {
        const reg = this.registry.find((x) => x.entity_id === selected);
        if (reg?.device_id) return reg.device_id;
      }
      return this.card.config?.genvex_device || null;
    }
    resolve(key, domain) {
      if (!this.hass) return null;
      const deviceId = this.selectedDeviceId();
      const aliases = {
        fan_speed: ["fan level", "fan speed", "ventilator trin", "ventilator hastighed"],
        boost_enable: ["boost"],
        boost_speed: ["boost speed", "boost fan speed", "boost level", "boost step", "boost hastighed", "boost trin"],
        boost_duration: ["boost duration", "boost time", "boost timer", "boost l\xE6ngde", "boost tid"],
        temp_supply: ["temperature supply air", "temperatur tilluft"],
        temp_extract: ["temperature extract air", "temperatur fraluft"],
        temp_outside: ["temperature outside air", "temperatur udeluft"],
        temp_exhaust: ["temperature exhaust air", "temperatur afkastluft"],
        humidity: ["humidity", "luftfugtighed"],
        filter_days_left: ["days left until filter change", "dage til filter skift"],
        filter_days: ["days since filter change", "dage siden filter skift", "filter days", "filterdage"],
        filter_days_setting: ["days between filter change", "dage mellem filter skift", "filter days setting", "filter interval"],
        filter_months_setting: ["months between filter change", "m\xE5neder mellem filterskift", "filter months setting"],
        filter_reset: ["reset filter", "nulstil filter"],
        efficiency: ["efficiency", "virkningsgrad", "varmegenvinding"],
        bypass_active: ["bypass"],
        summer_mode: ["summer mode", "sommerdrift"],
        defrost_active: ["defrost active", "afrimning aktiv"],
        reheat_active: ["reheat active", "eftervarme aktiv"],
        fan_rpm_supply: ["fan rpm supply", "supply fan rpm", "indbl\xE6sning rpm"],
        fan_rpm_extract: ["fan rpm extract", "extract fan rpm", "udsugning rpm"],
        cts400_humidity_low_level: ["low humidity %", "lav luftfugtighed %"],
        cts400_humidity_low_step: ["low humidity fan level", "lav luftfugtighed trin"],
        cts400_humidity_high_step: ["high humidity fan level", "h\xF8j luftfugtighed trin"],
        cts400_humidity_high_max_time: ["high humidity level timeout", "h\xF8j luftfugtighed trin timeout"]
      };
      for (const m of this.registry) {
        if (deviceId && m.device_id !== deviceId) continue;
        const id = m.entity_id;
        if (!id || domain && !id.startsWith(domain + ".")) continue;
        const uid = String(m.unique_id || "").toLowerCase();
        const tk = String(m.translation_key || "").toLowerCase();
        if (m.platform === "genvex_connect" && (tk === key || uid.endsWith("_" + key) || id.endsWith("_" + key.replace(/_enable$/, "")))) return id;
      }
      for (const [id, st] of Object.entries(this.hass.states || {})) {
        if (domain && !id.startsWith(domain + ".")) continue;
        if (deviceId) {
          const reg = this.registry.find((r) => r.entity_id === id);
          if (reg?.device_id !== deviceId) continue;
        }
        const name = String(st.attributes?.friendly_name || "").toLowerCase();
        if ((aliases[key] || []).some((a) => name.includes(a))) return id;
      }
      return null;
    }
  };

  // src/providers/danfoss-air.js
  var DanfossAirAdapter = class extends VentilationProviderAdapter {
    get id() {
      return "danfoss_air";
    }
    get label() {
      return "Danfoss Air";
    }
    get experimental() {
      return true;
    }
    resolve(key, domain) {
      const map = {
        temp_outside: ["Danfoss Air Outdoor Temperature"],
        temp_supply: ["Danfoss Air Supply Temperature"],
        temp_extract: ["Danfoss Air Extract Temperature"],
        temp_exhaust: ["Danfoss Air Exhaust Temperature"],
        humidity: ["Danfoss Air Humidity"],
        fan_speed: ["Danfoss Air Fan Step"],
        fan_control: ["Danfoss Air Ventilation"],
        operation_mode: ["Danfoss Air Operation Mode"],
        filter_remaining: ["Danfoss Air Remaining Filter", "Remaining Filter"],
        boost_enable: ["Danfoss Air Boost"],
        boost_speed: ["Danfoss Air Maximum Boost Step"],
        boost_duration: ["Danfoss Air Boost Duration"],
        bypass_active: ["Danfoss Air Bypass"],
        automatic_bypass: ["Danfoss Air Automatic Bypass"],
        supply_fan_rpm: ["Danfoss Air Supply Fan Speed", "Supply Fan Speed"],
        exhaust_fan_rpm: ["Danfoss Air Exhaust Fan Speed", "Exhaust Fan Speed"]
      };
      const exact = {
        filter_remaining: "sensor.danfoss_air_remaining_filter",
        boost_enable: "switch.danfoss_air_boost",
        boost_speed: "number.danfoss_air_maximum_boost_step",
        boost_duration: "number.danfoss_air_boost_duration",
        bypass_active: "switch.danfoss_air_bypass",
        automatic_bypass: "switch.danfoss_air_automatic_bypass",
        fan_control: "fan.danfoss_air_ventilation",
        operation_mode: "select.danfoss_air_operation_mode",
        supply_fan_rpm: "sensor.danfoss_air_supply_fan_speed",
        exhaust_fan_rpm: "sensor.danfoss_air_exhaust_fan_speed"
      };
      const id = exact[key];
      if (id && (!domain || id.startsWith(domain + ".")) && this.hass?.states?.[id]) return id;
      return this.findByFriendlyName(map[key] || [], domain);
    }
    normalizeFanLevel(entityId) {
      const percent = Number(this.hass?.states?.[entityId]?.state);
      if (!Number.isFinite(percent) || percent <= 0) return 0;
      return Math.max(1, Math.min(4, Math.ceil(percent / 25)));
    }
    fanPercentage(entityId) {
      const state = this.hass?.states?.[entityId];
      const pct = Number(state?.attributes?.percentage);
      if (Number.isFinite(pct)) return Math.max(0, Math.min(100, pct));
      const step = Number(this.hass?.states?.[this.resolve("fan_speed", "sensor")]?.state);
      return Number.isFinite(step) ? Math.max(0, Math.min(100, step)) : 0;
    }
    setFanPercentage(entityId, percentage) {
      return this.hass.callService("fan", "set_percentage", { entity_id: entityId, percentage: Number(percentage) });
    }
    turnFanOff(entityId) {
      return this.hass.callService("fan", "turn_off", { entity_id: entityId });
    }
  };

  // src/providers/index.js
  var PROVIDERS = {
    genvex_connect: GenvexConnectAdapter,
    danfoss_air: DanfossAirAdapter
  };
  function createProvider(card) {
    const id = card.config?.provider || "genvex_connect";
    const Provider = PROVIDERS[id] || GenvexConnectAdapter;
    return new Provider(card);
  }
  queueMicrotask(() => {
    const Card2 = customElements.get("genvex-flow-card");
    if (!Card2 || Card2.prototype.__persistentUiInstalled) return;
    Card2.prototype.__persistentUiInstalled = true;
    const previousRender = Card2.prototype.render;
    Card2.prototype.render = function() {
      previousRender.call(this);
      const root = this.shadowRoot;
      if (!root || !this.config) return;
      const p = createProvider(this), speed = p.resolve("boost_speed", "number"), duration = p.resolve("boost_duration", "number");
      if (speed || duration) {
        const boost = root.querySelector("button.boost:not(.danfossAuto):not(.danfossOff)");
        if (boost && !root.querySelector(".boostSettingsRow")) {
          const row = document.createElement("div");
          row.className = "boostSettingsRow";
          boost.parentNode.insertBefore(row, boost);
          row.appendChild(boost);
          const gear = document.createElement("button");
          gear.className = "boostConfig";
          gear.type = "button";
          gear.title = "Boost indstillinger";
          gear.setAttribute("aria-label", "Boost indstillinger");
          gear.textContent = "\u2699";
          row.appendChild(gear);
          const panel = document.createElement("div");
          panel.className = "boostSettings";
          const field = (id, label) => {
            if (!id) return "";
            const st = this._hass?.states?.[id], a = st?.attributes || {}, value = st?.state ?? "", min = Number.isFinite(Number(a.min)) ? `min="${a.min}"` : "", max = Number.isFinite(Number(a.max)) ? `max="${a.max}"` : "", step = Number.isFinite(Number(a.step)) ? `step="${a.step}"` : 'step="1"', unit = a.unit_of_measurement || "";
            return `<label>${label}<span><input type="number" data-boost-entity="${id}" ${min} ${max} ${step} value="${value}"><em>${unit}</em></span></label>`;
          };
          panel.innerHTML = `<div class="boostSettingsTitle">BOOST INDSTILLINGER</div>${field(speed, "Boost hastighed")}${field(duration, "Boost l\xE6ngde")}`;
          row.insertAdjacentElement("afterend", panel);
          const applyBoost = () => {
            const open = this._boostConfigOpen === true;
            panel.classList.toggle("open", open);
            gear.classList.toggle("on", open);
            gear.setAttribute("aria-expanded", String(open));
          };
          applyBoost();
          gear.addEventListener("click", (e) => {
            e.stopPropagation();
            this._boostConfigOpen = !(this._boostConfigOpen === true);
            applyBoost();
          });
          panel.querySelectorAll("[data-boost-entity]").forEach((input) => input.addEventListener("change", async (e) => {
            const value = Number(e.target.value);
            if (!Number.isFinite(value)) return;
            await this._hass.callService("number", "set_value", { entity_id: e.target.dataset.boostEntity, value });
          }));
        }
      }
      const humidityLow = p.resolve("cts400_humidity_low_level", "number"), humidityLowStep = p.resolve("cts400_humidity_low_step", "select"), humidityHighStep = p.resolve("cts400_humidity_high_step", "select"), humidityMaxTime = p.resolve("cts400_humidity_high_max_time", "number");
      if (humidityLow || humidityLowStep || humidityHighStep || humidityMaxTime) {
        const ui2 = root.querySelector(".ui");
        if (ui2 && !root.querySelector(".humiditySettingsRow")) {
          const row = document.createElement("div");
          row.className = "humiditySettingsRow";
          const button = document.createElement("button");
          button.className = "humidityConfig";
          button.type = "button";
          button.innerHTML = '<span>Fugtstyring</span><span aria-hidden="true">\u2699</span>';
          button.setAttribute("aria-label", "Fugtstyring indstillinger");
          row.appendChild(button);
          const panel = document.createElement("div");
          panel.className = "humiditySettings";
          const numberField = (id, label) => {
            if (!id) return "";
            const st = this._hass?.states?.[id], a = st?.attributes || {}, value = st?.state ?? "", min = Number.isFinite(Number(a.min)) ? `min="${a.min}"` : "", max = Number.isFinite(Number(a.max)) ? `max="${a.max}"` : "", step = Number.isFinite(Number(a.step)) ? `step="${a.step}"` : 'step="1"', unit = a.unit_of_measurement || "";
            return `<label>${label}<span><input type="number" data-humidity-number="${id}" ${min} ${max} ${step} value="${value}"><em>${unit}</em></span></label>`;
          };
          const selectField = (id, label) => {
            if (!id) return "";
            const st = this._hass?.states?.[id], options = st?.attributes?.options || [];
            return `<label>${label}<select data-humidity-select="${id}">${options.map((option) => `<option value="${option}" ${String(option) === String(st?.state) ? "selected" : ""}>${option}</option>`).join("")}</select></label>`;
          };
          panel.innerHTML = `<div class="humiditySettingsTitle">FUGTSTYRING</div>${numberField(humidityLow, "Lav fugtgr\xE6nse")}${selectField(humidityLowStep, "Trin ved lav fugt")}${selectField(humidityHighStep, "Trin ved h\xF8j fugt")}${numberField(humidityMaxTime, "Maks. tid ved h\xF8j fugt")}`;
          const firstSeparator = ui2.querySelector(".sep");
          if (firstSeparator) {
            firstSeparator.insertAdjacentElement("beforebegin", row);
            row.insertAdjacentElement("afterend", panel);
          } else {
            ui2.append(row, panel);
          }
          const applyHumidity = () => {
            const open = this._humidityConfigOpen === true;
            panel.classList.toggle("open", open);
            button.classList.toggle("on", open);
            button.setAttribute("aria-expanded", String(open));
          };
          applyHumidity();
          button.addEventListener("click", (e) => {
            e.stopPropagation();
            this._humidityConfigOpen = !(this._humidityConfigOpen === true);
            applyHumidity();
          });
          panel.querySelectorAll("[data-humidity-number]").forEach((input) => input.addEventListener("change", async (e) => {
            const value = Number(e.target.value);
            if (!Number.isFinite(value)) return;
            await this._hass.callService("number", "set_value", { entity_id: e.target.dataset.humidityNumber, value });
          }));
          panel.querySelectorAll("[data-humidity-select]").forEach((select) => select.addEventListener("change", async (e) => {
            await this._hass.callService("select", "select_option", { entity_id: e.target.dataset.humiditySelect, option: e.target.value });
          }));
        }
      }
      const ui = root.querySelector(".ui"), drift = [...ui?.querySelectorAll("h3") || []].find((h) => h.textContent.trim() === "DRIFT");
      if (drift && !root.querySelector(".driftAccordion")) {
        const body = document.createElement("div");
        body.className = "driftAccordion";
        let node = drift.nextElementSibling;
        while (node && !node.classList.contains("sep")) {
          const next = node.nextElementSibling;
          body.appendChild(node);
          node = next;
        }
        drift.insertAdjacentElement("afterend", body);
        drift.classList.add("accordionHead");
        drift.setAttribute("role", "button");
        drift.setAttribute("tabindex", "0");
        const applyDrift = () => {
          const open = this._driftInfoOpen === true;
          body.classList.toggle("open", open);
          drift.classList.toggle("open", open);
          drift.setAttribute("aria-expanded", String(open));
          drift.textContent = `DRIFT ${open ? "\u25B4" : "\u25BE"}`;
        };
        const toggle = (e) => {
          e?.stopPropagation?.();
          this._driftInfoOpen = !(this._driftInfoOpen === true);
          applyDrift();
        };
        applyDrift();
        drift.addEventListener("click", toggle);
        drift.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle(e);
          }
        });
      }
      const fb = root.querySelector("[data-filterbox]"), fd = root.querySelector("[data-filterdetail]"), fw = root.querySelector("[data-filterhouse]"), confirm = root.querySelector("[data-confirm]");
      if (fd) {
        fd.classList.toggle("open", this._filterDetailOpen === true);
        ui?.classList.toggle("filterExpanded", this._filterDetailOpen === true);
      }
      if (confirm) confirm.classList.toggle("open", this._filterConfirmOpen === true);
      fb?.addEventListener("click", (e) => {
        if (!e.target.closest("button")) {
          queueMicrotask(() => {
            this._filterDetailOpen = fd?.classList.contains("open") === true;
          });
        }
      });
      fw?.addEventListener("click", () => {
        this._filterDetailOpen = true;
        this._filterConfirmOpen = true;
      });
      root.querySelector("[data-filterreset]")?.addEventListener("click", () => {
        this._filterConfirmOpen = true;
      });
      root.querySelector("[data-cancel]")?.addEventListener("click", () => {
        this._filterConfirmOpen = false;
      });
      root.querySelector("[data-confirmreset]")?.addEventListener("click", () => {
        this._filterConfirmOpen = false;
      });
      if (!root.querySelector("style[data-persistent-ui]")) {
        const style = document.createElement("style");
        style.dataset.persistentUi = "";
        style.textContent = `.boostSettingsRow{display:grid;grid-template-columns:1fr 42px;gap:6px;margin-top:12px}.boostSettingsRow>.boost{margin-top:0}.boostConfig,.humidityConfig{border:1px solid #285777;background:#0b2033;color:#dcefff;border-radius:10px;cursor:pointer;font-size:18px;line-height:1}.boostConfig:hover,.boostConfig.on,.humidityConfig:hover,.humidityConfig.on{background:#15527d;border-color:#4b83aa}.boostSettings,.humiditySettings{display:none;margin-top:7px;padding:10px;border:1px solid #244866;border-radius:10px;background:#081a29}.boostSettings.open,.humiditySettings.open{display:grid;gap:9px}.boostSettingsTitle,.humiditySettingsTitle{color:#9db7ca;font-size:10px;font-weight:700;letter-spacing:.08em}.boostSettings label,.humiditySettings label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:#cfe2f2}.boostSettings label span,.humiditySettings label span{display:flex;align-items:center;gap:5px}.boostSettings input,.humiditySettings input,.humiditySettings select{width:68px;box-sizing:border-box;border:1px solid #355b78;border-radius:7px;background:#102b42;color:#eaf6ff;padding:5px}.boostSettings em,.humiditySettings em{min-width:20px;color:#7f9db5;font-size:10px;font-style:normal}.humiditySettingsRow{margin-top:8px}.humidityConfig{display:flex;align-items:center;justify-content:space-between;width:100%;padding:9px 11px;font-size:12px;font-weight:600}.accordionHead{display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;padding:2px 0}.accordionHead:hover{color:#cfe8fa}.driftAccordion{display:none}.driftAccordion.open{display:block}`;
        root.appendChild(style);
      }
    };
  });

  // src/generated/legacy-card-core.js
  var CARD_VERSION = "1.0.1";
  var GenvexFlowCard = class extends HTMLElement {
    setConfig(c) {
      this.config = { title: "Ventilation", height: 720, aspect_ratio: "16/10", grid_options: { columns: 12, rows: 8, min_columns: 3, min_rows: 4 }, ...c };
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.render();
    }
    set hass(h) {
      this._hass = h;
      if (!this._registryLoading && !this._registry) {
        this._registryLoading = true;
        Promise.all([h.callWS({ type: "config/entity_registry/list" }), h.callWS({ type: "config/device_registry/list" })]).then(([r, d]) => {
          this._registry = r || [];
          this._devices = d || [];
          this._registryLoading = false;
          this.render();
        }).catch(() => {
          this._registry = [];
          this._registryLoading = false;
          this.render();
        });
      }
      this.render();
    }
    getCardSize() {
      return Math.max(5, Math.ceil((+this.config?.height || 720) / 50));
    }
    static getStubConfig() {
      return { type: "custom:genvex-flow-card", title: "Ventilation", height: 720, grid_options: { columns: 12, rows: 8, min_columns: 3, min_rows: 4 } };
    }
    static getConfigElement() {
      return document.createElement("genvex-flow-card-editor");
    }
    selectedDeviceId() {
      if (this.config.genvex_entity) {
        const r = (this._registry || []).find((x) => x.entity_id === this.config.genvex_entity);
        if (r?.device_id) return r.device_id;
      }
      return this.config.genvex_device || null;
    }
    entityByKey(key, domain) {
      if (!this._hass) return null;
      const deviceId = this.selectedDeviceId();
      const aliases = { fan_speed: ["fan level", "fan speed", "ventilator trin", "ventilator hastighed"], boost_enable: ["boost"], temp_supply: ["temperature supply air", "temperatur tilluft"], temp_extract: ["temperature extract air", "temperatur fraluft"], temp_outside: ["temperature outside air", "temperatur udeluft"], temp_exhaust: ["temperature exhaust air", "temperatur afkastluft"], humidity: ["humidity", "luftfugtighed"], filter_days_left: ["days left until filter change", "dage til filter skift"], filter_days: ["days since filter change", "dage siden filter skift", "filter days", "filterdage"], filter_days_setting: ["days between filter change", "dage mellem filter skift", "filter days setting", "filter interval"], filter_reset: ["reset filter", "nulstil filter"], efficiency: ["efficiency", "virkningsgrad", "varmegenvinding"], bypass_active: ["bypass"] };
      for (const m of this._registry || []) {
        if (deviceId && m.device_id !== deviceId) continue;
        const id = m.entity_id;
        if (!id || domain && !id.startsWith(domain + ".")) continue;
        const uid = String(m.unique_id || "").toLowerCase();
        const tk = String(m.translation_key || "").toLowerCase();
        if (m.platform === "genvex_connect" && (tk === key || uid.endsWith("_" + key) || id.endsWith("_" + key.replace(/_enable$/, "")))) return id;
      }
      for (const [id, st] of Object.entries(this._hass.states)) {
        if (domain && !id.startsWith(domain + ".")) continue;
        if (deviceId) {
          const reg = (this._registry || []).find((r) => r.entity_id === id);
          if (reg?.device_id !== deviceId) continue;
        }
        const n = String(st.attributes?.friendly_name || "").toLowerCase();
        if ((aliases[key] || []).some((a) => n.includes(a))) return id;
      }
      return null;
    }
    state(e, f = "\u2014") {
      return e && this._hass?.states?.[e] ? this._hass.states[e].state : f;
    }
    num(e, f = NaN) {
      const n = Number(this.state(e, NaN));
      return Number.isFinite(n) ? n : Number(f);
    }
    fmt(v, d = 1, s = "\u2014") {
      return Number.isFinite(v) ? v.toFixed(d) : s;
    }
    tempColor(v) {
      let t = Math.max(-10, Math.min(30, +v || 0)), s = [[-10, "#168cff"], [7, "#2bbdff"], [15, "#65d6d0"], [19, "#ffad31"], [23, "#ff6558"], [30, "#ff3855"]];
      for (let i = 1; i < s.length; i++) if (t <= s[i][0]) {
        let p = (t - s[i - 1][0]) / (s[i][0] - s[i - 1][0]), a = s[i - 1][1].match(/\w\w/g).map((x) => parseInt(x, 16)), b = s[i][1].match(/\w\w/g).map((x) => parseInt(x, 16));
        return "#" + a.map((x, j) => Math.round(x + (b[j] - x) * p).toString(16).padStart(2, "0")).join("");
      }
      return s.at(-1)[1];
    }
    render() {
      if (!this.config || !this.shadowRoot) return;
      const auto = { outside: this.entityByKey("temp_outside", "sensor"), supply: this.entityByKey("temp_supply", "sensor"), extract: this.entityByKey("temp_extract", "sensor"), exhaust: this.entityByKey("temp_exhaust", "sensor"), humidity: this.entityByKey("humidity", "sensor"), efficiency: this.entityByKey("efficiency", "sensor"), filter: this.entityByKey("filter_days_left", "sensor"), filterDays: this.entityByKey("filter_days", "sensor"), filterSetting: this.entityByKey("filter_days_setting", "number"), filterMonthsSetting: this.entityByKey("filter_months_setting", "number"), filterReset: this.entityByKey("filter_reset", "button"), fan: this.entityByKey("fan_speed", "select"), boost: this.config.boost || this.entityByKey("boost_enable", "switch"), bypass: this.entityByKey("bypass_active", "binary_sensor"), summer: this.entityByKey("summer_mode", "binary_sensor"), defrost: this.entityByKey("defrost_active", "binary_sensor"), reheat: this.entityByKey("reheat_active", "binary_sensor") };
      let d = { o: this.num(auto.outside || this.config.outside_temperature), s: this.num(auto.supply || this.config.supply_temperature), x: this.num(auto.extract || this.config.extract_temperature), e: this.num(auto.exhaust || this.config.exhaust_temperature), h: this.num(auto.humidity || this.config.humidity), eff: this.num(auto.efficiency || this.config.efficiency), filter: this.num(auto.filter || this.config.filter_days_left), filterDays: this.num(auto.filterDays), filterSetting: Number(this.config.filter_interval_days) > 0 ? Number(this.config.filter_interval_days) : Number.isFinite(this.num(auto.filterSetting)) ? this.num(auto.filterSetting) : Number.isFinite(this.num(auto.filterMonthsSetting)) ? this.num(auto.filterMonthsSetting) * 30.4375 : NaN, level: String(this.state(auto.fan || this.config.fan_level, "0")), boost: this.state(auto.boost || this.config.boost, "off"), bypass: this.config.debug_bypass === "open" ? "on" : this.config.debug_bypass === "closed" ? "off" : this.state(auto.bypass || this.config.bypass, "off"), summer: this.state(auto.summer || this.config.summer_mode, "off"), defrost: this.state(auto.defrost || this.config.defrost, "off"), reheat: this.state(auto.reheat || this.config.reheat, "off") }, on = (v) => ["on", "true", "open", "active", "1"].includes(String(v).toLowerCase()), lvl = Math.max(0, Math.min(4, +d.level || 0)), speed = lvl === 0 ? 0 : { 1: 4.4, 2: 3.2, 3: 2.1, 4: 1.2 }[lvl] || 3.2, fanSpeed = lvl === 0 ? 0 : { 1: 4, 2: 2.8, 3: 1.8, 4: 0.9 }[lvl] || 2.8, calcEff = Number.isFinite(d.eff) ? d.eff : Number.isFinite(d.o) && Number.isFinite(d.s) && Number.isFinite(d.x) && Math.abs(d.x - d.o) > 0.5 ? Math.max(0, Math.min(100, (d.s - d.o) / (d.x - d.o) * 100)) : NaN, filterElapsed = Number.isFinite(d.filterDays) ? d.filterDays : Number.isFinite(d.filterSetting) && Number.isFinite(d.filter) ? Math.max(0, d.filterSetting - d.filter) : NaN, filterOverdue = Number.isFinite(d.filter) && d.filter <= 0 || Number.isFinite(filterElapsed) && Number.isFinite(d.filterSetting) && filterElapsed >= d.filterSetting, co = { o: this.tempColor(d.o), s: this.tempColor(d.s), x: this.tempColor(d.x), e: this.tempColor(d.e) }, found = !!(auto.outside || auto.supply || auto.extract || auto.exhaust || auto.fan), live = [auto.outside, auto.supply, auto.extract, auto.exhaust, auto.fan].filter(Boolean).some((id) => {
        const st = this._hass?.states?.[id];
        return st && !["unknown", "unavailable", ""].includes(String(st.state).toLowerCase());
      });
      this.shadowRoot.innerHTML = `<style>
:host{display:block;container-type:inline-size}ha-card{overflow:hidden;background:#061525;color:#eef7ff}.stage{position:relative;width:100%;height:${Math.max(420, +this.config.height || 720)}px;background:radial-gradient(circle at 47% 28%,#173b59 0,#0b243a 34%,#061525 72%);overflow:hidden}.head{position:absolute;left:3.5%;top:3%;z-index:6}.head h2{font-size:clamp(20px,2.2cqw,36px);margin:0;font-weight:500}.head p{color:#83a4c4;margin:5px 0;font-size:clamp(11px,1cqw,16px)}svg{position:absolute;inset:0;width:100%;height:100%;display:block}.scene{transform-box:view-box;transform-origin:center}.house{fill:#0a1724;stroke:#315c7d;stroke-width:2}.roof{fill:#10273a;stroke:#3b6889;stroke-width:2}.room{fill:#101f2b;stroke:#23445d;stroke-width:1}.warm{fill:#9b5728;opacity:.13}.ground{fill:#071b20;opacity:.9}.treeTrunk{fill:#1b3035}.treeCrown{fill:#123b35;stroke:#28594d;stroke-width:1}.cloud{fill:#15344b;opacity:.35}.lampGlow{fill:#ffb75a;opacity:.18;filter:url(#soft)}.lamp{fill:#b9854d}.picture{fill:#162a38;stroke:#31526a;stroke-width:2}.sofa{fill:#1b3545;stroke:#31556e;stroke-width:1}.table{fill:#213746}.rug{fill:#5b3c35;opacity:.28}.shelf{fill:#243744}.flowCaption{font:12px sans-serif;fill:#7293ad;letter-spacing:.08em}.window{fill:#e69b45;opacity:.27;filter:url(#soft)}.furniture{fill:#172b38;stroke:#294a5e;stroke-width:1}.plant{fill:#164234;stroke:#285e4d;stroke-width:1}.bush{fill:#12372f;stroke:#24584c;stroke-width:1}.duct{fill:none;stroke:#163a58;stroke-width:40;stroke-linecap:round;stroke-linejoin:round}.glow{fill:none;stroke-width:17;stroke-linecap:round;filter:url(#g)}.dots{fill:none;stroke:#e9fcff;stroke-width:7;stroke-linecap:round;stroke-dasharray:1 25;filter:url(#dg);animation:move ${speed || 1}s linear infinite}.paused{animation-play-state:paused}.reverse{animation-direction:reverse}.label{font:600 17px sans-serif;fill:#edf7ff}.temp{font:700 34px sans-serif}.sub{font:14px sans-serif;fill:#8ba8c4}.hx{fill:#17283a;stroke:#426c90;stroke-width:2}.fanRotor{transform-origin:365px 318px;animation:spin ${speed ? fanSpeed : 1}s linear infinite}.fanRotor.paused{animation-play-state:paused}.blade{fill:#b9d5ec;transition:fill .2s,filter .2s}.fanBoost .blade{fill:#ff8a3d;filter:drop-shadow(0 0 7px #ff8a3d88)}.badge{fill:#0b1b2e;stroke:#75a7cf;stroke-width:3;filter:url(#shadow)}.ui{position:absolute;right:2%;top:15%;bottom:14%;width:21%;min-width:210px;max-width:285px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;background:rgba(4,18,32,.9);border:1px solid #244866;border-radius:18px;padding:16px;z-index:7;box-shadow:0 18px 50px #0008}.status{position:absolute;right:3%;top:3%;z-index:7;background:rgba(4,18,32,.82);border:1px solid #244866;border-radius:16px;padding:11px 18px;min-width:170px}.green{display:inline-block;width:10px;height:10px;border-radius:50%;background:#3ad76b;box-shadow:0 0 12px #3ad76b;margin-right:9px}.ui h3{font-size:12px;letter-spacing:.08em;margin:0 0 12px}.level{display:flex;align-items:center;gap:12px;margin-bottom:12px}.miniFan{display:inline-block;font-size:31px;animation:spinCenter ${speed ? fanSpeed : 1}s linear infinite}.bigLevel{font-size:28px;font-weight:700}.steps{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid #1f405c;border-radius:10px;overflow:hidden}.step{text-align:center;padding:7px 0;cursor:pointer;user-select:none;transition:.15s}.step:hover{background:#15527d}.step.on{background:#078ee6}.boost{margin-top:12px;width:100%;border:1px solid #285777;background:#0b2033;color:#dcefff;border-radius:10px;padding:9px;cursor:pointer;font-weight:600}.boost.on{background:#c45518;border-color:#ff8a3d;color:#fff;box-shadow:0 0 18px #ff7b2f55}.boostdiag{margin-top:8px;padding:8px;border-radius:8px;background:#081a29;color:#9db7ca;font:11px/1.45 monospace;white-space:pre-wrap}.sep{height:1px;background:#17354d;margin:15px 0}.row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px}.row span:last-child{color:#9ed4ff}.filterbar{height:7px;background:#17354d;border-radius:8px;overflow:hidden;margin-top:8px}.filterbar i{display:block;height:100%;background:linear-gradient(90deg,#2ee56d,#82d883)}.filterbox{cursor:pointer;border-radius:10px;padding:7px;margin:-7px;transition:.15s}.filterbox:hover{background:#102b42}.filterbox.overdue{border:2px solid #ff8a3d;background:#3b2118;box-shadow:0 0 18px #ff8a3d66}.filterbox.overdue h3,.filterbox.overdue b{color:#ff9a5c}.filterbox.overdue .filterbar{background:#5b3020}.filterbox.overdue .filterbar i{background:linear-gradient(90deg,#ffb15c,#ff6f32)}.filterwarn{color:#ff9566;font-weight:700;margin-top:6px}.filterHouseWarn{cursor:pointer}.filterHouseWarn polygon{fill:#ff8a3d;stroke:#ffd0a8;stroke-width:2;filter:drop-shadow(0 0 8px #ff8a3d99)}.filterHouseWarn text{fill:#241308;font-size:22px;font-weight:900;pointer-events:none}.filterHouseHint{fill:#ffb17d;font:700 12px sans-serif;letter-spacing:.04em;pointer-events:none}.bypassCtl{font:800 14px sans-serif;letter-spacing:1.2px;fill:#61788d}.bypassCtl.active{fill:#eafaff;filter:drop-shadow(0 0 6px #63d8f2)}.bypassCtl.clickable{cursor:pointer;text-decoration:underline}.filterdetail{display:none;margin-top:12px;padding-top:10px;border-top:1px solid #24405a;font-size:12px}.filterdetail.open{display:block}.ui.filterExpanded{bottom:3%}.filteraction{width:100%;margin-top:10px;padding:8px;border-radius:9px;border:1px solid #355b78;background:#102b42;color:#eaf6ff;cursor:pointer}.confirm{display:none;margin-top:9px;padding:9px;border:1px solid #754f2c;border-radius:9px;background:#2b2118}.confirm.open{display:block}.confirmBtns{display:flex;gap:7px;margin-top:8px}.confirmBtns button{flex:1;padding:7px;border-radius:7px;border:1px solid #49657b;background:#132c40;color:#fff;cursor:pointer}.confirmBtns .yes{background:#a64e1f;border-color:#d86b2d}.bottom{position:absolute;left:14%;bottom:3%;width:55%;z-index:6;background:rgba(4,18,32,.87);border:1px solid #244866;border-radius:17px;display:grid;grid-template-columns:repeat(3,1fr);padding:12px 8px}.metric{text-align:center;border-right:1px solid #24405a}.metric:last-child{border:0}.metric small{display:block;color:#8ba8c4}.metric b{font-size:22px}.icon{font-size:22px;color:#80bfff}@keyframes move{to{stroke-dashoffset:-104}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes spinCenter{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.dots,.fanRotor,.miniFan{animation:none}}
@container(max-width:850px){.label{font-size:20px}.temp{font-size:39px}.sub{font-size:16px}.stage{height:${Math.max(520, (+this.config.height || 720) * 0.85)}px}.ui{right:1.5%;top:17%;width:23%;min-width:175px;padding:10px}.bottom{left:3%;width:65%}.status{display:none}.head p{display:none}}@container(max-width:560px){.label{font-size:22px}.temp{font-size:43px}.stage{height:${Math.max(500, (+this.config.height || 720) * 0.72)}px}.ui{display:none}.bottom{left:3%;width:91%;bottom:2%}.head{top:2%}}
</style><ha-card><div class="stage"><div class="head"><h2>${this.config.title}</h2><p>Frisk luft. Et sundere hjem.</p></div><div class="status"><span class="green" style="${live ? "" : "background:#e6a23c;box-shadow:0 0 12px #e6a23c"}"></span><b>${found ? "Genvex Connect" : "Genvex ikke fundet"}</b><div style="color:#829db7;font-size:11px;margin:4px 0 0 20px">${live ? "Live data" : found ? "Ingen aktuelle data" : "Venter p\xE5 entity registry"}</div></div>
<svg viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid meet"><g class="scene"><defs><filter id="g"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="dg"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="shadow"><feDropShadow dx="0" dy="7" stdDeviation="10" flood-opacity=".7"/></filter><filter id="soft"><feGaussianBlur stdDeviation="5"/></filter><linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173c5a" stop-opacity=".55"/><stop offset="1" stop-color="#061525" stop-opacity="0"/></linearGradient></defs>
<path fill="url(#night)" d="M0 0H850V620H0Z"/><g class="cloud"><ellipse cx="115" cy="90" rx="55" ry="17"/><ellipse cx="155" cy="86" rx="38" ry="14"/><ellipse cx="590" cy="78" rx="62" ry="18"/><ellipse cx="635" cy="82" rx="36" ry="13"/></g>
<path class="ground" d="M0 555Q120 525 245 558T500 550T820 560V640H0Z"/><g><rect class="treeTrunk" x="20" y="420" width="12" height="140"/><circle class="treeCrown" cx="26" cy="410" r="48"/><circle class="treeCrown" cx="62" cy="440" r="35"/><rect class="treeTrunk" x="760" y="430" width="11" height="135"/><circle class="treeCrown" cx="766" cy="420" r="45"/></g>
<!-- landscape and cosy cutaway -->
<ellipse class="bush" cx="105" cy="565" rx="72" ry="38"/><ellipse class="bush" cx="705" cy="570" rx="75" ry="34"/><circle class="bush" cx="55" cy="520" r="34"/><circle class="bush" cx="755" cy="530" r="31"/>
<path class="house" d="M70 570V305L365 125L660 305V570Z"/><path class="roof" d="M48 310L365 105L682 310L653 323L365 143L78 323Z"/><path class="room warm" d="M90 330H640V550H90Z"/><path class="room" d="M365 150V550M90 330H640"/>
<rect class="window" x="118" y="375" width="110" height="95" rx="4"/><rect class="window" x="505" y="375" width="105" height="95" rx="4"/><rect class="window" x="280" y="205" width="170" height="82" rx="4"/>
<ellipse class="rug" cx="355" cy="535" rx="105" ry="18"/><path class="sofa" d="M278 494q0-15 15-15h105q15 0 15 15v44H278z"/><path class="sofa" d="M290 470h110v35H290z"/><path class="table" d="M430 512h55v8h-55zm8 8h4v25h-4zm35 0h4v25h-4z"/><path class="shelf" d="M500 482h92v68h-92zm8 12h76v5h-76zm0 18h76v5h-76zm0 18h76v5h-76z"/><rect class="picture" x="112" y="348" width="62" height="42"/><rect class="picture" x="185" y="350" width="38" height="55"/><circle class="lampGlow" cx="248" cy="420" r="46"/><path class="lamp" d="M244 375h8v80h-8zm-22 0h52l-12-28h-28z"/>
<path class="plant" d="M130 550q-22-72 4-113q25 48 8 113m13 0q-3-58 38-94q4 55-25 94"/><path class="plant" d="M595 550q-16-55 5-90q20 39 7 90m10 0q0-45 30-70q4 42-19 70"/>
<!-- four physical flows; bypass changes the animated route itself -->
${on(d.bypass) ? `
<path class="duct" d="M240 112V230Q240 270 280 270H272Q292 270 292 290V325Q292 365 252 365H245Q225 365 225 385V455"/><path class="duct" d="M560 455V410Q560 365 515 365H458Q438 365 438 345V310Q438 270 478 270H515Q560 270 560 225V112"/>
<path class="glow" stroke="${co.o}" d="M240 112V230Q240 270 280 270H272Q292 270 292 290V325Q292 365 252 365H245Q225 365 225 385V455"/><path class="dots ${lvl ? "" : "paused"}" d="M240 112V230Q240 270 280 270H272Q292 270 292 290V325Q292 365 252 365H245Q225 365 225 385V455"/>
<path class="glow" stroke="${co.x}" d="M560 455V410Q560 365 515 365H458Q438 365 438 345V310Q438 270 478 270H515Q560 270 560 225V112"/><path class="dots ${lvl ? "" : "paused"}" d="M560 455V410Q560 365 515 365H458Q438 365 438 345V310Q438 270 478 270H515Q560 270 560 225V112"/>
` : `
<path class="duct" d="M240 112V230Q240 270 280 270H365"/><path class="duct" d="M365 365H300Q225 365 225 410V455"/><path class="duct" d="M560 455V410Q560 365 515 365H365"/><path class="duct" d="M365 270H515Q560 270 560 225V112"/>
<path class="glow" stroke="${co.o}" d="M240 112V230Q240 270 280 270H365"/><path class="dots ${lvl ? "" : "paused"}" d="M240 112V230Q240 270 280 270H365"/>
<path class="glow" stroke="${co.s}" d="M365 365H300Q225 365 225 410V455"/><path class="dots ${lvl ? "" : "paused"}" d="M365 365H300Q225 365 225 410V455"/>
<path class="glow" stroke="${co.x}" d="M560 455V410Q560 365 515 365H365"/><path class="dots ${lvl ? "" : "paused"}" d="M560 455V410Q560 365 515 365H365"/>
<path class="glow" stroke="${co.e}" d="M365 270H515Q560 270 560 225V112"/><path class="dots ${lvl ? "" : "paused"}" d="M365 270H515Q560 270 560 225V112"/>
`}
${filterOverdue ? `<g class="filterHouseWarn" data-filterhouse role="button" tabindex="0" aria-label="Filter skal skiftes. Klik for filterservice"><polygon points="365,400 340,444 390,444"/><text x="365" y="437" text-anchor="middle">!</text><text class="filterHouseHint" x="365" y="460" text-anchor="middle">SKIFT FILTER</text></g>` : ""}<text class="bypassCtl ${on(d.bypass) ? "active" : ""}" x="365" y="238" text-anchor="middle">BYPASS</text><g data-boostcore style="cursor:${auto.boost ? "pointer" : "default"}"><circle class="badge boostCore" cx="365" cy="318" r="62" style="stroke:${on(d.boost) ? "#ff8a3d" : "#75a7cf"}"/><g class="fanRotor ${lvl ? "" : "paused"} ${on(d.boost) ? "fanBoost" : ""}"><path class="blade" d="M365 307C345 270 373 263 382 287C388 303 376 311 365 318C403 298 417 325 394 338C379 346 371 332 365 320C383 357 353 368 340 345C331 330 348 323 363 318C325 329 318 298 344 289C357 284 362 302 365 315Z"/></g><circle cx="365" cy="318" r="18" fill="#42698a"/><text x="365" y="326" text-anchor="middle" font-size="22" font-weight="700" fill="#fff">${d.level}</text></g>
<text class="sub" x="435" y="302">Varmegenvinding</text><text x="435" y="330" font-size="30" font-weight="700" fill="#fff">${this.fmt(calcEff, 0)}%</text>
<text class="flowCaption" x="235" y="98" text-anchor="middle">FRISK LUFT UDEFRA</text><text class="label" x="92" y="145">INDSUGNING</text><text class="temp" x="92" y="181" fill="${co.o}">${d.o.toFixed(1)}\xB0</text><text class="flowCaption" x="560" y="98" text-anchor="middle">BRUGT LUFT UD</text><text class="label" x="585" y="145">UDBL\xC6SNING</text><text class="temp" x="585" y="181" fill="${co.e}">${d.e.toFixed(1)}\xB0</text>
<text class="label" x="100" y="500">INDBL\xC6SNING</text><text class="temp" x="100" y="537" fill="${co.s}">${d.s.toFixed(1)}\xB0</text><text class="label" x="505" y="500">UDSUGNING</text><text class="temp" x="505" y="537" fill="${co.x}">${this.fmt(d.x)}\xB0</text>
</g></svg>
<div class="ui"><h3>VENTILATION</h3><div class="level"><span class="miniFan" style="${lvl ? "" : "animation-play-state:paused"}">\u2724</span><span class="bigLevel">${d.level}</span><span style="color:#829db7;font-size:11px">Ventilationsniveau</span></div><div class="steps">${["0", "1", "2", "3", "4"].map((x) => `<div class="step ${x === d.level ? "on" : ""}" data-fan="${x}">${x}</div>`).join("")}</div><button class="boost ${on(d.boost) ? "on" : ""}" ${auto.boost ? "" : "disabled"}>${on(d.boost) ? "BOOST AKTIV" : "BOOST"}</button>${this.config.debug_boost ? `<div class="boostdiag" data-boostdiag>Click: NO
Entity: ${auto.boost || "\u2014"}
State: ${auto.boost ? this.state(auto.boost) : "\u2014"}
Action: \u2014</div>` : ""}<div class="sep"></div><h3>DRIFT</h3><div class="row"><span>\u21AA Bypass</span><span style="${on(d.bypass) ? "color:#63d8f2;font-weight:700" : ""}">${auto.bypass ? on(d.bypass) ? "\xC5ben" : "Lukket" : "Ikke tilg\xE6ngelig"}</span></div><div class="row"><span>\u263C Sommerdrift</span><span>${on(d.summer) ? "Ja" : "Nej"}</span></div><div class="row"><span>\u2744 Defrost</span><span>${on(d.defrost) ? "Aktiv" : "Nej"}</span></div><div class="row"><span>\u2668 Eftervarme</span><span>${on(d.reheat) ? "Aktiv" : "Nej"}</span></div><div class="sep"></div><div class="filterbox ${filterOverdue ? "overdue" : ""}" data-filterbox><h3>FILTER ${filterOverdue ? "\u26A0" : ""}</h3><div><b>${Number.isFinite(d.filter) ? this.fmt(d.filter, 0) + " dage tilbage" : Number.isFinite(filterElapsed) ? this.fmt(filterElapsed, 0) + " dage siden skift" : "\u2014"}</b></div>${filterOverdue ? `<div class="filterwarn">${filterElapsed > d.filterSetting ? `Filterskift overskredet med ${Math.ceil(filterElapsed - d.filterSetting)} dage` : "Filter skal skiftes nu"}</div>` : ""}<div class="filterbar"><i style="width:${Number.isFinite(d.filter) && Number.isFinite(d.filterSetting) ? Math.max(0, Math.min(100, d.filter / Math.max(1, d.filterSetting) * 100)) : 0}%"></i></div><div class="filterdetail" data-filterdetail><div class="row"><span>Siden filterskift</span><span>${this.fmt(filterElapsed, 0)} dage</span></div><div class="row"><span>Serviceinterval</span><span>${this.fmt(d.filterSetting, 0)} dage</span></div>${auto.filterReset ? `<button class="filteraction" data-filterreset>Filter skiftet / nulstil t\xE6ller</button><div class="confirm" data-confirm>Har du skiftet eller renset filteret?<div class="confirmBtns"><button data-cancel>Annuller</button><button class="yes" data-confirmreset>Ja, nulstil</button></div></div>` : ""}</div></div></div>
<div class="bottom"><div class="metric"><span class="icon">\u2667</span><small>Luftfugtighed</small><b>${this.fmt(d.h, 0)}%</b><small>Indend\xF8rs</small></div><div class="metric"><span class="icon">\u2302</span><small>Temperatur inde</small><b>${d.x.toFixed(1)}\xB0</b><small>Udsugningsluft</small></div><div class="metric"><span class="icon">\u2662</span><small>Luftkvalitet</small><b>\u2014</b><small>Ikke konfigureret</small></div></div>
</div></ha-card>`;
      this._bindControls(auto, d);
    }
    _bindControls(auto, d) {
      const toggleBoost = async () => {
        const diag = this.shadowRoot.querySelector("[data-boostdiag]");
        if (diag) diag.textContent = `Click: YES
Entity: ${auto.boost || "\u2014"}
State: ${auto.boost ? this.state(auto.boost) : "\u2014"}
Action: resolving\u2026`;
        const boostState = auto.boost ? String(this._hass?.states?.[auto.boost]?.state || "").toLowerCase() : "";
        const action = boostState === "on" ? "turn_off" : "turn_on";
        if (diag) diag.textContent = `Click: YES
Entity: ${auto.boost || "\u2014"}
State: ${boostState || "\u2014"}
Action: switch.${action}\u2026`;
        if (!auto.boost) {
          if (diag) diag.textContent += "\nResult: no entity";
          return;
        }
        try {
          await this._hass.callService("switch", action, { entity_id: auto.boost });
          if (diag) diag.textContent += "\nResult: service call OK";
        } catch (e) {
          if (diag) diag.textContent += "\nError: " + (e?.message || String(e));
        }
      };
      this.shadowRoot.querySelectorAll("[data-fan]").forEach((el) => {
        el.style.cursor = auto.fan ? "pointer" : "default";
        el.addEventListener("click", () => {
          if (auto.fan) this._hass.callService("select", "select_option", { entity_id: auto.fan, option: el.dataset.fan });
        });
      });
      const boost = this.shadowRoot.querySelector(".boost");
      if (boost) {
        boost.disabled = false;
        boost.style.cursor = "pointer";
        boost.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleBoost();
        });
      }
      const core = this.shadowRoot.querySelector("[data-boostcore]");
      if (core) {
        core.style.cursor = "pointer";
        core.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleBoost();
        });
      }
      ;
      const fb = this.shadowRoot.querySelector("[data-filterbox]"), fd = this.shadowRoot.querySelector("[data-filterdetail]"), ui = this.shadowRoot.querySelector(".ui"), fw = this.shadowRoot.querySelector("[data-filterhouse]");
      const openFilter = () => {
        if (ui) {
          ui.style.display = "block";
          ui.classList.add("filterExpanded");
        }
        fd?.classList.add("open");
        setTimeout(() => {
          fd?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          ui?.scrollTo?.({ top: ui.scrollHeight, behavior: "smooth" });
        }, 0);
      };
      if (fw) {
        fw.style.cursor = "pointer";
        const activate = (e) => {
          e.stopPropagation();
          openFilter();
          const cf2 = this.shadowRoot.querySelector("[data-confirm]");
          if (cf2) cf2.classList.add("open");
        };
        fw.addEventListener("click", activate);
        fw.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate(e);
          }
        });
      }
      if (fb && fd) fb.addEventListener("click", (e) => {
        if (!e.target.closest("button")) {
          fd.classList.toggle("open");
          ui?.classList.toggle("filterExpanded", fd.classList.contains("open"));
          if (fd.classList.contains("open")) setTimeout(() => fd.scrollIntoView({ block: "nearest", behavior: "smooth" }), 0);
        }
      });
      const fr = this.shadowRoot.querySelector("[data-filterreset]"), cf = this.shadowRoot.querySelector("[data-confirm]");
      if (fr && cf) fr.addEventListener("click", (e) => {
        e.stopPropagation();
        cf.classList.add("open");
      });
      this.shadowRoot.querySelector("[data-cancel]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        cf?.classList.remove("open");
      });
      this.shadowRoot.querySelector("[data-confirmreset]")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (auto.filterReset) {
          this._hass.callService("button", "press", { entity_id: auto.filterReset });
          cf?.classList.remove("open");
        }
      });
    }
  };
  var GenvexFlowCardEditor = class extends HTMLElement {
    set hass(h) {
      this._hass = h;
      if (this._rendered) this._syncPickers();
    }
    setConfig(c) {
      this._config = { title: "Ventilation", height: 720, ...c };
      this.render();
    }
    _fire(config) {
      this._config = config;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
    }
    _change(e) {
      const k = e.target.dataset.key;
      if (!k) return;
      let v = e.target.type === "checkbox" ? e.target.checked : e.target.type === "number" ? Number(e.target.value) : e.target.value;
      this._fire({ ...this._config, [k]: v });
    }
    _entity(k, v) {
      this._fire({ ...this._config, [k]: v });
    }
    _syncPickers() {
      this.shadowRoot?.querySelectorAll("ha-entity-picker").forEach((p) => p.hass = this._hass);
    }
    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style>:host{display:block;padding:8px 0}.grid{display:grid;gap:14px}.field{display:grid;gap:6px}.field label,.section{font-weight:600}.hint{font-size:12px;color:var(--secondary-text-color)}input,select{box-sizing:border-box;width:100%;padding:12px;border:1px solid var(--divider-color);border-radius:10px;background:var(--card-background-color);color:var(--primary-text-color)}details{border-top:1px solid var(--divider-color);padding-top:12px}summary{cursor:pointer;font-weight:600}</style><div class="grid"><div class="field"><label>Genvex-anl\xE6g</label><ha-entity-picker data-key="genvex_entity" value="${this._config.genvex_entity || ""}" allow-custom-entity></ha-entity-picker><div class="hint">V\xE6lg \xE9n entity fra det \xF8nskede Genvex Connect-anl\xE6g. Resten findes automatisk.</div></div><div class="field"><label>Titel</label><input data-key="title" value="${this._config.title || ""}"></div><div class="field"><label>H\xF8jde (px)</label><input data-key="height" type="number" min="420" max="1400" step="20" value="${this._config.height || 720}"></div><div class="field"><label>Filter serviceinterval (dage)</label><input data-key="filter_interval_days" type="number" min="1" max="3650" step="1" placeholder="Fx 180" value="${this._config.filter_interval_days || ""}"><div class="hint">Bruges kun hvis anl\xE6gget ikke selv leverer intervallet.</div></div><details><summary>Avanceret / fejlfinding</summary><div class="grid" style="margin-top:14px"><div class="field"><label>Bypass testtilstand</label><select data-key="debug_bypass"><option value="" ${!this._config.debug_bypass ? "selected" : ""}>Automatisk / live</option><option value="open" ${this._config.debug_bypass === "open" ? "selected" : ""}>Tving \xE5ben (kun visning)</option><option value="closed" ${this._config.debug_bypass === "closed" ? "selected" : ""}>Tving lukket (kun visning)</option></select><div class="hint">P\xE5virker kun cardets visualisering og sender ingen kommando til anl\xE6gget.</div></div><div class="field"><label>Boost entity override</label><ha-entity-picker data-key="boost" value="${this._config.boost || ""}" allow-custom-entity></ha-entity-picker></div><label><input style="width:auto" data-key="debug_boost" type="checkbox" ${this._config.debug_boost ? "checked" : ""}> Vis Boost-diagnose p\xE5 cardet</label></div></details></div>`;
      this.shadowRoot.querySelectorAll("input,select").forEach((x) => x.addEventListener("change", (e) => this._change(e)));
      this.shadowRoot.querySelectorAll("ha-entity-picker").forEach((x) => {
        x.hass = this._hass;
        x.addEventListener("value-changed", (e) => this._entity(x.dataset.key, e.detail.value));
      });
      this._rendered = true;
    }
  };
  customElements.define("genvex-flow-card-editor", GenvexFlowCardEditor);
  customElements.define("genvex-flow-card", GenvexFlowCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "genvex-flow-card", name: "Ventilation Flow Card", description: "Animated heat-recovery ventilation visualization", preview: true });
  console.info("%c VENTILATION-FLOW-CARD %c " + CARD_VERSION, "background:#078ee6;color:white;padding:3px", "background:#333;color:white;padding:3px");

  // src/ventilation-flow-card.js
  var CARD_VERSION2 = "1.1.2-dev.2";
  var Card = customElements.get("genvex-flow-card");
  if (!Card) throw new Error("Ventilation Flow Card: card core did not register");
  var providerFor = (card) => createProvider(card);
  Card.prototype.selectedDeviceId = function() {
    const p = providerFor(this);
    return typeof p.selectedDeviceId === "function" ? p.selectedDeviceId() : null;
  };
  Card.prototype.entityByKey = function(key, domain) {
    const p = providerFor(this);
    if (p.id === "danfoss_air") {
      if (key === "fan_speed") return p.resolve(key, "sensor");
      if (key === "bypass_active") return p.resolve(key, "switch");
      if (["filter_days_left", "filter_days", "filter_days_setting", "filter_reset", "efficiency"].includes(key)) return null;
    }
    return p.resolve(key, domain);
  };
  var originalState = Card.prototype.state;
  Card.prototype.state = function(entity, f = "\u2014") {
    const p = providerFor(this);
    if (p.id === "danfoss_air" && entity === p.resolve("fan_speed", "sensor")) {
      const fan = p.resolve("fan_control", "fan"), fanState = String(this._hass?.states?.[fan]?.state || "").toLowerCase();
      if (fan && fanState === "off") return "0";
      return String(p.normalizeFanLevel(entity));
    }
    return originalState.call(this, entity, f);
  };
  var iconifyStatus = (card) => {
    const root = card.shadowRoot;
    if (!root) return;
    const filterWarn = root.querySelector(".filterHouseWarn");
    if (filterWarn) {
      filterWarn.innerHTML = `<g class="filterIcon" transform="translate(365 420)"><rect x="-17" y="-13" width="34" height="26" rx="4"></rect><path d="M-11 -7H11M-11 0H11M-11 7H11"></path><circle class="filterAlert" cx="23" cy="-13" r="9"></circle><text class="filterAlertText" x="23" y="-9" text-anchor="middle">!</text></g>`;
      filterWarn.setAttribute("aria-label", "Filter kr\xE6ver opm\xE6rksomhed");
      filterWarn.setAttribute("title", "Filter kr\xE6ver opm\xE6rksomhed");
    }
    const oldBypass = root.querySelector(".bypassCtl");
    if (oldBypass && oldBypass.tagName?.toLowerCase() === "text") {
      const ns = "http://www.w3.org/2000/svg", bypass2 = document.createElementNS(ns, "g");
      bypass2.setAttribute("class", oldBypass.getAttribute("class") || "bypassCtl");
      bypass2.setAttribute("transform", "translate(365 220)");
      bypass2.setAttribute("aria-label", "Bypass");
      bypass2.setAttribute("title", "Bypass");
      const path2 = document.createElementNS(ns, "path");
      path2.setAttribute("class", "bypassIconPath");
      path2.setAttribute("d", "M-16 -8H4l-5-5m5 5-5 5M16 8H-4l5-5m-5 5 5 5");
      bypass2.appendChild(path2);
      oldBypass.replaceWith(bypass2);
    } else if (oldBypass) {
      oldBypass.setAttribute("transform", "translate(365 220)");
    }
    const bypass = root.querySelector(".bypassCtl"), path = bypass?.querySelector(".bypassIconPath");
    if (path) path.setAttribute("d", bypass.classList.contains("active") ? "M-8 14V-8l-5 5m5-5 5 5M8 -14V8l-5-5m5 5 5-5" : "M-16 -8H4l-5-5m5 5-5 5M16 8H-4l5-5m-5 5 5 5");
  };
  var addRpmLabel = (root, label, rpm) => {
    if (!Number.isFinite(rpm)) return;
    const lbl = [...root.querySelectorAll(".label")].find((x) => x.textContent.trim() === label), temp = lbl?.nextElementSibling;
    if (!temp) return;
    const ns = "http://www.w3.org/2000/svg", txt = document.createElementNS(ns, "text");
    txt.setAttribute("class", "rpmValue");
    txt.setAttribute("x", temp.getAttribute("x") || "0");
    txt.setAttribute("y", String(Number(temp.getAttribute("y") || 0) + 19));
    txt.textContent = `(${Math.round(rpm).toLocaleString("da-DK")} RPM)`;
    temp.after(txt);
  };
  var applyRpm = (card, supplyRpm, exhaustRpm, fanOn, fallbackPct) => {
    addRpmLabel(card.shadowRoot, "INDBL\xC6SNING", supplyRpm);
    addRpmLabel(card.shadowRoot, "UDSUGNING", exhaustRpm);
    const rpms = [supplyRpm, exhaustRpm].filter(Number.isFinite), rpmAvg = rpms.length ? rpms.reduce((a, b) => a + b, 0) / rpms.length : NaN, rpmPct = Number.isFinite(rpmAvg) && rpmAvg > 0 ? Math.max(5, Math.min(100, rpmAvg / 30)) : fallbackPct, animPct = fanOn ? rpmPct : 0, flowDuration = animPct <= 0 ? 0 : Math.max(0.55, 7.5 - Math.pow(animPct / 100, 0.55) * 6.95), rotorDuration = animPct <= 0 ? 0 : Math.max(0.45, 5.5 - Math.pow(animPct / 100, 0.6) * 5.05);
    card.shadowRoot.querySelectorAll(".dots").forEach((el) => {
      el.style.animationDuration = `${flowDuration || 1}s`;
      el.style.animationPlayState = fanOn ? "running" : "paused";
    });
    card.shadowRoot.querySelectorAll(".fanRotor,.miniFan").forEach((el) => {
      el.style.animationDuration = `${rotorDuration || 1}s`;
      el.style.animationPlayState = fanOn ? "running" : "paused";
    });
  };
  var originalRender = Card.prototype.render;
  Card.prototype.render = function() {
    originalRender.call(this);
    if (!this.shadowRoot || !this.config) return;
    const p = providerFor(this), status = this.shadowRoot.querySelector(".status b");
    if (status) status.textContent = p.label + (p.experimental ? " \xB7 Experimental" : "");
    iconifyStatus(this);
    if (p.id === "genvex_connect") {
      const supplyRpmEntity = p.resolve("fan_rpm_supply", "sensor"), exhaustRpmEntity = p.resolve("fan_rpm_extract", "sensor"), supplyRpm = Number(this._hass?.states?.[supplyRpmEntity]?.state), exhaustRpm = Number(this._hass?.states?.[exhaustRpmEntity]?.state), fan = p.resolve("fan_speed", "select"), level = Number(this._hass?.states?.[fan]?.state), rpms = [supplyRpm, exhaustRpm].filter(Number.isFinite), fanOn = rpms.some((rpm) => rpm > 0) || Number.isFinite(level) && level > 0;
      applyRpm(this, supplyRpm, exhaustRpm, fanOn, Number.isFinite(level) ? level * 25 : 0);
    }
    if (p.id === "danfoss_air") {
      const filter = p.resolve("filter_remaining", "sensor"), box = this.shadowRoot.querySelector(".filterbox");
      if (filter && box) {
        const raw = Number(this._hass?.states?.[filter]?.state);
        if (Number.isFinite(raw)) {
          const pct2 = Math.max(0, Math.min(100, raw));
          box.innerHTML = `<h3>FILTER</h3><div><b>${pct2.toFixed(0)}% tilbage</b></div><div class="filterbar"><i style="width:${pct2}%"></i></div>`;
        }
      }
      const bypass = p.resolve("bypass_active", "switch"), ctl = this.shadowRoot.querySelector(".bypassCtl");
      if (bypass && ctl) {
        const bypassOn = ["on", "true", "open", "active", "1"].includes(String(this._hass?.states?.[bypass]?.state || "").toLowerCase());
        ctl.classList.toggle("active", bypassOn);
        const iconPath = ctl.querySelector(".bypassIconPath");
        if (iconPath) iconPath.setAttribute("d", bypassOn ? "M-8 14V-8l-5 5m5-5 5 5M8 -14V8l-5-5m5 5 5-5" : "M-16 -8H4l-5-5m5 5-5 5M16 8H-4l5-5m-5 5 5 5");
        ctl.classList.add("clickable");
        ctl.setAttribute("tabindex", "0");
        const toggle = async (e) => {
          e?.stopPropagation?.();
          const state = String(this._hass?.states?.[bypass]?.state || "").toLowerCase();
          await this._hass.callService("switch", state === "on" ? "turn_off" : "turn_on", { entity_id: bypass });
        };
        ctl.onclick = toggle;
        ctl.onkeydown = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle(e);
          }
        };
      }
      const fan = p.resolve("fan_control", "fan"), mode = p.resolve("operation_mode", "select"), boostEntity = p.resolve("boost_enable", "switch"), supplyRpmEntity = p.resolve("supply_fan_rpm", "sensor"), exhaustRpmEntity = p.resolve("exhaust_fan_rpm", "sensor"), supplyRpm = Number(this._hass?.states?.[supplyRpmEntity]?.state), exhaustRpm = Number(this._hass?.states?.[exhaustRpmEntity]?.state), ui = this.shadowRoot.querySelector(".ui"), steps = this.shadowRoot.querySelector(".steps"), level = this.shadowRoot.querySelector(".level"), fanState = String(this._hass?.states?.[fan]?.state || "").toLowerCase(), fanOn = !!fan && fanState !== "off" && fanState !== "unavailable" && fanState !== "unknown", pct = fanOn ? Math.round(p.fanPercentage(fan)) : 0;
      applyRpm(this, supplyRpm, exhaustRpm, fanOn, pct);
      if (fan && steps) {
        steps.outerHTML = `<div class="danfossFan"><div class="danfossFanHead"><span>Ventilator</span><b data-fanpct>${pct}%</b></div><input data-fanslider type="range" min="0" max="100" step="10" value="${pct}"></div>`;
        if (level) level.style.display = "none";
        const slider = this.shadowRoot.querySelector("[data-fanslider]"), out = this.shadowRoot.querySelector("[data-fanpct]");
        slider?.addEventListener("input", (e) => {
          if (out) out.textContent = `${e.target.value}%`;
        });
        slider?.addEventListener("change", (e) => {
          const value = Number(e.target.value);
          if (value <= 0) p.turnFanOff(fan);
          else p.setFanPercentage(fan, value);
        });
      }
      const boost = this.shadowRoot.querySelector(".boost");
      if (boost) {
        boost.insertAdjacentHTML("afterend", `<button class="boost danfossAuto" ${mode ? "" : "disabled"}>AUTO</button><button class="boost danfossOff ${!fanOn ? "on" : ""}" ${fan ? "" : "disabled"}>SLUK</button>`);
        const autoBtn = this.shadowRoot.querySelector(".danfossAuto"), offBtn = this.shadowRoot.querySelector(".danfossOff");
        offBtn?.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (boostEntity && ["on", "true", "active", "1"].includes(String(this._hass?.states?.[boostEntity]?.state || "").toLowerCase())) await this._hass.callService("switch", "turn_off", { entity_id: boostEntity });
          if (fan) await p.turnFanOff(fan);
        });
        autoBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!mode) return;
          const st = this._hass?.states?.[mode], opts = st?.attributes?.options || [];
          const auto = opts.find((x) => /auto/i.test(String(x)));
          if (auto) this._hass.callService("select", "select_option", { entity_id: mode, option: auto });
          else {
            autoBtn.title = `AUTO option ikke fundet. Muligheder: ${opts.join(", ")}`;
            console.warn("Ventilation Flow Card: Danfoss AUTO option not found", opts);
          }
        });
      }
      if (ui && !ui.querySelector("style[data-danfoss-style]")) {
        const style = document.createElement("style");
        style.dataset.danfossStyle = "";
        style.textContent = `.danfossFan{margin:4px 0 12px}.danfossFanHead{display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:6px}.danfossFanHead b{font-size:18px;color:#9ed4ff}.danfossFan input{width:100%;accent-color:#078ee6}.danfossAuto,.danfossOff{margin-top:8px}.danfossOff{border-color:#8a4650}`;
        ui.appendChild(style);
      }
    }
    if (!this.shadowRoot.querySelector("style[data-status-icons]")) {
      const style = document.createElement("style");
      style.dataset.statusIcons = "";
      style.textContent = `.rpmValue{font:500 12px sans-serif;fill:#7894ac}.filterHouseWarn .filterIcon rect{fill:#ff8a3d;stroke:#ffd0a8;stroke-width:2;filter:drop-shadow(0 0 8px #ff8a3d99)}.filterHouseWarn .filterIcon path{fill:none;stroke:#241308;stroke-width:3;stroke-linecap:round}.filterHouseWarn .filterAlert{fill:#ff8a3d;stroke:#ffe0c4;stroke-width:2;filter:drop-shadow(0 0 5px #ff8a3daa)}.filterHouseWarn .filterAlertText{fill:#241308;font:900 14px sans-serif;pointer-events:none}.bypassCtl{text-decoration:none!important}.bypassCtl .bypassIconPath{fill:none;stroke:#61788d;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;transition:stroke .2s}.bypassCtl.active .bypassIconPath{stroke:#63d8f2;filter:drop-shadow(0 0 6px #63d8f2)}.bypassCtl.clickable:hover .bypassIconPath{stroke:#eafaff}`;
      this.shadowRoot.appendChild(style);
    }
  };
  var originalBind = Card.prototype._bindControls;
  if (originalBind) Card.prototype._bindControls = function(auto, d) {
    if (providerFor(this).id === "danfoss_air") auto = { ...auto, fan: null };
    return originalBind.call(this, auto, d);
  };
  var VentilationFlowCardEditor = class extends HTMLElement {
    set hass(h) {
      this._hass = h;
      this.render();
    }
    setConfig(c) {
      this._config = { title: "Ventilation", height: 720, provider: c?.provider || "genvex_connect", ...c };
      this.render();
    }
    _fire(next) {
      this._config = next;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: next }, bubbles: true, composed: true }));
    }
    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      const c = this._config || {}, danfoss = c.provider === "danfoss_air", selected = c.ventilation_entity || c.genvex_entity || "";
      this.shadowRoot.innerHTML = `<style>:host{display:block;padding:8px 0}.grid,.field{display:grid;gap:10px}.field{gap:5px}label{font-weight:600}select,input{width:100%;box-sizing:border-box;padding:10px}.hint{font-size:12px;color:var(--secondary-text-color)}</style><div class="grid"><div class="field"><label>Integration / provider</label><select data-provider><option value="genvex_connect" ${!danfoss ? "selected" : ""}>Genvex Connect</option><option value="danfoss_air" ${danfoss ? "selected" : ""}>Danfoss Air (experimental)</option></select></div><div class="field"><label>${danfoss ? "Danfoss Air entity (optional)" : "Genvex-anl\xE6g"}</label><ha-entity-picker data-entity value="${selected}" allow-custom-entity></ha-entity-picker><div class="hint">${danfoss ? "Danfoss entities findes automatisk." : "V\xE6lg \xE9n entity fra Genvex-anl\xE6gget."}</div></div>${danfoss ? "" : `<div class="field"><label>Filterinterval (dage)</label><input data-key="filter_interval_days" type="number" min="-1" step="1" value="${c.filter_interval_days ?? c.filter_days ?? -1}"><div class="hint">Brug -1 eller lad feltet v\xE6re tomt for at anvende intervallet fra Genvex Connect. En positiv v\xE6rdi overstyrer integrationen.</div></div>`}<div class="field"><label>Titel</label><input data-key="title" value="${c.title || ""}"></div><div class="field"><label>H\xF8jde (px)</label><input data-key="height" type="number" value="${c.height || 720}"></div></div>`;
      const picker = this.shadowRoot.querySelector("[data-entity]");
      if (picker) picker.hass = this._hass;
      this.shadowRoot.querySelector("[data-provider]")?.addEventListener("change", (e) => this._fire({ ...c, provider: e.target.value, ventilation_entity: "" }));
      this.shadowRoot.querySelectorAll("[data-key]").forEach((el) => el.addEventListener("change", (e) => {
        const key = e.target.dataset.key, value = e.target.type === "number" ? e.target.value === "" ? -1 : Number(e.target.value) : e.target.value, next = { ...this._config, [key]: value };
        if (key === "filter_interval_days") next.filter_days = value;
        this._fire(next);
      }));
      picker?.addEventListener("value-changed", (e) => {
        const next = { ...this._config, ventilation_entity: e.detail.value };
        if (!danfoss) next.genvex_entity = e.detail.value;
        this._fire(next);
      });
    }
  };
  if (!customElements.get("ventilation-flow-card-editor")) customElements.define("ventilation-flow-card-editor", VentilationFlowCardEditor);
  Card.getConfigElement = () => document.createElement("ventilation-flow-card-editor");
  var entry = (window.customCards || []).find((x) => x.type === "genvex-flow-card");
  if (entry) {
    entry.name = "Ventilation Flow Card";
    entry.description = "Animated heat-recovery ventilation card for Genvex Connect and Danfoss Air";
  }
  console.info("%c VENTILATION FLOW CARD %c " + CARD_VERSION2, "background:#078ee6;color:white;padding:3px", "background:#333;color:white;padding:3px");
})();
