/* Exercise the actual scene controls, not just the presence of preset names.
 * This is a UI/finite-state smoke test, not validation of every physical model. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),live=process.argv.includes('--live'),smoke=process.argv.includes('--smoke');
const counts={solar:5,binary:2,figure8:3,springs:7,dpendulum:3,cradle:10,atwood:2,wavestring:21,hangrope:16,catcradle:64,gas:34,dipole:8,cyclotron:1,velselect:3,massspec:3,cycloid:1,magorbit:2,exbdrift:4,counter:6,clear:0};
fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});
(async()=>{const browser=await chromium.launch();let passed=0;try{
 for(const width of (smoke?[1366,390]:[1366,850,390,320]))for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
  if(!live)await context.route('https://physics.entelloq.com/**',r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8')}):r.continue());
  await context.addInitScript(theme=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');localStorage.setItem('peq_theme',theme);localStorage.setItem('peq_sbx_view',JSON.stringify({rail:false}));window.cameraCalls=0;navigator.mediaDevices.getUserMedia=()=>{window.cameraCalls++;return Promise.reject(Error('No camera permission in this test'));};},theme);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://physics.entelloq.com/?still&libraryQA='+Date.now());
  await page.locator('#pe-explore').click();await page.locator('[data-explore-go="sandbox"]').click();
  const picker=page.locator('#studio-scene-select');await picker.waitFor();
  assert.equal(await page.locator('#sbx-host').getAttribute('data-workspace'),'hands');
  assert.match(await page.locator('#studio-scene-count').innerText(),/19 experiments/);
  assert.deepEqual(await picker.locator('option').evaluateAll(nodes=>nodes.filter(n=>n.value).map(n=>n.value)),Object.keys(counts));
  assert.equal(await page.evaluate(()=>window.cameraCalls),0);
  for(const mode of ['hands','build']){
   await page.locator('#studio-tab-'+mode).click();assert.ok(await picker.isVisible());
   for(const [id,count]of Object.entries(counts)){
    await picker.selectOption(id);
    const state=await page.evaluate(()=>{const api=window.__peqSbx;for(let i=0;i<12;i++)api.step(1/240);const s=api.shareState();return {n:s.B.length,finite:s.B.every(b=>[b.x,b.y,b.vx,b.vy,b.m].every(Number.isFinite)),rods:s.rods.length,pulleys:s.pulleys.length,gravity:s.P.g};});
    assert.equal(state.n,count,id+' creates its original bodies');assert.ok(state.finite,id+' stays finite over bounded steps');
    if(id==='dpendulum'){assert.equal(state.rods,2);assert.equal(state.gravity,240);}
    if(id==='atwood'){assert.equal(state.pulleys,1);assert.equal(state.gravity,240);}
    assert.equal(await picker.inputValue(),'','Command picker allows loading the same scene again');
    assert.match(await page.locator('#studio-scene-status').innerText(),/^Loaded /);
    passed++;
   }
  }
  await page.locator('#studio-tab-hands').click();
  await page.locator('[data-studio-scene="dpendulum"]').click();
  const first=await page.evaluate(()=>JSON.stringify(window.__peqSbx.shareState().B));
  await picker.focus();await page.keyboard.press('Space');await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__peqSbx.shareState().B)),first,'Opening the library must not reset or edit the simulation');
  await page.locator('[data-studio-scene="atwood"]').click();assert.equal(await page.evaluate(()=>window.__peqSbx.bodies().length),2);
  await page.locator('#sbx-undo').click();assert.equal(await page.evaluate(()=>window.__peqSbx.bodies().length),3,'Undo restores the previous experiment');
  await page.locator('#sbx-redo').click();assert.equal(await page.evaluate(()=>window.__peqSbx.bodies().length),2,'Redo restores Atwood');
  await page.locator('#studio-tab-camera').click();await page.locator('#studio-tab-hands').click();
  assert.equal(await page.evaluate(()=>window.__peqSbx.bodies().length),2,'Changing workspace preserves the experiment');
  await page.locator('[data-studio-scene="catcradle"]').click();assert.equal(await page.evaluate(()=>window.__peqSbx.bodies().length),64);assert.ok(await page.locator('.studio-cradle-hint').isVisible());
  await page.locator('[data-studio-scene="dpendulum"]').click();assert.equal(await page.locator('.studio-cradle-hint').isVisible(),false);
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const audit=await page.evaluate(async()=>({overflow:document.querySelector('#main-scroll').scrollWidth>document.querySelector('#main-scroll').clientWidth+1,violations:(await axe.run('.studio-scene-controls',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))}));
  assert.equal(audit.overflow,false);assert.deepEqual(audit.violations,[]);assert.equal(await page.evaluate(()=>window.cameraCalls),0);assert.deepEqual(errors,[]);
  await page.locator('#main-scroll').evaluate(e=>e.scrollTop=0);await page.screenshot({path:path.join(__dirname,'results',`sandbox-library-${live?'live':'local'}-${width}-${theme}.png`)});
  await context.close();console.log(width,theme,'all 20 choices in Hands + Build; shortcuts, undo, keyboard, accessibility and state preservation passed');
 }
 console.log(JSON.stringify({live,sceneLoads:passed}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
