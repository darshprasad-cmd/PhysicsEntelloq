/* Host integration, real video tracking and a real native Lean proof. Start the
   companion and native services first. Set PHYSICS_LOCAL_ENGINES=0 for static-only
   smoke; that report does not claim a new proof verification. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=(process.env.PHYSICS_TEST_URL||process.env.BASE_URL||'http://127.0.0.1:5411').replace(/\/$/,''),local=process.env.PHYSICS_LOCAL_ENGINES!=='0';
const out=path.join(__dirname,'results/scientific-labs');fs.mkdirSync(out,{recursive:true});
const report={url:base,localEngines:local,started:new Date().toISOString(),journeys:[],errors:[]};
async function loaded(page,id){
 await page.waitForFunction(id=>document.querySelector('.sci-frame')?.contentDocument?.documentElement?.dataset.physicsEngine===id,id);
 const frame=page.frames().find(f=>f.url().includes('/assets/scientific-labs/'+id+'/'));assert.ok(frame);
 await frame.locator({reality:'.experiment-tabs',reason:'#expression',robotics:'#targetX',proof:'#argument',discovery:'body'}[id]).waitFor({timeout:60000});
 await frame.waitForFunction(()=>[...document.styleSheets].some(s=>s.href?.includes('scientific-labs-embed.css')));return frame;
}
async function video(page,frame,full){
 await frame.getByRole('button',{name:'Video analysis',exact:true}).click();
 await frame.getByLabel('Choose experiment video').setInputFiles(path.join(__dirname,'../scientific-labs/reality/public/fixtures/tracking.webm'));
 await frame.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
 const canvas=frame.locator('.vl-canvas-wrap canvas'),box=await canvas.boundingBox();assert.ok(box);
 for(const [x,y] of [[20,200],[120,200],[80,180],[80,100]])await canvas.click({position:{x:x/320*box.width,y:y/240*box.height}});
 if(!full){assert.equal(await frame.getByRole('button',{name:'Track motion',exact:true}).isEnabled(),true);return;}
 await frame.getByRole('button',{name:'Track motion',exact:true}).click();
 await frame.waitForFunction(()=>document.querySelector('.vl-status')?.textContent?.startsWith('Tracked '),null,{timeout:90000});
 assert.match(await frame.locator('.vl-status').innerText(),/Tracked 30 positions/);
 const pending=page.waitForEvent('download');await frame.getByRole('button',{name:'CSV',exact:true}).click();const download=await pending,stream=await download.createReadStream(),chunks=[];
 for await(const chunk of stream)chunks.push(chunk);
 const rows=Buffer.concat(chunks).toString('utf8').trim().split('\n').slice(1).map(r=>r.split(',').map(Number));assert.equal(rows.length,30);assert.ok(rows.at(-1)[1]>.45&&rows.at(-1)[1]<.65);assert.ok(rows.every(r=>Math.abs(r[2]-.8)<.03));
 await frame.getByRole('button',{name:'Use in comparison',exact:true}).click();await frame.locator('.experiment-tabs').waitFor();report.video={positions:rows.length,finalX:rows.at(-1)[1],comparison:true};
 const contrast=await frame.evaluate(()=>{
  const rgb=s=>(s.match(/[\d.]+/g)||[]).slice(0,3).map(Number),lum=c=>c.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
  return ['.metrics>div strong','.metrics>div>span','.wonder-note p','.parameter strong','.experiment-tab span'].map(selector=>{const element=document.querySelector(selector);let parent=element,bg='';while(parent){bg=getComputedStyle(parent).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent')break;parent=parent.parentElement;}const a=lum(rgb(getComputedStyle(element).color)),b=lum(rgb(bg));return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
 });for(const item of contrast)assert.ok(item.ratio>=4.5,JSON.stringify(item));report.darkModelContrast=contrast;
}
async function main(){const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});try{
 for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await context.addInitScript(()=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');localStorage.setItem('peq_cbse_study_v1',JSON.stringify({v:1,status:'skipped'}));localStorage.setItem('physics-integration-preserve','existing data');});
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(base+'/?still',{waitUntil:'domcontentloaded',timeout:60000});await page.locator('body[data-view=home]').waitFor();
  assert.equal(requests.filter(u=>u.includes('/assets/scientific-labs/')).length,0,'No engine loads on Home');
  async function route(name){if(device==='mobile'&&!['home','universe','learn','lab','progress'].includes(name)){await page.locator('#pe-explore').click();await page.locator('[data-explore-go="'+name+'"]').click();await page.waitForFunction(()=>document.activeElement===document.querySelector('#pe-explore'));}else await page.locator((device==='mobile'?'.mtab ':'.side ')+'[data-go="'+name+'"]').first().click();await page.locator('body[data-view="'+name+'"]').waitFor();}
  for(const [id,parent] of [['reality','lab'],['reason','solve'],['robotics','lab'],['proof','adv'],['discovery','research']]){
   await route(parent);const opener=page.locator('[data-scientific-open="'+id+'"]').first();await opener.focus();await page.keyboard.press('Enter');await page.locator('#scientific-title').waitFor();assert.equal(await page.locator('.sci-workspace').evaluate(e=>e.contains(document.activeElement)),true,'Route focus stays within the opened workspace; browser Python may focus its frame');const frame=await loaded(page,id);
   assert.equal(new URL(page.url()).hash,'#scientific:'+id);assert.equal(await page.locator('.sci-frame').count(),1);
   assert.equal(await page.locator('#main-scroll').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'Host fits '+device);
   if(id==='reality'){assert.equal(await frame.locator('.page-intro').isVisible(),false);await video(page,frame,device==='desktop');}
   if(id==='reason'){await frame.locator('#expression').fill('x^2 + 2*x + 1');await frame.locator('.notebook-toggle').click();assert.equal(await frame.locator('.notebook').isVisible(),true);if(device==='mobile')await frame.getByRole('button',{name:'Close notebook'}).click();}
   if(id==='robotics'){await frame.locator('#targetX').fill('0.25');await frame.locator('#targetX').dispatchEvent('input');await frame.locator('#loadDemo').click();await frame.waitForFunction(()=>document.querySelector('#evidence')?.textContent==='Recorded run'&&!document.querySelector('#play')?.disabled);}
   if(id==='proof'){
    for(const choice of ['introduce','use'])await frame.locator('input[value="'+choice+'"]').check();assert.match(await frame.locator('pre[aria-label="Generated Lean proof"]').innerText(),/exact hp/);
    if(local){await frame.getByText('Lean checker connected',{exact:false}).waitFor();await frame.getByRole('button',{name:'Check my proof'}).click();await frame.getByRole('heading',{name:'This proof holds.'}).waitFor({timeout:30000});report.actualLeanProof=true;}
   }
   if(id!=='discovery')assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'Tool fits '+device+' '+id);
   await page.screenshot({path:path.join(out,device+'-'+id+'.png')});
   await page.locator('#scientific-back').click();assert.equal(await page.locator('.sci-frame').count(),0);assert.equal(await opener.evaluate(e=>e===document.activeElement),true);
   report.journeys.push({device,id,parent,passed:true});console.log(device+' '+id+' passed');
  }
  await route('lab');assert.equal(await page.locator('[data-lm]').count(),9);await page.locator('[data-lm=graphs]').click();assert.equal(await page.locator('[data-scientific-open=robotics]').count(),1);await page.locator('[data-lm=labs]').click();assert.ok(await page.locator('.xg-card[data-live="1"]').count()>=16);
  await page.locator('[data-scientific-open=reality]').click();await page.goBack();await page.locator('[data-scientific-open=reality]').waitFor();assert.equal(await page.locator('.sci-frame').count(),0);await page.goForward();await page.locator('.sci-frame').waitFor();
  await route('learn');assert.equal(await page.locator('.sci-frame').count(),0);await route('solve');assert.equal(await page.locator('#sv-input').count(),1);await route('adv');assert.equal(await page.locator('.as-card').count(),6);
  await route('settings');await page.locator('[data-th=light]').click();
  for(const [id,parent] of [['reason','solve'],['robotics','lab'],['proof','adv'],['discovery','research']]){await route(parent);await page.locator('[data-scientific-open="'+id+'"]').click();const f=await loaded(page,id);assert.equal(await f.locator('html').getAttribute('data-physics-theme'),'light');await page.screenshot({path:path.join(out,device+'-'+id+'-light.png')});await page.locator('#scientific-back').click();}
  await route('lab');await page.locator('[data-scientific-open=reality]').click();const light=await loaded(page,'reality');assert.equal(await light.locator('html').getAttribute('data-physics-theme'),'light');await light.getByRole('button',{name:'Video analysis',exact:true}).click();await page.screenshot({path:path.join(out,device+'-video-light.png')});
  const source=new URL(await page.locator('.sci-source').getAttribute('href'),base+'/');assert.equal((await page.request.get(source.href)).status(),200);
  const popup=page.waitForEvent('popup');await page.locator('.sci-source').click();const guide=await popup;await guide.getByRole('heading',{name:'What runs here'}).waitFor();assert.equal(await guide.locator('a[download]').count(),7);assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await guide.close();
  await light.getByLabel('Choose experiment video').focus();await page.keyboard.press('Alt+Shift+ArrowLeft');await page.locator('[data-scientific-open=reality]').waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('physics-integration-preserve')),'existing data');assert.deepEqual(errors,[]);report.errors.push(...errors);await context.close();
 }
 const fresh=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await fresh.newPage();await page.goto(base+'/?freshScientific#scientific:proof',{waitUntil:'domcontentloaded'});let frame=await loaded(page,'proof');assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.evaluate(()=>localStorage.getItem('peq_cbse_study_v1')),null);await frame.locator('input[value=introduce]').check();await page.locator('#scientific-back').click();await page.locator('.as-index').waitFor();report.freshBookmark=true;await fresh.close();
 const offline=await browser.newContext(),p=await offline.newPage();await p.route('**/api/**',r=>r.abort());await p.goto(base+'/?offline#scientific:proof',{waitUntil:'domcontentloaded'});frame=await loaded(p,'proof');await frame.getByText('Checker offline',{exact:false}).waitFor();for(const choice of ['introduce','use'])await frame.locator('input[value="'+choice+'"]').check();assert.equal(await frame.getByText('This proof holds.').count(),0);report.offlineUnverified=true;await offline.close();
 const broken=await browser.newContext(),q=await broken.newPage();await q.route('**/reality/index.html?embed=physics',r=>r.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'Fixture: unavailable file',available:false})}));await q.goto(base+'/?missingAsset#scientific:reality',{waitUntil:'domcontentloaded'});await q.locator('.sci-load-error').waitFor();assert.match(await q.locator('#scientific-status').innerText(),/could not open/);await q.locator('#scientific-back').click();await q.locator('[data-scientific-open=reality]').waitFor();report.missingAssetRecovery=true;await broken.close();report.passed=true;
}finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2));await browser.close();}}
main().then(()=>console.log(JSON.stringify(report,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
