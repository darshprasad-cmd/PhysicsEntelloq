import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.CODEX_NODE_MODULES || path.resolve('../entelloq-reality-lab/node_modules'),'_test.cjs'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const checks=[];const checked=name=>checks.push(name);
await fs.mkdir('qa',{recursive:true});
try{
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8772/',{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Teach a machine where to go.'}).waitFor();
  assert.equal(await page.locator('#modeLabel').textContent(),'GEOMETRIC PREVIEW');
  assert.equal(await page.locator('#play').isDisabled(),true);checked('initial geometric preview is paused and unverified');
  await page.locator('#loadDemo').click();
  await page.waitForFunction(()=>document.querySelector('#evidence').textContent==='Recorded run');
  await page.locator('#time').focus();await page.locator('#time').press('End');
  assert.equal(await page.locator('#distance').textContent(),'0.000 m');checked('actual Genesis recording replays to measured target');
  const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadPromise;
  const data=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  assert.equal(data.engine,'Genesis World');assert.equal(data.samples.length,91);assert.ok(data.finalError<1e-4);checked('JSON export contains actual complete simulation evidence');
  await page.screenshot({path:'qa/robotics-desktop.png',fullPage:true});
  await page.locator('#targetX').fill('1.05');await page.locator('#targetY').fill('1.05');await page.locator('#targetY').dispatchEvent('change');
  assert.equal(await page.locator('#run').isDisabled(),true);assert.equal(await page.locator('#evidence').textContent(),'Not run');checked('unreachable target invalidates prior evidence');
  await page.locator('#loadDemo').click();await page.waitForFunction(()=>document.querySelector('#evidence').textContent==='Recorded run');
  assert.match(await page.locator('#reachable').textContent(),/Reachable/);checked('recording restores valid target state');
  if(process.env.RUN_DYNAMICS==='1'){
    await page.locator('#kd').fill('5');await page.locator('#kd').dispatchEvent('input');
    await page.locator('#payload').fill('0.75');await page.locator('#payload').dispatchEvent('input');
    await page.locator('#run').click();await page.waitForFunction(()=>document.querySelector('#evidence').textContent==='Computed locally',{},{timeout:195000});
    const liveDownload=page.waitForEvent('download');await page.locator('#download').click();const d=await liveDownload;
    const live=JSON.parse(await fs.readFile(await d.path(),'utf8'));
    assert.equal(live.config.kd,5);assert.equal(live.config.payload,.75);assert.equal(live.samples.length,91);
    assert.ok(live.finalError<.1);assert.ok(Math.abs(live.samples[1].q2-live.config.target2*Math.PI/180)>.1);
    await fs.writeFile('qa/live-dynamics.json',JSON.stringify(live,null,2));checked('new Genesis API simulation with changed damping and payload returns non-teleported dynamics');
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa/robotics-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checked('390px mobile layout has no horizontal overflow');
  assert.deepEqual(errors,[]);checked('no browser exceptions');
  await fs.writeFile('qa/browser-checks.json',JSON.stringify({verifiedAt:new Date().toISOString(),checks,errors,liveDynamics:process.env.RUN_DYNAMICS==='1'},null,2));
  console.log(JSON.stringify({passed:checks.length,checks}));
}finally{await browser.close()}
