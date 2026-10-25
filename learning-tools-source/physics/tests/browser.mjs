import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const deps=process.env.CODEX_NODE_MODULES||'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=createRequire(import.meta.url)(resolve(deps,'playwright'));
const root=resolve(new URL('..',import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1'));
const mime={'.html':'text/html','.mjs':'application/javascript','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.json':'application/json','.wav':'audio/wav'};
const server=createServer(async(req,res)=>{try{const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const path=resolve(root,'.'+(rel==='/'?'/index.html':rel));if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}await stat(path);res.setHeader('Content-Type',mime[extname(path)]||'text/plain');res.end(await readFile(path));}catch{res.writeHead(404).end('Not found');}}).listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));const url='http://127.0.0.1:'+server.address().port;
await mkdir(resolve(root,'qa'),{recursive:true});
const browser=await chromium.launch({channel:process.env.CHECK_BROWSER||undefined,headless:true});const context=await browser.newContext({viewport:{width:1366,height:1000}});const page=await context.newPage();
const errors=[],requests=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
try{
 await page.goto(url+'/?panel=equations');await page.locator('math-field').waitFor();await page.waitForFunction(()=>document.querySelector('math-field')?.getValue);
 await page.locator('[data-template="energy"]').click();await page.waitForFunction(()=>document.querySelector('[data-ascii]').textContent.includes('m'));
 assert.ok(await page.locator('[data-ascii]').textContent());await page.evaluate(()=>{window.received=null;document.querySelector('#physics-tools').addEventListener('entelloq:equation',e=>window.received=e.detail);});await page.locator('[data-send]').click();assert.equal((await page.evaluate(()=>window.received)).source,'mathlive');checks.push('Real MathLive equation input, ASCII export and host event');
 await page.reload();await page.waitForFunction(()=>document.querySelector('math-field')?.value?.includes('frac'));checks.push('Equation persistence across reload');
 await page.screenshot({path:resolve(root,'qa/equations-desktop.png'),fullPage:true});
 await page.locator('[data-tab="trajectory"]').click();await page.locator('[data-range]').waitFor();await page.locator('[data-key="vx"]').fill('-8');await page.locator('[data-key="vx"]').press('Tab');await page.waitForFunction(()=>document.querySelector('[data-range]').textContent.startsWith('-'));
 const before=Number((await page.locator('[data-flight]').textContent()).split(' ')[0]);await page.locator('[data-moon]').click();const after=Number((await page.locator('[data-flight]').textContent()).split(' ')[0]);assert.ok(after>before*5);assert.ok(await page.locator('.pt-board svg').count()===2);checks.push('Real JSXGraph boards, leftward launch and lunar-gravity update');
 const vector=page.locator('.pt-vector');const box=await vector.boundingBox();await page.mouse.move(box.x+box.width*.33,box.y+box.height*.50);await page.mouse.down();await page.mouse.move(box.x+box.width*.60,box.y+box.height*.35,{steps:8});await page.mouse.up();
 await page.evaluate(()=>document.documentElement.dataset.physicsTheme='light');await page.screenshot({path:resolve(root,'qa/graphs-light-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:resolve(root,'qa/graphs-mobile.png'),fullPage:true});checks.push('Light theme and mobile 390px without horizontal overflow');
 await page.setViewportSize({width:820,height:1180});await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push('Tablet 820px without horizontal overflow');
 await page.setViewportSize({width:1366,height:1000});await page.locator('[data-tab="circuits"]').click();assert.equal(await page.locator('.pt-circuit-frame').count(),0);assert.ok(requests.every(r=>r.startsWith(url)||r.startsWith('data:')));checks.push('No remote engine or CDN requests before explicit CircuitJS launch');
 await page.locator('[data-key="circuit"]').selectOption('rc');await page.locator('[data-key="resistance"]').fill('2000');await page.locator('[data-key="resistance"]').press('Tab');assert.match(await page.locator('[data-prediction]').textContent(),/2.000 ms/);
 await context.setOffline(true);await page.locator('[data-launch]').click();assert.match(await page.locator('.pt-status').textContent(),/offline/);assert.equal(await page.locator('.pt-circuit-frame').count(),0);await context.setOffline(false);checks.push('Offline CircuitJS failure state and RC analytic prediction');
 let hosted={verified:false};
 if(process.env.CHECK_HOSTED==='1'){
   await page.locator('[data-launch]').click();const handle=await page.locator('.pt-circuit-frame').elementHandle();const frame=await handle.contentFrame();
   try{await frame.locator('canvas').first().waitFor({timeout:60000});await page.waitForTimeout(1500);hosted={verified:true,url:frame.url(),canvasCount:await frame.locator('canvas').count(),text:(await frame.locator('body').innerText()).slice(0,1500)};await page.screenshot({path:resolve(root,'qa/circuitjs-live.png'),fullPage:true});checks.push('Official hosted CircuitJS rendered a real circuit canvas');}catch(e){hosted={verified:false,error:e.message};}
 }
 await page.locator('[data-tab="equations"]').click();await page.locator('math-field').waitFor();assert.equal(await page.locator('.pt-circuit-frame').count(),0);checks.push('Leaving circuit panel destroys its frame');
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:resolve(root,'qa/equations-mobile.png'),fullPage:true});checks.push('Mobile equation editor and reduced-motion setting');
 // Separate storage-denied instance and mount cleanup exercise actual exported lifecycle.
 await page.evaluate(async()=>{const {mount}=await import('./tools.mjs');const el=document.createElement('div');document.body.append(el);const c=await mount(el,{storage:null,initialTab:'equations'});window.blockedStatus=el.querySelector('.pt-status').textContent;c.unmount();window.cleaned=el.childNodes.length===0;el.remove();});assert.match(await page.evaluate(()=>window.blockedStatus),/unavailable/);assert.equal(await page.evaluate(()=>window.cleaned),true);checks.push('Denied storage and unmount lifecycle');
 assert.deepEqual(errors,[]);await writeFile(resolve(root,'qa/browser-checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),checks,errors,hosted},null,2));console.log(JSON.stringify({checks,errors,hosted},null,2));if(process.env.CHECK_HOSTED==='1'&&!hosted.verified)process.exitCode=1;
}catch(error){console.error(JSON.stringify({errors,body:await page.locator('body').innerText(),requests:requests.slice(-10)},null,2));await page.screenshot({path:resolve(root,'qa/failure.png'),fullPage:true});throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
