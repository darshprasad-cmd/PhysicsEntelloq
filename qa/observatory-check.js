/* Run the staged document on its HTTPS origin; --live checks the published page.
   Isolated guest profiles. No real sign-in, AI submission or camera permission. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const live=process.argv.includes('--live'),mode=live?'observatory-live':'observatory-staged',out=path.join(__dirname,'results'),report=[];
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch();try{
 for(const [device,width,height]of[['reference',1536,1024],['desktop',1440,900],['tablet',820,1180],['mobile',390,844],['small',320,740]]){
  const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});await c.route(/clarity\.ms|google-analytics\.com/,r=>r.abort());
  if(!live)await c.route('https://physics.entelloq.com/**',r=>r.request().resourceType()==='document'?r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')}):r.continue());
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  async function launch(){await p.goto('https://physics.entelloq.com/?landing&observatoryQA='+Date.now(),{waitUntil:'load'});await p.locator('.obs-backdrop img').evaluate(i=>i.decode());}
  await launch();await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  assert.equal(await p.locator('#pe-pause').getAttribute('aria-pressed'),'true','Reduced motion starts paused');
  await p.screenshot({path:path.join(out,mode+'-'+device+'.png')});
  const a=await p.evaluate(async()=>{const root=document.querySelector('#lnd'),a=await axe.run(root,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return{overflow:root.scrollWidth>root.clientWidth+1,violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))};});
  report.push({device,...a});console.log(device,JSON.stringify(a));
  assert.equal(a.overflow,false);assert.deepEqual(a.violations,[]);
  await p.locator('.pe-skip').focus();await p.keyboard.press('Enter');assert.ok(await p.locator('#pe-title').evaluate(e=>e===document.activeElement));
  await p.locator('.obs-nav a[href="#pe-founder"]').click();await p.locator('#pe-founder img').evaluate(i=>i.decode());assert.equal(await p.locator('#pe-founder img').evaluate(i=>i.naturalWidth),512);await p.screenshot({path:path.join(out,mode+'-'+device+'-founder.png')});
  assert.match(await p.locator('#pe-founder').innerText(),/Darsh Prasad/);assert.match(await p.locator('#pe-founder').innerText(),/I built Entelloq so students could finally play it/);
  await p.locator('.obs-nav a[href="#pe-worlds"]').click();await p.screenshot({path:path.join(out,mode+'-'+device+'-explore.png')});
  await p.locator('#pe-advanced').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,mode+'-'+device+'-advanced.png')});
  await p.locator('#pe-mass').focus();const old=await p.locator('#pe-mass').inputValue();await p.keyboard.press('ArrowRight');assert.notEqual(await p.locator('#pe-mass').inputValue(),old);assert.equal(await p.locator('#pe-trajectory').inputValue(),'custom');
  for(const [preset,expected]of[['circular','NEAR-CIRCULAR'],['elliptical','ELLIPTICAL'],['escape','ESCAPE']]){await p.locator('#pe-trajectory').selectOption(preset);assert.match(await p.locator('#pe-orbit-state').innerText(),new RegExp(expected));}
  await p.locator('#pe-velocity').fill('4');assert.match(await p.locator('#pe-orbit-state').innerText(),/EARTH-INTERSECTING/);
  await p.locator('.obs-model summary').click();const modelBounds=await p.locator('.obs-result').boundingBox(),cardsBounds=await p.locator('.obs-features').boundingBox();assert.ok(modelBounds.y+modelBounds.height<cardsBounds.y,'Expanded model notes do not overlap feature cards');await p.locator('.obs-model summary').click();
  await p.locator('.obs-start').click();await p.locator('#pe-account-dialog[open]').waitFor();await p.keyboard.press('Escape');assert.equal(await p.locator('#pe-account-dialog[open]').count(),0);
  await p.locator('.obs-primary').click();assert.equal(await p.locator('#lnd').count(),0);assert.ok(await p.locator('[data-go="home"][aria-current="page"]').count());
  if(device==='reference'){
   for(const [selector,dest]of[['.obs-nav [data-enter="learn"]','learn'],['.obs-nav [data-enter="lab"]','lab'],['.obs-nav [data-enter="research"]','research'],['.obs-feature[data-enter="lab"]','lab'],['.obs-feature[data-enter="learn"]','learn'],['.obs-feature[data-enter="universe"]','universe'],['.obs-feature[data-enter="adv"]','adv']]){await launch();await p.locator(selector).click();assert.ok(await p.locator('[data-go="'+dest+'"][aria-current="page"]').count());assert.equal(await p.locator('#lnd').count(),0);}
   await launch();await p.locator('.obs-search').click();assert.equal(await p.locator('#lnd').count(),0);await p.locator('#cmdk[open]').waitFor();assert.ok(await p.locator('#cp-in').evaluate(e=>e===document.activeElement));
   await p.addInitScript(()=>{const request=requestAnimationFrame,cancel=cancelAnimationFrame;window.__obsFrames=new Set();window.requestAnimationFrame=function(fn){let id;const obs=fn.toString().includes('picture.style.transform');id=request.call(window,t=>{__obsFrames.delete(id);fn(t);});if(obs)__obsFrames.add(id);return id;};window.cancelAnimationFrame=function(id){__obsFrames.delete(id);cancel.call(window,id);};});
   await p.emulateMedia({reducedMotion:'no-preference'});await launch();assert.equal(await p.locator('#pe-pause').getAttribute('aria-pressed'),'false');assert.equal(await p.evaluate(()=>__obsFrames.size),1,'Only one scene frame is scheduled');
   const pixels=()=>p.locator('#pe-orbit-canvas').evaluate(c=>c.toDataURL());const first=await pixels();await p.waitForTimeout(220);assert.notEqual(await pixels(),first,'Orbit actually moves');
   await p.locator('#pe-pause').click();await p.waitForTimeout(100);const still=await pixels(),bg=await p.locator('.obs-backdrop').evaluate(e=>getComputedStyle(e).transform);await p.waitForTimeout(200);assert.equal(await pixels(),still,'Pause freezes canvas');assert.equal(await p.locator('.obs-backdrop').evaluate(e=>getComputedStyle(e).transform),bg,'Pause freezes background');
   await p.locator('#pe-pause').click();await p.waitForTimeout(150);assert.notEqual(await pixels(),still,'Scene resumes');
   await p.locator('#pe-founder').scrollIntoViewIfNeeded();await p.waitForTimeout(120);assert.equal(await p.locator('#lnd').getAttribute('data-scene-paused'),'true','Offscreen scene suspends');assert.equal(await p.evaluate(()=>__obsFrames.size),0);
   await p.locator('#pe-mass').scrollIntoViewIfNeeded();await p.waitForTimeout(120);assert.equal(await p.locator('#lnd').getAttribute('data-scene-paused'),'false','Visible scene resumes');
   await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);assert.equal(await p.locator('#pe-pause').getAttribute('aria-pressed'),'true','Preference changes stop motion');await p.locator('.obs-primary').click();assert.equal(await p.evaluate(()=>__obsFrames.size),0,'Leaving launch releases its animation');
   await p.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){return this.id==='pe-orbit-canvas'?null:get.apply(this,args);};});await launch();assert.equal(await p.locator('#pe-orbit-canvas').isVisible(),false);await p.locator('#pe-trajectory').selectOption('escape');assert.match(await p.locator('#pe-orbit-state').innerText(),/ESCAPE/);
  }
  assert.deepEqual(errors,[]);report.push({device,runtimeErrors:errors,interactionChecks:'navigation, founder, account dialog, keyboard, controls, motion preferences'});await c.close();
 }
}finally{fs.writeFileSync(path.join(out,mode+'.json'),JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
