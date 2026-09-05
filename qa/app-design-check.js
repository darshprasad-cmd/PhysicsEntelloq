/* Real HTTPS, isolated guest profiles. No credentials or AI calls are submitted. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.join(__dirname,'results'),phase=process.argv[2]||'design-after';
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true}),report=[];try{for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
 await context.addInitScript(()=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://physics.entelloq.com/?still&design='+phase,{waitUntil:'load',timeout:45000});
 assert.ok(await page.locator('html.pe-refined').count(),'Refined release is live');
 const learnNav=page.locator((device==='mobile'?'.mtab ':'.side ')+'[data-go="learn"]');await learnNav.focus();await learnNav.press('Enter');assert.equal(await page.locator('#main h1').evaluate(e=>e===document.activeElement),true,'Keyboard navigation moves focus to the page heading');assert.equal(await learnNav.getAttribute('aria-current'),'page');
 async function route(name){if(device==='mobile'&&!['home','universe','learn','lab','progress'].includes(name)){await page.locator('#pe-explore').click();await page.locator('[data-explore-go="'+name+'"]').click();}else await page.locator((device==='mobile'?'.mtab ':'.side ')+'[data-go="'+name+'"]').first().click();await page.waitForTimeout(180);}
 async function scan(name,selector='#main'){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const r=await page.evaluate(async({selector})=>{const a=await axe.run(selector,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:a.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),overflow:document.querySelector('#main-scroll').scrollWidth>document.querySelector('#main-scroll').clientWidth+1};},{selector});report.push({device,name,...r});console.log(device,name,JSON.stringify(r));await page.screenshot({path:path.join(out,phase+'-'+device+'-'+name+'.png')});}
 for(const name of ['home','universe','learn','lesson','solve','practice','lab','research','progress','settings']){
  if(name==='lesson'){await page.locator('#main [data-link="domain:mechanics"]').click();await page.locator('#main [data-link="lesson:newton-laws"]').click();}else await route(name);
  await scan(name);
 }
 await route('universe');await page.locator('[data-field="mechanics"]').click();await page.locator('[data-concept="newton-laws"]').click();assert.match(await page.locator('#atlas-concept').innerText(),/Newton/);await scan('concept');
 await page.locator('#atlas-back').click();await page.locator('[data-atlas-filter="review"]').click();assert.ok(await page.locator('.pe-empty').count());await page.locator('#atlas-search').fill('noSuchIdeaZX');assert.ok(await page.locator('.pe-empty').count());
 await page.locator('#pe-explore').click();await scan('explore','#pe-explore-sheet');await page.keyboard.press('Escape');assert.equal(await page.locator('#pe-explore').evaluate(e=>e===document.activeElement),true);
 await route('lab');assert.equal(await page.locator('.xg-card[data-live="0"]:visible').count(),0);assert.equal(await page.locator('.xg-card[data-live="1"]:visible').count(),16);
 await page.locator('.xg-open:visible').first().click();await page.locator('#lab-full.on').waitFor();await scan('instrument','#lab-full');await page.locator('#lf-focus').click();assert.ok(await page.locator('#lab-full.pe-stage-focus').count());await scan('instrument-focus','#lab-full');await page.keyboard.press('Escape');assert.equal(await page.locator('.app').evaluate(e=>e.inert),false);
 await page.locator('#tutor-fab').click();await scan('tutor','#tutor');await page.locator('#tu-close').click();
 await route('settings');await page.locator('[data-th="light"]').click();
 for(const name of ['home','universe','learn','lesson','solve','practice','lab','research','progress','settings']){if(name==='lesson'){await page.locator('#main [data-link="domain:mechanics"]').click();await page.locator('#main [data-link="lesson:newton-laws"]').click();}else await route(name);await scan(name+'-light');}
 assert.deepEqual(errors,[],'No runtime errors');report.push({device,errors});await context.close();
}}finally{fs.writeFileSync(path.join(out,phase+'-checks.json'),JSON.stringify(report,null,2));await browser.close();}
if(report.some(r=>r.overflow||r.violations&&r.violations.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
