/* Isolated guest profiles on HTTPS; no sign-in or AI submission. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const live=process.argv.includes('--live'),root=path.join(__dirname,'..'),out=path.join(__dirname,'results');fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),data={};vm.createContext(data);vm.runInContext(html.slice(html.indexOf('var DB=['),html.indexOf('var DMAP=')),data);vm.runInContext(fs.readFileSync(path.join(root,'experience/learn-flow.js'),'utf8'),data);data.DB.forEach(t=>t.lvl=/Olympiad|University/.test(t.tags.join(' '))?3:1);
(async()=>{const browser=await chromium.launch({headless:true}),report=[];
try{for(const width of [1440,850,390,320]){
  const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce'});
  if(!live)await context.route('https://physics.entelloq.com/**',r=>r.request().resourceType()==='document'?r.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8')}):r.continue());
  await context.addInitScript(()=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');});
  const page=await context.newPage(),errors=[],ai=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('groq-proxy')&&r.method()==='POST')ai.push(r.url());});
  await page.goto('https://physics.entelloq.com/?still&learn-check='+Date.now(),{waitUntil:'load'});
  async function lesson(id){const t=data.DB.find(t=>t.id===id);await page.locator((width<=850?'.mtab':'.side')+' [data-go="learn"]').click();await page.locator('#main [data-link="domain:'+t.domain+'"]').click();await page.locator('#main [data-link="lesson:'+id+'"]').click();}
  await lesson('newton-laws');
  assert.equal(await page.locator('.learn-flow').count(),1);assert.equal(await page.locator('#lens-host canvas').count(),0,'Tools mount only when opened');
  const completeBefore=await page.evaluate(()=>localStorage.getItem('peq_learn_v1'));
  await page.locator('[data-lf="check"]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.learn-card h2').evaluate(e=>e===document.activeElement),true);
  const answer=data.LearnFlow.cards(data.DB.find(t=>t.id==='newton-laws'))[0].answer;
  await page.locator('[data-answer="'+(1-answer)+'"]').click();assert.match(await page.locator('.learn-feedback').innerText(),/Not quite/);
  await page.locator('[data-lf="retry"]').click();await page.locator('[data-answer="'+answer+'"]').click();assert.match(await page.locator('.learn-feedback').innerText(),/That’s it/);
  await page.locator('[data-lf="next"]').click();assert.match(await page.locator('.learn-count').innerText(),/2 \/ 3/);
  await page.locator('[data-lf="skip"]').click();assert.match(await page.locator('.learn-count').innerText(),/3 \/ 3/);
  await page.locator('[data-lf="check"]').click();await page.locator('[data-lf="review"]').click();assert.match(await page.locator('.learn-idea').innerText(),/one chosen body/);
  await page.locator('[data-lf="skip"]').click();assert.match(await page.locator('.learn-card').innerText(),/1 of 3/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('peq_learn_v1')),completeBefore,'Practice checks do not award completion, XP or mastery');
  await page.locator('.learn-curiosity summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.learn-curiosity').evaluate(e=>e.open),true);
  await page.keyboard.press('Enter');assert.equal(await page.locator('.learn-curiosity').evaluate(e=>e.open),false);
  for(const label of ['Explore this idea','See it in motion','Try a small experiment','Change the variables','Formula notebook','Another way to see it','Choose another route','Connect the dots']){
    const summary=page.locator('.learn-extra summary').filter({has:page.locator('strong',{hasText:label})});if(!await summary.count())continue;
    await summary.click();await page.waitForTimeout(140);
    const detail=summary.locator('..');assert.ok((await detail.locator('.learn-extra-body').innerText()).length>0,label+' is not empty');
    if(label==='Explore this idea'){const sizes=await detail.locator('canvas').evaluateAll(cs=>cs.map(c=>c.getBoundingClientRect().width));assert.ok(sizes.every(w=>w>50));}
    await summary.click();
  }
  await page.locator('[data-lf="restart"]').click();
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  async function scan(theme){const r=await page.evaluate(async()=>({overflow:document.querySelector('#main-scroll').scrollWidth>document.querySelector('#main-scroll').clientWidth+1,violations:(await axe.run('#main',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}));report.push({width,theme,...r});assert.equal(r.overflow,false);assert.deepEqual(r.violations,[]);}
  await scan('dark');await page.screenshot({path:path.join(out,'learn-'+(live?'live':'staged')+'-'+width+'.png')});
  await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));await scan('light');
  if(width===1440){
    for(const t of data.DB){await lesson(t.id);assert.equal(await page.locator('.learn-flow').count(),t.lvl<3?1:0,t.id);}
    await lesson('newton-laws');await page.locator('#main [data-link="deep:newton-laws"]').click();assert.equal(await page.locator('.learn-flow').count(),0);
    await page.locator('#pe-explore').click();await page.locator('[data-explore-go="adv"]').click();assert.equal(await page.locator('.learn-flow').count(),0);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(ai,[]);console.log(width,'passed');await context.close();
}}finally{fs.writeFileSync(path.join(out,'learn-'+(live?'live':'staged')+'.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
