const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),context={};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'experience/practical-guides.js'),'utf8'),context);
const data=context.PeqPracticalGuides, inventory=JSON.parse(fs.readFileSync(path.join(root,'docs/cbse/practicals.json'),'utf8'));
const entries=data.entries,byId=id=>entries.find(e=>e.id===id);
test('Every audited Physics practical, alternative and project has one authored guide',()=>{
 const expected=inventory.requirements.filter(e=>e.subject==='Physics').map(e=>e.id).sort();
 assert.deepEqual(Array.from(entries,e=>e.id).sort(),expected);assert.equal(entries.length,98);assert.equal(new Set(entries.map(e=>e.id)).size,98);
 assert.equal(entries.filter(e=>['Experiment','Activity'].includes(e.kind)).length,72);
 assert.equal(entries.filter(e=>e.kind==='Accessible alternative').length,18);assert.equal(entries.filter(e=>e.kind==='Project').length,8);
});
test('Every guide contains distinct procedure, evidence, limitation and reasoned retrieval',()=>{
 for(const e of entries){assert.ok(e.title.length>=10,e.id+' title');for(const key of ['apparatus','principle','record','caution','question','answer'])assert.ok(typeof e[key]==='string'&&e[key].length>15,e.id+' '+key);
 assert.ok(e.steps.length>=3,e.id);assert.ok(e.steps.every(s=>s.length>30),e.id);assert.equal(e.mode,'Preparation guide');
 assert.match(e.source,/^https:\/\/cbseacademic\.nic\.in\//);assert.match(e.reference,/^https:\/\/(www\.)?ncert\.nic\.in\//);
 const requirement=inventory.requirements.find(r=>r.id===e.id);assert.equal(e.year,Number(requirement.classYear));assert.ok(requirement.pages.includes(e.page),e.id+' source page');
 if(e.related)for(const ref of e.related)assert.ok(byId(ref),e.id+' relation');
 }
});
test('Accessible alternatives retain their own scientific goal',()=>{
 assert.match(byId('p12-vi-e01').record,/Ω\/cm/);assert.doesNotMatch(byId('p12-vi-e01').apparatus,/screw gauge/i);
 assert.match(byId('p12-vi-e05').apparatus,/inductor/);assert.match(byId('p12-vi-e06').record,/not a combined-lens/);
 assert.equal(byId('p11-vi-e09').related.length,2);assert.match(byId('p12-vi-e08').adaptation,/both step-up and step-down/);
});
test('Measurement and electrical safety boundaries are explicit',()=>{
 assert.match(byId('p11-a-e01').answer,/12\.2 mm/);assert.match(byId('p11-a-e02').answer,/2\.41 mm/);
 assert.match(byId('p12-a-e06').steps.join(' '),/never connect.*mains/i);assert.match(byId('p12-project04').caution,/dangerous secondary voltage/);
 assert.match(byId('p12-b-a05').caution,/Never look into a laser/);assert.match(byId('s10-e10').caution,/Never look at the Sun/);
 assert.match(byId('p11-a-e03').answer,/1\.0 cm³/);assert.match(byId('p12-b-e03').answer,/slope−1/);
});
test('Library is local, scoped, and never marks school completion',()=>{
 const source=fs.readFileSync(path.join(root,'experience/practical-library.js'),'utf8');
 assert.match(source,/peq_practical_notes_v1/);assert.doesNotMatch(source,/localStorage\.clear\(|getUserMedia|fetch\(|XMLHttpRequest|innerHTML\s*=\s*field\.value/);
 assert.match(source,/maxlength=\"12000\"/);assert.match(source,/function esc/);assert.match(source,/do not mark a school practical complete/);
});
