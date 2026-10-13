// Native buttons retain a circular focus outline and a 44px touch target.
// The overlay follows the SVG's centered 1200:760 view box at every card size.
export const sceneControlStyle = `
.sceneControls{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(100%,calc(var(--scene-height)*1200/760));aspect-ratio:1200/760;pointer-events:none;z-index:5}
.sceneControl{position:absolute;left:30.416667%;transform:translate(-50%,-50%);min-width:44px;min-height:44px;border:0;border-radius:50%;padding:0;background:transparent;color:#eaf6ff;pointer-events:auto;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.sceneControl:focus-visible{outline:3px solid #63d8f2;outline-offset:3px}
.sceneControl:disabled{cursor:default;opacity:.5}
.sceneControl:not(:disabled):active{background:#63d8f226}
.sceneBoost{top:41.842105%;width:10.333333%;aspect-ratio:1}
.sceneBypass{top:28.947368%;width:44px;height:44px;background:#0b2033;border:1px solid #285777}
.sceneBypass svg{position:static;width:32px;height:32px;margin:auto}
.sceneBypass.active .bypassIconPath{stroke:#63d8f2}
.sceneFilter{top:55.263158%;width:44px;height:44px}
.ui button,.mobileControls{min-height:44px}
.boostConfig{min-width:44px}
.boostSettingsRow{grid-template-columns:1fr 44px}
.percentageFan input{min-height:44px}
.sceneBypass:focus-visible{outline-offset:2px}
@container(max-width:560px){.sceneBypass{top:19%}
.sceneFilter{top:66%}
.filterHouseWarn{transform:translateY(82px)}
}
`;

export function sceneControls(model) {
  const on=value=>value===true;
  return `<div class="sceneControls" data-key="scene-controls">
${model.bypass.supported?`<button type="button" class="sceneControl sceneBypass ${model.bypass.value===true?"active":""}" data-key="bypass-button" data-action="bypass" aria-label="Bypass" aria-pressed="${on(model.bypass.value)}" ${model.bypass.available&&model.bypass.controllable?"":"disabled"}><svg viewBox="-24 -24 48 48" aria-hidden="true"><path class="bypassIconPath" d="${model.bypass.value===true?"M-8 14V-8l-5 5m5-5 5 5M8 -14V8l-5-5m5 5 5-5":"M-16 -8H4l-5-5m5 5-5 5M16 8H-4l5-5m-5 5 5 5"}"/></svg></button>`:""}
${model.boost.supported?`<button type="button" class="sceneControl sceneBoost" data-key="boost-button" data-action="boost" aria-label="Boost" aria-pressed="${on(model.boost.value)}" ${model.boost.available&&model.boost.controllable?"":"disabled"}></button>`:""}
${model.filter.overdue?`<button type="button" class="sceneControl sceneFilter" data-key="filter-button" data-action="filterHouse" aria-label="Filter kræver opmærksomhed"></button>`:""}
</div>`;
}
