import { escapeHtml as esc, fmt } from "./view-format.js";
const disabled = allowed => allowed ? "" : "disabled";
const row = (label, text) => `<div class="row"><span>${label}</span><span>${text}</span></div>`;
const status = (feature, yes, no) => feature.available ? feature.value ? yes : no : "—";
export function fieldView(field, label, action) {
  if (!field.supported) return "";
  const attrs=`data-key="field:${esc(field.entity)}" data-field="${esc(field.entity)}" data-change="${action}" ${disabled(field.writable)}`;
  const input = field.options.length ? `<select ${attrs}>${field.options.map(option=>`<option value="${esc(option)}" ${String(option)===String(field.value)?"selected":""}>${esc(option)}</option>`).join("")}</select>`
    : `<input type="number" ${attrs} ${field.min===null?"":`min="${field.min}"`} ${field.max===null?"":`max="${field.max}"`} step="${field.step}" value="${esc(field.value)}">`;
  return `<label>${label}<span>${input}<em>${esc(field.unit)}</em></span></label>`;
}
export function controlsView(model, ui) {
  const {fan,boost,filter,bypass,operating,humidityControl:humidity}=model;
  const sections=[];
  if(fan.supported) {
    const steps=fan.controlMode === "steps" ? `<div class="steps" style="grid-template-columns:repeat(${Math.min(5,fan.options.length)},1fr)">${fan.options.map(value=>`<button type="button" class="step ${value===fan.displayValue?"on":""}" data-key="speed:${esc(value)}" data-action="fan" data-value="${esc(value)}" ${disabled(fan.writable)}>${esc(value)}</button>`).join("")}</div>`
      : fan.controlEntity ? `<div class="percentageFan"><input aria-label="Ventilationshastighed" data-key="fan-slider" data-change="fan" type="range" min="${fan.min}" max="${fan.max}" step="${fan.step}" value="${fan.value}" ${disabled(fan.writable)}></div>` : "";
    sections.push(`<section data-key="fan-controls"><h3>VENTILATION</h3><div class="level"><span class="miniFan">✤</span><span class="bigLevel" data-fan-value>${esc(fan.displayValue)}</span><span class="fanUnit">${esc(fan.displayUnit)}</span></div>${steps}
      ${fan.autoSupported?`<button class="boost fanAuto" data-action="auto" ${disabled(fan.autoAvailable)}>AUTO</button>`:""}
      ${fan.offSupported?`<button class="boost fanOff ${fan.running===false?"on":""}" data-action="off" ${disabled(fan.offAvailable)}>SLUK</button>`:""}</section>`);
  }
  if(boost.supported || model.capabilities.boostSettings) sections.push(`<section data-key="boost-controls"><div class="boostSettingsRow">
    ${boost.supported?`<button class="boost ${boost.value===true?"on":""}" data-action="boost" ${disabled(boost.available&&boost.controllable)}>${boost.available?boost.value?"BOOST AKTIV":"BOOST":"BOOST —"}</button>`:""}
    ${model.capabilities.boostSettings?`<button class="boostConfig" data-action="boostSettings" aria-label="Boost indstillinger" aria-expanded="${ui.boostSettings}">⚙</button>`:""}</div>
    ${model.capabilities.boostSettings?`<div class="boostSettings ${ui.boostSettings?"open":""}"><div class="boostSettingsTitle">BOOST INDSTILLINGER</div>${fieldView(boost.speed,"Boost hastighed","boostField")}${fieldView(boost.duration,"Boost længde","boostField")}</div>`:""}</section>`);
  if(humidity.supported) sections.push(`<section data-key="humidity-controls"><button class="humidityConfig" data-action="humiditySettings" aria-expanded="${ui.humiditySettings}">Fugtstyring ⚙</button><div class="humiditySettings ${ui.humiditySettings?"open":""}"><div class="humiditySettingsTitle">FUGTSTYRING</div>${fieldView(humidity.fields.low,"Lav fugtgrænse","humidityField")}${fieldView(humidity.fields.lowStep,"Trin ved lav fugt","humidityField")}${fieldView(humidity.fields.highStep,"Trin ved høj fugt","humidityField")}${fieldView(humidity.fields.maxTime,"Maks. tid ved høj fugt","humidityField")}</div></section>`);
  const drift=[];
  if(bypass.supported) drift.push(row("↪ Bypass",status(bypass,"Åben","Lukket")));
  for(const [key,label,yes] of [["summer","☼ Sommerdrift","Ja"],["defrost","❄ Defrost","Aktiv"],["reheat","♨ Eftervarme","Aktiv"]]) if(operating[key].supported) drift.push(row(label,status(operating[key],yes,"Nej")));
  if(drift.length) sections.push(`<section data-key="operating"><button class="accordionHead" data-action="drift" aria-expanded="${ui.drift}">DRIFT ${ui.drift?"▴":"▾"}</button><div class="driftAccordion ${ui.drift?"open":""}">${drift.join("")}</div></section>`);
  if(filter.supported) {
    const summary=filter.percentOnly ? `${fmt(filter.remainingPercent,0)}% tilbage` : filter.remainingDays!==null ? `${fmt(filter.remainingDays,0)} dage tilbage` : filter.elapsedDays!==null ? `${fmt(filter.elapsedDays,0)} dage siden skift` : "—";
    sections.push(`<section class="filterbox ${filter.overdue?"overdue":""}" data-key="filter"><button class="filterSummary" data-action="filterDetail" aria-expanded="${ui.filterDetail}"><h3>FILTER ${filter.overdue?"⚠":""}</h3><b>${summary}</b></button>
      ${filter.overdue?`<div class="filterwarn">${filter.intervalDays!==null&&filter.elapsedDays>filter.intervalDays?`Filterskift overskredet med ${Math.ceil(filter.elapsedDays-filter.intervalDays)} dage`:"Filter skal skiftes nu"}</div>`:""}
      ${filter.remainingPercent!==null?`<div class="filterbar"><i style="width:${filter.remainingPercent}%"></i></div>`:""}
      <div class="filterdetail ${ui.filterDetail?"open":""}">${filter.elapsedDays!==null?row("Siden filterskift",fmt(filter.elapsedDays,0)+" dage"):""}${filter.intervalDays!==null?row("Serviceinterval",fmt(filter.intervalDays,0)+" dage"):""}${filter.remainingPercent!==null?row("Tilbage",fmt(filter.remainingPercent,0)+"%"):""}
      ${filter.resetSupported?`<button class="filteraction" data-action="filterConfirm" ${disabled(filter.resetAvailable)}>Filter skiftet / nulstil tæller</button><div class="confirm ${ui.filterConfirm?"open":""}">Har du skiftet eller renset filteret?<div class="confirmBtns"><button data-action="filterCancel">Annuller</button><button class="yes" data-action="filterReset" ${disabled(filter.resetAvailable)}>Ja, nulstil</button></div></div>`:""}</div></section>`);
  }
  if(ui.debugBoost)sections.push(`<div class="boostdiag" data-key="boost-diagnostic">Entity: ${esc(boost.entity||"—")}\nState: ${boost.available?boost.value?"on":"off":"—"}\nAction: ${esc(ui.lastAction||"—")}\nResult: ${esc(ui.lastResult||"—")}</div>`);
  return sections.length ? `<div class="ui ${ui.filterDetail?"filterExpanded":""} ${ui.mobileControls?"mobileOpen":""}" data-key="controls">${sections.join('<div class="sep"></div>')}${ui.error?`<div role="alert" class="actionError">${esc(ui.error)}</div>`:""}</div><button class="mobileControls" data-action="mobileControls" aria-expanded="${ui.mobileControls}">Betjening</button>` : "";
}
export function metricsView(model) {
  const {humidity,temperatures}=model.measurements,metrics=[];
  if(humidity.supported) metrics.push(`<div class="metric"><span class="icon">♧</span><small>Luftfugtighed</small><b>${fmt(humidity.value,0)}%</b><small>Indendørs</small></div>`);
  if(temperatures.extract.supported) metrics.push(`<div class="metric"><span class="icon">⌂</span><small>Temperatur inde</small><b>${fmt(temperatures.extract.value)}°</b><small>Udsugningsluft</small></div>`);
  return metrics.length ? `<div class="bottom" data-key="metrics" style="grid-template-columns:repeat(${metrics.length},1fr)">${metrics.join("")}</div>` : "";
}
