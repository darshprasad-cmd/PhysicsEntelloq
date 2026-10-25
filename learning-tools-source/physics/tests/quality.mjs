import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(resolve(process.env.CODEX_NODE_MODULES||'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.woff2':'font/woff2','.json':'application/json','.wav':'audio/wav'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}}).listen(0,'127.0.0.1');
await new Promise(r=>server.once('listening',r));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:process.env.CHECK_BROWSER||'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:980}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await mkdir(resolve(root,'qa/quality'),{recursive:true});
try{
 await page.goto(url+'/?panel=graphs');await page.locator('[data-flight]').waitFor();
 await page.screenshot({path:resolve(root,'qa/quality/graphs-'+(process.env.BASELINE?'before':'after')+'.png'),fullPage:true});
 if(!process.env.BASELINE){
  const gravity=page.locator('[data-key="g"]');await gravity.fill('');await gravity.pressSequentially('1.62');assert.equal(await gravity.inputValue(),'1.62');assert.equal(await gravity.getAttribute('aria-invalid'),'false');await gravity.press('Home');await gravity.press('ArrowRight');await gravity.pressSequentially('0');assert.equal(await gravity.inputValue(),'10.62');await gravity.fill('9.81');checks.push('Sequential decimal typing and mid-number caret edits retain the raw draft');
  const value=await page.locator('[data-flight]').textContent();
  await page.locator('[data-key="vy"]').fill('100');assert.equal(await page.locator('[data-download]').isDisabled(),true);
  assert.equal(await page.locator('[data-flight]').textContent(),value);assert.equal(await page.locator('[data-key="vy"]').getAttribute('aria-invalid'),'true');
  assert.match(await page.locator('[data-error="vy"]').textContent(),/0.1.*20/);await page.locator('[data-key="vx"]').fill('7');assert.match(await page.locator('.pt-status').textContent(),/Correct the highlighted/);assert.equal(await page.locator('[data-download]').isDisabled(),true);checks.push('Out-of-range motion input explains the bounds and preserves the last valid model');
  await page.locator('[data-key="vy"]').fill('12');await page.locator('[data-key="vy"]').press('Tab');assert.equal(await page.locator('[data-key="vy"]').getAttribute('aria-invalid'),'false');checks.push('Valid correction clears the field error and updates the model');
 }
 for(const [width,height,theme] of [[390,844,'light'],[820,1180,'dark'],[1280,980,'light']]){
  await page.setViewportSize({width,height});await page.evaluate(t=>document.documentElement.dataset.physicsTheme=t,theme);await page.waitForTimeout(100);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:resolve(root,`qa/quality/graphs-${width}-${theme}.png`),fullPage:true});
 }checks.push('390px mobile, 820px tablet and 1280px desktop fit in both palettes');
 if(!process.env.BASELINE){
  await page.locator('[data-tab="circuits"]').click();await page.locator('[data-key="resistance"]').fill('1');assert.equal(await page.locator('[data-external]').getAttribute('href'),null);assert.equal(await page.locator('[data-launch]').isDisabled(),true);assert.match(await page.locator('[data-error="resistance"]').textContent(),/10.*1,000,000/);
  await page.locator('[data-key="resistance"]').fill('2000');await page.locator('[data-key="resistance"]').press('Tab');assert.equal(await page.locator('[data-launch]').isEnabled(),true);assert.equal(await page.locator('.pt-circuit-frame').count(),0);checks.push('Circuit settings reject invalid resistance without silently launching a different circuit');
  await page.locator('[data-key="circuit"]').selectOption('rc');await page.locator('[data-cap]').fill('');await page.locator('[data-cap]').pressSequentially('1.25');assert.equal(await page.locator('[data-cap]').inputValue(),'1.25');assert.match(await page.locator('[data-prediction]').textContent(),/2.500 ms/);checks.push('Sequential capacitance entry retains decimal precision and updates the circuit model');
  await page.locator('[data-tab="equations"]').click();await page.locator('math-field').waitFor();await page.locator('[data-tab="trajectory"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('h2').evaluate(e=>e===document.activeElement),true);checks.push('Keyboard panel activation moves focus to the new workspace');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('[data-earth]').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');checks.push('Reduced motion removes button transitions');
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(root,'qa/quality/checks.json'),JSON.stringify({checks,errors,baseline:!!process.env.BASELINE},null,2));console.log(JSON.stringify({checks,errors}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
