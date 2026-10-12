import { sceneTemplate } from "./card-scene.js";
import { patchMarkup } from "./dom-patch.js";

export class CardView {
  constructor(root, { action, change, preview }) {
    this.root=root;
    root.addEventListener("click",event=>{
      const button=event.target.closest?.("[data-action]");
      if(button && !button.disabled){event.stopPropagation();action(button.dataset.action,button.dataset.value);}
    });
    root.addEventListener("keydown",event=>{
      const element=event.target.closest?.("[data-action]");
      if(element?.namespaceURI==="http://www.w3.org/2000/svg" && ["Enter"," "].includes(event.key)){event.preventDefault();event.stopPropagation();action(element.dataset.action);}
    });
    root.addEventListener("change",event=>{
      const input=event.target.closest?.("[data-change]");
      if(input&&!input.disabled)change(input.dataset.change,input.value,input.dataset.field);
    });
    root.addEventListener("input",event=>{
      if(event.target.dataset.change==="fan")preview(event.target.value);
    });
  }
  render(model, config, ui) { patchMarkup(this.root,sceneTemplate(model,config,ui)); }
  preview(value) { const output=this.root.querySelector("[data-fan-value]");if(output)output.textContent=value; }
}
