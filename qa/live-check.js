/* Isolated, repeatable checks against the real HTTPS deployment. No user session is used.
   Run with the bundled Playwright available through NODE_PATH. Pass before for baseline. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const phase=process.argv[2]||'after',out=path.join(__dirname,'results');fs.mkdirSync(out,{recursive:true});
const report={phase,at:new Date().toISOString(),pages:[],checks:[]};
async function check(name,fn){await fn();report.checks.push(name);console.log('PASS',name);}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844],['tablet',820,1180]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:device==='mobile',hasTouch:device==='mobile'});
   await context.addInitScript(()=>{window.__audit={cls:0,lcp:0,longTasks:0,longTaskMs:0};for(const type of ['largest-contentful-paint','layout-shift','longtask'])try{new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(type==='largest-contentful-paint')window.__audit.lcp=e.startTime;if(type==='layout-shift'&&!e.hadRecentInput)window.__audit.cls+=e.value;if(type==='longtask'){window.__audit.longTasks++;window.__audit.longTaskMs+=e.duration;}})).observe({type,buffered:true});}catch{}});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('https://physics.entelloq.com/?landing&audit='+phase+Date.now(),{waitUntil:'load'});await page.waitForTimeout(1800);
   const metrics=await page.evaluate(()=>({...window.__audit,domNodes:document.querySelectorAll('*').length,canvasCount:document.querySelectorAll('canvas').length,overflow:document.documentElement.scrollWidth>innerWidth,htmlBytes:new TextEncoder().encode(document.documentElement.outerHTML).length,nav:performance.getEntriesByType('navigation').map(n=>({transfer:n.transferSize,encoded:n.encodedBodySize,decoded:n.decodedBodySize,domContentLoaded:n.domContentLoadedEventEnd,load:n.loadEventEnd}))[0]}));
   await page.screenshot({path:path.join(out,phase+'-'+device+'-launch.png')});
   report.pages.push({device,width,height,...metrics,errors});console.log(device,JSON.stringify(metrics));
   if(phase==='before'){await context.close();continue;}
   assert.equal(errors.length,0,errors.join('\n'));
   await check(device+' launch has no overflow',async()=>assert.equal(metrics.overflow,false));
   await check(device+' real orbital speed control',async()=>{
    const range=page.locator('#pe-velocity');await range.fill('1.5');await range.dispatchEvent('input');assert.match(await page.locator('#pe-orbit-state').innerText(),/ESCAPE/);await range.fill('0.7');await range.dispatchEvent('input');assert.match(await page.locator('#pe-orbit-state').innerText(),/EARTH-INTERSECTING/);await range.fill('1');await range.dispatchEvent('input');
   });
   await check(device+' enter without forced onboarding',async()=>{await page.getByRole('button',{name:'Enter the Physics Lab',exact:true}).first().click();await page.locator('.cc-home').waitFor();assert.equal(await page.locator('#onb').count(),0);});
   await page.waitForTimeout(600);await page.screenshot({path:path.join(out,phase+'-'+device+'-home.png')});
   await check(device+' start exploring opens cradle',async()=>{await page.locator('#cc-start').click();await page.locator('.cradle-mode').waitFor();await page.waitForTimeout(1000);assert.equal(await page.locator('#cr-lab').isVisible(),true);assert.match(await page.locator('#cr-peak').innerText(),/N/);});
   await page.screenshot({path:path.join(out,phase+'-'+device+'-cradle.png')});
   await check(device+' pause freezes physics; play advances it',async()=>{await page.locator('#cr-stage-pause').click();const a=await page.evaluate(()=>window.__peqSbx.simT());await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__peqSbx.simT()),a);await page.locator('#cr-stage-pause').click();await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>window.__peqSbx.simT())>a);});
   await check(device+' stiffness, damping and save/restore round trip',async()=>{
    await page.locator('#cr-elasticity').fill('130');await page.locator('#cr-elasticity').dispatchEvent('input');await page.locator('#cr-damping').fill('0');await page.locator('#cr-damping').dispatchEvent('input');await page.locator('#cr-save').click();await page.locator('#cr-elasticity').fill('40');await page.locator('#cr-elasticity').dispatchEvent('input');await page.locator('#cr-restore').click();assert.equal(await page.locator('#cr-elasticity').inputValue(),'130');assert.equal(await page.locator('#cr-damping').inputValue(),'0');
   });
   await check(device+' shape, reset, keyboard anchor and pluck',async()=>{
    await page.getByRole('button',{name:'Bridge',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Bridge',exact:true}).getAttribute('aria-pressed'),'true');await page.locator('#cr-reset').click();const cv=page.locator('#sbx-c');await cv.focus();const x=await page.evaluate(()=>{const s=window.__peqSbx.state();return s.B[s.cradleNodes[0].id].x;});await cv.press('ArrowRight');assert.ok(await page.evaluate(()=>{const s=window.__peqSbx.state();return s.B[s.cradleNodes[0].id].x;})>x);await page.locator('#cr-pluck').click();
   });
   if(device==='desktop'){
    await check('prediction precedes measured controlled comparison',async()=>{assert.equal(await page.locator('#cr-compare').isDisabled(),true);await page.getByRole('button',{name:'Higher',exact:true}).click();await page.locator('#cr-compare').click();await page.getByText('Your prediction matches.',{exact:false}).waitFor();});
    await check('legacy destinations still render',async()=>{for(const name of ['universe','learn','solve','practice','lab','research','progress']){await page.locator('.nav-i[data-go="'+name+'"]').click();assert.ok((await page.locator('#main').innerText()).length>80);}});
   }
   assert.equal(errors.length,0,errors.join('\n'));await context.close();
  }
  if(phase!=='before'){
   const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await reduced.newPage();await page.goto('https://physics.entelloq.com/?landing&still',{waitUntil:'load'});
   await check('reduced motion starts orbital preview paused',async()=>assert.equal(await page.locator('#pe-pause').getAttribute('aria-label'),'Play orbital animation'));
   await check('keyboard can reach primary entry',async()=>{await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'pe-skip');});await reduced.close();
  }
 }finally{fs.writeFileSync(path.join(out,phase+'-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
