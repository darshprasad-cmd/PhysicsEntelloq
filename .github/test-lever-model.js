'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../experience/lever-model.js');
const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
const round=value=>Math.round((value+Number.EPSILON)*100)/100;
const settings=(patch={})=>({...M.defaults(),...patch});
function balanced(patch={}){const s=settings({tared:true,attached:true,...patch});s.effortN=round(s.loadN*(50-s.loadCm)/(s.effortCm-50));return s;}
function record(patch={}){const s=balanced(patch);return M.check(s,{loadN:s.loadN,effortN:s.effortN,ma:round(s.loadN/s.effortN)}).record;}

test('pure global and CommonJS API supplies fresh defaults and explicit ideal-model limits',()=>{
  const source=fs.readFileSync(require.resolve('../experience/lever-model.js'),'utf8'),context={};vm.runInNewContext(source,context);
  assert.equal(context.PeqLeverModel.defaults().zeroN,.2);assert.equal(typeof context.document,'undefined');
  assert.doesNotMatch(source,/localStorage|fetch\(|getUserMedia|Math\.random|Date\.now/);
  for(const value of[M,M.constants,M.constants.LOADS_N,M.constants.LOAD_POSITIONS_CM,M.constants.EFFORT_POSITIONS_CM,M.limits])assert.ok(Object.isFrozen(value));
  const first=M.defaults();first.loadN=2;assert.equal(M.defaults().loadN,4);
  assert.deepEqual(M.defaults(),{loadN:4,loadCm:30,effortCm:80,effortN:0,zeroN:.2,tared:false,attached:false});
  assert.ok(M.limits.some(value=>/residual moment/.test(value)));assert.ok(M.limits.some(value=>/not.*calibrated/.test(value)));assert.ok(M.limits.some(value=>/completion/.test(value)));
});

test('strict settings reject coercion, inherited/missing fields, getters, out-of-range and off-grid effort',()=>{
  const base=Object.freeze(settings());assert.deepEqual(M.validSettings(base),base);assert.notEqual(M.validSettings(base),base);
  for(const bad of[null,undefined,{},[],Object.create(base),{...base,loadN:'4'},{...base,loadN:3},{...base,loadCm:50},{...base,effortCm:50},{...base,effortCm:85},{...base,zeroN:.1},{...base,zeroN:NaN},{...base,tared:1},{...base,attached:'true'},{...base,effortN:-.01},{...base,effortN:20.01},{...base,effortN:1.334},{...base,effortN:Infinity},{...base,effortN:'1.33'},{...base,extra:true}]){assert.equal(M.validSettings(bad),null);assert.equal(M.experiment(bad),null);assert.equal(M.check(bad,{}).ok,false);}
  for(const key of Object.keys(base)){const missing={...base};delete missing[key];assert.equal(M.validSettings(missing),null);}
  let accessed=false;const getter={...base};Object.defineProperty(getter,'effortN',{get(){accessed=true;return 4;}});assert.equal(M.validSettings(getter),null);assert.equal(accessed,false);
  assert.equal(M.validSettings(settings({effortN:20})).effortN,20);assert.equal(Object.is(M.validSettings(settings({effortN:-0,zeroN:-0})).effortN,-0),false);
});

test('all 36 configurations have independently computed arms, effort, advantage and moments in SI units',()=>{
  let count=0;
  for(const loadN of[2,4,6])for(const loadCm of[20,30,40])for(const effortCm of[60,70,80,90]){
    const s=balanced({loadN,loadCm,effortCm}),e=M.experiment(s),loadArm=50-loadCm,effortArm=effortCm-50;
    assert.equal(e.loadArmCm,loadArm);assert.equal(e.effortArmCm,effortArm);close(e.idealEffortN,loadN*loadArm/effortArm);close(e.idealMA,effortArm/loadArm);assert.equal(e.roundedEffortN,s.effortN);
    close(e.loadMomentNm,loadN*loadArm*.01);close(e.effortMomentNm,s.effortN*effortArm*.01);close(e.residualMomentNm,e.effortMomentNm-e.loadMomentNm);
    assert.equal(e.balanced,true);assert.equal(e.direction,0);close(e.actualMA,loadN/s.effortN);assert.ok(Math.abs(e.residualMomentNm)<=.005*effortArm/100+1e-12);
    assert.equal(M.check(s,{loadN,effortN:s.effortN,ma:round(loadN/s.effortN)}).ok,true);count++;
  }
  assert.equal(count,36);assert.equal(M.experiment(balanced({loadN:6,loadCm:20,effortCm:60})).roundedEffortN,18);
});

test('nearest representable balance does not erase residual torque or replace measured MA with ideal arm ratio',()=>{
  const s=balanced({loadN:4,loadCm:40,effortCm:80}),e=M.experiment(s);assert.equal(s.effortN,1.33);assert.equal(e.balanced,true);close(e.idealEffortN,4/3);assert.equal(e.idealMA,3);close(e.actualMA,4/1.33);close(e.residualMomentNm,-.001);
  assert.equal(M.check(s,{loadN:4,effortN:1.33,ma:3.01}).ok,true);const wrong=M.check(s,{loadN:4,effortN:1.33,ma:3});assert.equal(wrong.ok,false);assert.match(wrong.errors.join(' '),/actual 0.01 N effort/);
  for(const loadN of[2,4,6])for(const loadCm of[20,30,40])for(const effortCm of[60,70,80,90]){
    const base=balanced({loadN,loadCm,effortCm});
    for(const [delta,direction]of[[-.01,-1],[.01,1]]){const e=M.experiment({...base,effortN:round(base.effortN+delta)});assert.equal(e.balanced,false);assert.equal(e.direction,direction);assert.equal(e.actualMA,null);}
  }
});

test('zero offsets affect indications but not forces or moments; detached meter applies no effort',()=>{
  for(const zeroN of[-.2,0,.2])for(const tared of[false,true])for(const attached of[false,true]){
    const s=settings({effortN:2.67,zeroN,tared,attached}),e=M.experiment(s);
    assert.equal(e.readingN,round((attached?2.67:0)+(tared?0:zeroN)));assert.equal(e.zeroErrorN,tared?0:zeroN);assert.equal(e.correctedReadingN,attached?2.67:0);assert.equal(e.correctable,true);
    close(e.effortMomentNm,attached?.801:0);close(e.loadMomentNm,.8);
    if(!attached){assert.equal(e.balanced,false);assert.equal(e.direction,-1);assert.equal(e.actualMA,null);}
  }
  assert.equal(M.experiment(settings({zeroN:-.2})).readingN,-.2);assert.equal(M.experiment(settings({zeroN:.2,tared:true})).readingN,0);
  const s=balanced();assert.equal(M.experiment({...s,tared:false}).balanced,true,'physical force balance is separate from meter preparation');assert.equal(M.check({...s,tared:false},{loadN:4,effortN:2.87,ma:1.39}).ok,false);
});

test('checking requires tare, attachment and balance with reasoned feedback, never an empty or forged answer',()=>{
  const s=balanced(),answer={loadN:4,effortN:2.67,ma:1.5};assert.equal(M.check(s,answer).ok,true);
  assert.match(M.check({...s,tared:false},answer).errors.join(' '),/unloaded zero/);assert.match(M.check({...s,attached:false},answer).errors.join(' '),/Attach/);assert.match(M.check({...s,effortN:2.68},answer).errors.join(' '),/balance setting/);
  for(const bad of[null,undefined,{},[],Object.create(answer),{...answer,loadN:''},{...answer,effortN:'2.67'},{...answer,ma:'1.50'},{...answer,ma:NaN},{...answer,ma:Infinity},{...answer,ma:1.498},{...answer,effortN:2.6667},{...answer,expected:true},{...answer,loadN:0},{...answer,effortN:0},{...answer,ma:0}]){const r=M.check(s,bad);assert.equal(r.ok,false);assert.equal(r.record,null);assert.ok(r.errors.length);}
  let called=false;const accessor={loadN:4,effortN:2.67,get ma(){called=true;return 1.5;}};assert.equal(M.check(s,accessor).ok,false);assert.equal(called,false);
  assert.match(M.check(s,{...answer,loadN:2}).errors.join(' '),/selected load in newtons/);assert.match(M.check(s,{...answer,effortN:2.87}).errors.join(' '),/indicated, tared/);
});

test('records reconstruct checked numeric state and identity, not caller-supplied strings or conclusions',()=>{
  const r=record();assert.equal(r.id,'4:30:80');assert.equal(r.provenance,'ideal_lever_rehearsal');assert.deepEqual(r.readings,{loadN:4,effortN:2.67,ma:1.5});
  const forged={...r,id:'=HYPERLINK("bad")',provenance:'physical_experiment'};assert.deepEqual(M.validateRecord(forged),r);
  for(const bad of[null,{},[],Object.create(r),{...r,notes:'private draft'},{...r,mastery:true},{...r,settings:{...r.settings,tared:false}},{...r,settings:{...r.settings,attached:false}},{...r,settings:{...r.settings,effortN:3}},{...r,readings:{...r.readings,ma:2}},{...r,readings:{...r.readings,effortN:'2.67'}},{...r,readings:{...r.readings,claimedCorrect:true}}])assert.equal(M.validateRecord(bad),null);
  const clone=M.validateRecord(r);clone.settings.loadN=999;clone.readings.ma=999;assert.equal(r.settings.loadN,4);assert.equal(r.readings.ma,1.5);
});

test('same load and positions replace a trial regardless of zero-offset choice; all outputs are defensive copies',()=>{
  let book=M.upsert(null,record());assert.equal(book.v,1);assert.equal(book.trials.length,1);
  const original=structuredClone(book);book=M.upsert(book,record({zeroN:-.2}));assert.equal(book.trials.length,1);assert.equal(book.trials[0].settings.zeroN,-.2);assert.equal(original.trials[0].settings.zeroN,.2);
  book=M.upsert(book,record({effortCm:90}));assert.equal(book.trials.length,2);const fresh=M.validateNotebook(book);fresh.trials[0].settings.loadN=99;fresh.trials[1].readings.ma=99;assert.notEqual(book.trials[0].settings.loadN,99);assert.notEqual(book.trials[1].readings.ma,99);
  assert.deepEqual(M.upsert(book,{bad:true}),book);assert.notEqual(M.upsert(book,null),book);
  const all=[];for(const loadN of[2,4,6])for(const loadCm of[20,30,40])for(const effortCm of[60,70,80,90])all.push(record({loadN,loadCm,effortCm}));
  const checked=M.validateNotebook({v:1,trials:[...all,...all]});assert.equal(checked.trials.length,36);assert.ok(checked.trials.length<=40);assert.equal(new Set(checked.trials.map(r=>r.id)).size,36);
});

test('notebook parsing bounds validation work and rejects bad versions, inherited properties, sparse entries and accessors',()=>{
  const r=record();for(const invalid of[null,undefined,{},[],{v:2,trials:[r]},{v:'1',trials:[r]},{v:1,trials:'bad'},Object.create({v:1,trials:[r]}),{v:1,trials:[r],mastery:100}])assert.deepEqual(M.validateNotebook(invalid),{v:1,trials:[]});
  assert.equal(M.validateNotebook({v:1,trials:[r,...Array(200).fill(null)]}).trials.length,0);
  assert.equal(M.validateNotebook({v:1,trials:Array(200).fill(r)}).trials.length,1);
  const sparse=new Array(20);sparse[19]=r;assert.equal(M.validateNotebook({v:1,trials:sparse}).trials.length,1);
  let called=false;const entries=[];Object.defineProperty(entries,'0',{get(){called=true;return r;}});assert.equal(M.validateNotebook({v:1,trials:entries}).trials.length,0);assert.equal(called,false);
});

test('comparison groups only distinct effort arms at fixed load and load arm without averages or artificial repeats',()=>{
  const rows=[record({effortCm:60}),record({effortCm:70}),record({effortCm:80}),record({effortCm:80,zeroN:-.2}),record({loadN:6,effortCm:80}),record({loadCm:40,effortCm:80})];
  const groups=M.summary({v:1,trials:rows});assert.equal(groups.length,3);const matched=groups.find(g=>g.loadN===4&&g.loadCm===30);assert.equal(matched.count,3);assert.equal(matched.comparisonReady,true);assert.deepEqual(matched.points.map(p=>p.effortArmCm),[10,20,30]);assert.deepEqual(matched.points.map(p=>p.effortN),[8,4,2.67]);
  assert.ok(matched.points[0].ma<matched.points[1].ma&&matched.points[1].ma<matched.points[2].ma);assert.equal(Object.hasOwn(matched,'mean'),false);assert.match(matched.limitation,/no average/);
  assert.equal(groups.filter(g=>!g.comparisonReady).length,2);assert.deepEqual(M.summary(null),[]);
});

test('CSV exports revalidated SI-labelled raw readings and residual torque without formulas or private stored text',()=>{
  const r=record({loadCm:40,effortCm:80,zeroN:-.2}),text=M.csv({v:1,trials:[{...r,id:'=1+2',provenance:'=BAD()'},r,{...r,readings:{...r.readings,ma:'=SUM(1,2)'}}]});
  const lines=text.trim().split('\r\n');assert.equal(lines.length,2);assert.match(lines[0],/load_arm_cm.*applied_effort_N.*residual_moment_Nm/);assert.equal(lines[1],'4,40,80,10,30,1.33,1.33,-0.20,1,3.01,0.4000,0.3990,-0.0010,ideal_lever_rehearsal');assert.doesNotMatch(text,/BAD|SUM|=1\+2/);assert.ok(text.endsWith('\r\n'));assert.equal(M.csv(null).trim().split('\r\n').length,1);
});
