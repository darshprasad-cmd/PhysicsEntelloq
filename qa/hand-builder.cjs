/* Synthetic landmarks travel through the production smoothing, recognizer and
 * builder. This does NOT validate a real webcam/model or human gesture accuracy. */
const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const live=process.argv.includes('--live'),root=path.join(__dirname,'..');
(async()=>{const browser=await chromium.launch();try{for(const width of [1366,850,390])for(const theme of ['dark','light']){
 const c=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
 if(!live)await c.route('https://physics.entelloq.com/**',r=>r.request().resourceType()==='document'?r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8')}):r.continue());
 await c.addInitScript(theme=>{localStorage.setItem('peq_entered','1');localStorage.setItem('peq_onboarded','1');localStorage.setItem('peq_theme',theme);window.cameraCalls=0;navigator.mediaDevices.getUserMedia=()=>{window.cameraCalls++;return Promise.reject(new DOMException('Camera denied for test','NotAllowedError'));};},theme);
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('https://physics.entelloq.com/?still&handBuilderQA='+Date.now());await p.locator('#pe-explore').click();await p.locator('[data-explore-go="sandbox"]').click();await p.locator('#studio-scene-select').selectOption('clear');
 const add=p.locator('[data-hand-mode="add"]');assert.ok(await add.isVisible());await add.focus();await p.keyboard.press('Enter');assert.equal(await add.getAttribute('aria-pressed'),'true');assert.equal(await p.evaluate(()=>window.__peqSbx.pie.cfg.buildMode),true);assert.equal(await p.locator('#sbx-pie-buildMode').isChecked(),true);assert.equal(await p.evaluate(()=>window.cameraCalls),0);
 const results=await p.evaluate(()=>{
  const api=window.__peqSbx,test=window.__peqPie,rect=document.querySelector('#sbx-c').getBoundingClientRect();let clock=performance.now()+1000;const original=performance.now.bind(performance);performance.now=()=>clock;
  function hand(x,y,pose){const pts=Array.from({length:21},()=>({x,y:y+20,z:0}));Object.assign(pts,{0:{x,y:y+80},4:{x:x-80,y:y+10},6:{x:x-35,y:y-25},8:{x:x-35,y:y-80},9:{x,y},10:{x,y:y-30},12:{x,y:y-90},14:{x:x+30,y:y-20},16:{x:x+30,y:y-75},18:{x:x+55,y},20:{x:x+55,y:y-50}});if(pose==='none'){pts[16].y=y+60;pts[20].y=y+60;}if(pose==='fist'){for(const i of [8,12,16,20])pts[i]={x:x+(i-12)*2,y:y+55};pts[4]={x:x-10,y:y+57};}return pts.map(v=>({x:v.x/rect.width,y:v.y/rect.height,z:0}));}
  function frames(pose,n,x,y,side){for(let i=0;i<n;i++){clock+=33;test.injectHand(hand(x,y,pose),side);}}
  const cases=[];try{
   for(const side of ['Left','Right'])for(let i=0;i<5;i++){
    api.pie.stop();api.pie.set('buildMode',true);const x=rect.width/2,y=rect.height/2,before=api.bodies().length;frames('palm',18,x,y,side);const a=-Math.PI/2+i*Math.PI*2/5;const dx=60*Math.cos(a),dy=60*Math.sin(a);frames('palm',16,x+dx,y+dy,side);const selected=test.filterState().radial.hot;
    frames('none',5,x+dx,y+dy,side);const transition=test.filterState().gest[side],armed=test.filterState().radial.side;frames('fist',12,x+dx,y+dy,side);const after=api.bodies().length,body=api.bodies()[after-1];frames('fist',24,x+dx,y+dy,side);
    cases.push({side,i,selected,transition,armed,delta:after-before,held:api.bodies().length-after,m:body&&body.m,q:body&&body.q});
   }
   // Losing the hand or switching action invalidates a pending wheel.
   api.pie.stop();api.pie.set('buildMode',true);const x=rect.width/2,y=rect.height/2;frames('palm',18,x,y,'Right');frames('palm',16,x,y-60,'Right');const n=api.bodies().length;for(let j=0;j<12;j++){clock+=33;api.pie.__inject({multiHandLandmarks:[],multiHandedness:[]});}const lost=test.filterState().radial.side;frames('fist',12,x,y-60,'Right');const noStaleAdd=api.bodies().length===n;
   api.pie.stop();return{cases,lost,noStaleAdd};
  }finally{performance.now=original;}
 });
 for(const r of results.cases){assert.equal(r.selected,r.i,JSON.stringify(r));assert.equal(r.transition,'none',JSON.stringify(r));assert.equal(r.armed,r.side,JSON.stringify(r));assert.equal(r.delta,1,JSON.stringify(r));assert.equal(r.held,0);assert.equal(r.m,[8,400,12,12,1600][r.i]);if(r.i===2||r.i===3)assert.equal(r.q,r.i===2?70:-70);}
 assert.equal(results.lost,null);assert.ok(results.noStaleAdd);assert.equal(await p.evaluate(()=>window.__peqSbx.bodies().length),10);
 await p.locator('#sbx-undo').click();assert.equal(await p.evaluate(()=>window.__peqSbx.bodies().length),9);await p.locator('#sbx-redo').click();assert.equal(await p.evaluate(()=>window.__peqSbx.bodies().length),10);
 await p.locator('[data-hand-mode="move"]').click();assert.equal(await p.locator('#sbx-pie-buildMode').isChecked(),false);await p.locator('#studio-tab-build').click();await p.locator('[data-studio-rail="controls"]').click();await p.locator('#sbx-advt').click();await p.locator('#sbx-pie-buildMode').check();await p.locator('#studio-tab-hands').click();assert.equal(await add.getAttribute('aria-pressed'),'true');
 await p.locator('[data-studio-scene="catcradle"]').click();assert.equal(await p.locator('.studio-cradle-hint').isVisible(),false);await p.locator('[data-hand-mode="move"]').click();assert.ok(await p.locator('.studio-cradle-hint').isVisible());assert.equal(await p.evaluate(()=>window.cameraCalls),0);
 await p.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const audit=await p.evaluate(async()=>({overflow:document.querySelector('#main-scroll').scrollWidth>document.querySelector('#main-scroll').clientWidth+1,violations:(await axe.run('.studio-hand-guide',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))}));assert.equal(audit.overflow,false);assert.deepEqual(audit.violations,[]);assert.deepEqual(errors,[]);
 // Explicit start only: denied permission must return to an off/retry state.
 await p.evaluate(()=>{window.Hands=class{setOptions(){}onResults(){}close(){return Promise.resolve();}};});await p.locator('#sbx-hand').click();await p.waitForFunction(()=>window.cameraCalls===1&&!window.__peqSbx.pie.isOn());assert.equal(await p.locator('#sbx-hand').getAttribute('aria-pressed'),'false');
 await p.locator('.studio-hand-guide').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(__dirname,'results',`hand-builder-${live?'live':'local'}-${width}-${theme}.png`)});await c.close();console.log(width,theme,'10 filtered gesture additions, undo, loss cancellation, mode sync, keyboard, camera denial and accessibility passed');
 }}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
