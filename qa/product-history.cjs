/* Real browser history regression; legacy renderers and scientific models remain intact. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function checkHistory(browser,base,out){
 const report={scope:'Chromium desktop/tablet/mobile history; not WKWebView or physical-device evidence',cases:[]};
 const notebookKey='entelloq.science.notebook.physics.v1';
 async function pulseStep(page){
  const before=Number(await page.locator('#pulse-scrub').inputValue());
  await page.locator('#pulse-step').click();
  assert.ok(Number(await page.locator('#pulse-scrub').inputValue())>before,'pulse stepping still works after history traversal');
  // A stale legacy cleanup can leave DOM handlers but remove lifecycle listeners.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>!document.querySelector('#pulse-play').disabled);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('#pulse-play').disabled);
 }
 async function notebookSnapshot(page){return page.evaluate(key=>({scientific:localStorage.getItem(key),notes:localStorage.getItem('peq_notes')}),notebookKey);}
 const resources=[['bench:lever','.lever-workspace'],['bench:vernier-calipers','.measurement-workspace'],['bench:pulse','.pulse-workspace'],['scientific:reality','.sci-workspace'],['learning:graphs','.lt-workspace']];
 for(const width of [1440,768,390]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route(/^https?:\/\/(?!127\.0\.0\.1(?::|\/))/,r=>r.abort());
  try{for(const [resource,selector] of resources){for(const emptyHome of [false,true]){
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/?excellence=1#science:view:home');await page.locator('.science-explore').waitFor();
   assert.equal(await page.evaluate(()=>{if(!PhysicsExcellence.notebook.list().some(e=>e.id==='history-sentinel')){const saved=PhysicsExcellence.notebook.save({id:'history-sentinel',subject:'physics',title:'History preservation sentinel',experimentId:'physics:sim:refraction',observations:'Keep this saved scientific observation unchanged during navigation.',config:{},model:{classification:'analytical'}});if(!saved.ok)return false;}localStorage.setItem('peq_notes','Retain this existing study note across history navigation.');return true;}),true);
   const notebookBefore=await notebookSnapshot(page);
   await page.evaluate(empty=>{history.replaceState({originSentinel:'preserved'},'',empty?location.pathname+location.search:location.href);window.__historyMethods=[history.pushState,history.replaceState];window.__historyRenders=0;new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&(n.matches('.lever-workspace')||n.querySelector('.lever-workspace')))window.__historyRenders++;}).observe(document.body,{childList:true,subtree:true});},emptyHome);
   const home=page.url(),start=await page.evaluate(()=>history.length);
   await page.evaluate(id=>PhysicsExcellence.openById('physics:'+id),resource);await page.locator(selector).waitFor();
   assert.equal(new URL(page.url()).hash,'#science:'+resource);
   assert.equal(await page.evaluate(()=>history.length),start+1,'one entry per explicit open: '+resource+' emptyHome='+emptyHome);
   await page.evaluate(()=>PhysicsExcellence.openById('physics:sim:refraction'));await page.locator('#lab-full.on').waitFor();
   const expected=start+2;assert.equal(await page.evaluate(()=>history.length),expected);
   await page.goBack();await page.locator(selector).waitFor();await page.waitForTimeout(80);
   assert.equal(new URL(page.url()).hash,'#science:'+resource);assert.equal(await page.locator('#lab-full.on').count(),0);
   assert.equal(await page.evaluate(()=>history.length),expected,'Back cannot add an entry');
   if(resource==='bench:pulse')await pulseStep(page);
   if(resource==='bench:lever')assert.equal(await page.evaluate(()=>window.__historyRenders),2,'initial open plus exactly one Back render');
   await page.goBack();await page.locator('.science-explore').waitFor();assert.equal(page.url(),home);
   assert.deepEqual(await page.evaluate(()=>history.state),{originSentinel:'preserved'});
   await page.goForward();await page.locator(selector).waitFor();await page.waitForTimeout(80);
   assert.equal(new URL(page.url()).hash,'#science:'+resource);assert.equal(await page.evaluate(()=>history.length),expected);
   if(resource==='bench:pulse')await pulseStep(page);
   if(resource==='bench:lever'){assert.equal(await page.evaluate(()=>window.__historyRenders),3);if(!emptyHome)await page.screenshot({path:path.join(out,'history-lever-'+width+'.png')});}
   await page.goForward();await page.locator('#lab-full.on').waitFor();assert.equal(new URL(page.url()).hash,'#science:sim:refraction');
   assert.equal(await page.evaluate(()=>history.length),expected);assert.equal(await page.evaluate(()=>history.pushState===__historyMethods[0]&&history.replaceState===__historyMethods[1]),true,'native history functions restored');
   assert.deepEqual(await notebookSnapshot(page),notebookBefore,'history cannot rewrite saved scientific observations or existing notes');
   assert.deepEqual(errors,[]);report.cases.push({width,resource,emptyHome,backForwardPassed:true,entriesAdded:2,notebookPreserved:true,...(resource==='bench:pulse'?{pulseStepAfterBackAndForward:true}:{})});await page.close();
  }}
  const labsPage=await context.newPage(),labsErrors=[];labsPage.on('pageerror',e=>labsErrors.push(e.message));
  await labsPage.goto(base+'/?excellence=1#science:view:home');await labsPage.locator('.science-explore').waitFor();
  await labsPage.locator('.side [data-go="lab"]:visible,.mtab [data-go="lab"]:visible').first().click();await labsPage.locator('.science-lab-entry').waitFor();
  assert.equal(new URL(labsPage.url()).hash,'');await labsPage.evaluate(()=>history.replaceState({labsSentinel:'preserved'},'',location.href));
  const labsURL=labsPage.url(),labsStart=await labsPage.evaluate(()=>history.length),labsNotebook=await notebookSnapshot(labsPage);
  await labsPage.locator('.science-lab-entry [data-find]').fill('lever');await labsPage.locator('.science-lab-entry [data-science-id="physics:bench:lever"]').click();await labsPage.locator('.lever-workspace').waitFor();
  assert.equal(new URL(labsPage.url()).hash,'#science:bench:lever');assert.equal(await labsPage.evaluate(()=>history.length),labsStart+1);
  await labsPage.goBack();await labsPage.locator('.science-lab-entry').waitFor();assert.equal(labsPage.url(),labsURL);assert.deepEqual(await labsPage.evaluate(()=>history.state),{labsSentinel:'preserved'});assert.equal(await labsPage.evaluate(()=>history.length),labsStart+1);
  await labsPage.goForward();await labsPage.locator('.lever-workspace').waitFor();assert.equal(new URL(labsPage.url()).hash,'#science:bench:lever');assert.equal(await labsPage.evaluate(()=>history.length),labsStart+1);
  assert.deepEqual(await notebookSnapshot(labsPage),labsNotebook);assert.deepEqual(labsErrors,[]);report.cases.push({width,resource:'labs-to-lever',blankLabsRestored:true,backForwardPassed:true,notebookPreserved:true});await labsPage.close();
  const savedPage=await context.newPage(),savedErrors=[];savedPage.on('pageerror',e=>savedErrors.push(e.message));
  await savedPage.goto(base+'/?excellence=1#science:view:home');await savedPage.locator('.science-explore').waitFor();
  await savedPage.evaluate(()=>PhysicsExcellence.openById('physics:sim:refraction'));await savedPage.locator('#lab-full.on').waitFor();
  const savedResult=await savedPage.evaluate(width=>{const control=document.querySelector('#lf-ctl input[type=range]');control.value=control.max;control.dispatchEvent(new Event('input',{bubbles:true}));control.dispatchEvent(new Event('change',{bubbles:true}));const result=PhysicsExcellence.notebook.save({id:'history-resume-'+width,subject:'physics',title:'Resume refraction after Back',experimentId:'physics:sim:refraction',observations:'A saved control configuration used by the browser history regression.',config:PhysicsExcellence.capture(),model:PhysicsExcellence.modelFor('refraction')});return{ok:result.ok,id:result.entry?.id,value:control.value};},width);
  assert.equal(savedResult.ok,true);const savedNotebook=await notebookSnapshot(savedPage);
  await savedPage.evaluate(()=>PhysicsExcellence.openById('physics:view:home'));await savedPage.locator('.science-explore').waitFor();
  const savedStart=await savedPage.evaluate(()=>history.length),savedHash='#science:saved:'+savedResult.id;
  await savedPage.evaluate(hash=>{location.hash=hash;},savedHash);await savedPage.locator('#lab-full.on').waitFor();
  assert.equal(new URL(savedPage.url()).hash,savedHash);assert.equal(await savedPage.evaluate(()=>history.length),savedStart+1,'saved-route replay cannot push its underlying experiment route');
  assert.equal(await savedPage.locator('#lf-ctl input[type=range]').first().inputValue(),savedResult.value);
  await savedPage.evaluate(()=>PhysicsExcellence.openById('physics:bench:lever'));await savedPage.locator('.lever-workspace').waitFor();
  const savedSize=savedStart+2;assert.equal(await savedPage.evaluate(()=>history.length),savedSize);
  await savedPage.goBack();await savedPage.locator('#lab-full.on').waitFor();assert.equal(new URL(savedPage.url()).hash,savedHash);
  assert.equal(await savedPage.locator('#lf-ctl input[type=range]').first().inputValue(),savedResult.value);assert.equal(await savedPage.evaluate(()=>history.length),savedSize);
  await savedPage.goBack();await savedPage.locator('.science-explore').waitFor();assert.equal(new URL(savedPage.url()).hash,'#science:view:home');
  await savedPage.goForward();await savedPage.locator('#lab-full.on').waitFor();assert.equal(new URL(savedPage.url()).hash,savedHash);assert.equal(await savedPage.locator('#lf-ctl input[type=range]').first().inputValue(),savedResult.value);
  await savedPage.goForward();await savedPage.locator('.lever-workspace').waitFor();assert.equal(await savedPage.evaluate(()=>history.length),savedSize);
  assert.deepEqual(await notebookSnapshot(savedPage),savedNotebook);assert.deepEqual(savedErrors,[]);report.cases.push({width,resource:'saved:refraction',backForwardPassed:true,savedControlsRestored:true,notebookPreserved:true});await savedPage.close();
  const failurePage=await context.newPage();await failurePage.goto(base+'/?excellence=1#science:view:home');await failurePage.locator('.science-explore').waitFor();const failureNotebook=await notebookSnapshot(failurePage);
  const failure=await failurePage.evaluate(()=>{const create=document.createElement,push=history.pushState,replace=history.replaceState;let error='';try{document.createElement=function(tag,...args){if(String(tag).toLowerCase()==='iframe')throw Error('history-test-delegate-failure');return create.call(this,tag,...args);};try{PhysicsExcellence.openById('physics:scientific:reality');}catch(e){error=e.message;}}finally{document.createElement=create;}return{error,pushRestored:history.pushState===push,replaceRestored:history.replaceState===replace,documentMethodRestored:document.createElement===create};});
  assert.deepEqual(failure,{error:'history-test-delegate-failure',pushRestored:true,replaceRestored:true,documentMethodRestored:true});
  await failurePage.evaluate(()=>PhysicsExcellence.openById('physics:bench:lever'));await failurePage.locator('.lever-workspace').waitFor();assert.equal(new URL(failurePage.url()).hash,'#science:bench:lever');assert.deepEqual(await notebookSnapshot(failurePage),failureNotebook);
  report.cases.push({width,resource:'forced-render-error',historyMethodsRestored:true,nextOpenRecovered:true,notebookPreserved:true});await failurePage.close();
  for(const excellence of [0,1]){const p=await context.newPage();await p.goto(base+'/?excellence='+excellence+'#practical:lever');if(excellence===0){const gate=p.locator('#cbse-questionnaire[open]');if(await gate.count())await gate.evaluate(d=>d.close());}await p.locator('.lever-workspace').waitFor();assert.equal(new URL(p.url()).hash,'#practical:lever');await p.close();}
  const cold=await context.newPage();await cold.goto(base+'/?excellence=1#science:bench:lever');await cold.locator('.lever-workspace').waitFor();const size=await cold.evaluate(()=>history.length);await cold.reload();await cold.locator('.lever-workspace').waitFor();assert.equal(await cold.evaluate(()=>history.length),size,'cold/reload adds no history');assert.equal(new URL(cold.url()).hash,'#science:bench:lever');await cold.close();
  }finally{await context.close();}
 }
 fs.writeFileSync(path.join(out,'history-report.json'),JSON.stringify(report,null,2));return report;
}
module.exports=checkHistory;
if(require.main===module){const http=require('node:http'),{chromium}=require(path.join(process.env.CODEX_NODE_MODULES||'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright')),root=path.resolve(__dirname,'..'),out=process.env.PRODUCT_OUTPUT||path.join(root,'docs/product-excellence/history-20261120');fs.mkdirSync(out,{recursive:true});const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).on('error',()=>res.writeHead(404).end()).pipe(res);});(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});try{console.log(JSON.stringify(await checkHistory(browser,'http://127.0.0.1:'+server.address().port,out),null,2));}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});}
