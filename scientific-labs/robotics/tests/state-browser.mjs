// UI-state regression checks. The physics fixture itself is produced by Genesis.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const localRequire=createRequire(import.meta.url);
let chromium;
try { ({chromium}=localRequire('playwright')); }
catch { ({chromium}=createRequire(path.join(process.env.CODEX_NODE_MODULES || 'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','package.json'))('playwright')); }
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://127.0.0.1:5294/**',async route=>{
    const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
    if(name==='api/status')return route.fulfill({json:{available:true}});
    return route.fulfill({body:await fs.readFile(path.join(root,'web',name)),contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html'});
  });
  await page.goto('http://127.0.0.1:5294/');
  await page.waitForFunction(()=>document.getElementById('engineStatus').textContent.includes('Ready'));
  const setTarget=async(x,y)=>{await page.locator('#targetX').fill(x);await page.locator('#targetY').fill(y)};
  await setTarget('-.9','-.2');
  assert.equal(await page.locator('#run').isDisabled(),false);
  assert.equal(await page.locator('#q1').textContent(),'168.1°');
  await page.locator('#elbow').check();
  await setTarget('-.9','.2');
  assert.equal(await page.locator('#run').isDisabled(),false);
  assert.equal(await page.locator('#q1').textContent(),'-168.1°');
  for(const [x,y] of [['','.55'],['.65','']]) {
    await setTarget(x,y);
    assert.equal(await page.locator('#run').isDisabled(),true);
    assert.match(await page.locator('#reachable').textContent(),/both target coordinates/);
    assert.equal(await page.locator('#distance').textContent(),'—');
    assert.doesNotMatch(await page.locator('#stage').innerHTML(),/NaN|Infinity/);
  }
  await setTarget('1.05','1.05');
  await page.locator('#loadDemo').click();
  await page.waitForFunction(()=>document.getElementById('evidence').textContent==='Recorded run');
  assert.equal(await page.locator('#run').isDisabled(),false);
  assert.equal(await page.locator('#elbow').isChecked(),false);
  assert.equal(await page.locator('#reachable').textContent(),'Reachable within both joint limits.');
  assert.equal(await page.locator('#reachable').evaluate(e=>e.classList.contains('warning')),false);
  await page.locator('#targetX').fill('.7');
  assert.equal(await page.locator('#evidence').textContent(),'Not run');
  assert.equal(await page.locator('#notice').isHidden(),true);
  assert.equal(await page.locator('#download').isDisabled(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: wrapped IK, empty coordinates, synchronized recording state, and preview evidence reset.');
} finally { await browser.close(); }
