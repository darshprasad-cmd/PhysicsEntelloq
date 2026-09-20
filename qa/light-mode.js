/* Exercise real theme controls and lazily opened learning surfaces, not just page shells. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),out=path.join(__dirname,'results'),live=process.argv.includes('--live');fs.mkdirSync(out,{recursive:true});
const topics=[['mechanics','newton-laws'],['mechanics','projectile'],['waves','wave-basics'],['thermo','first-law'],['optics','lenses'],['electrostatics','e-field'],['current','ohms-law'],['magnetism','em-induction'],['modern','photoelectric']];
(async()=>{const browser=await chromium.launch(),report=[];try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',colorScheme:'light'});
  if(!live)await context.route('https://physics.entelloq.com/**',r=>r.request().resourceType()==='document'?r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8')}):r.continue());
  await context.addInitScript(()=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');if(!localStorage.getItem('peq_theme'))localStorage.setItem('peq_theme','light');});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('https://physics.entelloq.com/?still&lightQA='+Date.now(),{waitUntil:'load'});assert.equal(await p.locator('html').getAttribute('data-theme'),'light');
  await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  async function scan(name,selector='#main'){const result=await p.evaluate(async selector=>{const el=document.querySelector(selector);return{violations:(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),overflow:document.querySelector('#main-scroll').scrollWidth>document.querySelector('#main-scroll').clientWidth+1};},selector);report.push({width,name,...result});console.log(width,name,JSON.stringify(result));}
  async function nav(name){await p.locator('#pe-explore').click();const target=p.locator('[data-explore-go="'+name+'"]');if(await target.count())await target.click();else{await p.keyboard.press('Escape');await p.locator((width<=850?'.mtab':'.side')+' [data-go="'+name+'"]').first().click();}}
  for(const [domain,id] of topics){await nav('learn');await p.locator('#main [data-link="domain:'+domain+'"]').click();await p.locator('#main [data-link="lesson:'+id+'"]').click();
    await p.locator('[data-lf="check"]').click();await p.locator('[data-answer="0"]').click();await scan(id+'-feedback');
    const extras=p.locator('.learn-extra');for(let i=0;i<await extras.count();i++){
      const d=extras.nth(i);await d.locator('summary').click();await p.waitForTimeout(90);
      if(await d.locator('#lens-host').count())for(const k of 'ABCDEF'){await d.locator('.lens-tab[data-k="'+k+'"]').click();await scan(id+'-lens-'+k);if(id==='newton-laws'&&k==='C')await p.screenshot({path:path.join(out,'light-lens-'+width+'.png')});}
      else await scan(id+'-extra-'+i);
      await d.locator('summary').click();
    }
  }
  for(const name of ['home','universe','learn','solve','practice','lab','research','progress','settings','sandbox','journeys','deeps']){await nav(name);await scan(name);if(name==='sandbox')await p.screenshot({path:path.join(out,'light-sandbox-'+width+'.png')});}
  await p.locator('#tutor-fab').click();await scan('tutor','#tutor');await p.locator('#tu-close').click();
  await nav('lab');await p.locator('.xg-open:visible').first().click();await scan('instrument','#lab-full');await p.screenshot({path:path.join(out,'light-instrument-'+width+'.png')});await p.keyboard.press('Escape');
  await nav('home');await p.screenshot({path:path.join(out,'light-background-'+width+'.png')});
  await p.keyboard.press('Control+k');await scan('search','#cmdk');await p.keyboard.press('Escape');
  await p.locator('#pe-explore').click();await scan('explore','#pe-explore-sheet');await p.keyboard.press('Escape');
  await nav('settings');await p.locator('[data-th="system"]').click();await p.emulateMedia({colorScheme:'dark'});await p.waitForTimeout(100);assert.equal(await p.locator('html').getAttribute('data-theme'),'dark');await p.emulateMedia({colorScheme:'light'});await p.waitForTimeout(100);assert.equal(await p.locator('html').getAttribute('data-theme'),'light');
  await p.locator('[data-th="light"]').click();await p.reload({waitUntil:'load'});assert.equal(await p.locator('html').getAttribute('data-theme'),'light');assert.equal(await p.evaluate(()=>localStorage.getItem('peq_theme')),'light');
  assert.deepEqual(errors,[]);await context.close();
}}finally{fs.writeFileSync(path.join(out,'light-mode-'+(live?'live':'staged')+'.json'),JSON.stringify(report,null,2));await browser.close();}assert.equal(report.filter(r=>r.violations.length||r.overflow).length,0,'Light mode accessibility and overflow');
})().catch(e=>{console.error(e);process.exitCode=1;});
