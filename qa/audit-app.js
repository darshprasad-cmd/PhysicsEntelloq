const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const phase=process.argv[2]||'design-before',out=path.join(__dirname,'results');
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true});try{for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});await context.addInitScript(()=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://physics.entelloq.com/?still&designAudit='+phase,{waitUntil:'domcontentloaded',timeout:45000});
 const records=[];for(const route of ['home','universe','learn','lesson','solve','practice','lab','research','progress','settings']){
  if(route==='lesson'){await page.locator('#main [data-link="domain:mechanics"]').first().click();await page.locator('#main [data-link="lesson:newton-laws"]').first().click();}
  else await page.locator('[data-go="'+route+'"]').first().evaluate(el=>el.click());
  await page.waitForTimeout(250);await page.screenshot({path:path.join(out,phase+'-'+device+'-'+route+'.png')});
  records.push(await page.evaluate(route=>({route,bodyClasses:document.body.className,headStyles:[...document.querySelectorAll('style[id]')].map(x=>x.id),main:document.querySelector('#main').innerHTML.slice(0,40000),buttons:[...document.querySelectorAll('#main button')].slice(0,20).map(e=>({t:e.textContent,c:e.className})),fixed:[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).position==='fixed'&&e.getBoundingClientRect().width>0).slice(0,25).map(e=>({id:e.id,c:e.className}))}),route));
 }fs.writeFileSync(path.join(out,phase+'-'+device+'.json'),JSON.stringify({records,errors},null,2));console.log(device,'screens',records.length,'errors',errors);await context.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
