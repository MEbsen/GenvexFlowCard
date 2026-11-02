import assert from "node:assert/strict";

// Uses the browser suite's populated card, including writable settings.
export async function testResponsive(page, root) {
  const sizes=[[320,568],[360,800],[390,844],[430,932],[584,800],[585,800],[768,1024],[874,900],[875,900],[1024,768],[1440,900],[1920,1080],[844,390]];
  await page.addStyleTag({content:"body{margin:0;padding:12px;box-sizing:border-box}genvex-flow-card{width:100%;max-width:1200px}"});
  await root.evaluate(card=>card.style.removeProperty("width"));
  for(const [width,height] of sizes) {
    await page.setViewportSize({width,height});
    const label=`${width}x${height}`;
    const cardWidth=await root.evaluate(card=>card.getBoundingClientRect().width);
    const mobile=cardWidth<=560;
    assert.equal(await root.locator(".mobileControls").isVisible(),mobile,`${label}: container breakpoint`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label}: page overflow`);
    if(mobile) await root.locator(".mobileControls").click();
    assert.equal(await root.locator(".ui").isVisible(),true,`${label}: controls accessible`);
    await root.locator('[data-action="boostSettings"]').click();
    const duration=root.locator('[data-field="number.boost_duration"]');
    await duration.scrollIntoViewIfNeeded();
    assert.equal(await duration.isVisible(),true);
    const geometry=await root.evaluate(card=>{
      const shadow=card.shadowRoot,stage=shadow.querySelector(".stage").getBoundingClientRect();
      const panel=shadow.querySelector(".ui"),bounds=panel.getBoundingClientRect();
      const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      const button=shadow.querySelector(".mobileControls");
      return {
        panelFits:bounds.left>=stage.left&&bounds.right<=stage.right&&bounds.top>=stage.top&&bounds.bottom<=stage.bottom,
        panelOverflow:panel.scrollWidth>panel.clientWidth+1,
        headerOverlap:getComputedStyle(button).display!=="none"&&overlap(shadow.querySelector(".head").getBoundingClientRect(),button.getBoundingClientRect()),
        metricsOverlap:overlap(bounds,shadow.querySelector(".bottom").getBoundingClientRect()),
      };
    });
    assert.ok(geometry.panelFits,`${label}: panel outside card`);
    assert.equal(geometry.panelOverflow,false,`${label}: settings overflow horizontally`);
    assert.equal(geometry.headerOverlap,false,`${label}: title overlaps controls button`);
    assert.equal(geometry.metricsOverlap,false,`${label}: panel overlaps metrics`);
    await root.screenshot({path:`dist/responsive-${label}-controls.png`});
    await root.locator('[data-action="boostSettings"]').click();
    if(mobile) await root.locator(".mobileControls").click();
    await root.screenshot({path:`dist/responsive-${label}.png`});
  }
  // A narrow dashboard column must use mobile layout even on a wide screen.
  await page.setViewportSize({width:1440,height:900});
  await root.evaluate(card=>card.style.width="360px");
  assert.equal(await root.locator(".mobileControls").isVisible(),true);
  await root.evaluate(card=>card.style.width="1200px");
  console.log(`Responsive layouts OK: ${sizes.length} viewports and narrow desktop column`);
}
