import { finite } from "./fan-model.js";
const clamp = value => Math.max(0, Math.min(100, value));
const known = state => Boolean(state) && state.state != null && !["unknown", "unavailable", ""].includes(String(state.state));
export function measurement(states, entity, temperature = false) {
  const state = states[entity], raw = state?.state;
  const available = known(state) && finite(raw);
  let value = available ? Number(raw) : null;
  const unit = state?.attributes?.unit_of_measurement || "";
  if (temperature && available && ["°F", "F"].includes(unit)) value = (value - 32) * 5 / 9;
  return { entity: entity || null, supported: Boolean(entity), available, value, unit: temperature ? "°C" : unit };
}
export function binary(states, entity) {
  const state = states[entity], raw = String(state?.state ?? "").toLowerCase();
  const on = ["on", "true", "open", "active", "1"], off = ["off", "false", "closed", "inactive", "0"];
  const available = known(state) && [...on, ...off].includes(raw);
  return { entity: entity || null, supported: Boolean(entity), available, value: available ? on.includes(raw) : null };
}
export function field(states, entity) {
  const state = states[entity], domain = entity?.split(".")[0], a = state?.attributes || {};
  return { entity, supported: Boolean(entity), available: known(state), writable: known(state) && ["number", "input_number", "select"].includes(domain),
    value: known(state) ? state.state : "", options: a.options || [], min: finite(a.min) ? Number(a.min) : null,
    max: finite(a.max) ? Number(a.max) : null, step: finite(a.step) && Number(a.step) > 0 ? Number(a.step) : 1, unit: a.unit_of_measurement || "" };
}
export function buildModel({ states, entities: e, config, fan, provider, version, actions }) {
  const temperatures = Object.fromEntries(["outside", "supply", "extract", "exhaust"].map(key => [key, measurement(states, e[`temp_${key}`], true)]));
  const humidity = measurement(states, e.humidity), efficiency = measurement(states, e.efficiency);
  if (!efficiency.available) {
    const { outside: o, supply: s, extract: x } = temperatures;
    if ([o, s, x].every(x => x.available) && Math.abs(x.value - o.value) > .5) {
      Object.assign(efficiency, { supported: true, available: true, value: clamp((s.value - o.value) / (x.value - o.value) * 100), calculated: true });
    }
  }
  const boost = { ...binary(states, e.boost_enable), ...actions.boost, speed: field(states, e.boost_speed), duration: field(states, e.boost_duration) };
  const bypass = { ...binary(states, e.bypass_active), ...actions.bypass };
  if (config.debug_bypass) Object.assign(bypass, { supported: true, available: true, value: config.debug_bypass === "open", simulated: true });
  const daysLeft = measurement(states, e.filter_days_left), elapsed = measurement(states, e.filter_days), remaining = measurement(states, e.filter_remaining);
  const daysInterval = measurement(states, e.filter_days_setting), monthsInterval = measurement(states, e.filter_months_setting);
  const override = Number(config.filter_interval_days ?? config.filter_days);
  const interval = override > 0 ? override : daysInterval.available && daysInterval.value > 0 ? daysInterval.value : monthsInterval.available && monthsInterval.value > 0 ? monthsInterval.value * 30.4375 : null;
  const elapsedDays = elapsed.available ? elapsed.value : interval !== null && daysLeft.available ? Math.max(0, interval - daysLeft.value) : null;
  const remainingDays = daysLeft.available ? daysLeft.value : interval !== null && elapsedDays !== null ? interval - elapsedDays : null;
  const remainingPercent = remaining.available ? clamp(remaining.value) : interval !== null && remainingDays !== null ? clamp(remainingDays / interval * 100) : null;
  const filter = { supported: [daysLeft, elapsed, remaining].some(x => x.supported) || Boolean(e.filter_reset), available: [remainingDays, elapsedDays, remainingPercent].some(x => x !== null),
    remainingDays, elapsedDays, intervalDays: interval, remainingPercent, percentOnly: remaining.supported && !daysLeft.supported && !elapsed.supported,
    overdue: remaining.available && remaining.value <= 0 || remainingDays !== null && remainingDays <= 0 || interval !== null && elapsedDays !== null && elapsedDays >= interval,
    ...actions.filter };
  const operating = Object.fromEntries(["summer", "defrost", "reheat"].map(key => [key, binary(states, e[`${key}_active`] || e[`${key}_mode`])]));
  const humidityControl = { fields: { low: field(states, e.humidity_low), lowStep: field(states, e.humidity_low_step), highStep: field(states, e.humidity_high_step), maxTime: field(states, e.humidity_max_time) }, setValue: actions.setField };
  humidityControl.supported = Object.values(humidityControl.fields).some(x => x.supported);
  const measurements = { temperatures, humidity, efficiency };
  return { provider, card: { version }, entities: e, measurements, fan, boost, bypass, filter, operating, humidityControl,
    live: [...Object.values(temperatures), humidity, efficiency, fan, boost, bypass].some(x => x.available),
    capabilities: { fan: fan.supported, fanControl: Boolean(fan.controlEntity), fanRpm: Boolean(e.fan_rpm_supply||e.fan_rpm_extract),
      boost: boost.supported, boostSettings: boost.speed.supported || boost.duration.supported, bypass: bypass.supported,
      bypassControl: bypass.controllable, filter: filter.supported, humidityControl: humidityControl.supported } };
}
