/* Production UI, deterministic provider fixtures: rendering is tested without
 * asserting that a generated model answer is always scientifically correct. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..'),live=process.argv.includes('--live'),env=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'experience/practice-answers.js'),'utf8'),env);
const charge=JSON.parse(JSON.stringify(env.PracticeAnswers.coulomb()));
const solve={problem:'A ball is launched at 20 m/s at 30° above level ground. Find its range and maximum height.',given:['\\(v_0=20\\,\\mathrm{m/s}\\)','\\(\\theta=30^\\circ\\)','\\(g=9.8\\,\\mathrm{m/s^2}\\)'],assumptions:'Neglect air resistance and assume uniform gravity. The ball returns to its launch height.',concepts:[{name:'Constant-acceleration kinematics',why:'Gravity changes the vertical velocity while the horizontal velocity remains constant.'}],steps:[
 {title:'Resolve the initial velocity',reasoning:'Choose horizontal and upward vertical axes. The launch angle is measured from the horizontal, so cosine gives the horizontal component and sine gives the vertical component.',math:'v_{0x}=20\\cos30^\\circ=10\\sqrt{3}\\,\\mathrm{m/s},\\quad v_{0y}=20\\sin30^\\circ=10\\,\\mathrm{m/s}'},
 {title:'Find the time of flight',reasoning:'The vertical displacement is zero at landing. Factor the displacement equation and use the nonzero root; the zero root represents the launch instant.',math:'0=v_{0y}T-\\frac12gT^2\\quad\\Rightarrow\\quad T=\\frac{2v_{0y}}{g}=\\frac{20}{9.8}\\,\\mathrm{s}'},
 {title:'Calculate range and maximum height',reasoning:'Multiply the constant horizontal velocity by the flight time. At the highest point only the vertical velocity is zero; use that condition to find the height.',math:'R=v_{0x}T\\approx35.3\\,\\mathrm{m},\\qquad H=\\frac{v_{0y}^2}{2g}\\approx5.10\\,\\mathrm{m}'}],answer:'The range is \\(35.3\\,\\mathrm{m}\\); the maximum height is \\(5.10\\,\\mathrm{m}\\).',check:'Both expressions have dimensions of length. As the launch angle approaches zero on level ground, flight time and height approach zero.',diagram:{type:'projectile-level'},intuition:'Horizontal motion carries the ball forward while gravity first slows its upward motion and then speeds its descent.'};
const tutor='## How range follows from the motion\n\n**Separate the two directions.** With no drag, horizontal velocity is constant, while gravity produces downward vertical acceleration. For landing at the launch height:\n\n\\[T=\\frac{2v_0\\sin\\theta}{g}\\]\n\n\\[R=v_0\\cos\\theta\\,T=\\frac{v_0^2}{g}\\sin(2\\theta)\\]\n\n* **Maximum range:** \\(\\theta=45^\\circ\\), because \\(\\sin(2\\theta)\\) reaches 1. This does not apply unchanged to unequal landing heights or motion with drag.\n\n```physics-diagram\n{"type":"projectile-level"}\n```';
fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});
(async()=>{const browser=await chromium.launch();let passed=0;
 try{for(const width of (process.argv.includes('--smoke')?[1366,390]:[1366,768,390,320]))for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];let invalid=false;
  page.on('pageerror',e=>errors.push(e.message));
  if(!live)await context.route('https://physics.entelloq.com/**',r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8')}):r.continue());
  await context.addInitScript(theme=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');localStorage.setItem('peq_theme',theme);},theme);
  await context.route('https://groq-proxy.physicsedge.workers.dev/**',async route=>{
   const b=route.request().postDataJSON();
   if(b.stream){const chunks=tutor.match(/[\s\S]{1,21}/g);return route.fulfill({contentType:'text/event-stream',body:chunks.map(content=>'data: '+JSON.stringify({choices:[{delta:{content}}]})+'\n\n').join('')+'data: [DONE]\n\n'});}
   const result=b.messages[0].content.includes('multiple-choice')?(invalid?{...charge,a:0}:charge):solve;
   await route.fulfill({contentType:'application/json',body:JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]})});
  });
  await page.goto('https://physics.entelloq.com/?still&answerQA='+Date.now());
  async function go(name){await page.locator('#pe-explore').click();await page.locator('[data-explore-go="'+name+'"]').click();}
  async function checkSurface(selector){
   const el=page.locator(selector);await el.waitFor();assert.equal(await el.locator('.answer-math-error').count(),0,'All fixture equations typeset');
   assert.doesNotMatch(await el.innerText(),/\\frac|\\theta|\\\[|\*\*|```physics-diagram/);
   assert.equal(await page.locator('#main-scroll').evaluate(e=>e.scrollWidth>e.clientWidth+2),false,'No page-wide horizontal overflow');
   for(const m of await el.locator('math').all()){const b=await m.boundingBox();assert.ok(b&&b.height>10,'Native MathML is visible');}
   const diagram=el.locator('svg[role="img"]');assert.equal(await diagram.count(),1);assert.ok((await diagram.getAttribute('aria-label')).length>30);
  }
  await go('solve');await page.locator('#sv-input').fill(solve.problem);await page.locator('#sv-go').click();await page.locator('.sv-result').waitFor();await checkSurface('#sv-out');
  const equation=page.locator('#sv-out .answer-display').first();await equation.focus();assert.equal(await equation.evaluate(e=>e===document.activeElement),true);
  await page.locator('.sv-result').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'results',`answers-${live?'live':'local'}-${width}-${theme}-solve.png`)});
  await go('practice');await page.locator('.pr-pick[data-k="electrostatics"]').click();await page.locator('.pr-opt').nth(1).click();await page.locator('#pr-exp.on').waitFor();assert.match(await page.locator('#pr-exp').innerText(),/Correct — here is why/);await checkSurface('#pr-exp');
  invalid=true;await page.locator('#pr-next').click();await page.locator('.pr-opt').nth(0).click();await page.locator('#pr-exp.on').waitFor();assert.match(await page.locator('#pr-exp').innerText(),/Not quite/);assert.match(await page.locator('#pr-exp').innerText(),/9.38 N/);invalid=false;
  await page.locator('#pr-exp').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'results',`answers-${live?'live':'local'}-${width}-${theme}-practice.png`)});
  await page.locator('#tutor-fab').click();await page.locator('#tu-q').fill('Explain projectile range.');await page.locator('#tu-q').press('Enter');await page.locator('#tu-thread .answer-diagram').waitFor();await checkSurface('#tu-thread .bub.a:last-child');
  assert.equal(await page.locator('#tu-thread .bub.a:last-child strong').count(),2);assert.equal(await page.locator('#tu-thread .bub.a:last-child strong').first().innerText(),'Separate the two directions.');assert.equal(await page.locator('#tu-thread').evaluate(e=>e.scrollWidth>e.clientWidth+2),false,'Tutor stays within panel');
  await page.locator('#tu-thread').evaluate(e=>e.scrollTop=0);await page.screenshot({path:path.join(__dirname,'results',`answers-${live?'live':'local'}-${width}-${theme}-tutor.png`)});
  assert.deepEqual(errors,[]);await context.close();passed++;console.log(width,theme,'Solve / Practice / Tutor / arithmetic rejection passed');
 }console.log(JSON.stringify({live,passed,provider:'deterministic fixtures; no live model claim'}));}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
