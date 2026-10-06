/* Optional, bounded real-provider check (three requests). Not a correctness benchmark. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
(async()=>{const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});
 await context.route('https://physics.entelloq.com/**',r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8')}):r.continue());
 await context.addInitScript(()=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');});
 const page=await context.newPage(),responses=[];
 page.on('response',async r=>{if(r.url().includes('groq-proxy')){try{if(r.request().postDataJSON()?.stream){const source=await r.text();let content='';for(const line of source.split('\n'))if(line.startsWith('data: ')&&line.slice(6)!=='[DONE]'){try{content+=JSON.parse(line.slice(6)).choices?.[0]?.delta?.content||'';}catch{}}responses.push({status:r.status(),stream:true,content});}else{const j=await r.json();responses.push({status:r.status(),content:j.choices?.[0]?.message?.content||null});}}catch{}}});
 await page.goto('https://physics.entelloq.com/?still&modelAnswerSample=1');
 async function go(name){await page.locator('#pe-explore').click();await page.locator('[data-explore-go="'+name+'"]').click();}
 await go('solve');await page.locator('#sv-input').fill('A ball is launched at 20 m/s at 30 degrees above horizontal and lands at the same height. Neglect air resistance and use g = 9.8 m/s^2. Find the range and maximum height. Explain with a diagram.');await page.locator('#sv-go').click();await page.locator('.sv-result,.sv-err').waitFor({timeout:60000});
 const solve=await page.locator('#sv-out').innerText(),solveMath=await page.locator('#sv-out math').count(),solveErrors=await page.locator('#sv-out .answer-math-error').count();
 await go('practice');await page.locator('.pr-pick[data-k="electrostatics"]').click();await page.locator('.pr-opt').first().waitFor({timeout:60000});await page.locator('.pr-opt').first().click();const practice=await page.locator('.pr-card').innerText(),practiceErrors=await page.locator('#pr-exp .answer-math-error').count();
 await page.locator('#tutor-fab').click();await page.locator('#tu-q').fill('Explain why the maximum range of an ideal level-ground projectile is at 45 degrees. Use equations and a diagram.');await page.locator('#tu-q').press('Enter');await page.locator('#tu-thread .bub.a .answer-prose').waitFor({timeout:60000});await page.waitForFunction(()=>!document.querySelector('#tu-thread .cur'),{},{timeout:60000});
 const tutor=await page.locator('#tu-thread .bub.a').last().innerText(),tutorMath=await page.locator('#tu-thread math').count(),tutorErrors=await page.locator('#tu-thread .answer-math-error').count();
 const report={solve,solveMath,solveErrors,practice,practiceErrors,tutor,tutorMath,tutorErrors,responses};fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});fs.writeFileSync(path.join(__dirname,'results/model-answer-sample.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
