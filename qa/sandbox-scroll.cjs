/* Native wheel, keyboard and touch checks: programmatic scrollIntoView alone
   can pass even when overflow:hidden prevents the user from scrolling. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),live=process.argv.includes('--live');
const viewports=process.argv.includes('--smoke')?[[1366,650],[390,700]]:[[1366,650],[1440,900],[850,650],[390,700],[320,568],[844,390]];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch(),report=[];
 try{
  for(const [width,height]of viewports)for(const theme of ['dark','light']){
   const context=await browser.newContext({viewport:{width,height},hasTouch:width<900,reducedMotion:'reduce'});
   if(!live)await context.route('https://physics.entelloq.com/**',r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8')}):r.continue());
   await context.addInitScript(theme=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');localStorage.setItem('peq_theme',theme);window.scrollTestCameraCalls=0;navigator.mediaDevices.getUserMedia=()=>{window.scrollTestCameraCalls++;return Promise.reject(Error('Camera not part of scroll testing'));};},theme);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('https://physics.entelloq.com/?still&scrollQA='+Date.now());
   await page.locator('#pe-explore').click();await page.locator('[data-explore-go="sandbox"]').click();
   const scroller=page.locator('#main-scroll');
   async function reset(){await scroller.evaluate(e=>e.scrollTo({top:0,behavior:'instant'}));}
   async function positionCanvas(){await pause(300);await scroller.evaluate(e=>e.scrollTo({top:Math.max(0,e.scrollTop+document.querySelector('#sbx-c').getBoundingClientRect().top-innerHeight*.35),behavior:'instant'}));await pause(60);}
   async function atBottom(){const r=await scroller.boundingBox();await page.mouse.move(r.x+5,Math.min(height-100,r.y+r.height/2));let reached=false;for(let i=0;i<5;i++){await page.mouse.wheel(0,20000);await pause(250);reached=await scroller.evaluate(e=>e.scrollTop+e.clientHeight>=e.scrollHeight-3);if(reached)break;}assert.ok(reached,'Native wheel must reach the bottom');const bounds=await page.locator('.studio-footer').boundingBox();const nav=page.locator('.mtab');const bottom=await nav.isVisible()?(await nav.boundingBox()).y:height;assert.ok(bounds.y>=0&&bounds.y+bounds.height<=bottom+2,'Footer must be reachable above mobile navigation');}
   for(const mode of ['hands','camera','build']){
    await page.locator('#studio-tab-'+mode).click();await reset();
    assert.equal(await scroller.evaluate(e=>getComputedStyle(e).overflowY),'auto');
    assert.equal(await scroller.evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
    await page.locator('.studio-header h1').hover();await page.mouse.wheel(0,240);
    await page.waitForFunction(()=>document.querySelector('#main-scroll').scrollTop>40);
    await reset();await page.locator('#studio-tab-'+mode).focus();await page.keyboard.press('PageDown');
    await page.waitForFunction(()=>document.querySelector('#main-scroll').scrollTop>40);
    if(mode!=='camera'){
     // Bring the canvas into view, then use actual wheel input over its pixels.
     await positionCanvas();
     const r=await page.locator('#sbx-c').boundingBox(),y=Math.max(100,Math.min(height-130,r.y+r.height/2));
     await page.mouse.move(r.x+r.width/2,y);
     const before=await scroller.evaluate(e=>e.scrollTop),scale=await page.evaluate(()=>window.__peqSbx.shareState().s);
     await page.mouse.wheel(0,150);await page.waitForFunction(before=>document.querySelector('#main-scroll').scrollTop>before+20,before);
     assert.equal(await page.evaluate(()=>window.__peqSbx.shareState().s),scale,'Ordinary scrolling must not zoom the simulation');
     await positionCanvas();
     const next=await page.locator('#sbx-c').boundingBox();await page.mouse.move(next.x+next.width/2,Math.max(100,Math.min(height-130,next.y+next.height/2)));
     const fixedTop=await scroller.evaluate(e=>e.scrollTop);await page.keyboard.down('Alt');await page.mouse.wheel(0,-80);await page.keyboard.up('Alt');await pause(150);
     assert.ok(await page.evaluate(s=>window.__peqSbx.shareState().s>s,scale),'Alt + scroll still zooms');
     assert.ok(Math.abs(await scroller.evaluate(e=>e.scrollTop)-fixedTop)<2);
    }
    await atBottom();report.push({width,height,theme,mode,scroll:'passed'});console.log(width,height,theme,mode,'wheel / keyboard / footer passed');
   }
   if(width===390){
    await page.locator('#studio-tab-hands').click();await reset();
    const cdp=await context.newCDPSession(page),x=width/2,y=330;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let step=1;step<=8;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*25}]});await pause(30);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>document.querySelector('#main-scroll').scrollTop>40);
    console.log(theme,'native touch scrolling passed');
   }
   // Leaving the Sandbox must not leave other app pages scroll-locked.
   await page.locator('#pe-explore').click();await page.locator('[data-explore-go="settings"]').click();
   assert.equal(await scroller.evaluate(e=>e.classList.contains('sbx-active')),false);
   assert.equal(await scroller.evaluate(e=>getComputedStyle(e).overflowY),'auto');
   assert.equal(await page.evaluate(()=>window.scrollTestCameraCalls),0);assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log(JSON.stringify({live,passed:report.length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
