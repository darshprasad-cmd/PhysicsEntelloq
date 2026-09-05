const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'}),results=[];
try{
 await page.goto('https://physics.entelloq.com/?landing&still&a11y',{waitUntil:'load'});
 async function scan(name,selector){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const r=await page.evaluate(async selector=>{const a=await axe.run(selector,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {passes:a.passes.length,violations:a.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))};},selector);results.push({name,...r});console.log(name,JSON.stringify(r));}
 await scan('Launch','#lnd');await page.getByRole('button',{name:'Enter the Physics Lab',exact:true}).first().click();await page.locator('.cc-home').waitFor();await scan('Command centre','.cc-home');await page.locator('#cc-start').click();await page.locator('#cr-lab').waitFor();await scan('Cradle instrument','#cr-lab');await scan('Cradle stage','.sbx-stage');
}finally{fs.writeFileSync(path.join(__dirname,'results/accessibility.json'),JSON.stringify(results,null,2));await browser.close();}if(results.some(r=>r.violations.length))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
