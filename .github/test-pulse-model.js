const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../experience/pulse-model.js');
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} should equal ${b}`);
const settings=(setup='A',lengthM=2,roundTrips=3,trial=0)=>({setup,lengthM,roundTrips,trial});
function record(s=settings()){const e=M.experiment(s),result=M.check(s,e.idealTimeS,{lengthM:String(s.lengthM),roundTrips:String(s.roundTrips),timeS:e.observedTimeS.toFixed(2),distanceM:String(e.distanceM),speedMps:e.speedMps.toFixed(2)});assert.ok(result.ok,JSON.stringify(result.errors));return result.record;}

test('All 162 configurations derive positive teaching times and distance from round trips, not one-way journeys',()=>{
  assert.deepEqual(M.defaults(),settings());assert.equal(M.config.clockResolutionS,.01);assert.equal(M.config.maxRows,40);
  assert.ok(Object.isFrozen(M)&&Object.isFrozen(M.config)&&Object.isFrozen(M.setups)&&Object.isFrozen(M.config.timingErrors)&&Object.isFrozen(M.config.lengths));
  let n=0;for(const setup of ['A','B'])for(const length of M.config.lengths)for(const trips of M.config.roundTrips)for(let trial=0;trial<3;trial++){
    const s=settings(setup,length,trips,trial),e=M.experiment(s);n++;assert.equal(e.distanceM,2*trips*length);near(e.idealTimeS,e.distanceM/(setup==='A'?3:4));assert.equal(e.timingErrorS,[-.04,.02,.04][trial]);assert.equal(e.observedTimeS,Math.round((e.idealTimeS+e.timingErrorS)*100)/100);assert.ok(e.observedTimeS>0);near(e.speedMps,e.distanceM/e.observedTimeS);assert.deepEqual(M.raw(record(s)),record(s));
  }assert.equal(n,162);
});

test('Pulse centre reflects, inverts sign at each fixed end and counts complete returns exactly',()=>{
  for(const setup of ['A','B'])for(const length of M.config.lengths)for(const trips of M.config.roundTrips){
    const s=settings(setup,length,trips),e=M.experiment(s),leg=length/e.idealSpeedMps;
    for(let k=0;k<=2*trips;k++){
      const f=M.frame(s,k*leg);near(f.positionM,k%2===0?0:length);assert.equal(f.direction,k%2===0?1:-1);assert.equal(f.polarity,k%2===0?1:-1);assert.equal(f.returns,Math.floor(k/2));assert.equal(f.complete,k===2*trips);
      if(k<2*trips){const mid=M.frame(s,(k+.5)*leg);near(mid.positionM,length/2);assert.equal(mid.returns,Math.floor(k/2));assert.equal(mid.direction,k%2===0?1:-1);}
    }
    assert.equal(M.frame(s,-100).elapsedS,0);assert.equal(M.frame(s,1000).elapsedS,e.idealTimeS);assert.equal(M.frame(s,1000).returns,trips);assert.equal(M.frame(s,1000).positionM,0);
  }
  const e=M.experiment(settings());assert.equal(M.frame(settings(),e.idealTimeS-1e-6).complete,false);assert.equal(M.frame(settings(),e.idealTimeS-1e-6).returns,2);
  for(const value of [NaN,Infinity,'1',null])assert.throws(()=>M.frame(settings(),value),RangeError);
});

test('Checked entries require completed replay and reject blanks, wrong units, half distance and counts',()=>{
  const s=settings(),e=M.experiment(s),good=record(s).inputs;
  assert.equal(M.check(s,0,good).ok,false);assert.equal(M.check(s,e.idealTimeS-.00001,good).ok,false);
  for(const k of ['lengthM','roundTrips','timeS','distanceM','speedMps'])for(const bad of ['', ' ', null,undefined,NaN,Infinity,'NaN','Infinity','3 m/s','0x10','=1+1',[],{}])assert.equal(M.check(s,e.idealTimeS,{...good,[k]:bad}).ok,false,`${k}: ${String(bad)}`);
  for(const bad of [{lengthM:200},{roundTrips:6},{timeS:e.idealTimeS},{distanceM:e.distanceM/2},{speedMps:e.speedMps/2}]){const result=M.check(s,e.idealTimeS,{...good,...bad});assert.equal(result.ok,false);assert.ok(result.errors.length);assert.equal(result.record,null);}
  assert.equal(M.check(s,e.idealTimeS,{...good,timeS:'3.96s'}).ok,false);assert.equal(M.check(s,e.idealTimeS,{...good,timeS:3.964}).ok,false);
  assert.equal(M.check(s,e.idealTimeS,{...good,speedMps:e.speedMps+.00499}).ok,true);assert.equal(M.check(s,e.idealTimeS,{...good,speedMps:e.speedMps+.00501}).ok,false);
  assert.equal(M.check(s,e.idealTimeS,{...good,timeS:'3.96',distanceM:'1.2e1'}).ok,true);
});

test('Summary requires three distinct trials for the identical setup, L and N and divides by mean time',()=>{
  const s=settings(),rows=[0,1,2].map(i=>record({...s,trial:i})),summary=M.summary(rows,s);
  assert.deepEqual(summary.timesS,[3.96,4.02,4.04]);near(summary.meanTimeS,12.02/3);near(summary.speedMps,12/(12.02/3));assert.ok(Math.abs(summary.speedMps-rows.reduce((sum,r)=>sum+12/r.inputs.timeS,0)/3)>1e-5,'Do not average speeds when teaching distance / mean elapsed time');
  assert.equal(summary.n,3);assert.equal(summary.distanceM,12);assert.ok(summary.speedMps<3,'Fixed offsets are not unbiased and repeats do not promise removal of bias');
  assert.equal(M.summary(rows.slice(0,2),s),null);assert.equal(M.summary([rows[0],rows[0],rows[1]],s),null);
  assert.equal(M.summary([rows[0],rows[1],record(settings('B',2,3,2))],s),null);assert.equal(M.summary([rows[0],rows[1],record(settings('A',2.5,3,2))],s),null);assert.equal(M.summary([rows[0],rows[1],record(settings('A',2,5,2))],s),null);
  assert.deepEqual(M.summary([...rows,record(settings('B',2,3,0))],s),summary);near(M.summary([0,1,2].map(i=>record(settings('B',2,3,i))),settings('B')).speedMps,12/(9.02/3));
  // Non-terminating ideal time is rounded before every record and summary calculation.
  const rounded=[0,1,2].map(i=>record(settings('A',1,1,i)));assert.deepEqual(rounded.map(r=>r.inputs.timeS),[.63,.69,.71]);near(M.summary(rounded,settings('A',1,1)).speedMps,2/(2.03/3));
});

test('Invalid, inherited, accessor and polluted-prototype settings/observations never become trusted records',()=>{
  const s=settings(),r=record(s),e=M.experiment(s);
  for(const change of [{setup:'__proto__'},{setup:'constructor'},{setup:'toString'},{setup:'C'},{lengthM:0},{lengthM:1.1},{lengthM:'2'},{roundTrips:2},{roundTrips:'3'},{trial:-1},{trial:3},{trial:1.5}]){assert.throws(()=>M.experiment({...s,...change}),RangeError);assert.deepEqual(M.normalize({...s,...change}),M.defaults());assert.equal(M.raw({...r,...change}),null);}
  for(const bad of [null,{},[],Object.create(s),{...s,constructor:'bad'},JSON.parse('{"__proto__":{},"setup":"A","lengthM":2,"roundTrips":3,"trial":0}')]){assert.throws(()=>M.experiment(bad),RangeError);assert.equal(M.check(bad,e.idealTimeS,r.inputs).ok,false);}
  const getter={...s};Object.defineProperty(getter,'lengthM',{get(){throw new Error('Must not invoke a getter');}});assert.throws(()=>M.experiment(getter),RangeError);
  for(const bad of [Object.create(r),{...r,inputs:Object.create(r.inputs)},{...r,inputs:{...r.inputs,timeS:'3.96'}},{...r,inputs:{...r.inputs,prototype:{}}}])assert.equal(M.raw(bad),null);
  for(const field of ['setup','lengthM','roundTrips','trial','inputs']){const invalid={...r};delete invalid[field];assert.equal(M.raw(invalid),null);}
  const inputs={...r.inputs};Object.defineProperty(inputs,'timeS',{get(){throw new Error('Must not execute accessor');}});assert.equal(M.check(s,e.idealTimeS,inputs).ok,false);assert.equal(M.raw({...r,inputs}),null);
});

test('Raw notebook strips invented results/private fields, recomputes derivatives and does not mutate callers',()=>{
  const r=record(),forged={...r,speedMps:999,meanTimeS:0,name:'=HYPERLINK("bad")',notes:'private draft',inputs:{...r.inputs,formula:'=1+1'}};
  assert.deepEqual(M.raw(forged),r);const t=M.buildTrial(forged);near(t.speedMps,12/3.96);assert.equal(t.idealSpeedMps,3);assert.equal(forged.speedMps,999);assert.deepEqual(M.validateNotebook({v:1,trials:[forged]}),{v:1,trials:[r]});
  const clean=M.raw(forged);clean.inputs.timeS=100;assert.equal(forged.inputs.timeS,3.96);
  for(const field of ['lengthM','roundTrips','timeS','distanceM','speedMps'])assert.equal(M.raw({...r,inputs:{...r.inputs,[field]:r.inputs[field]+1}}),null);
});

test('Notebook retains latest 40 distinct raw trials, rejects invalid envelopes and bounds untrusted input work',()=>{
  const all=[];for(const setup of ['A','B'])for(const length of M.config.lengths)for(const trips of M.config.roundTrips)for(let trial=0;trial<3;trial++)all.push(record(settings(setup,length,trips,trial)));
  assert.deepEqual(M.validateNotebook({v:1,trials:all}).trials,all.slice(-40));assert.deepEqual(M.validateNotebook({v:1,trials:[all[0],all[1],all[0]]}).trials,[all[1],all[0]]);
  assert.equal(M.validateNotebook({v:1,trials:[all[0],...Array(200).fill(null)]}).trials.length,0);
  const sparse=new Array(3);sparse[1]=all[0];assert.deepEqual(M.validateNotebook({v:1,trials:sparse}).trials,[all[0]]);
  for(const value of [null,undefined,{},[],Object.create({v:1,trials:[all[0]]}),{v:2,trials:[all[0]]},{v:1,trials:{}},{v:1,trials:'bad'}])assert.deepEqual(M.validateNotebook(value),{v:1,trials:[]});
  const array=[];Object.defineProperty(array,'0',{get(){throw new Error('Array accessor must not run');}});assert.deepEqual(M.validateNotebook({v:1,trials:array}),{v:1,trials:[]});
});

test('CSV has explicit units and provenance, numerical rows only, no untrusted spreadsheet formulas',()=>{
  const rows=[{...record(),name:'=HYPERLINK("bad")',notes:'\n@SUM(A1)'},record(settings('B',1,1,1))],csv=M.csv([...rows,rows[0],{...record(),setup:'=1+1'}]),lines=csv.split('\r\n');
  assert.equal(lines.length,3);assert.match(lines[0],/One-way journeys 2N/);assert.match(lines[0],/Captured time \(s\)/);assert.match(lines[0],/Calculated speed \(m\/s\)/);assert.match(csv,/Ideal string A,2,3,6,1,3.96,12,3.03,3.030303/);assert.match(csv,/Deterministic transverse-string rehearsal; not calibrated data or reaction-time measurement/);assert.doesNotMatch(csv,/HYPERLINK|SUM|=1\+1/);assert.equal(M.csv(null).split('\r\n').length,1);
});

test('Global browser aliases work without DOM, storage, network, timing or camera APIs',()=>{
  const vm=require('node:vm'),fs=require('node:fs'),ctx=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../experience/pulse-model.js'),'utf8'),ctx);
  assert.equal(ctx.PulseModel,ctx.PeqPulseModel);assert.equal(ctx.PulseModel.experiment(ctx.PulseModel.defaults()).observedTimeS,3.96);assert.equal(ctx.PulseModel.frame(ctx.PulseModel.defaults(),2).returns,1);assert.equal(typeof ctx.document,'undefined');assert.equal(typeof ctx.navigator,'undefined');assert.equal(typeof ctx.fetch,'undefined');assert.equal(typeof ctx.requestAnimationFrame,'undefined');
});
