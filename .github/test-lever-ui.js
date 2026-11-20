const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'experience/lever-lab.js'),'utf8'),model=fs.readFileSync(path.join(root,'experience/lever-model.js'),'utf8');
function fixture(raw,blocked=false){
 const values=new Map([['peq_notes','keep notes'],['peq_cbse_study_v1','keep preferences']]);if(raw!==undefined)values.set('peq_lever_v1',raw);
 const calls={get:[],set:[],routes:[],after:0},listeners={};
 const c={localStorage:{getItem(k){calls.get.push(k);if(blocked)throw Error('blocked');return values.get(k)||null;},setItem(k,v){calls.set.push(k);values.set(k,v);}},AppDesign:{afterView(){calls.after++;}},main:{querySelector(){return null;}},PeqPracticalLibrary:{byId(){return null;}},go(...args){calls.routes.push(args);},location:{hash:''},document:{},addEventListener(k,fn){listeners[k]=fn;}};
 c.window=c;vm.createContext(c);vm.runInContext(model,c);vm.runInContext(source,c);return {c,calls,values,listeners};
}
const plain=v=>JSON.parse(JSON.stringify(v));
test('Lever adapter is inert at load and preserves unrelated navigation',()=>{
 const f=fixture();assert.equal(f.c.LeverLab.state(),null);assert.deepEqual(f.calls.get,[]);assert.deepEqual(f.calls.set,[]);
 f.c.go('concept','waves');assert.deepEqual(f.calls.routes,[['concept','waves']]);f.c.AppDesign.afterView();assert.equal(f.calls.after,1);
 assert.equal(typeof f.listeners.hashchange,'function');assert.doesNotMatch(source,/getUserMedia|fetch\s*\(|XMLHttpRequest|setInterval|requestAnimationFrame|localStorage\.(?:clear|removeItem)/);
});
test('Lever read fallback is isolated and does not rewrite other notes',()=>{
 for(const raw of[undefined,'{bad','null','[]','{"v":2,"trials":[]}'])for(const blocked of[false,true]){
  const f=fixture(raw,blocked);assert.deepEqual(plain(f.c.LeverLab.read()),{v:1,trials:[]});f.c.LeverLab.read();assert.deepEqual(f.calls.get,['peq_lever_v1']);assert.deepEqual(f.calls.set,[]);assert.equal(f.values.get('peq_notes'),'keep notes');assert.equal(f.values.get('peq_cbse_study_v1'),'keep preferences');
 }
});
test('Notebook reconstruction excludes forged answers and returns a defensive copy',()=>{
 const M=require('../experience/lever-model.js'),s={...M.defaults(),tared:true,attached:true,effortN:2.67},record=M.check(s,{loadN:4,effortN:2.67,ma:1.5}).record;
 assert.ok(record);const f=fixture(JSON.stringify({v:1,trials:[record,{...record,readings:{loadN:4,effortN:2.67,ma:999}}]}));
 const b=f.c.LeverLab.read();assert.equal(b.trials.length,1);b.trials[0].readings.ma=999;assert.equal(f.c.LeverLab.read().trials[0].readings.ma,1.5);assert.deepEqual(f.calls.set,[]);
});
test('Observation boundary converts native numerical values and gates draft input',()=>{
 assert.match(source,/valueAsNumber/);assert.match(source,/M\.check\(s,/);assert.match(source,/Not recorded/);assert.match(source,/draft\.checkValidity\(\)/);assert.match(source,/M\.upsert\(read\(\), result\.record\)/);assert.match(source,/M\.csv\(read\(\)\)/);assert.match(source,/confirm\('Clear only lever observations/);
 for(const route of['#practical:lever','#practicals:9',"byId('s9-e11')"])assert.ok(source.includes(route));
});
