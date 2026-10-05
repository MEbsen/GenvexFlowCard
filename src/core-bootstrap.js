// Transitional bootstrap for the native renderer.
// card-core still contains its historical private banner; suppress only that
// banner while the module is evaluated. The public version is owned and
// announced by ventilation-flow-card.js.
const originalInfo = console.info;
console.info = (...args) => {
  const text = args.map(value => String(value)).join(" ");
  if (text.includes("VENTILATION-FLOW-CARD") && text.includes("1.0.1")) return;
  originalInfo.apply(console, args);
};

await import("./card-core.js");
console.info = originalInfo;
