import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";

const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
try {
  const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.setContent('<style>body{margin:20px;background:#061525;font-family:Arial,sans-serif}genvex-flow-card{display:block;width:1200px}</style>');
  await page.addScriptTag({path:"dist/genvex-flow-card.js"});
  await page.evaluate(()=>{
    const state=(state,attributes={})=>({state,attributes});
    window.calls=[];
    window.hass={states:{
      "number.speed":state("0.5",{min:0,max:1,step:.05}),"sensor.outside":state("8"),"sensor.supply":state("19"),"sensor.extract":state("22"),"sensor.exhaust":state("9"),
      "sensor.humidity":state("45"),"sensor.rpm":state("1350"),"sensor.filter":state("30"),"button.reset":state("2026-01-01"),
      "switch.boost":state("off"),"number.boost_duration":state("30",{min:1,max:120,step:1,unit_of_measurement:"min"}),"switch.bypass":state("off"),"binary_sensor.defrost":state("unknown")
    },callWS:async()=>[],callService:async(...args)=>{window.calls.push(args);}};
    window.config={type:"custom:genvex-flow-card",provider:"generic",title:"Ventilation",height:720,fan:{entity:"number.speed"},entities:{temp_outside:"sensor.outside",temp_supply:"sensor.supply",temp_extract:"sensor.extract",temp_exhaust:"sensor.exhaust",humidity:"sensor.humidity",fan_rpm_supply:"sensor.rpm",filter_remaining:"sensor.filter",filter_reset:"button.reset",boost_enable:"switch.boost",boost_duration:"number.boost_duration",bypass_active:"switch.bypass",defrost_active:"binary_sensor.defrost"}};
    window.card=document.createElement("genvex-flow-card");card.setConfig(config);document.body.append(card);card.hass=hass;
    window.renderCount=0;const render=card.view.render.bind(card.view);card.view.render=(...args)=>{renderCount++;return render(...args);};
    window.setState=(id,state)=>{hass={...hass,states:{...hass.states,[id]:{...hass.states[id],state}}};card.hass=hass;};
  });
  const root=page.locator("genvex-flow-card");
  await root.locator(".bigLevel").waitFor();
  assert.equal(await root.locator(".bigLevel").textContent(),"0.5");
  assert.equal(await root.locator(".rpmValue").count(),1);
  assert.equal(await root.locator(".filterSummary").textContent(),"FILTER 30% tilbage");
  assert.equal(await root.locator('[data-action="auto"]').count(),0);
  assert.equal(await root.locator(".driftAccordion").textContent(),"↪ BypassLukket❄ Defrost—");
  await page.evaluate(async()=>{window.rotor=card.shadowRoot.querySelector(".fanRotor");window.rotorAnimation=rotor.getAnimations()[0];await rotorAnimation.ready;rotorAnimation.currentTime=1700;window.flow=card.shadowRoot.querySelector(".dots");window.flowAnimation=flow.getAnimations()[0];window.renderCount=0;});
  // Same data and unrelated entities must not touch the DOM or animation.
  await page.evaluate(()=>{card.hass={...hass};setState("sensor.unrelated","42");});
  assert.equal(await page.evaluate(()=>renderCount),0);
  await page.evaluate(()=>setState("sensor.outside","10"));
  assert.equal(await page.evaluate(()=>renderCount),1);
  assert.equal(await page.evaluate(()=>rotor===card.shadowRoot.querySelector(".fanRotor")&&rotorAnimation===rotor.getAnimations()[0]),true);
  // Browser animation clocks can differ slightly from the time of a seek.
  assert.ok(await page.evaluate(()=>rotorAnimation.currentTime>=1600));
  await page.evaluate(()=>setState("switch.bypass","on"));
  assert.equal(await root.locator(".dots").count(),2);
  assert.equal(await page.evaluate(()=>rotor===card.shadowRoot.querySelector(".fanRotor")&&flow===card.shadowRoot.querySelector(".dots")),true);
  await page.evaluate(()=>setState("switch.bypass","off"));
  assert.equal(await root.locator(".dots").count(),4);
  assert.equal(await page.evaluate(()=>rotorAnimation===rotor.getAnimations()[0]),true);
  // Verify actual service dispatch through the incremental view.
  await root.locator('[data-change="fan"]').evaluate(input=>{input.value="0.65";input.dispatchEvent(new Event("change",{bubbles:true}));});
  await page.waitForFunction(()=>calls.length===1);
  assert.deepEqual(await page.evaluate(()=>calls.pop()),["number","set_value",{entity_id:"number.speed",value:.65}]);
  await root.locator('[data-action="boostSettings"]').click();
  const duration=root.locator('[data-field="number.boost_duration"]');
  await duration.focus();await duration.fill("47");
  await page.evaluate(()=>setState("sensor.extract","23"));
  assert.equal(await duration.inputValue(),"47");
  assert.equal(await duration.evaluate(input=>input.getRootNode().activeElement===input),true);
  await duration.press("Tab");
  await page.waitForFunction(()=>calls.length===1);
  assert.deepEqual(await page.evaluate(()=>calls.pop()),["number","set_value",{entity_id:"number.boost_duration",value:47}]);
  await root.locator('[data-action="filterDetail"]').click();
  await root.locator('[data-action="filterConfirm"]').click();
  await page.evaluate(()=>setState("sensor.filter","0"));
  assert.equal(await root.locator(".confirm.open").count(),1);
  assert.equal(await root.locator(".filterHouseWarn").count(),1);
  await root.locator('[data-action="filterReset"]').click();
  await page.waitForFunction(()=>calls.length===1);
  assert.deepEqual(await page.evaluate(()=>calls.pop()),["button","press",{entity_id:"button.reset"}]);
  assert.equal(await root.locator(".confirm.open").count(),0);
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.waitForFunction(()=>rotor.getAnimations()[0].playState==="paused");
  assert.equal(await page.evaluate(()=>rotor.getAnimations()[0].playState),"paused");
  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.waitForFunction(()=>rotor.getAnimations()[0].playState==="running");
  assert.equal(await page.evaluate(()=>rotor.getAnimations()[0].playState),"running");
  await page.evaluate(()=>setState("number.speed","unavailable"));
  assert.equal(await root.locator(".bigLevel").textContent(),"—");
  assert.equal(await root.locator('[data-change="fan"]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>rotor.getAnimations()[0].playState),"paused");
  await page.evaluate(()=>setState("number.speed","0.5"));
  assert.equal(await page.evaluate(()=>rotor.getAnimations()[0].playState),"running");
  // Narrow layouts must still expose controls on demand.
  await root.evaluate(card=>card.style.width="480px");
  await root.locator(".mobileControls").click();
  assert.equal(await root.locator(".ui").isVisible(),true);
  await root.evaluate(card=>card.style.width="1200px");
  await page.evaluate(()=>{
    const editor=customElements.get("genvex-flow-card").getConfigElement();editor.setConfig(config);editor.hass=hass;window.editor=editor;window.editorConfig=null;
    editor.addEventListener("config-changed",event=>window.editorConfig=event.detail.config);document.body.append(editor);
  });
  const editor=page.locator("ventilation-flow-card-editor");
  assert.ok((await editor.locator(".meta").textContent()).startsWith("Ventilation · Card v"));
  assert.equal(await editor.locator('[data-path="provider"] option').count(),3);
  await editor.locator('[data-path="fan.max"]').fill("5");await editor.locator('[data-path="fan.max"]').press("Tab");
  assert.equal(await page.evaluate(()=>editorConfig.fan.max),5);
  await editor.locator('[data-path="provider"]').selectOption("danfoss_air");
  assert.ok((await editor.locator(".meta").textContent()).includes("Danfoss Air"));
  assert.equal(await page.evaluate(()=>editorConfig.fan),undefined);
  assert.equal(await page.evaluate(()=>editorConfig.entities),undefined);
  await page.evaluate(()=>editor.remove());
  fs.mkdirSync("dist",{recursive:true});
  await root.screenshot({path:"dist/card-preview.png"});
  // Trin 1 is active on a 1–5 scale, and controls use native option values.
  await page.evaluate(()=>{
    hass={...hass,states:{...hass.states,"select.steps":{state:"1",attributes:{options:["1","2","3","4","5"]}}}};
    card.setConfig({...config,fan:{entity:"select.steps",mode:"steps",min:1,max:5,step:1}});card.hass=hass;
  });
  assert.equal(await root.locator('[data-action="fan"]').count(),5);
  assert.equal(await root.locator(".bigLevel").textContent(),"1");
  assert.equal(await page.evaluate(()=>rotorAnimation===rotor.getAnimations()[0]&&rotorAnimation.playState==="running"),true);
  await root.locator('[data-action="fan"][data-value="5"]').click();
  await page.waitForFunction(()=>calls.length===1);
  assert.deepEqual(await page.evaluate(()=>calls.pop()),["select","select_option",{entity_id:"select.steps",option:"5"}]);
  await page.evaluate(()=>{
    hass={...hass,states:{...hass.states,"sensor.speed":{state:"2",attributes:{}}}};
    card.setConfig({...config,fan:{entity:"sensor.speed",min:0,max:5,step:1}});card.hass=hass;
  });
  assert.equal(await root.locator('[data-change="fan"]').count(),0);
  assert.equal(await root.locator(".bigLevel").textContent(),"2");
  // Failed services are surfaced in the UI rather than unhandled promises.
  await page.evaluate(()=>{hass={...hass,callService:async()=>{throw new Error("Test service unavailable");}};card.hass=hass;});
  await root.locator('button[data-action="boost"]').click();
  await root.locator('[role="alert"]').waitFor();
  assert.equal(await root.locator('[role="alert"]').textContent(),"Test service unavailable");
  assert.deepEqual(errors,[]);
  // Danfoss discovery with a full HA registry must leave the browser responsive.
  await page.evaluate(async()=>{
    const states={},registry=[];
    for(let i=0;i<6000;i++) {
      const id=`sensor.unrelated_${i}`;
      states[id]={state:"1",attributes:{friendly_name:`Unrelated ${i}`}};
      registry.push({entity_id:id,platform:"other",device_id:"other"});
    }
    const id="fan.danfoss_air_ventilation";
    states[id]={state:"on",attributes:{friendly_name:"Danfoss Air Ventilation",percentage:30}};
    registry.push({entity_id:id,platform:"danfoss_air",device_id:"danfoss"});
    hass={states,callWS:async()=>registry,callService:async()=>{}};
    card.hass=hass;
    card.setConfig({provider:"danfoss_air",ventilation_entity:id});
    await Promise.resolve();
    window.renderCount=0;
    for(let i=0;i<100;i++) {
      hass={...hass,states:{...hass.states,"sensor.unrelated_0":{state:String(i),attributes:{}}}};
      card.hass=hass;
    }
    await new Promise(resolve=>requestAnimationFrame(resolve));
  });
  assert.equal(await root.locator(".bigLevel").textContent(),"30");
  assert.equal(await page.evaluate(()=>renderCount),0);
  await page.evaluate(()=>setState("fan.danfoss_air_ventilation","off"));
  assert.equal(await page.evaluate(()=>card.model.fan.running),false);
  // Disconnect cleans up animation timelines and reconnect creates them again.
  await page.evaluate(()=>card.remove());
  assert.equal(await page.evaluate(()=>rotor.getAnimations().length),0);
  await page.evaluate(()=>document.body.append(card));
  assert.equal(await page.evaluate(()=>card.shadowRoot.querySelector(".fanRotor").getAnimations().length),1);
  console.log("Browser DOM identity, controls, focus, filter, editor and motion tests OK");
} finally { await browser.close(); }
