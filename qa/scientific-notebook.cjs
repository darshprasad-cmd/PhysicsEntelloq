/* Browser-Python recomputation through the actual embedded Physics host. */
const {chromium,expect}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=(process.env.PHYSICS_TEST_URL||'http://127.0.0.1:5411').replace(/\/$/,''),out=path.join(__dirname,'results/scientific-labs');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true}),report={url:base,errors:[]};try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));const started=Date.now();
 await page.goto(base+'/?notebookQA#scientific:discovery',{waitUntil:'domcontentloaded'});await page.locator('.sci-frame').waitFor();
 const frame=page.frames().find(f=>f.url().includes('/discovery/notebook.html'));assert.ok(frame);await frame.locator('.discovery-result').waitFor({timeout:180000});report.initializationMs=Date.now()-started;
 assert.equal(await frame.locator('.discovery-header').isVisible(),false);assert.equal(await page.locator('dialog[open]').count(),0);
 report.initial=await frame.locator('.discovery-metric strong').first().innerText();await frame.getByRole('slider').first().focus();await frame.getByRole('slider').first().press('Home');await expect(frame.locator('.discovery-metric strong').first()).toHaveText(/^1\.60/,{timeout:30000});report.recomputed=await frame.locator('.discovery-metric strong').first().innerText();assert.notEqual(report.initial,report.recomputed);
 await page.screenshot({path:path.join(out,'desktop-discovery-ready.png')});
 await frame.getByRole('combobox').selectOption({label:'Sampling · the missing motion'});await expect(frame.locator('.discovery-metric strong').nth(1)).toHaveText('3',{timeout:30000});await frame.getByRole('slider').last().press('End');await expect(frame.locator('.discovery-metric strong').nth(1)).toHaveText('7',{timeout:30000});report.aliasingRecomputed=true;
 await page.setViewportSize({width:390,height:844});assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:path.join(out,'mobile-discovery-ready.png')});
 await page.locator('#scientific-back').click();await page.locator('[data-scientific-open=discovery]').waitFor();assert.equal(await page.locator('.sci-frame').count(),0);assert.deepEqual(report.errors.filter(e=>e!=='RPC request timed out.'),[]);report.passed=true;
}finally{fs.writeFileSync(path.join(out,'notebook.json'),JSON.stringify(report,null,2));await browser.close();}console.log(JSON.stringify(report,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
