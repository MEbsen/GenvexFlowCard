export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char]));
export const fmt = (value, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : "—";
export function tempColor(value) {
  if (!Number.isFinite(value)) return "#61788d";
  const t=Math.max(-10,Math.min(30,value)),stops=[[-10,"#168cff"],[7,"#2bbdff"],[15,"#65d6d0"],[19,"#ffad31"],[23,"#ff6558"],[30,"#ff3855"]];
  for(let i=1;i<stops.length;i++) if(t<=stops[i][0]) {
    const fraction=(t-stops[i-1][0])/(stops[i][0]-stops[i-1][0]);
    const a=stops[i-1][1].match(/\w\w/g).map(x=>parseInt(x,16)),b=stops[i][1].match(/\w\w/g).map(x=>parseInt(x,16));
    return "#"+a.map((x,j)=>Math.round(x+(b[j]-x)*fraction).toString(16).padStart(2,"0")).join("");
  }
  return stops.at(-1)[1];
}
