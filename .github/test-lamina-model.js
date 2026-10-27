const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../experience/lamina-model.js');
const near=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} should equal ${expected}`);
function trial(sample='copper',zero=0,step=1){const g=M.grid(sample,step);return {sample,zero,step,counts:{full:g.full,majority:g.majority,half:g.half,boundary:g.boundary},readings:Array.from({length:5},(_,position)=>{const r=M.reading(M.contact(sample,position),zero);return {position,opening:r.opening,zero,mainMm:r.mainMm,division:r.division};})};}

test('Screw gauge resolves 0.01 mm through every rollover and negative zero without changing physical thickness',()=>{
  assert.deepEqual(M.config,{pitchMm:.5,divisions:50,tickMm:.01,maxTicks:500});
  for(let zero=-5;zero<=5;zero++)for(let opening=0;opening<=500;opening++){
    const r=M.reading(opening,zero);assert.equal(r.rawTicks,opening+zero);assert.ok(r.division>=0&&r.division<50);near(r.mainMm+r.division*.01,r.rawMm);near(r.rawMm-r.zeroMm,r.correctedMm);near(r.correctedMm,opening*.01);
  }
  assert.deepEqual(M.reading(0,-5),{opening:0,zero:-5,mainMm:-.5,division:45,rawTicks:-5,correctedMm:0,rawMm:-.05,zeroMm:-.05});
  assert.equal(M.reading(49,1).mainMm,.5);assert.equal(M.reading(49,1).division,0);
  for(const args of [[null,0],['50',0],[1.2,0],[-1,0],[501,0],[1,6],[1,-6],[1,'0'],[1,Infinity]])assert.throws(()=>M.reading(...args),RangeError);
});

test('Closing stops at contact and withdrawal is possible without penetrating the lamina',()=>{
  assert.deepEqual(M.turn(100,0,51),{opening:51,contact:true,limited:true});
  assert.deepEqual(M.turn(51,52,51),{opening:52,contact:false,limited:false});
  assert.deepEqual(M.turn(51,600,51),{opening:500,contact:false,limited:true});
  assert.deepEqual(M.turn(60,51.3,51),{opening:51,contact:true,limited:false});
  for(let target=0;target<=500;target+=7)for(let requested=-20;requested<=520;requested+=11){const r=M.turn(100,requested,target);assert.ok(r.opening>=target&&r.opening<=500);assert.equal(r.contact,r.opening===target);}
  for(const args of [[null,10,20],[0,Infinity,20],[0,'10',20],[0,10,-1],[501,1,20],[0,10,2.5]])assert.throws(()=>M.turn(...args),RangeError);
});

test('Polygon and rectangle clipping preserve exact known area including empty edges and half cells',()=>{
  const square=[[0,0],[1,0],[1,1],[0,1]],triangle=[[0,0],[1,0],[0,1]],shifted=[[.25,.25],[1.25,.25],[1.25,1.25],[.25,1.25]];
  assert.equal(M.polygonArea(square),1);assert.equal(M.polygonArea(square.slice().reverse()),1);assert.equal(M.polygonArea(triangle),.5);
  assert.equal(M.clippedArea(square,0,0,1),1);assert.equal(M.clippedArea(square,1,0,1),0);assert.equal(M.clippedArea(square,-1,-1,1),0);assert.equal(M.clippedArea(triangle,0,0,1),.5);
  near(M.clippedArea(shifted,0,0,1),.5625);near(M.clippedArea(shifted,1,0,1),.1875);
  for(const polygon of [square,triangle,shifted])for(const step of [1,.5,.25]){let sum=0;for(let x=0;x<2;x+=step)for(let y=0;y<2;y+=step)sum+=M.clippedArea(polygon,x,y,step);near(sum,M.polygonArea(polygon));}
  for(const polygon of [null,[],[[0,0],[1,1]],[[0,0],[1,1],[2,Infinity]],new Array(4)])assert.throws(()=>M.polygonArea(polygon),RangeError);
  for(const args of [[square,0,0,0],[square,0,0,-1],[square,0,Infinity,1],[square,'0',0,1]])assert.throws(()=>M.clippedArea(...args),RangeError);
});

test('Rectangle clipping agrees with independent overlap products across translations and cell sizes',()=>{
  for(let i=0;i<25;i++){
    const x0=(i%5)*.17-.3,y0=Math.floor(i/5)*.23-.4,w=.37+i*.017,h=.61+i*.011,rectangle=[[x0,y0],[x0+w,y0],[x0+w,y0+h],[x0,y0+h]];
    for(const size of [.1,.5,1])for(const x of [-.5,0,.5,1])for(const y of [-.5,0,.5,1]){
      const expected=Math.max(0,Math.min(x0+w,x+size)-Math.max(x0,x))*Math.max(0,Math.min(y0+h,y+size)-Math.max(y0,y));near(M.clippedArea(rectangle,x,y,size),expected);
    }
  }
  // Concave L: the missing upper-right unit square must stay empty after clipping.
  const concave=[[0,0],[2,0],[2,1],[1,1],[1,2],[0,2]];assert.equal(M.polygonArea(concave),3);assert.equal(M.clippedArea(concave,1,1,1),0);assert.equal(M.clippedArea(concave,.5,.5,1),.75);
});

test('Every grid cell has derived coverage and meaningful geometric bounds for both original shapes',()=>{
  for(const id of Object.keys(M.samples))for(const step of [1,.5,.1]){
    const g=M.grid(id,step);assert.equal(g.cells.length,Math.round(30/(step*step)));assert.equal(g.full+g.boundary+g.empty,g.cells.length);assert.equal(g.majority+g.half+g.minority,g.boundary);
    near(g.cells.reduce((sum,c)=>sum+c.fraction*step*step,0),g.exactCm2);assert.ok(g.lowerCm2<g.exactCm2&&g.exactCm2<g.upperCm2);assert.ok(g.estimateCm2>=g.lowerCm2&&g.estimateCm2<=g.upperCm2);
    assert.equal(g.estimateCm2,(g.full+g.majority+.5*g.half)*step*step);if(step===1)assert.notEqual(g.estimateCm2,(g.full+g.boundary/2)*step*step,'Half of every boundary cell is not the adopted rule, though estimates may coincide for some grids');
    assert.equal(g.lowerCm2,g.full*step*step);assert.equal(g.upperCm2,(g.full+g.boundary)*step*step);
    for(const c of g.cells){assert.ok(c.fraction>=0&&c.fraction<=1);assert.equal(c.x,c.col*step);assert.equal(c.y,c.row*step);if(c.kind==='boundary')assert.equal(c.part,Math.abs(c.fraction-.5)<=1e-10?'half':c.fraction>.5?'majority':'minority');else assert.equal(c.part,null);}
  }
  for(const id of Object.keys(M.samples)){const coarse=M.grid(id,1),fine=M.grid(id,.5),millimetre=M.grid(id,.1);assert.ok(fine.upperCm2-fine.lowerCm2<coarse.upperCm2-coarse.lowerCm2,'Finer cells tighten the geometric interval, not necessarily the point estimate');assert.ok(millimetre.upperCm2-millimetre.lowerCm2<fine.upperCm2-fine.lowerCm2);assert.ok(Object.isFrozen(millimetre)&&Object.isFrozen(millimetre.cells)&&Object.isFrozen(millimetre.cells[0]));assert.equal(M.grid(id,.1),millimetre,'Repeated readings reuse the immutable computed grid');}
});

test('Five distinct near-edge placements are frozen original teaching data and every placement is measurable',()=>{
  assert.ok(Object.isFrozen(M.config)&&Object.isFrozen(M.samples)&&Object.isFrozen(M.board));
  for(const id of Object.keys(M.samples)){
    const s=M.samples[id];assert.equal(s.positions.length,5);assert.equal(s.thicknessTicks.length,5);assert.ok(Object.isFrozen(s)&&Object.isFrozen(s.polygon)&&Object.isFrozen(s.positions)&&Object.isFrozen(s.thicknessTicks));
    for(let i=0;i<5;i++){
      const p=s.positions[i];assert.ok(Object.isFrozen(p)&&Object.isFrozen(s.polygon[i]));assert.equal(M.contact(id,i),s.thicknessTicks[i]);assert.equal(new Set(s.positions.map(p=>`${p.x}:${p.y}`)).size,5);
      // A small square around each indicated point must be wholly inside the shape.
      near(M.clippedArea(s.polygon,p.x-.02,p.y-.02,.04),.0016);
      const edgeDistance=Math.min(...s.polygon.map((a,j)=>{const b=s.polygon[(j+1)%s.polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy);}));assert.ok(edgeDistance<.4,'Reading location should remain close to an edge');
    }
  }
});

test('Summary uses five corrected readings and converts thickness from mm to cm before area times thickness',()=>{
  for(const id of Object.keys(M.samples))for(const zero of [-5,0,5])for(const step of [1,.5,.1]){
    const t=trial(id,zero,step),s=M.summary(t.sample,t.zero,t.readings,t.step,t.counts),g=M.grid(id,step);assert.ok(s);assert.equal(s.n,5);assert.equal(s.unique,5);near(s.meanMm,id==='copper'?.51:.83);near(s.rangeMm,.02);assert.equal(s.resolutionMm,.01);assert.equal(s.areaCm2,g.estimateCm2);near(s.volumeCm3,g.estimateCm2*s.meanMm/10);near(s.volumeLowerCm3,g.lowerCm2*s.meanMm/10);near(s.volumeUpperCm3,g.upperCm2*s.meanMm/10);assert.ok(s.volumeLowerCm3<=s.volumeCm3&&s.volumeCm3<=s.volumeUpperCm3);
  }
  const t=trial();assert.equal(M.summary(t.sample,t.zero,t.readings.slice(0,4),t.step,t.counts),null);assert.equal(M.summary(t.sample,t.zero,[...t.readings.slice(0,4),t.readings[0]],t.step,t.counts),null);
  for(const field of ['full','majority','half','boundary'])assert.equal(M.buildTrial({...t,counts:{...t.counts,[field]:t.counts[field]+1}}),null);
  assert.equal(M.buildTrial({...t,readings:t.readings.map((r,i)=>i===2?{...r,mainMm:r.mainMm+.5}:r)}),null);assert.equal(M.buildTrial({...t,readings:t.readings.map((r,i)=>i===2?{...r,division:r.division+1}:r)}),null);assert.equal(M.buildTrial({...t,readings:t.readings.map((r,i)=>i===2?{...r,opening:r.opening+1}:r)}),null);
});

test('Malformed, inherited and unknown input is rejected rather than forming a trusted stored trial',()=>{
  const t=trial();
  for(const id of ['__proto__','constructor','toString','',null]){assert.throws(()=>M.contact(id,0),RangeError);assert.throws(()=>M.grid(id,1),RangeError);assert.equal(M.buildTrial({...t,sample:id}),null);}
  for(const position of [-1,5,.5,NaN,'1'])assert.throws(()=>M.contact('copper',position),RangeError);
  for(const step of [0,-1,.2,2,'1',NaN]){assert.throws(()=>M.grid('copper',step),RangeError);assert.equal(M.buildTrial({...t,step}),null);}
  for(const value of [null,{},Object.create(t),{...t,counts:Object.create(t.counts)},{...t,readings:new Array(5)},{...t,zero:'0'},{...t,zero:6},{...t,readings:t.readings.map((r,i)=>i===0?Object.create(r):r)}])assert.equal(M.buildTrial(value),null);
  for(const field of ['position','opening','zero','mainMm','division']){const readings=structuredClone(t.readings);delete readings[0][field];assert.equal(M.buildTrial({...t,readings}),null);}
});

test('Derived values are recomputed and canonical raw data strips private text, markup and forged results',()=>{
  const value={...trial(),meanMm:1000,volumeCm3:-5,name:'=HYPERLINK("bad")',notes:'private student draft'};
  value.readings[0].correctedMm=900;value.counts.areaCm2=10000;
  const built=M.buildTrial(value);assert.ok(built);assert.equal(built.meanMm,.51);assert.ok(built.volumeCm3>0&&built.volumeCm3<10);assert.equal(value.volumeCm3,-5);
  assert.deepEqual(M.raw(value),trial());assert.deepEqual(M.validateNotebook({v:1,trials:[value]}),{v:1,trials:[trial()]});
  const clean=M.raw(value);clean.readings[0].opening=500;clean.counts.full=500;assert.notEqual(value.readings[0].opening,500);assert.notEqual(value.counts.full,500);
});

test('Notebook deduplicates a complete specimen/zero/grid condition without inflating practical coverage',()=>{
  const t=trial(),book=M.validateNotebook({v:1,trials:[t,t,t,trial('card'),trial('copper',1),trial('copper',0,.5),t]});assert.equal(book.trials.length,4);assert.deepEqual(book.trials.at(-1),t);
  const all=Object.keys(M.samples).flatMap(id=>Array.from({length:11},(_,i)=>i-5).flatMap(zero=>[trial(id,zero,1),trial(id,zero,.5),trial(id,zero,.1)]));assert.equal(all.length,66);const limited=M.validateNotebook({v:1,trials:all});assert.equal(limited.trials.length,40);assert.deepEqual(limited.trials,all.slice(-40));
  assert.equal(M.validateNotebook({v:1,trials:[t,...Array(200).fill(null)]}).trials.length,0,'Validation work is bounded to the latest 200 raw entries');
  for(const value of [undefined,null,[],{},Object.create({v:1,trials:[t]}),{v:2,trials:[t]},{v:1,trials:'bad'}])assert.deepEqual(M.validateNotebook(value),{v:1,trials:[]});
});

test('CSV exports checked raw scales with units, fixed provenance and derived values, never supplied formulas',()=>{
  const rows=[{...trial('copper',-5),name:'=1+2',volumeCm3:-100},trial('card',5,.5),{...trial(),sample:'=1+2'}],csv=M.csv(rows),lines=csv.split('\r\n');assert.equal(lines.length,11);assert.match(lines[0],/Estimated volume \(cm3\)/);assert.match(lines[1],/^Irregular copper sheet,1,/);assert.match(lines[1],/,-0\.05,0\.51,0\.510,/);assert.match(lines[6],/^Irregular stiff card,0\.5,/);assert.match(csv,/Deterministic virtual rehearsal; bounds exclude thickness error/);assert.doesNotMatch(csv,/=1\+2|HYPERLINK|private student/);assert.equal(M.csv([trial(),trial()]).split('\r\n').length,6);assert.equal(M.csv(null).split('\r\n').length,1);
});

test('Browser global works without CommonJS, DOM, storage, network or camera dependencies',()=>{
  const vm=require('node:vm'),fs=require('node:fs'),context=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../experience/lamina-model.js'),'utf8'),context);
  assert.equal(context.LaminaModel.contact('copper',0),51);assert.equal(context.LaminaModel.grid('card',1).estimateCm2,15);assert.equal(context.LaminaModel.reading(0,-3).rawMm,-.03);
  assert.equal(typeof context.document,'undefined');assert.equal(typeof context.navigator,'undefined');assert.equal(typeof context.fetch,'undefined');
});
