import { createProvider } from "./providers/index.js";
import { fanModel } from "./fan-model.js";
import { CardView } from "./card-view.js";
import { AnimationController } from "./animation-controller.js";
import { VentilationFlowCardEditor } from "./card-editor.js";

const CARD_VERSION=__CARD_VERSION__;

export class VentilationFlowCard extends HTMLElement {
  setConfig(config) {
    this.config={title:"Ventilation",height:720,aspect_ratio:"16/10",grid_options:{columns:12,rows:8,min_columns:3,min_rows:4},...config};
    if(this.config.fan)fanModel({config:this.config.fan,entity:this.config.fan.entity});
    if(this.config.debug_bypass && !["open","closed"].includes(this.config.debug_bypass))throw new Error("debug_bypass must be open or closed");
    this.provider=createProvider(this);
    this.loadRegistry();
    if(!this.shadowRoot) {
      this.attachShadow({mode:"open"});
      this.ui={boostSettings:false,humiditySettings:false,drift:false,filterDetail:false,filterConfirm:false,mobileControls:false,error:""};
      this.view=new CardView(this.shadowRoot,{action:(...args)=>this.action(...args),change:(...args)=>this.change(...args),preview:value=>this.view.preview(value)});
    }
    this.render();
  }
  set hass(hass) {
    this._hass=hass;
    this.loadRegistry();
    this.render();
  }
  loadRegistry() {
    const key=this.config?.ventilation_entity||this.config?.genvex_entity||"auto";
    if(!this._hass?.callWS || !this.config || this._registryKey===key)return;
    this._registryKey=key;
    this._registryRequest=(this._registryRequest||0)+1;
    const request=this._registryRequest;
    this._hass.callWS({type:"config/entity_registry/list"}).then(registry=>{if(request!==this._registryRequest)return;this._registry=registry||[];this.render();}).catch(error=>{if(request!==this._registryRequest)return;this._registry=[];console.warn("Ventilation Flow Card: entity registry unavailable",error);this.render();});
  }
  connectedCallback() { this._renderSignature=null;this.render(); }
  disconnectedCallback() { this.motion?.disconnect();this.motion=null;this._renderSignature=null; }
  getCardSize() { return Math.max(5,Math.ceil((+this.config?.height||720)/50)); }
  static getStubConfig() { return {type:"custom:genvex-flow-card",title:"Ventilation",height:720,provider:"genvex_connect",grid_options:{columns:12,rows:8,min_columns:3,min_rows:4}}; }
  static getConfigElement() { const editor=document.createElement("ventilation-flow-card-editor");editor.version=CARD_VERSION;return editor; }
  render() {
    if(!this.config || !this.view)return;
    const model=this.provider.model(CARD_VERSION);
    // Handlers always access the latest model, including after skipped updates.
    this.model=model;
    const signature=JSON.stringify([this.config,model,this.ui]);
    if(signature===this._renderSignature)return;
    this.view.render(model,this.config,this.ui);
    this._renderSignature=signature;
    if(this.isConnected) {
      this.motion??=new AnimationController(this.shadowRoot);
      this.motion.update(model.fan);
    }
  }
  async run(command, onSuccess, label) {
    if(this._pending || !command)return;
    this._pending=true;this.ui.error="";
    if(this.config.debug_boost)this.ui.lastAction=label||"settings";
    try { await command();onSuccess?.();if(this.config.debug_boost)this.ui.lastResult="OK"; }
    catch(error) { this.ui.error=error?.message||String(error);if(this.config.debug_boost)this.ui.lastResult=this.ui.error; }
    finally { this._pending=false;this.render(); }
  }
  action(name,value) {
    const toggles={boostSettings:"boostSettings",humiditySettings:"humiditySettings",drift:"drift",filterDetail:"filterDetail",mobileControls:"mobileControls"};
    if(toggles[name]) { const key=toggles[name];this.ui[key]=!this.ui[key];this.render();return; }
    if(name==="filterHouse"){this.ui.filterDetail=true;this.ui.mobileControls=true;this.render();return;}
    if(name==="filterConfirm"||name==="filterCancel"){this.ui.filterConfirm=name==="filterConfirm";this.render();return;}
    const m=this.model;
    const commands={fan:()=>m.fan.writable&&m.fan.setValue(value),boost:()=>m.boost.available&&m.boost.controllable&&m.boost.toggle(),
      bypass:()=>m.bypass.available&&m.bypass.controllable&&m.bypass.toggle(),off:()=>m.fan.offAvailable&&m.fan.turnOff(),auto:()=>m.fan.autoAvailable&&m.fan.setAuto(),
      filterReset:()=>m.filter.resetAvailable&&m.filter.reset()};
    if(commands[name])this.run(commands[name],name==="filterReset"?()=>{this.ui.filterConfirm=false;}:undefined,name);
  }
  change(name,value,entity) {
    const m=this.model;
    if(name==="fan")return this.run(()=>m.fan.writable&&m.fan.setValue(value));
    const fields=name==="boostField"?[m.boost.speed,m.boost.duration]:name==="humidityField"?Object.values(m.humidityControl.fields):[];
    if(fields.some(field=>field.entity===entity&&field.writable))return this.run(()=>name==="boostField"?m.boost.setValue(entity,value):m.humidityControl.setValue(entity,value));
  }
}

class VersionedEditor extends VentilationFlowCardEditor { constructor(){super();this.version=CARD_VERSION;} }
if(!customElements.get("ventilation-flow-card-editor"))customElements.define("ventilation-flow-card-editor",VersionedEditor);
if(!customElements.get("genvex-flow-card-editor"))customElements.define("genvex-flow-card-editor",class extends VersionedEditor {});
if(!customElements.get("genvex-flow-card"))customElements.define("genvex-flow-card",VentilationFlowCard);
window.customCards??=[];
if(!window.customCards.some(entry=>entry.type==="genvex-flow-card"))window.customCards.push({type:"genvex-flow-card",name:"Ventilation Flow Card",description:"Animated heat-recovery ventilation visualization with provider capabilities",preview:true});
console.info("%c VENTILATION FLOW CARD %c "+CARD_VERSION,"background:#078ee6;color:white;padding:3px","background:#333;color:white;padding:3px");
