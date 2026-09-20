/* Visual-first restoration: real navigation, both themes, no identity or AI submission. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),out=path.join(__dirname,'results'),live=process.argv.includes('--live');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch(),report=[];try{for(const width of [1440,850,390,320]){const c=await b.newContext({viewport:{width,height:960},reducedMotion:'reduce'});
 if(!live)await c.route('https://physics.entelloq.com/**',r=>r.request().resourceType()==='document'?r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8')}):r.continue());
 await c.addInitScript(()=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');});const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('https://physics.entelloq.com/?still&visualLearn='+Date.now(),{waitUntil:'load'});await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 for(const theme of ['dark','light']){if(theme==='light'){await p.locator('#pe-explore').click();await p.locator('[data-explore-go="settings"]').click();await p.locator('[data-th="light"]').click();}
  await p.locator((width<=850?'.mtab':'.side')+' [data-go="learn"]').click();await p.locator('#main [data-link="domain:mechanics"]').click();await p.locator('#main [data-link="lesson:newton-laws"]').click();
  assert.equal(await p.locator('.learn-flow,.learn-extra').count(),0);assert.equal(await p.locator('.lens-tab').count(),6);assert.ok(await p.locator('#mrep-host canvas').count()>0);assert.ok(await p.locator('.l-pts').isVisible());assert.ok(await p.locator('.l-eqs').isVisible());assert.ok(await p.locator('#ways-host').isVisible());
  for(const k of 'ABCDEF'){const tab=p.locator('.lens-tab[data-k="'+k+'"]');await tab.focus();await tab.press('Enter');assert.equal(await p.locator('#lens-panel').getAttribute('data-k'),k);assert.ok(await tab.evaluate(e=>e.classList.contains('on')));}
  await p.locator('.lens-tab[data-k="A"]').click();await p.locator('#main-scroll').evaluate(e=>e.scrollTop=0);
  const result=await p.evaluate(async()=>({violations:(await axe.run('#main',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),overflow:document.querySelector('#main-scroll').scrollWidth>document.querySelector('#main-scroll').clientWidth+1}));report.push({width,theme,...result});assert.deepEqual(result.violations,[]);assert.equal(result.overflow,false);await p.screenshot({path:path.join(out,'visual-learn-'+(live?'live':'staged')+'-'+width+'-'+theme+'.png')});
  for(const [domain,id] of [['mechanics','projectile'],['optics','lenses']]){
   await p.locator((width<=850?'.mtab':'.side')+' [data-go="learn"]').click();await p.locator('#main [data-link="domain:'+domain+'"]').click();await p.locator('#main [data-link="lesson:'+id+'"]').click();
   assert.equal(await p.locator('#main-scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,id+' equations stay within '+width+'px in '+theme);
   assert.ok(await p.locator('.l-eqs .eq .d').first().isVisible());
  }
 }assert.deepEqual(errors,[]);console.log(width,'visual Learn passed in both themes');await c.close();}
}finally{fs.writeFileSync(path.join(out,'visual-learn-'+(live?'live':'staged')+'.json'),JSON.stringify(report,null,2));await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
