/* Real Chromium interaction with the packaged artifact. No camera or AI actions.
   --live verifies production; SPHEROMETER_URL optionally selects a preview host. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const M=require('../experience/spherometer-model.js');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const live=process.argv.includes('--live'),base=process.env.SPHEROMETER_URL||'https://physics.entelloq.com/';
const out=path.join(__dirname,'results','spherometer'),key='peq_spherometer_v1';
const axePath=process.env.AXE_PATH||'C:/Users/darsh/biology-entelloq/node_modules/axe-core/axe.min.js';
const oldNotebook=JSON.stringify({v:1,trials:[],sentinel:'preserve legacy measurements'});
fs.mkdirSync(out,{recursive:true});
const report=[],errors=[];
function checkpoint(value){report.push(value);console.log(JSON.stringify(value));}
async function context(browser,width,options={}){
  const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',acceptDownloads:true});
  c.setDefaultTimeout(15000);c.setDefaultNavigationTimeout(90000);
  await c.route('**/*',r=>{
    if(!live&&r.request().resourceType()==='document'&&r.request().url().startsWith(base))return r.fulfill({status:200,contentType:'text/html',body:html});
    return r.request().url().startsWith(base)?r.continue():r.abort();
  });
  await c.addInitScript(({options,key,oldNotebook})=>{
    // Playwright also runs init scripts on the initial opaque about:blank page.
    // Seed only the app document; retain pageerror checks for all actual app work.
    if(window.top!==window||!['http:','https:','file:'].includes(location.protocol))return;
    localStorage.setItem('peq_notes','preserved student note');
    localStorage.setItem('peq_measurements_v1',oldNotebook);
    if(!options.fresh)localStorage.setItem('peq_cbse_study_v1',JSON.stringify({v:1,status:'ready',class:'11',goal:'foundations',minutes:'20',focus:'measurements'}));
    if(options.corrupt)localStorage.setItem(key,'{malformed');
    window.__cameraCalls=0;
    if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__cameraCalls++;return Promise.reject(Error('Camera is not part of this test'));};
    if(options.blocked){const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Denied for QA');return original.call(this,k,v);};}
  },{options,key,oldNotebook});
  c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  return c;
}
async function open(p,route='practical:spherometer'){
  await p.goto(base+'?still#'+route,{waitUntil:'load'});
  if(route==='practical:spherometer')await p.locator('.sph-workspace').waitFor();
}
async function fit(p){
  const b=await p.locator('.sph-workspace').evaluate(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,viewport:innerWidth,client:e.clientWidth,scroll:e.scrollWidth}));
  assert.ok(b.left>=-1&&b.right<=b.viewport+1&&b.scroll<=b.client+1,JSON.stringify(b));
}
async function scan(p){
  await p.addScriptTag({path:axePath});
  const violations=await p.evaluate(async()=>(await axe.run('.sph-workspace',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
  assert.deepEqual(violations,[],'Spherometer accessibility');
}
async function calibrate(p,checkWrong=false){
  if(checkWrong){await p.locator('#sph-lc').fill('1');await p.locator('#sph-calibration button').click();assert.match(await p.locator('#sph-calibration-feedback').innerText(),/Pitch is not least count/);}
  await p.locator('#sph-lc').fill('0.01');await p.locator('#sph-calibration button').click();
  assert.match(await p.locator('#sph-calibration-feedback').innerText(),/Correct.*0.01/);
}
async function select(p,sample,position){
  await p.locator('#sph-sample').selectOption(sample);await p.locator('#sph-position').selectOption(String(position));
}
async function surface(p,sample,position,id,wrong=false){
  await p.locator('[data-sph-surface="'+id+'"]').click();
  assert.match(await p.locator('#sph-contact-status').innerText(),/Not at contact/);
  const r=M.reading(M.contact(sample,position,id));
  await p.locator('#sph-main').fill(String(r.mainMm));await p.locator('#sph-division').fill(String(r.division));
  if(wrong){await p.locator('#sph-reading button').click();assert.match(await p.locator('#sph-reading-feedback').innerText(),/not at contact/);}
  await p.locator('#sph-contact').click();
  assert.equal(await p.locator('#sph-travel').inputValue(),String(r.ticks));
  assert.match(await p.locator('#sph-contact-status').innerText(),/Gentle contact/);
  if(wrong){await p.locator('#sph-division').fill(String((r.division+1)%100));await p.locator('#sph-reading button').click();assert.match(await p.locator('#sph-reading-feedback').innerText(),/Not saved/);await p.locator('#sph-division').fill(String(r.division));}
  await p.locator('#sph-reading button').click();assert.match(await p.locator('#sph-reading-feedback').innerText(),/Checked and recorded/);
}
async function trial(p,sample='convex',position=0,wrong=false){
  await select(p,sample,position);
  await surface(p,sample,position,'flat',wrong);await surface(p,sample,position,'curve');
  const t=M.buildTrial({sample,position,flatTicks:M.contact(sample,position,'flat'),curveTicks:M.contact(sample,position,'curve'),legs:M.samples[sample].legReadings.slice()});
  for(let i=0;i<3;i++){
    await p.locator('#sph-leg').selectOption(String(i));
    await p.locator('#sph-ruler summary').click();
    assert.match(await p.locator('#sph-ruler details').innerText(),new RegExp(String(t.legs[i]).replace('.','\\.')));
    await p.locator('#sph-leg-'+i).fill(String(t.legs[i]));
  }
  await p.locator('#sph-h').fill(t.h.toFixed(2));await p.locator('#sph-radius').fill(t.R.toFixed(2));
  if(wrong){
    await p.locator('#sph-leg-0').fill('17.3');await p.locator('#sph-result button').click();
    assert.match(await p.locator('#sph-result-feedback').innerText(),/inter-foot distances/);
    await p.locator('#sph-leg-0').fill(String(t.legs[0]));await p.locator('#sph-radius').fill('1');await p.locator('#sph-result button').click();
    assert.match(await p.locator('#sph-result-feedback').innerText(),/Not saved/);await p.locator('#sph-radius').fill(t.R.toFixed(2));
  }
  await p.locator('#sph-result button').click();assert.match(await p.locator('#sph-result-feedback').innerText(),/Trial checked and saved/);
  return t;
}
async function complete(p){for(const answer of ['11','foundations','20','measurements']){await p.locator('#cbse-questionnaire input[value="'+answer+'"]').check();await p.locator('#cbse-questionnaire button[type=submit]').click();}}
async function preserved(p){assert.equal(await p.evaluate(()=>localStorage.getItem('peq_notes')),'preserved student note');assert.equal(await p.evaluate(()=>localStorage.getItem('peq_measurements_v1')),oldNotebook);assert.equal(await p.evaluate(()=>window.__cameraCalls),0);}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const width of [320,390,768,1440]){
      const c=await context(browser,width),p=await c.newPage();await open(p);
      assert.equal(await p.locator('#cbse-questionnaire[open],#lnd').count(),0);
      assert.equal(await p.locator('.sph-header h1').evaluate(e=>e===document.activeElement),true);
      await fit(p);await scan(p);
      await p.locator('#sph-travel').focus();await p.keyboard.press('ArrowRight');
      assert.equal(await p.locator('#sph-travel').inputValue(),'1');
      await p.keyboard.press('Tab');assert.ok(await p.evaluate(()=>document.activeElement.closest('.sph-workspace')!==null));
      assert.equal(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
      await calibrate(p,true);await trial(p,'convex',0,true);
      assert.equal(await p.locator('#sph-notebook tbody tr').count(),1);
      await p.locator('#sph-worked summary').click();assert.match(await p.locator('#sph-working').innerText(),/300.25/);
      await fit(p);await scan(p);await p.evaluate(()=>document.getElementById('main-scroll').scrollTop=0);
      await p.screenshot({path:path.join(out,'dark-'+width+'.png')});
      await p.reload({waitUntil:'load'});assert.equal(await p.locator('#sph-notebook tbody tr').count(),1);await preserved(p);
      checkpoint({width,calibration:true,contactGate:true,scaleGate:true,threeLegs:true,radiusGate:true,keyboard:true,reducedMotion:true,persisted:true,axe:true,cameraCalls:0});
      await c.close();
    }
    const c=await context(browser,1440),p=await c.newPage();await open(p);await calibrate(p);
    for(const sample of Object.keys(M.samples))for(let position=0;position<4;position++)await trial(p,sample,position);
    assert.equal(await p.locator('#sph-notebook tbody tr').count(),8);
    assert.equal(await p.locator('.sph-summaries article').count(),2);
    for(const text of await p.locator('.sph-summaries article').allInnerTexts())assert.match(text,/4 \/ 4 distinct placements/);
    assert.deepEqual(await p.locator('.sph-summaries article strong').allTextContents(),['300.25 mm','200.38 mm'],'Primary results use the radius calculated from mean sagitta');
    await trial(p,'convex',0);assert.equal(await p.locator('#sph-notebook tbody tr').count(),9);
    assert.match(await p.locator('.sph-summaries article').first().innerText(),/5 trials.*4 \/ 4 distinct placements/s);
    const downloadEvent=p.waitForEvent('download');await p.locator('#sph-export').click();const download=await downloadEvent;
    const csvPath=path.join(out,(live?'live-':'')+'trials.csv');await download.saveAs(csvPath);
    const csv=fs.readFileSync(csvPath,'utf8');assert.equal(csv.split(/\r?\n/).length,10);
    assert.match(csv,/Flat reading \(mm\),Curved reading \(mm\)/);assert.match(csv,/Convex spherical surface,1,3.00,2.50,30.00,30.50,29.50,30.00,0.50,300.25/);assert.match(csv,/Concave spherical surface,1,3.00,3.75/);
    await p.reload({waitUntil:'load'});assert.equal(await p.locator('#sph-notebook tbody tr').count(),9);
    await p.locator('#sph-notebook').screenshot({path:path.join(out,'notebook.png')});
    p.once('dialog',d=>d.accept());await p.locator('#sph-clear').click();assert.equal(await p.locator('#sph-notebook tbody tr').count(),0);await preserved(p);
    checkpoint({bothSamples:true,placements:8,duplicatesDoNotIncreaseCoverage:true,reloaded:true,csv:true,scopedClear:true});
    for(const route of ['practicals:11','practical-guide:p11-a-e04','lab','cbse:11']){
      if(route==='lab'){await p.locator('[data-go="lab"]:visible').first().click();await p.locator('[data-lm="labs"]').click();}
      else await open(p,route);
      await p.locator('[data-sph-entry]').waitFor();
      await p.locator('[data-sph-entry]').first().click();await p.locator('.sph-workspace').waitFor();
      assert.match(p.url(),/#practical:spherometer$/);
    }
    await p.locator('#pe-explore').click();await p.locator('[data-explore-go="settings"]').click();await p.locator('[data-th="light"]').click();
    await open(p);await fit(p);await scan(p);await p.screenshot({path:path.join(out,'light-desktop.png')});
    await p.setViewportSize({width:320,height:700});await fit(p);await scan(p);await p.screenshot({path:path.join(out,'light-mobile.png')});
    checkpoint({catalogueEntry:true,guideEntry:true,labEntry:true,class11Entry:true,lightDesktopAndMobileAxe:true});await c.close();
    for(const scenario of ['blocked','corrupt']){
      const sc=await context(browser,390,{[scenario]:true}),sp=await sc.newPage();await open(sp);
      assert.equal(await sp.locator('#sph-notebook tbody tr').count(),0);await calibrate(sp);await trial(sp);
      assert.equal(await sp.locator('#sph-notebook tbody tr').count(),1);
      if(scenario==='blocked')assert.match(await sp.locator('#sph-storage').innerText(),/session/);
      await preserved(sp);checkpoint({scenario,sessionInteraction:true});await sc.close();
    }
    for(const mode of ['skip','complete']){
      const fc=await context(browser,390,{fresh:true}),fp=await fc.newPage();await open(fp);
      await fp.locator('#cbse-questionnaire[open]').waitFor();assert.equal(await fp.locator('#lnd').count(),0);
      if(mode==='skip')await fp.locator('#cbse-questionnaire [data-cbse-dismiss]').first().click();else await complete(fp);
      assert.equal(await fp.locator('#cbse-questionnaire[open],#lnd').count(),0);
      assert.match(fp.url(),/#practical:spherometer$/);await fp.locator('.sph-workspace').waitFor();await calibrate(fp);await trial(fp);await preserved(fp);
      checkpoint({freshQuestionnaire:mode,deepLinkPreserved:true,usable:true});await fc.close();
    }
    if(!live){
      const oc=await browser.newContext({viewport:{width:390,height:700},reducedMotion:'reduce'});
      await oc.setOffline(true);await oc.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
      await oc.addInitScript(()=>{if(window.top===window)localStorage.setItem('peq_cbse_study_v1',JSON.stringify({v:1,status:'skipped'}));});
      const op=await oc.newPage();await op.goto(pathToFileURL(path.join(root,'index.html')).href+'?still#practical:spherometer',{waitUntil:'load'});
      await op.locator('.sph-workspace').waitFor();await calibrate(op);await trial(op,'concave',3);await fit(op);
      assert.equal(await op.locator('#sph-notebook tbody tr').count(),1);checkpoint({singleFileOffline:true,networkDisconnected:true});await oc.close();
    }
    assert.deepEqual(errors,[],'No browser runtime errors');checkpoint({runtimeErrors:errors});
    fs.writeFileSync(path.join(out,(live?'live':'staged')+'-report.json'),JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(e=>{fs.writeFileSync(path.join(out,(live?'live':'staged')+'-failure.json'),JSON.stringify({message:e.message,stack:e.stack,completed:report,errors},null,2));console.error(e);process.exitCode=1;});
