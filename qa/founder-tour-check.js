/* Real HTTPS in isolated profiles. Synthetic identity callback, never a Google submission. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.join(__dirname,'results'),report=[],stamp=Date.now();
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844],['small',320,740]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:device==='desktop'?'no-preference':'reduce'});
  await context.route(/clarity\.ms|google-analytics\.com/,r=>r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://physics.entelloq.com/?landing&still&welcomeqa='+stamp,{waitUntil:'load',timeout:45000});
  await page.locator('#pe-founder').waitFor();
  async function scan(name,selector){
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   const result=await page.evaluate(async selector=>{const root=document.querySelector(selector),r=root.getBoundingClientRect(),a=await axe.run(selector,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return{overflow:root.scrollWidth>root.clientWidth+1,bounds:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))};},selector);
   report.push({device,name,...result});console.log(device,name,JSON.stringify(result));
   await page.screenshot({path:path.join(out,'welcome-'+device+'-'+name+'.png')});
   assert.equal(result.overflow,false,name+' has no horizontal overflow');assert.deepEqual(result.violations,[],name+' accessibility');
  }
  await page.locator('#pe-founder').scrollIntoViewIfNeeded();
  const portrait=page.locator('#pe-founder img');await portrait.evaluate(img=>img.decode());assert.equal(await portrait.evaluate(img=>img.naturalWidth),512);
  assert.match(await page.locator('#pe-founder').innerText(),/Darsh Prasad/);assert.match(await page.locator('#pe-founder').innerText(),/I built Entelloq so students could finally play it/);
  assert.equal(await page.locator('#pe-founder a[href="mailto:entelloqnetworks@gmail.com"]').count(),1);await scan('founder','#pe-founder');
  await page.locator('[data-signup]').first().click();await page.locator('#pe-account-dialog[open]').waitFor();await scan('account','#pe-account-dialog');
  await page.locator('#pe-account-guest').click();assert.equal(await page.locator('#welcome-tour[open]').count(),0,'Guests are not enrolled');
  await page.goto('https://physics.entelloq.com/?landing&still&welcomeqa='+stamp,{waitUntil:'load'});
  await page.locator('[data-signup]').first().click();
  const email=device+'-'+stamp+'@example.invalid';
  const before=await page.evaluate(()=>({done:Me.done,xp:Me.xp}));
  await page.evaluate(e=>window.PEQ_gauth._simSignIn({n:'Welcome QA',e}),email);
  await page.locator('#welcome-tour[open]').waitFor();assert.equal(await page.locator('#pe-launch').count(),0,'Successful identity exits landing');
  if(device==='desktop'){
   assert.equal(await page.locator('#welcome-play').getAttribute('aria-pressed'),'true');await page.mouse.move(0,0);await page.waitForTimeout(11400);
   assert.match(await page.locator('#welcome-count').innerText(),/STEP 2 OF 8/,'Auto-play advances');
   await page.locator('#welcome-back').click();assert.equal(await page.locator('#welcome-play').getAttribute('aria-pressed'),'false');
  }else assert.equal(await page.locator('#welcome-play').getAttribute('aria-pressed'),'false','Reduced motion starts paused');
  for(let i=1;i<=8;i++){
   assert.equal(await page.locator('#welcome-count').innerText(),'STEP '+i+' OF 8');await scan('step-'+i,'#welcome-tour');
   const card=await page.locator('#welcome-card').boundingBox();assert.ok(card.x>=0&&card.x+card.width<=width+1&&card.y>=0&&card.y+card.height<=height+1,'Card within viewport');
   assert.equal(await page.locator('#welcome-tour').evaluate(d=>d.contains(document.activeElement)),true,'Focus stays in tutorial');
   await page.locator('#welcome-next').click();
  }
  assert.equal(await page.locator('#welcome-tour[open]').count(),0);assert.equal(await page.evaluate(e=>JSON.parse(localStorage.getItem('peq_welcome_v1:'+encodeURIComponent(e))).status,email),'completed');
  assert.deepEqual(await page.evaluate(()=>({done:Me.done,xp:Me.xp})),before,'Tour does not award learning progress');
  await page.reload({waitUntil:'load'});assert.equal(await page.locator('#welcome-tour[open]').count(),0,'Completion survives reload');
  await page.evaluate(()=>go('settings'));await page.locator('[data-welcome-replay]').click();await page.locator('#welcome-tour[open]').waitFor();
  await page.keyboard.press('Tab');assert.equal(await page.locator('#welcome-play').getAttribute('aria-pressed'),'false');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#welcome-tour[open]').count(),0);
  assert.equal(await page.evaluate(e=>JSON.parse(localStorage.getItem('peq_welcome_v1:'+encodeURIComponent(e))).status,email),'skipped');
  await page.evaluate(()=>{PEQ_gauth.signOut();PEQ_gauth._simSignIn({n:'Second QA',e:'second-'+Date.now()+'@example.invalid'});});
  await page.locator('#welcome-tour[open]').waitFor();await page.locator('#welcome-skip').click();
  await page.evaluate(()=>{document.documentElement.dataset.theme='light';go('settings');});
  const light=page.locator('[data-th="light"]');if(await light.count())await light.click();
  await page.locator('[data-welcome-replay]').click();await scan('light-tour','#welcome-tour');await page.locator('#welcome-skip').click();
  assert.deepEqual(errors,[],'No page errors');report.push({device,flows:'autoplay, account handoff, guest, 8 steps, completion, replay, skip, second identity, reduced motion, keyboard, light theme',errors});await context.close();
 }
}finally{fs.writeFileSync(path.join(out,'welcome-checks.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
