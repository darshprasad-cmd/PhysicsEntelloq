const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../experience/spherometer-model.js');
const near=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} should equal ${expected}`);
function raw(sample='convex',position=0){return {sample,position,flatTicks:M.contact(sample,position,'flat'),curveTicks:M.contact(sample,position,'curve'),legs:M.samples[sample].legReadings.slice()};}

test('Spherometer scale is one millimetre per turn and one hundred divisions, including every rollover',()=>{
  assert.deepEqual(M.config,{pitchMm:1,divisions:100,tickMm:.01,minTicks:0,maxTicks:700});
  for(let ticks=0;ticks<=700;ticks++){const r=M.reading(ticks);assert.equal(r.ticks,ticks);assert.equal(r.mainMm*100+r.division,ticks);assert.ok(r.division>=0&&r.division<100);near(r.mm,ticks*.01);}
  assert.deepEqual(M.reading(299),{ticks:299,mainMm:2,division:99,mm:2.99});
  assert.deepEqual(M.reading(300),{ticks:300,mainMm:3,division:0,mm:3});
  for(const invalid of [-1,701,.2,NaN,Infinity,null,'300'])assert.throws(()=>M.reading(invalid),RangeError);
});

test('Lowering is contact-limited and withdrawing remains possible without surface penetration',()=>{
  assert.deepEqual(M.turn(0,250,250),{ticks:250,contact:true,limited:false});
  assert.deepEqual(M.turn(249,251,250),{ticks:250,contact:true,limited:true});
  assert.deepEqual(M.turn(250,249,250),{ticks:249,contact:false,limited:false});
  assert.deepEqual(M.turn(250,-20,250),{ticks:0,contact:false,limited:true});
  assert.equal(M.turn(0,99.6,250).ticks,100);
  for(let target=0;target<=700;target+=7)for(let requested=-1;requested<=701;requested+=13){const r=M.turn(0,requested,target);assert.ok(r.ticks>=0&&r.ticks<=target);assert.equal(r.contact,r.ticks===target);}
  for(const args of [[null,10,20],[0,Infinity,20],[0,'10',20],[0,10,-1],[701,1,20],[0,10,2.5]])assert.throws(()=>M.turn(...args),RangeError);
});

test('Paired difference cancels a constant zero offset and is symmetric for convex versus concave depth',()=>{
  assert.equal(M.sagitta(300,250),.5);assert.equal(M.sagitta(250,300),.5);
  for(let offset=-200;offset<=200;offset++)assert.equal(M.sagitta(300+offset,250+offset),.5);
  assert.equal(M.sagitta(300,300),0);
  for(const invalid of [-1,701,NaN,Infinity,'300',300.5])assert.throws(()=>M.sagitta(invalid,250),RangeError);
});

test('Equilateral-leg radius includes the sagitta term and enforces the shallow spherical-cap domain',()=>{
  assert.equal(M.radius(30,.5),300.25);assert.equal(M.radius(30,.75),200.375);
  assert.notEqual(M.radius(30,.5),30*30/(6*.5));
  const boundary=30/Math.sqrt(3);near(M.radius(30,boundary),boundary);
  near(M.radius(60,1),2*M.radius(30,.5));
  for(const args of [[30,0],[0,.5],[-30,.5],[30,-.5],[30,18],[NaN,.5],[30,Infinity],['30',.5],[30,null],[1,Number.MIN_VALUE]])assert.throws(()=>M.radius(...args),RangeError);
});

test('Every surface has four paired placements and a mean 30 mm equilateral-support estimate',()=>{
  for(const sample of Object.keys(M.samples)){
    const s=M.samples[sample];assert.equal(s.flatTicks.length,4);assert.equal(s.curveTicks.length,4);assert.equal(s.legReadings.reduce((a,b)=>a+b,0)/3,30);
    for(let position=0;position<4;position++){const r=M.buildTrial(raw(sample,position));assert.ok(r);assert.equal(r.l,30);assert.equal(r.h,M.sagitta(r.flatTicks,r.curveTicks));assert.equal(r.R,M.radius(r.l,r.h));assert.equal(M.contact(sample,position),r.flatTicks);assert.equal(sample==='convex',r.curveTicks<r.flatTicks);}
  }
  assert.ok(Object.isFrozen(M.config));assert.ok(Object.isFrozen(M.samples));assert.ok(Object.isFrozen(M.samples.convex.legReadings));
});

test('Unknown and inherited surface identifiers, invalid positions and off-contact trial records are rejected',()=>{
  for(const id of ['__proto__','constructor','toString','',null]){assert.throws(()=>M.contact(id,0),RangeError);assert.equal(M.buildTrial({...raw(),sample:id}),null);assert.equal(M.summary([raw()],id),null);}
  for(const position of [-1,4,.5,NaN,'1']){assert.throws(()=>M.contact('convex',position),RangeError);assert.equal(M.buildTrial({...raw(),position}),null);}
  assert.throws(()=>M.contact('convex',0,'skin'),RangeError);
  for(const value of [null,{},Object.create(raw()),{...raw(),flatTicks:299},{...raw(),curveTicks:249},{...raw(),legs:[30,30,30]},{...raw(),legs:[30,30.5]},{...raw(),legs:new Array(3)},{...raw(),legs:[30,30.5,Infinity]},{...raw(),legs:['30',30.5,29.5]}])assert.equal(M.buildTrial(value),null);
});

test('Stored results are always recomputed from canonical raw input and do not mutate the supplied record',()=>{
  const value={...raw(),l:-400,h:-10,R:1000000,name:'=HYPERLINK("bad")',notes:'private text'};
  const trial=M.buildTrial(value);assert.equal(trial.R,300.25);assert.equal(trial.l,30);assert.equal(trial.h,.5);assert.equal(value.R,1000000);
  const book=M.validateNotebook({v:1,trials:[value]});assert.deepEqual(book,{v:1,trials:[raw()]});
  assert.notEqual(book.trials[0].legs,value.legs);book.trials[0].legs[0]=7;assert.equal(value.legs[0],30);
  assert.equal(M.summary([value],'convex').meanR,300.25);
});

test('Notebook is versioned and bounded and drops corrupt records without treating a guide view as a trial',()=>{
  assert.equal(M.validateNotebook({v:1,trials:Array(100).fill(raw())}).trials.length,90);
  assert.equal(M.validateNotebook({v:1,trials:[raw(),{},null]}).trials.length,1);
  for(const value of [undefined,null,[],{}, {v:2,trials:[raw()]},{v:1,trials:'bad'}])assert.deepEqual(M.validateNotebook(value),{v:1,trials:[]});
  const empty={n:0,unique:0,meanH:null,meanR:null,radiusFromMeanH:null,rangeH:null};assert.deepEqual(M.summary([],'convex'),empty);assert.equal(M.summary(null,'convex'),null);assert.deepEqual(M.summary([{}],'convex'),empty);
});

test('Repeated placement does not inflate distinct coverage and surface summaries remain separate',()=>{
  const duplicate=M.summary([raw(),raw(),raw()],'convex');assert.equal(duplicate.n,3);assert.equal(duplicate.unique,1);assert.equal(duplicate.rangeH,0);
  const rows=Object.keys(M.samples).flatMap(sample=>Array.from({length:4},(_,position)=>raw(sample,position)));
  for(const sample of Object.keys(M.samples)){const stats=M.summary(rows,sample);assert.equal(stats.n,4);assert.equal(stats.unique,4);near(stats.meanH,sample==='convex'?.5:.75);near(stats.rangeH,.02);near(stats.meanR,rows.filter(r=>r.sample===sample).reduce((a,r)=>a+M.buildTrial(r).R,0)/4);near(stats.radiusFromMeanH,sample==='convex'?300.25:200.375);}
  assert.notEqual(M.summary(rows,'convex').meanR,M.radius(30,M.summary(rows,'convex').meanH),'Mean of individual radii is deliberately not radius of mean h');
});

test('CSV is numeric, includes units and exports fixed trusted labels without user-derived formulas',()=>{
  const rows=[{...raw(),name:'=1+2',R:0},raw('concave',2),{...raw(),sample:'=1+2'}],csv=M.csv(rows),lines=csv.split('\r\n');
  assert.equal(lines.length,3);assert.match(lines[0],/Radius magnitude \(mm\)/);assert.match(lines[1],/^Convex spherical surface,1,3\.00,2\.50,30\.00,30\.50,29\.50,30\.00,0\.50,300\.25$/);assert.match(lines[2],/^Concave spherical surface,3,/);assert.doesNotMatch(csv,/=1\+2|private text|HYPERLINK/);assert.equal(M.csv(null).split('\r\n').length,1);
});
