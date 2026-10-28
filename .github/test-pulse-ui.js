const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'experience/pulse-lab.js'),'utf8');
const modelSource=fs.readFileSync(path.join(root,'experience/pulse-model.js'),'utf8');
const css=fs.readFileSync(path.join(root,'experience/pulse-lab.css'),'utf8');
const M=require('../experience/pulse-model.js'),KEY='peq_pulse_v1';
function record(settings=M.defaults()) {
  const e=M.experiment(settings),result=M.check(settings,e.idealTimeS,{lengthM:settings.lengthM,roundTrips:settings.roundTrips,timeS:e.observedTimeS,distanceM:e.distanceM,speedMps:Number(e.speedMps.toFixed(2))});
  assert.equal(result.ok,true);return result.record;
}
function fixture(raw,blocked=false) {
  const values=new Map([['peq_notes','keep notes'],['peq_lamina_v1','keep lamina'],['peq_spherometer_v1','keep spherometer'],['peq_measurements_v1','keep instruments'],['peq_cbse_study_v1','keep preferences']]);
  if(raw!==undefined)values.set(KEY,raw);
  const listeners=new Map(),calls={gets:[],sets:[],routes:[],after:0,frames:0,services:0};
  const c={localStorage:{getItem(k){calls.gets.push(k);if(blocked)throw Error('denied');return values.get(k)||null;},setItem(k,v){calls.sets.push(k);if(blocked)throw Error('denied');values.set(k,v);}},
    AppDesign:{afterView(){calls.after++;}},main:{querySelector(){return null;}},
    go(view,id){calls.routes.push([view,id]);},location:{hash:''},document:{},
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
    requestAnimationFrame(){calls.frames++;return 1;},cancelAnimationFrame(){},
    fetch(){calls.services++;throw Error('Unexpected service request');},
    navigator:{mediaDevices:{getUserMedia(){calls.services++;throw Error('Unexpected camera request');}}}};
  c.window=c;vm.createContext(c);
  // Load both sources into the same realm, matching the portable app closure.
  // This respects the model's strict plain-object/prototype validation.
  vm.runInContext(modelSource,c);vm.runInContext(source,c);
  return {c,api:c.PulseLab,values,listeners,calls};
}
const plain=value=>JSON.parse(JSON.stringify(value));

test('Pulse notebook uses its own raw versioned key and strips untrusted text and derived results',()=>{
  const valid=record(),forged={...valid,title:'<img src=x onerror=alert(1)>',notes:'=HYPERLINK("bad")',speedMps:999,inputs:{...valid.inputs,formula:'=1+1'}};
  const f=fixture(JSON.stringify({v:1,trials:[forged,{...valid,setup:'__proto__'},{...valid,inputs:{...valid.inputs,timeS:999}}]}));
  assert.equal(f.api.key,KEY);assert.deepEqual(plain(f.api.read()),{v:1,trials:[valid]});
  assert.deepEqual(f.calls.gets,[KEY]);assert.deepEqual(f.calls.sets,[],'Reading must not rewrite stored notes');
  assert.equal(f.values.get('peq_notes'),'keep notes');assert.equal(f.values.get('peq_lamina_v1'),'keep lamina');
  assert.equal(f.values.get('peq_spherometer_v1'),'keep spherometer');assert.equal(f.values.get('peq_measurements_v1'),'keep instruments');assert.equal(f.values.get('peq_cbse_study_v1'),'keep preferences');
  assert.equal(f.api.read(),f.api.read(),'Session copy should remain available without repeated storage access');
});

test('Corrupt, missing, unsupported and denied storage fall back without changing other records',()=>{
  for(const raw of [undefined,'{bad','null','[]','{}','"bad"','{"v":2,"trials":[]}','{"v":1,"trials":"bad"}']) {
    const f=fixture(raw);assert.deepEqual(plain(f.api.read()),{v:1,trials:[]});assert.equal(f.api.state(),null);assert.deepEqual(f.calls.sets,[]);assert.equal(f.values.get('peq_notes'),'keep notes');
  }
  const denied=fixture(undefined,true);assert.deepEqual(plain(denied.api.read()),{v:1,trials:[]});assert.equal(denied.calls.gets.length,1);assert.equal(denied.api.read().trials.length,0);assert.equal(denied.calls.gets.length,1);
  assert.match(source,/Storage unavailable or invalid[\s\S]*export a copy before leaving/);
});

