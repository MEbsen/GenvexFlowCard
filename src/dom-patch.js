const key = node => node.nodeType === 1 ? node.getAttribute("data-key") : null;
const compatible = (a,b) => a && a.nodeType === b.nodeType && (a.nodeType !== 1 || a.localName === b.localName && a.namespaceURI === b.namespaceURI);

// Reconcile existing nodes, keeping focus, scrolling and Web Animations alive.
export function patchChildren(parent, source) {
  const keyed = new Map([...parent.childNodes].filter(key).map(node => [key(node),node]));
  const kept = new Set();
  let cursor = parent.firstChild;
  for (const fresh of [...source.childNodes]) {
    const wanted = key(fresh);
    let node = wanted ? keyed.get(wanted) : cursor;
    if (!wanted) {
      while (node && (key(node) || kept.has(node) || !compatible(node,fresh))) node=node.nextSibling;
    }
    if (!compatible(node,fresh)) node=fresh.cloneNode(true);
    if (node !== cursor) parent.insertBefore(node,cursor);
    kept.add(node);
    patchNode(node,fresh);
    cursor=node.nextSibling;
  }
  for (const node of [...parent.childNodes]) if(!kept.has(node)) node.remove();
}
function patchNode(node, fresh) {
  if(node.nodeType !== 1) { if(node.nodeValue!==fresh.nodeValue) node.nodeValue=fresh.nodeValue;return; }
  const active=node.getRootNode().activeElement===node;
  const focusedValue=active&&node.localName==="select"?node.value:null;
  for(const attribute of [...node.attributes]) if(!fresh.hasAttribute(attribute.name)) node.removeAttribute(attribute.name);
  for(const attribute of [...fresh.attributes]) {
    if(active && attribute.name === "value") continue;
    if(node.getAttribute(attribute.name)!==attribute.value) node.setAttribute(attribute.name,attribute.value);
  }
  patchChildren(node,fresh);
  if(focusedValue!==null&&[...node.options].some(option=>option.value===focusedValue))node.value=focusedValue;
  if(!active && ["input","select"].includes(node.localName) && node.value!==fresh.value) node.value=fresh.value;
}

export function patchMarkup(root, html) {
  const template=document.createElement("template");
  template.innerHTML=html;
  for(const selector of [".dots", ".fanRotor", ".miniFan"]) template.content.querySelectorAll(selector).forEach((el,index)=>el.setAttribute("data-key",`motion:${selector}:${index}`));
  patchChildren(root,template.content);
}
