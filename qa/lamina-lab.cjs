/* Exercise the actual packaged apparatus in Chromium. Synthetic instrument
   readings do not validate a physical screw gauge or a student's competence.
   --live checks production; LAMINA_URL can select an HTTPS preview. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const M=require('../experience/lamina-model.js');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const live=process.argv.includes('--live'),base=process.env.LAMINA_URL||'https://physics.entelloq.com/';
const out=process.env.LAMINA_OUTPUT||path.join(__dirname,'results','lamina'),key='peq_lamina_v1';
const axePath=process.env.AXE_PATH||'C:/Users/darsh/biology-entelloq/node_modules/axe-core/axe.min.js';
const notes={peq_notes:'Student note: keep this.',peq_practical_notes_v1:JSON.stringify({v:1,notes:{'p11-a-e03':'Keep my physical observations.'}}),peq_measurements_v1:JSON.stringify({v:1,trials:[],sentinel:'measurement'}),peq_spherometer_v1:JSON.stringify({v:1,trials:[],sentinel:'spherometer'})};
const profile={v:1,status:'ready',class:'11',goal:'foundations',minutes:'20',focus:'measurements'};
const report=[],errors=[];fs.mkdirSync(out,{recursive:true});
function checkpoint(value){report.push(value);console.log(JSON.stringify(value));}
function counts(g){return {full:g.full,majority:g.majority,half:g.half,boundary:g.boundary};}
function rawTrial(sample='copper',zero=2,step=1){const g=M.grid(sample,step);return {sample,zero,step,counts:counts(g),readings:M.samples[sample].positions.map((_,position)=>Object.assign({position},M.reading(M.contact(sample,position),zero)))};}
async function context(browser,width,options={}){
  const c=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',acceptDownloads:true});
  c.setDefaultTimeout(15000);c.setDefaultNavigationTimeout(90000);
  await c.route('**/*',r=>{
    if(r.request().url().startsWith('file:'))return r.continue();
    if(!live&&r.request().resourceType()==='document'&&r.request().url().startsWith(base))return r.fulfill({status:200,contentType:'text/html',body:html});
    return r.request().url().startsWith(base)?r.continue():r.abort();
  });
  await c.addInitScript(({options,key,notes,profile,injected})=>{
    if(window.top!==window||!['http:','https:','file:'].includes(location.protocol))return;
    if(!sessionStorage.getItem('qa-lamina-seeded')){
      Object.entries(notes).forEach(([k,v])=>localStorage.setItem(k,v));
      if(!options.fresh)localStorage.setItem('peq_cbse_study_v1',JSON.stringify(profile));
      if(options.corrupt)localStorage.setItem(key,'{malformed');
      if(options.injected)localStorage.setItem(key,JSON.stringify(injected));
      sessionStorage.setItem('qa-lamina-seeded','yes');
    }
    window.__cameraCalls=0;window.__laminaInjected=false;
    if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__cameraCalls++;return Promise.reject(Error('No camera action is allowed in this test'));};
    if(options.blocked){const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Storage denied for QA');return set.call(this,k,v);};}
  },{options,key,notes,profile,injected:{v:1,trials:[Object.assign(rawTrial(),{label:'<img src=x onerror="window.__laminaInjected=true">',volumeCm3:999999}),{sample:'<img src=x onerror="window.__laminaInjected=true">'}]}});
  c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return c;
}
async function open(p,route='practical:lamina'){await p.goto(base+'?still#'+route,{waitUntil:'load'});if(route==='practical:lamina')await p.locator('.lam-workspace').waitFor();}
async function fit(p){
  const b=await p.locator('.lam-workspace').evaluate(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,viewport:innerWidth,client:e.clientWidth,scroll:e.scrollWidth}));
  assert.ok(b.left>=-1&&b.right<=b.viewport+1&&b.scroll<=b.client+1,JSON.stringify(b));
}
async function scan(p){
  if(!await p.evaluate(()=>typeof axe==='object'))await p.addScriptTag({path:axePath});
  const violations=await p.evaluate(async()=>(await axe.run('.lam-workspace',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
  assert.deepEqual(violations,[],'Lamina scoped accessibility');
}
async function preserved(p,expectProfile=true){
  assert.deepEqual(await p.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),Object.keys(notes)),notes);
  if(expectProfile)assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('peq_cbse_study_v1'))),profile);
  assert.equal(await p.evaluate(()=>window.__cameraCalls),0);assert.equal(await p.evaluate(()=>window.__laminaInjected),false);
}
async function book(p){return await p.evaluate(k=>JSON.parse(localStorage.getItem(k)||'{"v":1,"trials":[]}'),key);}
async function trialCount(p){return await p.locator('#lam-notebook tbody tr').count();}
async function feedback(p,id,re){assert.match(await p.locator('#lam-'+id+'-feedback').innerText(),re);}
async function submit(p,id){await p.locator('#lam-'+id+' button[type=submit]').click();}
async function calibration(p,zero=2,wrong=false){
  await p.locator('#lam-zero').selectOption(String(zero));await p.locator('[data-lam-mode="zero"]').click();
  await p.locator('#lam-lc').fill('.01');await p.locator('#lam-error').fill((zero*.01).toFixed(2));
  if(wrong){await submit(p,'calibration');await feedback(p,'calibration',/contact|close/i);}
  await p.locator('#lam-contact').click();assert.equal(await p.locator('#lam-travel').inputValue(),'0');
  const r=M.reading(0,zero);await scale(p,r);
  if(wrong){await p.locator('#lam-lc').fill('.5');await submit(p,'calibration');await feedback(p,'calibration',/pitch|50|least count/i);await p.locator('#lam-lc').fill('.01');await p.locator('#lam-error').fill((zero*.01+.01).toFixed(2));await submit(p,'calibration');await feedback(p,'calibration',/zero|signed/i);await p.locator('#lam-error').fill((zero*.01).toFixed(2));}
  await submit(p,'calibration');await feedback(p,'calibration',/correct|checked|calibrat/i);
}
async function scale(p,r){
  const svg=p.locator('#lam-gauge svg'),label=await svg.getAttribute('aria-label');
  assert.ok(label.includes('main '+r.mainMm+' millimetres and circular division '+r.division+'.'),label);
  assert.equal(await svg.locator('text').nth(1).textContent(),'Main: '+r.mainMm.toFixed(2)+' mm');
  assert.equal(Number(await svg.locator('text[y="180"]').textContent()),r.division);
  assert.ok(Math.abs(Number(await svg.locator('rect').nth(1).getAttribute('x'))-(140+r.opening*.35))<1e-10,'Screw gap geometry matches raw opening');
}
async function measure(p,sample,zero,position,wrong=false){
  await p.locator('#lam-position').selectOption(String(position));await p.locator('[data-lam-mode="sample"]').click();
  const r=M.reading(M.contact(sample,position),zero);
  await p.locator('#lam-main').fill(String(r.mainMm));await p.locator('#lam-division').fill(String(r.division));await p.locator('#lam-corrected').fill(r.correctedMm.toFixed(2));
  if(wrong){await submit(p,'reading');await feedback(p,'reading',/contact/i);}
  await p.locator('#lam-contact').click();assert.equal(await p.locator('#lam-travel').inputValue(),String(r.opening));await scale(p,r);
  if(wrong){await p.locator('#lam-division').fill(String((r.division+1)%50));await submit(p,'reading');await feedback(p,'reading',/scale|division|reading|not saved/i);await p.locator('#lam-division').fill(String(r.division));await p.locator('#lam-corrected').fill((r.correctedMm+1).toFixed(2));await submit(p,'reading');await feedback(p,'reading',/correct|zero|subtract/i);await p.locator('#lam-corrected').fill(r.correctedMm.toFixed(2));}
  await submit(p,'reading');await feedback(p,'reading',/checked|recorded/i);return Object.assign({position},r);
}
async function area(p,sample,step,wrong=false){
  await p.locator('#lam-step').selectOption(String(step));const g=M.grid(sample,step);
  for(const field of ['full','majority','half','boundary'])await p.locator('#lam-'+field).fill(String(g[field]));
  await p.locator('#lam-area').fill(g.estimateCm2.toFixed(3));
  if(wrong){await p.locator('#lam-full').fill(String(g.full+1));await submit(p,'count');await feedback(p,'count',/count|grid|square/i);await p.locator('#lam-full').fill(String(g.full));await p.locator('#lam-area').fill((g.estimateCm2/10).toFixed(3));await submit(p,'count');await feedback(p,'count',/area|cm|unit|step/i);await p.locator('#lam-area').fill(g.estimateCm2.toFixed(3));}
  await submit(p,'count');await feedback(p,'count',/checked|correct|accepted/i);
  const choices=await p.locator('#lam-cell option').count();assert.equal(choices,g.cells.length);
  assert.equal(await p.locator('#lam-grid polygon').getAttribute('points'),M.samples[sample].polygon.map(v=>v.join(',')).join(' '));
  const graphLabel=await p.locator('#lam-grid text').last().evaluate(e=>({text:e.textContent,length:e.getComputedTextLength()}));
  assert.equal(graphLabel.text,'6 cm');assert.ok(graphLabel.length>.2,'Inherited page letter spacing must not collapse SVG graph units');
  const marks=await p.locator('#lam-grid circle').evaluateAll(elements=>elements.map(e=>[Number(e.getAttribute('cx')),Number(e.getAttribute('cy'))]));
  assert.deepEqual(marks,M.samples[sample].positions.map(v=>[v.x,v.y]));
  assert.equal(await p.locator('#lam-grid g path').count(),Math.round(6/step)+Math.round(5/step)+2);
  const details=p.locator('details').filter({has:p.locator('#lam-cell')});if(!await details.evaluate(e=>e.open))await details.locator('summary').click();
  for(const kind of ['full','boundary','empty']){
    const index=g.cells.findIndex(cell=>cell.kind===kind);if(index<0)continue;
    await p.locator('#lam-cell').selectOption(String(index));
    const cell=g.cells[index],detail=await p.locator('#lam-closeup').innerText(),expected={full:/Full square/,empty:/Outside/,majority:/More than half/,half:/Exactly half/,minority:/Less than half/};assert.match(detail,expected[cell.part||cell.kind]);
    assert.equal(await p.locator('#lam-closeup svg').getAttribute('viewBox'),[cell.x,cell.y,cell.size,cell.size].join(' '));
    assert.equal(await p.locator('#lam-closeup polygon').getAttribute('points'),M.samples[sample].polygon.map(v=>v.join(',')).join(' '));
  }
  return g;
}
async function trial(p,sample='copper',zero=2,step=1,wrong=false){
  await p.locator('#lam-sample').selectOption(sample);await calibration(p,zero,wrong);
  assert.equal(await p.locator('#lam-readings .lam-reading').count(),0,'New specimen or zero scenario clears in-flight readings, not saved trials');
  const savedBefore=await trialCount(p),g=await area(p,sample,step,wrong),readings=[];
  for(let position=0;position<5;position++){
    readings.push(await measure(p,sample,zero,position,wrong&&position===0));
    if(wrong&&position===0){await submit(p,'reading');assert.equal(await p.locator('#lam-readings .lam-reading').count(),1,'Repeated edge is not a new position');}
    if(wrong&&position===3){await p.locator('#lam-volume').fill('1');await submit(p,'result');await feedback(p,'result',/five distinct/i);assert.equal(await trialCount(p),savedBefore);}
  }
  assert.equal(await p.locator('#lam-readings .lam-reading').count(),5);
  for(const r of readings)assert.equal(await p.locator('#lam-readings .lam-reading').nth(r.position).textContent(),'Position '+(r.position+1)+': '+r.correctedMm.toFixed(2)+' mm');
  const raw={sample,zero,step,counts:counts(g),readings},t=M.buildTrial(raw);assert.ok(t);
  await p.locator('#lam-volume').fill(t.volumeCm3.toFixed(4));
  if(wrong){await p.locator('#lam-volume').fill((t.volumeCm3*10).toFixed(4));await submit(p,'result');await feedback(p,'result',/cm|10|unit|volume/i);await p.locator('#lam-volume').fill(t.volumeCm3.toFixed(4));}
  await submit(p,'result');await feedback(p,'result',/checked|saved/i);return t;
}
async function complete(p){for(const answer of ['11','foundations','20','measurements']){await p.locator('#cbse-questionnaire input[value="'+answer+'"]').check();await p.locator('#cbse-questionnaire button[type=submit]').click();}}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const width of [320,390,768,1440]){
      const c=await context(browser,width),p=await c.newPage();await open(p);
      assert.equal(await p.locator('#cbse-questionnaire[open],#lnd').count(),0);assert.equal(await p.locator('.lam-workspace>header h1').evaluate(e=>e===document.activeElement),true);
      await fit(p);await scan(p);
      await p.locator('#lam-travel').focus();const start=Number(await p.locator('#lam-travel').inputValue());await p.keyboard.press('ArrowRight');assert.equal(Number(await p.locator('#lam-travel').inputValue()),start+1);
      await p.keyboard.press('Tab');assert.ok(await p.evaluate(()=>!!document.activeElement.closest('.lam-workspace')));assert.equal(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
      await trial(p,'copper',2,1,true);assert.equal(await trialCount(p),1);
      await trial(p,'card',-3,.5);assert.equal(await trialCount(p),2);
      await fit(p);await scan(p);await preserved(p);await p.evaluate(()=>document.getElementById('main-scroll').scrollTop=0);
      await p.screenshot({path:path.join(out,'dark-'+width+'.png')});
      await p.reload({waitUntil:'load'});assert.equal(await trialCount(p),2);await preserved(p);
      checkpoint({width,signedZero:[2,-3],samples:2,placements:10,grids:[1,.5],calibrationGate:true,contactGate:true,scaleGate:true,correctionGate:true,countAndUnitGates:true,fiveDistinctEdgeGate:true,pendingDuplicateDoesNotIncreaseCoverage:true,renderedGeometryAndScales:true,keyboard:true,reducedMotion:true,persistence:true,scopedAxe:true});await c.close();
    }
    const c=await context(browser,1440),p=await c.newPage();await open(p);
    for(const sample of Object.keys(M.samples))for(const step of [1,.5,.1])await trial(p,sample,-3,step);
    assert.equal(await trialCount(p),6);
    await p.locator('#lam-grid').screenshot({path:path.join(out,'millimetre-grid.png')});
    await p.locator('#lam-gauge').screenshot({path:path.join(out,'negative-zero-corrected-gauge.png')});
    await p.locator('#lam-closeup').screenshot({path:path.join(out,'selected-cell-magnifier.png')});
    await trial(p,'card',-3,.1);assert.equal(await trialCount(p),6);
    const all=(await book(p)).trials;
    assert.equal(new Set(all.map(t=>[t.sample,t.zero,t.step].join(':'))).size,6);
    for(const [index,raw]of all.entries()){
      const t=M.buildTrial(raw),g=M.grid(raw.sample,raw.step);assert.ok(t);assert.equal(raw.readings.length,5);assert.ok(Math.abs(t.meanMm-raw.readings.reduce((sum,r)=>sum+r.opening*.01,0)/5)<1e-10);assert.ok(Math.abs(t.volumeCm3-g.estimateCm2*t.meanMm/10)<1e-10);assert.ok(t.volumeLowerCm3<=t.volumeCm3&&t.volumeUpperCm3>=t.volumeCm3);
      assert.deepEqual(await p.locator('#lam-notebook tbody tr').nth(index).locator('td').allTextContents(),[t.areaCm2.toFixed(4),t.meanMm.toFixed(3),t.volumeCm3.toFixed(4),t.volumeLowerCm3.toFixed(4)+' – '+t.volumeUpperCm3.toFixed(4)],'Rendered results agree with independently recomputed raw readings');
    }
    const downloadEvent=p.waitForEvent('download');await p.locator('#lam-export').click();const download=await downloadEvent,csvPath=path.join(out,(live?'live-':'')+'trials.csv');await download.saveAs(csvPath);
    assert.equal(fs.readFileSync(csvPath,'utf8'),M.csv(all));assert.equal(fs.readFileSync(csvPath,'utf8').split(/\r?\n/).length,31);
    await p.locator('#lam-notebook').screenshot({path:path.join(out,'notebook.png')});await preserved(p);await p.reload({waitUntil:'load'});assert.equal(await trialCount(p),6);
    p.once('dialog',d=>d.dismiss());await p.locator('#lam-clear').click();assert.equal(await trialCount(p),6);
    p.once('dialog',d=>d.accept());await p.locator('#lam-clear').click();assert.equal(await trialCount(p),0);await preserved(p);
    checkpoint({bothSamples:true,allGridSteps:[1,.5,.1],placements:30,duplicateDoesNotInflateCoverage:true,csvRawRows:30,csvExact:true,scopedClearWithCancel:true,areaVolumeBounds:true});
    for(const route of ['practicals:11','practical-guide:p11-a-e03','lab','cbse:11']){
      if(route==='lab'){await p.locator('[data-go="lab"]:visible').first().click();await p.locator('[data-lm="labs"]').click();}else await open(p,route);
      await p.locator('[data-lam-entry]').waitFor();await p.locator('[data-lam-entry]').first().click();await p.locator('.lam-workspace').waitFor();assert.match(p.url(),/#practical:lamina$/);
    }
    await p.locator('#pe-explore').click();await p.locator('[data-explore-go="settings"]').click();await p.locator('[data-th="light"]').click();await open(p);
    assert.equal(await p.locator('.lam-top span').evaluate(e=>getComputedStyle(e).color),'rgb(35, 70, 89)','Light-theme caption remains dark over the background image');
    await fit(p);await scan(p);await p.screenshot({path:path.join(out,'light-desktop.png')});await p.setViewportSize({width:320,height:700});await fit(p);await scan(p);await p.screenshot({path:path.join(out,'light-mobile.png')});
    checkpoint({catalogueEntry:true,guideEntry:true,labEntry:true,class11Entry:true,lightDesktopAndMobileAxe:true});await c.close();
    for(const scenario of ['blocked','corrupt','injected']){
      const sc=await context(browser,390,{[scenario]:true}),sp=await sc.newPage();await open(sp);assert.equal(await trialCount(sp),scenario==='injected'?1:0);
      assert.equal(await sp.locator('.lam-workspace img[onerror]').count(),0);await trial(sp,'card',0,.5);assert.equal(await trialCount(sp),scenario==='injected'?2:1);
      if(scenario==='blocked')assert.match(await sp.locator('#lam-storage').innerText(),/session/i);
      await preserved(sp);checkpoint({scenario,sessionInteraction:true,storedMarkupInert:true});await sc.close();
    }
    for(const mode of ['skip','complete']){
      const fc=await context(browser,390,{fresh:true}),fp=await fc.newPage();await open(fp);await fp.locator('#cbse-questionnaire[open]').waitFor();assert.equal(await fp.locator('#lnd').count(),0);
      if(mode==='skip')await fp.locator('#cbse-questionnaire [data-cbse-dismiss]').first().click();else await complete(fp);
      assert.equal(await fp.locator('#cbse-questionnaire[open],#lnd').count(),0);assert.match(fp.url(),/#practical:lamina$/);await fp.locator('.lam-workspace').waitFor();await trial(fp);await preserved(fp,mode==='complete');
      checkpoint({freshQuestionnaire:mode,deepLinkPreserved:true,usable:true});await fc.close();
    }
    if(!live){
      const oc=await context(browser,390),op=await oc.newPage();await oc.setOffline(true);await op.goto(pathToFileURL(path.join(root,'index.html')).href+'?still#practical:lamina',{waitUntil:'load'});await op.locator('.lam-workspace').waitFor();
      await trial(op,'card',-3,.1);await fit(op);assert.equal(await trialCount(op),1);await preserved(op);checkpoint({singleFileOffline:true,networkDisconnected:true});await oc.close();
    }
    assert.deepEqual(errors,[],'No browser runtime errors');checkpoint({runtimeErrors:errors,cameraRequests:0});fs.writeFileSync(path.join(out,(live?'live':'staged')+'-report.json'),JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(e=>{fs.writeFileSync(path.join(out,(live?'live':'staged')+'-failure.json'),JSON.stringify({message:e.message,stack:e.stack,completed:report,errors},null,2));console.error(e);process.exitCode=1;});
