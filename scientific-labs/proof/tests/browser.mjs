import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.PROOF_URL || 'http://127.0.0.1:8773/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await fs.mkdir('test-results', { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const cases = [
  ['identity', ['introduce','use']], ['compose',['intro','hqr','transform']], ['pair',['ordered']],
  ['swap',['intro','reverse']], ['either',['left','hp']], ['zero',['rfl']],
];
const resultLog=[];
try {
  await page.goto(base);
  await page.getByText('Lean checker connected', { exact: false }).waitFor();
  for (let index=0;index<cases.length;index++) {
    if(index) await page.locator('.puzzle-nav').nth(index).click();
    for (const id of cases[index][1]) await page.locator(`input[value="${id}"]`).check();
    await page.getByRole('button',{name:'Check my proof'}).click();
    await page.getByRole('heading',{name:'This proof holds.'}).waitFor();
    resultLog.push({ puzzle:cases[index][0], verified:true });
  }
  assert.equal(await page.locator('.journey-progress strong').innerText(),'6');
  await page.locator('.puzzle-nav').nth(0).click();
  assert.equal(await page.getByText('A draft, full of possibility.').count(),1);
  await page.locator('input[value="empty"]').check();
  await page.getByRole('button',{name:'Check my proof'}).click();
  await page.getByRole('heading',{name:'There’s a gap to explore.'}).waitFor();
  await page.getByText('Read Lean’s feedback').click();
  assert.match(await page.locator('.check-result details pre').innerText(),/unsolved goals/);
  await page.locator('input[value="use"]').check();
  assert.equal(await page.getByText('This proof holds.').count(),0);
  await page.getByRole('button',{name:'Check my proof'}).click();
  await page.getByRole('heading',{name:'This proof holds.'}).waitFor();
  await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  const download = page.waitForEvent('download');
  await page.getByRole('button',{name:'Download proof'}).click();
  assert.equal((await download).suggestedFilename(),'identity.lean');
  await page.reload();
  assert.equal(await page.locator('.journey-progress strong').innerText(),'6');
  assert.equal(await page.getByText('This proof holds.').count(),0);
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Proof 1 of 6'}).click();
  await page.locator('.puzzle-nav').nth(1).click();
  await page.screenshot({path:'test-results/mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('input[value="intro"]').focus();
  await page.keyboard.press('Space');
  assert.equal(errors.length,0,errors.join('\n'));
  const apiUrl=new URL('api/check',base).href;
  const invalid=await page.request.post(apiUrl,{data:{puzzle:'identity',choices:['introduce','use'],source:'sorry'}});
  assert.equal(invalid.status(),400);
  const forbidden=await page.request.post(apiUrl,{headers:{Origin:'https://untrusted.example'},data:{puzzle:'identity',choices:['introduce','use']}});
  assert.equal(forbidden.status(),403);
  const wrongType=await page.request.post(apiUrl,{headers:{'Content-Type':'text/plain'},data:'anything'});
  assert.equal(wrongType.status(),415);
  // A static site without a local service stays explicitly unverified.
  const offline=await browser.newPage();
  await offline.route('**/api/**',route=>route.abort());
  await offline.goto(base);
  await offline.getByText('Checker offline',{exact:false}).waitFor();
  await offline.getByRole('button',{name:'Start checker'}).click();
  await offline.getByRole('heading',{name:'Connect the local proof checker'}).waitFor();
  assert.equal(await offline.getByText('This proof holds.').count(),0);
  await offline.close();
  await fs.writeFile('test-results/browser.json',JSON.stringify({passed:true,actualLeanProofs:resultLog,incorrectRejected:true,editedProofCleared:true,persistedProgress:true,proofDownload:true,mobileOverflow:false,offlineUnverified:true,extraSourceRejected:true,externalOriginRejected:true,nonJsonRejected:true,pageErrors:errors},null,2));
  console.log('Proof browser checks passed: six actual Lean proofs, rejected gap, edit/reload status reset, export, mobile, keyboard, and offline honesty.');
}finally{await browser.close();}
