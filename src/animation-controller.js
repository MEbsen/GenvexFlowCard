// Fixed timelines + variable playback rates keep phase continuous at every speed.
export class AnimationController {
  constructor(root, { requestFrame = callback => requestAnimationFrame(callback), cancelFrame = id => cancelAnimationFrame(id), media = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") } = {}) {
    this.root=root;this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;this.media=media;
    this.animations=new Map();this.frame=null;
    this.motionChanged=()=>this.update(this.fan);
    this.media?.addEventListener("change",this.motionChanged);
  }
  update(fan) {
    if(!fan)return;
    this.fan=fan;
    const percent=fan.running===true?Math.max(1,fan.normalizedPercent??5):0;
    const flow=1/Math.max(.55,7.5-Math.pow(percent/100,.55)*6.95);
    const rotor=1/Math.max(.45,5.5-Math.pow(percent/100,.6)*5.05);
    const live=new Set(this.root.querySelectorAll(".dots,.fanRotor,.miniFan"));
    // A new bypass route starts at the same phase as the existing airflow.
    const flowPhase=[...this.animations].find(([el])=>el.classList.contains("dots"))?.[1].animation.currentTime || 0;
    for(const [element,entry] of this.animations) if(!live.has(element)){entry.animation.cancel();this.animations.delete(element);}
    for(const element of live) {
      let entry=this.animations.get(element);
      const dots=element.classList.contains("dots"),target=dots?flow:rotor;
      if(!entry) {
        const animation=element.animate(dots?[{strokeDashoffset:0},{strokeDashoffset:-104}]:[{transform:"rotate(0deg)"},{transform:"rotate(360deg)"}],{duration:1000,iterations:Infinity,easing:"linear"});
        animation.currentTime=dots?flowPhase:0;
        animation.playbackRate=target;
        entry={animation,rate:target,target};this.animations.set(element,entry);
      }
      entry.target=target;
      if(!percent || this.media?.matches) entry.animation.pause();
      else if(entry.animation.playState!=="running") entry.animation.play();
    }
    if(this.frame!==null){this.cancelFrame(this.frame);this.frame=null;}
    if(percent && !this.media?.matches) this.smooth();
  }
  smooth() {
    let last;
    const tick=time=>{
      this.frame=null;
      const blend=1-Math.exp(-Math.min(64,last===undefined?16:time-last)/150);last=time;
      let changing=false;
      for(const entry of this.animations.values()) {
        const delta=entry.target-entry.rate;
        if(Math.abs(delta)>.001){entry.rate+=delta*blend;changing=true;}else entry.rate=entry.target;
        // updatePlaybackRate preserves the current time rather than seeking.
        entry.animation.updatePlaybackRate(entry.rate);
      }
      if(changing)this.frame=this.requestFrame(tick);
    };
    if([...this.animations.values()].some(entry=>Math.abs(entry.target-entry.rate)>.001))this.frame=this.requestFrame(tick);
  }
  disconnect() {
    if(this.frame!==null)this.cancelFrame(this.frame);
    this.frame=null;
    this.media?.removeEventListener("change",this.motionChanged);
    for(const entry of this.animations.values())entry.animation.cancel();
    this.animations.clear();
  }
}
