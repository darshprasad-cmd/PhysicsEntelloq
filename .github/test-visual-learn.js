const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),view=html.slice(html.indexOf('function viewLesson(id){'),html.indexOf('var prDiff='));
test('The retired guided-card layer is absent from the distribution and assembly',()=>{
  assert.doesNotMatch(html,/LearnFlow|learn-guided|EXPERIENCE:LEARN:/);
  assert.doesNotMatch(fs.readFileSync(path.join(root,'.github/build-experience.js'),'utf8'),/learn-flow/);
});
test('Every lesson level mounts the six lenses and parallel representations immediately',()=>{
  for(const lvl of [1,2,3]){const mounted=[],t={id:'test',name:'Test concept',domain:'mechanics',lvl,tags:[],summary:'Test',points:['An idea'],eqs:[['F = ma','force']],exam:['A note']},node={addEventListener(){}};
    const c={topicById:()=>t,Me:{d:{},save(){},domDone:()=>0,isDone:()=>false},renderSide(){},DMAP:{mechanics:{n:'Mechanics',c:'#7dd3fc'}},topicsOf:()=>[t],setCrumb(){},SIM_FOR:{},IEQ:{},localStorage:{getItem:()=>null,setItem(){}},LVL:{1:{n:'Foundation',c:'#abc'},2:{n:'Intermediate',c:'#abc'},3:{n:'Advanced',c:'#abc'}},esc:s=>s,Deep:{get:()=>false},main:{innerHTML:''},$:()=>node,$$:()=>[],window:{__lensModeHook:true},Lens:{mount:()=>mounted.push('lenses')},Ways:{render:()=>mounted.push('ways')},ExpKit:{render:()=>mounted.push('experiment')},MultiRep:{mount:()=>mounted.push('representations')},Graph:{renderConnections:()=>mounted.push('connections')}};
    vm.runInNewContext(view,c);c.viewLesson(t.id);assert.deepEqual(mounted,['lenses','ways','experiment','representations','connections']);
    assert.ok(c.main.innerHTML.indexOf('id="lens-host"')<c.main.innerHTML.indexOf('l-sec l-eqs'));assert.match(c.main.innerHTML,/Learning companion/);assert.doesNotMatch(c.main.innerHTML,/learn-extra|CHECKPOINT|ONE IDEA AT A TIME/);
  }
});
test('The light-mode repairs and clearer original planet backdrop remain assembled',()=>{
  assert.match(html,/rgba\(237,242,248,\.82\)/);assert.match(html,/--ink-faint:#385269/);assert.match(html,/AppDesign\.enhance\(panel\)/);
  assert.ok(fs.readFileSync(path.join(root,'.github/build-experience.js'),'utf8').includes("'light-mode.css'"));
});
test('Long equations keep their notation and wrap captions without widening the page',()=>{
  assert.match(html,/\.pe-refined \.l-eqs \.eq\{flex-wrap:wrap\}/);
  assert.match(html,/\.pe-refined \.l-eqs \.eq \.f\{min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere\}/);
});
