const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),M=require('../experience/measurement-model.js');
test('Instrument units and least counts match the explicitly selected scales',()=>{
  assert.equal(M.mm('vernier-calipers',1),.1);assert.equal(M.mm('screw-gauge',1),.01);
  assert.equal(M.config('vernier-calipers').divisions,10);assert.equal(M.config('screw-gauge').divisions,50);
  assert.equal(M.mm('screw-gauge',M.config('screw-gauge').mainTicks),.5);
});
test('Every tick round-trips observed, signed zero and corrected scales without floating subtraction',()=>{
  for(const id of Object.keys(M.instruments)){const c=M.config(id);for(let opening=0;opening<=c.max;opening++)for(let zero=-5;zero<=5;zero++){const r=M.reading(id,opening,zero);assert.equal(r.raw,r.main+r.division);assert.equal(r.raw-r.zero,opening);assert.equal(r.corrected,opening);assert.ok(r.division>=0&&r.division<c.divisions);}}
});
test('Negative zero uses wrap and a negative correction, not a large positive error',()=>{
  const r=M.reading('screw-gauge',0,-3);assert.equal(r.division,47);assert.equal(r.raw,-3);assert.equal(M.format('screw-gauge',r.raw),'-0.03');
  const measure=M.reading('screw-gauge',241,-3);assert.equal(M.format('screw-gauge',measure.raw),'2.38');assert.equal(M.format('screw-gauge',measure.corrected),'2.41');
  assert.equal(M.reading('vernier-calipers',0,-3).division,7);
});
test('Contact gates external jaws, inside jaws, depth rods and micrometer without changing sample geometry',()=>{
  assert.equal(M.move('sphere',0,0,300,0,false).opening,234);
  assert.equal(M.move('wire',0,0,100,0,false).opening,58);
  assert.equal(M.move('beakerDiameter',0,0,0,900,false).opening,426);
  assert.equal(M.move('beakerDepth',0,0,0,900,false).opening,653);
  assert.equal(M.move('sphere',0,0,300,0,true).opening,0);
  assert.equal(M.move('sheet',0,0,80,9999,false).opening,2500);
});
function row(sample,position=0,orientation=0,zero=3){const instrument=M.samples[sample].instrument,r=M.reading(instrument,M.dimension(sample,position,orientation),zero);return Object.assign(r,{instrument,sample,position,orientation});}
test('Notebook rejects corrupted, forged, inherited and off-contact data; retains only bounded valid trials',()=>{
  const good=row('wire');assert.ok(M.trial(good));for(const value of [null,{},Object.assign({},good,{sample:'__proto__'}),Object.assign({},good,{instrument:'constructor'}),Object.assign({},good,{raw:200}),Object.assign({},good,{opening:99}),Object.assign({},good,{position:4})])assert.equal(M.trial(value),null);
  assert.equal(M.validateNotebook({v:1,trials:[good,{bad:true}]}).trials.length,1);assert.equal(M.validateNotebook({v:1,trials:Array(200).fill(good)}).trials.length,120);assert.deepEqual(M.validateNotebook({v:5,trials:[good]}).trials,[]);
});
test('Repeating one position does not fill coverage; resolution is separate from spread',()=>{
  const r=row('wire'),stats=M.summary([r,r,r],'wire');assert.equal(stats.unique,1);assert.equal(stats.required,8);assert.equal(stats.range,0);assert.equal(stats.resolutionHalf,.005);
  const rows=[];for(let p=0;p<4;p++)for(let o=0;o<2;o++)rows.push(row('wire',p,o));assert.equal(M.summary(rows,'wire').unique,8);
});
test('Beaker capacity uses independently measured internal diameter and depth with correct mm3 to mL conversion',()=>{
  assert.equal(M.beakerVolume([row('beakerDiameter')]),null);const value=M.beakerVolume([row('beakerDiameter'),row('beakerDepth')]);assert.ok(Math.abs(value.ml-Math.PI*42.6**2*65.3/4000)<1e-9);assert.equal(value.complete,false);
});
test('Integration is additive, has no service/camera calls and supplies real controls and a separate notebook',()=>{
  const ui=fs.readFileSync(path.join(root,'experience/measurement-lab.js'),'utf8');assert.doesNotMatch(ui,/getUserMedia|fetch\(|XMLHttpRequest|Tutor\.ask|peq_notes|peq_lab_last/);assert.match(ui,/peq_measurements_v1/);assert.match(ui,/Expt\.hub=function/);assert.match(ui,/data-cbse-class=\\?"11/);assert.match(ui,/measurement-zero-answer/);assert.match(ui,/measurement-travel/);assert.match(ui,/resolution-only estimate/);assert.match(ui,/not implemented here/);assert.match(ui,/practical:\(vernier-calipers\|screw-gauge\)/);
});
