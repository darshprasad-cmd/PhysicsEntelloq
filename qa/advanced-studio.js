/* Exercise staged HTML at its real HTTPS origin, or the published app with --live.
   Isolated profiles; no real identity, camera access or AI requests. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const live=process.argv.includes('--live'),mode=live?'studio-live':'studio-staged',out=path.join(__dirname,'results');
fs.mkdirSync(out,{recursive:true});
const ids=['lagrangian','lorentz','maxwell-waves','schrodinger-1d','partition-function','chaos'];
(async()=>{const b=await chromium.launch(),report=[];try{for(const[device,width,height]of[['desktop',1440,1000],['tablet',768,1024],['mobile',390,844],['small',320,740]]){
 const c=await b.newContext({viewport:{width,height},reducedMotion:'reduce'});await c.route(/clarity\.ms/,r=>r.abort());
 if(!live)await c.route('https://physics.entelloq.com/**',r=>r.request().resourceType()==='document'?r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')}):r.continue());
 await c.addInitScript(()=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('https://physics.entelloq.com/?studioQA='+Date.now(),{waitUntil:'load'});await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 async function scan(name,selector='#main'){
  const data=await p.evaluate(async sel=>{const root=document.querySelector(sel),a=await axe.run(root,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary}))})),overflow:root.scrollWidth>root.clientWidth+1,wide:[...root.querySelectorAll('*')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&!n.closest('.av-eq,.av-jump')}).slice(0,8).map(n=>({tag:n.tagName,cls:n.className,text:n.textContent.slice(0,60)}))};},selector);
  report.push({device,name,...data});console.log(device,name,JSON.stringify({violations:data.violations,overflow:data.overflow}));
 }
 async function enter(id){await p.locator('[data-studio-open="'+id+'"]').last().click();if(await p.locator('#studio-gate[open]').count())await p.locator('#studio-enter').click();await p.locator('.as-reading').waitFor();}
 await p.locator('.as-promo').click();assert.equal(await p.locator('.as-card').count(),6);assert.equal(await p.locator('#studio-gate').count(),0);await scan('index');await p.screenshot({path:path.join(out,mode+'-'+device+'-index.png')});
 await p.locator('#studio-choose').click();await p.screenshot({path:path.join(out,mode+'-'+device+'-cards.png')});await p.locator('[data-studio-open="lagrangian"]').last().click();await p.locator('#studio-gate[open]').waitFor();await scan('gate','#studio-gate');await p.screenshot({path:path.join(out,mode+'-'+device+'-gate.png')});
 assert.ok(await p.locator('#studio-cancel').evaluate(e=>e===document.activeElement));for(let i=0;i<6;i++){await p.keyboard.press('Tab');assert.ok(await p.locator('#studio-gate').evaluate(e=>e.contains(document.activeElement)));}
 await p.keyboard.press('Escape');assert.equal(await p.locator('#studio-gate').count(),0);assert.ok(await p.locator('[data-studio-open="lagrangian"]').last().evaluate(e=>e===document.activeElement));
 await p.locator('[data-studio-open="lagrangian"]').last().click();await p.locator('#studio-foundations').click();assert.equal(await p.locator('#studio-gate').count(),0);await p.locator('#pe-explore').click();await p.locator('[data-explore-go="adv"]').click();
 for(const theme of['dark','light']){
  if(theme==='light'){await p.locator('#pe-explore').click();await p.locator('[data-explore-go="settings"]').click();await p.locator('[data-th="light"]').click();await p.locator('#pe-explore').click();await p.locator('[data-explore-go="adv"]').click();await scan('index-light');await p.screenshot({path:path.join(out,mode+'-'+device+'-light.png')});}
  for(const id of ids){await enter(id);assert.ok(await p.locator('#adv-der .av-step').count()>0);assert.ok(await p.locator('#adv-sim canvas').count()>0);assert.doesNotMatch(await p.locator('#adv-sim').innerText(),/failed to start|unavailable/);await scan(id+'-'+theme);
   if(id==='lagrangian'){await p.screenshot({path:path.join(out,mode+'-'+device+'-reader-'+theme+'.png')});await p.locator('[data-j="adv-mod"]').click();await p.waitForTimeout(150);await p.screenshot({path:path.join(out,mode+'-'+device+'-model-'+theme+'.png')});const slider=p.locator('#adv-sim input[type="range"]').first();if(await slider.count()){const prior=await slider.inputValue();await slider.focus();await slider.press('ArrowRight');assert.notEqual(await slider.inputValue(),prior);}await p.locator('#adv-xall').click();assert.ok(await p.locator('#adv-der details[open]').count()>0);const way=p.locator('.av-way-h').first(),before=await way.getAttribute('aria-expanded');await way.click();assert.notEqual(await way.getAttribute('aria-expanded'),before);}
   await p.locator('#adv-sim .av-ctl').first().evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));await scan(id+'-controls-'+theme,'#adv-sim');
   if(id==='lagrangian'){await p.locator('#adv-sim').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));await p.screenshot({path:path.join(out,mode+'-'+device+'-plot-'+theme+'.png')});if(width<700){const plot=p.locator('.av-stage').first();await plot.focus();await plot.press('ArrowRight');await p.waitForTimeout(120);assert.ok(await plot.evaluate(e=>e.scrollLeft>0));}}
   await p.locator('.as-reader-bar [data-go="adv"]').click();assert.equal(await p.locator('#adv-sim').count(),0);assert.equal(await p.locator('.as-resume').count(),1);
  }
 }
 assert.deepEqual(errors,[]);report.push({device,name:'runtime',errors});await c.close();
}assert.equal(report.filter(r=>r.overflow||r.violations?.length).length,0,'No accessibility or page overflow findings');}finally{fs.writeFileSync(path.join(out,mode+'.json'),JSON.stringify(report,null,2));await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
