import assert from "node:assert/strict";
import { AnimationController } from "../src/animation-controller.js";

function element(dots=false) {
  return {classList:{contains:name=>dots&&name==="dots"},animate(){return {currentTime:0,playbackRate:1,playState:"running",pause(){this.playState="paused";},play(){this.playState="running";},cancel(){this.playState="idle";},updatePlaybackRate(rate){this.playbackRate=rate;}};}};
}
let elements=[element(true),element()],frameId=0,frames=new Map(),listeners=new Map();
const media={matches:false,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
const controller=new AnimationController({querySelectorAll:()=>elements},{media,requestFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelFrame:id=>frames.delete(id)});
controller.update({running:true,normalizedPercent:20});
const flow=controller.animations.get(elements[0]).animation,rotor=controller.animations.get(elements[1]).animation;
flow.currentTime=1234;rotor.currentTime=987;
controller.update({running:true,normalizedPercent:80});
assert.equal(controller.animations.get(elements[0]).animation,flow);
assert.equal(flow.currentTime,1234);assert.equal(rotor.currentTime,987);
const previous=flow.playbackRate;
let time=0;
while(frames.size&&time<3000){const pending=[...frames];frames.clear();time+=16;for(const [,callback]of pending)callback(time);}
assert.ok(flow.playbackRate>previous);assert.equal(flow.currentTime,1234);assert.equal(frames.size,0);
elements=[...elements,element(true)];controller.update({running:true,normalizedPercent:80});
assert.equal(controller.animations.get(elements[2]).animation.currentTime,1234);
media.matches=true;listeners.get("change")();assert.equal(flow.playState,"paused");
media.matches=false;listeners.get("change")();assert.equal(flow.playState,"running");
controller.update({running:false,normalizedPercent:80});assert.equal(flow.playState,"paused");assert.equal(rotor.playState,"paused");
controller.update({running:null,normalizedPercent:null});assert.equal(flow.playState,"paused");
controller.disconnect();assert.equal(flow.playState,"idle");assert.equal(controller.animations.size,0);assert.equal(listeners.size,0);
console.log("Animation continuity, easing, reduced motion and lifecycle tests OK");
