/* Browser evidence from the real packaged artifact. Uses the existing QA
 * Playwright/axe installations through NODE_PATH. --live selects production;
 * GUIDED_PRACTICALS_URL can select a preview. External services are blocked. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..'),out=path.join(__dirname,'results','guided-practicals');
const live=process.argv.includes('--live'),base=process.env.GUIDED_PRACTICALS_URL||'https://physics.entelloq.com/';
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const artifactSha256=require('node:crypto').createHash('sha256').update(html).digest('hex');
const data={};data.window=data;data.globalThis=data;vm.createContext(data);
for(const name of ['procedure-xi.js','procedure-xii.js'])vm.runInContext(fs.readFileSync(path.join(root,'experience',name),'utf8'),data);
const modules=data.PeqProcedureModules;
const report=[],errors=[];fs.mkdirSync(out,{recursive:true});
function checkpoint(row){report.push(row);console.log(JSON.stringify(row));fs.writeFileSync(path.join(out,(live?'live':'staged')+'-report.json'),JSON.stringify({generatedAt:new Date().toISOString(),source:live?'live':'packaged-local',artifactSha256:live?null:artifactSha256,checks:report,errors},null,2));}
async function context(browser,width,options={}){
 const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',acceptDownloads:true});
 c.setDefaultTimeout(15000);c.setDefaultNavigationTimeout(90000);
 await c.route('**/*',r=>{
  if(!live&&r.request().resourceType()==='document'&&r.request().url().startsWith(base))return r.fulfill({status:200,contentType:'text/html',body:html});
  if(live&&r.request().url().startsWith(base))return r.continue();return r.abort();
 });
 await c.addInitScript(options=>{
  if(window.top!==window||!['http:','https:','file:'].includes(location.protocol))return;
  localStorage.setItem('peq_notes','keep-existing-physics-notes');
  localStorage.setItem('peq_measurements_v1',JSON.stringify({v:1,trials:[],sentinel:'preserve prior evidence'}));
  if(!options.fresh)localStorage.setItem('peq_cbse_study_v1',JSON.stringify({v:1,status:'skipped'}));
  if(options.corrupt)localStorage.setItem('peq_guided_practicals_v1','{broken json');
  window.__cameraCalls=0;if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__cameraCalls++;return Promise.reject(Error('No camera requested'));};
  if(options.blocked){const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(/procedure|guided/.test(k))throw Error('Storage blocked for QA');return original.call(this,k,v);};}
 },options);
 c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 return c;
}
async function open(p,id){if(!p.url().startsWith(base))await p.goto(base+'?still#conduct:'+id,{waitUntil:'load'});else await p.evaluate(id=>{location.hash='conduct:'+id;},id);await p.locator('.procedure-lab[data-procedure-id="'+id+'"]').waitFor();await p.locator('#procedure-stage svg').waitFor();}
async function fit(p){const b=await p.locator('.procedure-lab').evaluate(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:innerWidth,client:e.clientWidth,scroll:e.scrollWidth}));assert.ok(b.left>=-1&&b.right<=b.width+1&&b.scroll<=b.client+1,JSON.stringify(b));const scene=await p.locator('#procedure-stage svg').boundingBox();assert.ok(scene&&scene.width>150&&scene.height>100,'Visible apparatus');}
async function scan(p){await p.addScriptTag({path:process.env.AXE_PATH||require.resolve('axe-core/axe.min.js')});const bad=await p.evaluate(async()=>(await axe.run('.procedure-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));assert.deepEqual(bad,[],'Guided practical accessibility');}
async function preserved(p){assert.equal(await p.evaluate(()=>localStorage.getItem('peq_notes')),'keep-existing-physics-notes');assert.match(await p.evaluate(()=>localStorage.getItem('peq_measurements_v1')),/preserve prior evidence/);assert.equal(await p.evaluate(()=>window.__cameraCalls),0);}
async function screenshot(p,name){await p.evaluate(()=>{const host=document.getElementById('main-scroll');if(host)host.scrollTop=0;window.scrollTo(0,0);});await p.screenshot({path:path.join(out,name+'.png')});await p.locator('#procedure-stage').screenshot({path:path.join(out,name+'-apparatus.png')});}
async function validateSvg(p){const invalid=await p.evaluate(()=>{const failures=[];for(const m of window.PeqProcedureModules){const defaults=Object.fromEntries(m.controls.map(c=>[c.key,c.value]));const variants=[defaults];for(const c of m.controls)for(const value of Array.isArray(c.options)?c.options.map(o=>o.value):[c.min,c.max])variants.push({...defaults,[c.key]:value});for(const values of variants)for(let step=0;step<=m.steps.length;step++){const text='<svg xmlns="http://www.w3.org/2000/svg">'+m.render({step,completed:step===m.steps.length,values,trial:0})+'</svg>';const doc=new DOMParser().parseFromString(text,'image/svg+xml');const error=doc.querySelector('parsererror');if(error)failures.push({id:m.id,step,values,error:error.textContent.slice(0,240)});}}return failures;});assert.deepEqual(invalid,[],'Every scene and control boundary parses as valid SVG XML');}
async function complete(p,m,record=true){
 await p.locator('#procedure-reset').click();assert.equal(await p.locator('#procedure-record').isDisabled(),true,m.id+' record requires procedure');
 const frames=[await p.locator('#procedure-stage svg').innerHTML()];
 for(let i=0;i<m.steps.length;i++){await p.locator('#procedure-action').click();frames.push(await p.locator('#procedure-stage svg').innerHTML());}
 if(await p.locator('#procedure-record').isDisabled()&&await p.locator('#procedure-tune').isVisible())await p.locator('#procedure-tune').click();
 assert.equal(await p.locator('#procedure-record').isEnabled(),true,m.id+' completed actions enable recording');
 assert.ok(new Set(frames).size>=3,m.id+' visible step progression');
 if(record){const before=await p.locator('#procedure-table tbody tr').count();await p.locator('#procedure-record').click();assert.ok(await p.locator('#procedure-table tbody tr').count()>before,m.id+' records current measured model state');}
}
async function vary(p,m){
 const before=await p.locator('#procedure-stage svg').innerHTML();let changes=0;
 for(const c of m.controls){let input=p.locator('.procedure-control[data-key="'+c.key+'"]');if(!['INPUT','SELECT'].includes(await input.evaluate(e=>e.tagName)))input=input.locator('input,select');
  if(Array.isArray(c.options)){for(const o of c.options){const value=typeof o==='object'?o.value:o;await input.selectOption(String(value));assert.doesNotMatch(await p.locator('.procedure-lab').innerText(),/NaN|undefined|Infinity/);}}
  else {const current=await input.inputValue(),value=String(Number(current)===c.max?c.min:c.max);if(await input.getAttribute('type')==='range')await input.evaluate((e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},value);else {await input.fill(value);await input.dispatchEvent('input');await input.dispatchEvent('change');}changes++;}
 }
 const after=await p.locator('#procedure-stage svg').innerHTML();assert.ok(after!==before||changes===0,m.id+' controls update apparatus');
 const invalid=await p.locator('#procedure-stage svg').evaluate(e=>Array.from(e.querySelectorAll('*')).flatMap(n=>Array.from(n.attributes).filter(a=>/(?:NaN|undefined|Infinity)/.test(a.value)).map(a=>n.tagName+' '+a.name)));assert.deepEqual(invalid,[],m.id+' valid SVG geometry');
}
(async()=>{const browser=await chromium.launch({headless:true});try{
 const c=await context(browser,1440),p=await c.newPage();await open(p,modules[0].id);await validateSvg(p);checkpoint({allSceneMarkup:true});
 await open(p,'p12-a-e02');for(const step of modules.find(m=>m.id==='p12-a-e02').steps)await p.locator('#procedure-action').click();assert.equal(await p.locator('#procedure-record').isDisabled(),true,'Unbalanced bridge cannot produce a saved measurement');await p.locator('#procedure-tune').click();assert.equal(await p.locator('#procedure-record').isEnabled(),true,'Scientific demonstration obtains a valid null');checkpoint({bridgeNullGate:true,tunedSetup:true});
 for(const m of modules){await open(p,m.id);await complete(p,m);await vary(p,m);await fit(p);checkpoint({id:m.id,workflow:true,liveControls:true,recorded:true,layout:true});}
 await scan(p);await preserved(p);
 const download=p.waitForEvent('download');await p.locator('#procedure-export').click();const file=await download;await file.saveAs(path.join(out,'model-observations.'+(file.suggestedFilename().split('.').pop())));assert.ok(fs.statSync(path.join(out,'model-observations.'+(file.suggestedFilename().split('.').pop()))).size>30);
 await screenshot(p,'desktop-final');checkpoint({allModules:modules.length,export:true,legacyWorkPreserved:true,cameraCalls:0,axe:true});await c.close();
 for(const width of [320,390,768]){const c=await context(browser,width),p=await c.newPage();for(const id of ['p11-a-e07','p12-a-e03','p12-b-e05']){const m=modules.find(m=>m.id===id);await open(p,id);await complete(p,m);await fit(p);await scan(p);await screenshot(p,id+'-'+width);}
  await p.locator('#procedure-reset').click();await p.locator('#procedure-action').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('#procedure-back').isEnabled(),true);await p.locator('#procedure-back').click();assert.equal(await p.locator('#procedure-record').isDisabled(),true);assert.equal(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);await preserved(p);checkpoint({width,mobileTablet:true,keyboard:true,stepBack:true,reducedMotion:true,axe:true});await c.close();}
 const denied=await context(browser,390,{blocked:true}),dp=await denied.newPage();await open(dp,'p11-a-e07');await complete(dp,modules.find(m=>m.id==='p11-a-e07'));await open(dp,'p12-b-e05');await complete(dp,modules.find(m=>m.id==='p12-b-e05'));await preserved(dp);checkpoint({storageBlocked:true,canContinue:true});await denied.close();
 const catalog=await context(browser,1440),cp=await catalog.newPage();for(const year of [11,12]){await cp.goto(base+'?still#practicals:'+year,{waitUntil:'load'});const targets=await cp.locator('#practical-cards a[href^="#conduct:"]').evaluateAll(links=>Array.from(new Set(links.map(l=>l.getAttribute('href').slice('#conduct:'.length)))).sort());assert.deepEqual(targets,Array.from(modules).filter(m=>m.id.startsWith('p'+year+'-')).map(m=>m.id).sort());await cp.locator('#practical-cards a[href^="#conduct:"]').first().click();await cp.locator('.procedure-lab').waitFor();}
 for(const id of ['p11-a-e01','p11-a-e04','p12-b-e05']){await cp.goto(base+'?still#practical-guide:'+id,{waitUntil:'load'});await cp.locator('.practical-reader').waitFor();await cp.locator('[data-procedure-entry] a').click();await cp.locator('.procedure-lab[data-procedure-id="'+id+'"]').waitFor();await cp.locator('a[href="#practical-guide:'+id+'"]').first().click();await cp.locator('.practical-reader').waitFor();}
 for(const id of ['vernier-calipers','screw-gauge','spherometer']){await cp.goto(base+'?still#practical:'+id,{waitUntil:'load'});await cp.locator(id==='spherometer'?'.sph-workspace':'.measurement-workspace').waitFor();}
 await cp.locator('#pe-explore').click();await cp.locator('[data-explore-go="settings"]').click();await cp.locator('[data-th="light"]').click();await open(cp,'p11-a-e07');await complete(cp,modules.find(m=>m.id==='p11-a-e07'));await scan(cp);await fit(cp);await screenshot(cp,'light-pendulum');
 await cp.locator('#procedure-reset').click();await cp.locator('#procedure-demo').click();await cp.waitForFunction(()=>window.PeqGuidedPracticals.state()?.step>0);await cp.locator('#procedure-action').click();const manualStep=await cp.evaluate(()=>window.PeqGuidedPracticals.state().step);await cp.waitForTimeout(3000);assert.equal(await cp.evaluate(()=>window.PeqGuidedPracticals.state().step),manualStep,'Manual action pauses demonstration');await cp.locator('#procedure-reset').click();await cp.locator('#procedure-demo').click();await open(cp,'p12-b-e05');await cp.waitForTimeout(3100);assert.equal(await cp.evaluate(()=>window.PeqGuidedPracticals.state().step),0,'Changing practical disposes demonstration');
 checkpoint({catalogueEntry:true,readerRoundTrip:true,legacyInstrumentRoutes:true,years:[11,12],lightTheme:true,demoAdvances:true,demoManualPause:true,demoRouteDisposal:true});await catalog.close();
 const fresh=await context(browser,390,{fresh:true}),fp=await fresh.newPage();await fp.goto(base+'?still#conduct:p11-a-e07',{waitUntil:'load'});await fp.locator('#cbse-questionnaire[open]').waitFor();await fp.locator('#cbse-questionnaire [data-cbse-dismiss]').first().click();await fp.locator('.procedure-lab[data-procedure-id="p11-a-e07"]').waitFor();assert.match(fp.url(),/#conduct:p11-a-e07/);await complete(fp,modules.find(m=>m.id==='p11-a-e07'));await fp.reload({waitUntil:'load'});await fp.locator('.procedure-lab').waitFor();assert.equal(await fp.locator('#procedure-table tbody tr').count(),1);checkpoint({freshOnboarding:true,deepLinkRetained:true,trialPersists:true});await fresh.close();
 const corrupt=await context(browser,390,{corrupt:true}),broken=await corrupt.newPage();await open(broken,'p11-a-e07');await complete(broken,modules.find(m=>m.id==='p11-a-e07'));await preserved(broken);checkpoint({corruptStorage:true,recovered:true});await corrupt.close();
 assert.deepEqual(errors,[],'No application exceptions');checkpoint({complete:true,pageErrors:0});
}finally{await browser.close();}})().catch(e=>{console.error(e);checkpoint({complete:false,failure:e.stack});process.exitCode=1;});