test('UI read path validates, deduplicates and caps the latest 40 distinct observations',()=>{
  const rows=[];for(const setup of ['A','B'])for(const lengthM of M.config.lengths)for(const roundTrips of M.config.roundTrips)for(let trial=0;trial<3;trial++)rows.push(record({setup,lengthM,roundTrips,trial}));
  const f=fixture(JSON.stringify({v:1,trials:[...rows,rows[0]]}));
  assert.deepEqual(plain(f.api.read()),M.validateNotebook({v:1,trials:[...rows,rows[0]]}));assert.equal(f.api.read().trials.length,40);assert.deepEqual(plain(f.api.read().trials.at(-1)),rows[0]);
  assert.match(source,/latest 40 distinct checked rows/);assert.match(source,/older rows are replaced when full/);assert.match(source,/M\.validateNotebook\(read\(\)\)/);
  assert.match(source,/M\.csv\(read\(\)\.trials\)/);assert.match(source,/if \(!confirm\('Clear only the pulse notebook/);
  assert.doesNotMatch(source,/localStorage\.(?:clear|removeItem)\s*\(/);assert.equal((source.match(/localStorage\.setItem\(KEY,/g)||[]).length,1);
});

test('Loading registers additive routes without rendering, writing, starting replay or requesting services',()=>{
  const f=fixture();assert.equal(f.api.state(),null);assert.equal(f.calls.frames,0);assert.equal(f.calls.services,0);assert.deepEqual(f.calls.gets,[]);assert.deepEqual(f.calls.sets,[]);
  assert.equal(f.listeners.get('hashchange').length,1);assert.equal(f.listeners.get('pagehide').length,1);
  f.c.go('concept','waves');assert.deepEqual(f.calls.routes,[['concept','waves']]);assert.equal(f.api.state(),null);
  f.c.AppDesign.afterView();assert.equal(f.calls.after,1,'Existing afterView still runs');
  f.c.location.hash='#home';f.listeners.get('hashchange')[0]();f.listeners.get('pagehide')[0]();assert.equal(f.calls.frames,0);
  assert.doesNotMatch(source,/getUserMedia|fetch\s*\(|XMLHttpRequest|Tutor\.ask|setInterval\s*\(/);
  assert.match(source,/#practical:pulse/);assert.match(source,/#practicals:9/);assert.match(source,/byId\('s9-e10'\)/);assert.match(source,/class="pulse-discovery"/);
  assert.doesNotMatch(source,/class="practical-benches/,'The Class 9 entry must not trigger legacy Class 11 instrument decorators');
});

test('Observation controls, model gating, explained feedback and separate ideal/captured clocks remain present',()=>{
  for(const id of ['pulse-setup','pulse-length','pulse-trips','pulse-trial','pulse-svg','pulse-wave','pulse-marker','pulse-clock','pulse-returns','pulse-timer','pulse-scrub','pulse-step','pulse-finish','pulse-play','pulse-restart','pulse-reading','pulse-read-length','pulse-read-trips','pulse-read-time','pulse-read-distance','pulse-read-speed','pulse-feedback','pulse-summary','pulse-export','pulse-clear','pulse-storage'])assert.ok(source.includes('id="'+id+'"')||source.includes("input('"+id+"',"),id);
  assert.match(source,/M\.check\(s\.settings, s\.elapsedS, values\)/);assert.match(source,/if \(!result\.ok\)[\s\S]*Not recorded/);assert.match(source,/trials\.push\(result\.record\)/);
  assert.match(source,/M\.summary\(rows, s\.settings\)/);assert.match(source,/not the mean of the three speeds/);assert.match(source,/Their mean is not zero/);
  assert.match(source,/frame\.complete \? fixed\(x\.observedTimeS\)/);assert.match(source,/fixed\(s\.elapsedS\) \+ ' s'/);
  assert.match(source,/Text equivalent of this journey/);assert.match(source,/pulse position, not a material particle/);assert.match(source,/N returns = 2N one-way journeys/);
});

test('Replay requires explicit Play, stops at the target, and cleans up navigation, hidden-tab and motion listeners',()=>{
  assert.match(source,/elapsedS: 0, playing: false/);assert.match(source,/if \(frame\.complete\) pause\(\)/);
  assert.match(source,/if \(!s\.playing \|\| !root\.isConnected \|\| document\.hidden \|\| media\.matches\)/);
  assert.match(source,/if \(media\.matches \|\| document\.hidden \|\| M\.frame\(s\.settings, s\.elapsedS\)\.complete\) return/);
  assert.match(source,/if \(raf\) cancelAnimationFrame\(raf\)/);assert.match(source,/s\.elapsedS \+= \(now - last\) \/ 1000/);
  assert.match(source,/document\.addEventListener\('visibilitychange', visibility\)/);assert.match(source,/document\.removeEventListener\('visibilitychange', visibility\)/);
  assert.match(source,/media\.addEventListener\('change', preference\)/);assert.match(source,/media\.removeEventListener\('change', preference\)/);
  assert.match(source,/function preference\(\) \{ if \(media\.matches\) pause\(\)/);assert.match(source,/function stop\(\) \{ if \(cleanup\) cleanup\(\)/);
  assert.match(source,/step="any"/,'Native End must reach non-decimal ideal endpoints');
  assert.match(source,/addEventListener\('pageshow',[\s\S]*event\.persisted && location\.hash === '#practical:pulse'\) go\('pulse'\)/,'Restored pages reattach scoped lifecycle listeners');
  assert.match(source,/go = function \(view, id\)[\s\S]*stop\(\);/);assert.match(source,/node\.textContent !== text/,'Unchanged role=status content must not be reannounced on each replay frame');
});

test('Style rules remain scoped, responsive and reduced-motion safe with native touch-sized controls',()=>{
  const rules=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{/g)].map(m=>m[1].trim()).filter(s=>!s.startsWith('@'));
  // Commas inside :is(...) are not selector-list boundaries.
  function selectors(rule){let depth=0,start=0,out=[];for(let i=0;i<rule.length;i++){if(rule[i]==='('||rule[i]==='[')depth++;if(rule[i]===')'||rule[i]===']')depth--;if(rule[i]===','&&depth===0){out.push(rule.slice(start,i));start=i+1;}}out.push(rule.slice(start));return out;}
  for(const rule of rules)for(const selector of selectors(rule))assert.match(selector,/\.pulse-/,'Unscoped rule: '+selector);
  assert.match(css,/min-height:44px/);assert.match(css,/:focus-visible/);assert.match(css,/@media\(max-width:420px\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/data-theme=light/);
  assert.doesNotMatch(css,/@keyframes|transition:\s*all/);assert.match(source,/type="range"/);assert.match(source,/type="number"/);assert.match(source,/role="region" tabindex="0"/);
  assert.match(source,/cbse-questionnaire\[open\],#cbse-entry\[open\]/,'Do not steal focus from first-visit setup');
  assert.match(source,/ielm104\.pdf#page=52/);assert.match(source,/ScienceSt_SecP1_2026-27\.pdf#page=19/);assert.match(source,/16-5-interference-of-waves/);
});

test('Portable source contains exactly one ordered model/UI pair and exact scoped stylesheet',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),builder=fs.readFileSync(path.join(root,'.github/build-experience.js'),'utf8');
  for(const [slot,file]of [['PULSE-MODEL','pulse-model.js'],['PULSE-LAB','pulse-lab.js']]) {
    assert.match(builder,new RegExp("embed\\('"+slot+"','"+file.replace('.','\\.')+"'"));
    const start='/* EXPERIENCE:'+slot+':START */',end='/* EXPERIENCE:'+slot+':END */';
    assert.equal(html.split(start).length-1,1);assert.equal(html.split(end).length-1,1);
    const embedded=html.split(start)[1].split(end)[0].trim().replace(/\r\n/g,'\n');
    assert.equal(embedded,fs.readFileSync(path.join(root,'experience',file),'utf8').trim().replace(/\r\n/g,'\n'));
  }
  assert.ok(html.indexOf('/* EXPERIENCE:PULSE-MODEL:START */')<html.indexOf('/* EXPERIENCE:PULSE-LAB:START */'));
  assert.ok(html.indexOf('/* EXPERIENCE:PULSE-LAB:END */')<html.indexOf('Me.streakInit(); renderSide();'));
  assert.ok(builder.includes("'pulse-lab.css'"));assert.ok(html.replace(/\r\n/g,'\n').includes(css.trim().replace(/\r\n/g,'\n')));
});
