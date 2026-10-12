export const finite = value => value !== null && value !== undefined && String(value).trim() !== "" && Number.isFinite(Number(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = value => Number(value.toFixed(8));

// A range does not imply that its minimum is an off state (e.g. steps 1–5).
export function fanModel({ entity, state, config = {}, callService, runningState }) {
  const attributes = state?.attributes || {};
  const domain = entity?.split(".")[0];
  const options = (config.options ?? attributes.options ?? []).map(String);
  const mode = config.mode ?? (domain === "select" ? "steps" : "percentage");
  if (!["steps", "percentage"].includes(mode)) throw new Error("fan.mode must be steps or percentage");
  const numericOptions = options.length > 0 && options.every(finite);
  const min = Number(config.min ?? attributes.min ?? (numericOptions ? Math.min(...options.map(Number)) : 0));
  const max = Number(config.max ?? attributes.max ?? (numericOptions ? Math.max(...options.map(Number)) : mode === "steps" ? Math.max(1, options.length - 1 || 4) : 100));
  const step = Number(config.step ?? attributes.step ?? attributes.percentage_step ?? 1);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || !Number.isFinite(step) || step <= 0) throw new Error("fan: require finite min < max and step > 0");
  if (domain === "fan" && (min !== 0 || max !== 100)) throw new Error("Home Assistant fan entities require the 0–100 percentage range");
  for (const value of Object.values(config.option_values || {})) {
    if (!finite(value) || Number(value) < min || Number(value) > max) throw new Error("fan.option_values must be within min–max");
  }
  const offValues = (config.off_values ?? [config.off_value ?? 0, "off"]).map(String);
  const raw = config.attribute ? attributes[config.attribute] : domain === "fan" ? attributes.percentage : state?.state;
  const supported = Boolean(entity);
  const available = Boolean(state) && state.state != null && !["unknown", "unavailable", ""].includes(String(state.state));
  const off = available && (domain === "fan" ? state.state === "off" : offValues.includes(String(raw)));
  const activeOptions=options.filter(value=>!offValues.includes(value));
  const index=activeOptions.indexOf(String(raw));
  let number=NaN;
  if(finite(config.option_values?.[raw]))number=Number(config.option_values[raw]);
  else if(finite(raw))number=Number(raw);
  else if(index>=0) {
    const fraction=min>0?index/Math.max(1,activeOptions.length-1):(index+1)/activeOptions.length;
    number=min+fraction*(max-min);
  }
  const speedAvailable = available && (off || Number.isFinite(number));
  const value = Number.isFinite(number) ? clamp(number, min, max) : min;
  const zero = finite(config.off_value) ? Number(config.off_value) : Math.min(0, min);
  if(zero >= max)throw new Error("fan.off_value must be below max");
  const normalizedPercent = !speedAvailable ? null : off ? 0 : clamp((value - zero) / (max - zero) * 100, 0, 100);
  let running=null;
  if(available) {
    if(runningState!==undefined)running=runningState;
    else if(off)running=false;
    else if(speedAvailable)running=normalizedPercent>0;
    else if(domain==="fan"&&state.state==="on")running=true;
  }
  const count = Math.floor((max - min) / step) + 1;
  const choices = options.length ? options : count <= 20 ? Array.from({ length: count }, (_, i) => String(round(min + i * step))) : [];
  const controlMode = domain === "select" || mode === "steps" && choices.length ? "steps" : "percentage";
  const writable = available && ["select", "number", "input_number", "fan"].includes(domain);
  const setValue = input => {
    if (!writable) return;
    if (domain === "select") {
      if (!choices.includes(String(input))) return;
      return callService("select", "select_option", { entity_id: entity, option: String(input) });
    }
    if (!finite(input)) return;
    const value = clamp(round(min + Math.round((Number(input) - min) / step) * step), min, max);
    return callService(domain, domain === "fan" ? "set_percentage" : "set_value", { entity_id: entity, [domain === "fan" ? "percentage" : "value"]: value });
  };
  return {
    supported, available, speedAvailable, writable, controlMode, controlEntity: supported && ["select", "number", "input_number", "fan"].includes(domain) ? entity : null,
    displayEntity: entity, value, displayValue: !speedAvailable ? "—" : options.length && !numericOptions ? String(raw) : String(round(off ? 0 : value)),
    displayUnit: config.unit ?? (domain === "fan" ? "%" : mode === "steps" ? "trin" : attributes.unit_of_measurement || ""),
    min, max, step, options: choices, normalizedPercent, running, setValue,
    offSupported: domain === "fan", offAvailable: domain === "fan" && available,
    turnOff: domain === "fan" ? () => available && callService("fan", "turn_off", { entity_id: entity }) : null,
    autoSupported: false, autoAvailable: false, setAuto: null
  };
}
