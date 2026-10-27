const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'experience/lamina-lab.js'),'utf8');
const css=fs.readFileSync(path.join(root,'experience/lamina-lab.css'),'utf8'),M=require('../experience/lamina-model.js');
const KEY='peq_lamina_v1';
function fixture(raw,blocked=false){
  const values=new Map([['peq_notes','keep notes'],['peq_spherometer_v1','keep spherometer'],['peq_measurements_v1','keep measurements'],['peq_cbse_study_v1','keep preferences']]);
  if(raw!==undefined)values.set(KEY,raw);
  const c={LaminaModel:M,localStorage:{getItem(k){if(blocked)throw Error('blocked');return values.get(k)||null;},setItem(k,v){if(blocked)throw Error('blocked');values.set(k,v);}},AppDesign:{afterView(){}},Expt:{hub(){}},go(){},addEventListener(){},document:{},location:{hash:''},Object,Number,String,Boolean,Array,JSON,Math,Set,Map};
  vm.createContext(c);vm.runInContext(source,c);return {api:c.LaminaLab,values,c};
}
function rawTrial(){const sample='copper',zero=2,step=1,g=M.grid(sample,step);return {sample,zero,step,counts:{full:g.full,majority:g.majority,half:g.half,boundary:g.boundary},readings:M.samples[sample].positions.map((_,position)=>Object.assign({position},M.reading(M.contact(sample,position),zero)))};}
test('Lamina notebook is isolated, versioned, and strips untrusted stored markup and derived results',()=>{
  const trial=Object.assign(rawTrial(),{title:'<img src=x onerror=alert(1)>',volumeCm3:999});
  const f=fixture(JSON.stringify({v:1,trials:[trial,{sample:'__proto__'}]}));
  assert.equal(f.api.key,KEY);assert.equal(f.api.read().trials.length,1);
  assert.equal(f.api.read().trials[0].title,undefined);assert.equal(f.api.read().trials[0].volumeCm3,undefined);
  assert.equal(f.values.get('peq_notes'),'keep notes');assert.equal(f.values.get('peq_spherometer_v1'),'keep spherometer');assert.equal(f.values.get('peq_measurements_v1'),'keep measurements');assert.equal(f.values.get('peq_cbse_study_v1'),'keep preferences');
});
test('Corrupt, unsupported and inaccessible notebook storage all fall back safely',()=>{
  for(const raw of ['{bad','null','[]','{}','"bad"','{"v":2,"trials":[]}'])assert.equal(fixture(raw).api.read().trials.length,0);
  assert.equal(fixture(undefined,true).api.read().trials.length,0);assert.equal(fixture().api.state(),null);
});
test('Apparatus remains additive and local with no automatic permission or service requests',()=>{
  assert.doesNotMatch(source,/getUserMedia|fetch\s*\(|XMLHttpRequest|Tutor\.ask|localStorage\.clear\s*\(/);
  assert.doesNotMatch(source,/localStorage\.(?:setItem|removeItem)\(['"]peq_(?:notes|spherometer|measurements|cbse)/);
  assert.match(source,/Expt\.hub=function/);assert.match(source,/#practical:lamina/);assert.match(source,/p11-a-e03/);assert.match(source,/data-lam-entry/);
});
test('Real student entry, feedback, signed correction and grid evidence controls exist',()=>{
  for(const id of ['lam-sample','lam-position','lam-step','lam-zero','lam-cell','lam-travel','lam-contact','lam-main','lam-division','lam-corrected','lam-reading','lam-lc','lam-error','lam-calibration','lam-full','lam-majority','lam-half','lam-boundary','lam-area','lam-count','lam-volume','lam-result','lam-export','lam-clear'])assert.ok(source.includes(id),id);
  for(const id of ['lam-reading-feedback','lam-calibration-feedback','lam-count-feedback','lam-result-feedback'])assert.ok(source.includes(id),id);
  assert.match(source,/type="range"/);assert.match(source,/type="number"/);assert.match(source,/Text equivalent|text equivalent/);assert.match(source,/confirm\(/);assert.match(source,/M\.csv\(/);
});
test('Source and portable artifact contain one ordered additive model and UI pair',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),builder=fs.readFileSync(path.join(root,'.github/build-experience.js'),'utf8');
  for(const [slot,file]of [['LAMINA-MODEL','lamina-model.js'],['LAMINA-LAB','lamina-lab.js']]){
    assert.match(builder,new RegExp("embed\\('"+slot+"','"+file.replace('.','\\.')+"'"));
    assert.equal(html.split('/* EXPERIENCE:'+slot+':START */').length-1,1);
    const embedded=html.split('/* EXPERIENCE:'+slot+':START */')[1].split('/* EXPERIENCE:'+slot+':END */')[0].trim().replace(/\r\n/g,'\n');
    assert.equal(embedded,fs.readFileSync(path.join(root,'experience',file),'utf8').trim().replace(/\r\n/g,'\n'));
  }
  assert.ok(html.indexOf('/* EXPERIENCE:LAMINA-MODEL:START */')<html.indexOf('/* EXPERIENCE:LAMINA-LAB:START */'));
  assert.ok(html.indexOf('/* EXPERIENCE:LAMINA-LAB:END */')<html.indexOf('Me.streakInit(); renderSide();'));
  assert.ok(builder.includes("'lamina-lab.css'"));assert.ok(html.includes(css.trim()));
});
