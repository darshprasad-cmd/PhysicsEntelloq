const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),js=fs.readFileSync(path.join(root,'experience/learn-flow.js'),'utf8'),c={};
vm.createContext(c);vm.runInContext(html.slice(html.indexOf('var DB=['),html.indexOf('var DMAP=')),c);vm.runInContext(js,c);
c.DB.forEach(t=>{t.lvl=/Olympiad|University/.test(t.tags.join(' '))?3:/Foundation/.test(t.tags.join(' '))?1:2;});
test('Every standard Learn core idea has a valid, unambiguous authored recall check',()=>{
  const standard=c.DB.filter(t=>t.lvl<3);assert.equal(standard.length,66);let count=0;
  for(const t of standard){assert.ok(c.LearnFlow.eligible(t),t.id);const before=JSON.stringify(t),cards=c.LearnFlow.cards(t);assert.equal(cards.length,t.points.length,t.id);
    for(const q of cards){count++;assert.equal(q.options.length,2);assert.notEqual(q.options[0],q.options[1]);assert.ok(q.answer===0||q.answer===1);assert.equal(q.prompt.split('_____').length,2,t.id);assert.equal(q.prompt.replace('_____',q.options[q.answer]),q.idea,t.id);assert.notEqual(q.prompt.replace('_____',q.options[1-q.answer]),q.idea);assert.ok(q.idea.length<260,t.id+' stays concise');}
    assert.equal(JSON.stringify(t),before,'Do not alter shared content');
  }assert.equal(count,197);
});
test('Advanced lessons are excluded and no assessment is added to other routes',()=>{
  const advanced=c.DB.filter(t=>t.lvl===3);assert.equal(advanced.length,23);advanced.forEach(t=>assert.equal(c.LearnFlow.eligible(t),false));
  assert.equal(c.LearnFlow.eligible(null),false);assert.equal(c.LearnFlow.eligible({id:'unknown',lvl:1}),false);
  const view=html.slice(html.indexOf('function viewLesson(id){'),html.indexOf('var prDiff='));assert.match(view,/if\(LearnFlow.eligible\(t\)\)/);assert.equal(html.split('LearnFlow.mount(t,').length,2);
});
test('Checks remain local and optional, and preserve scoped physics assumptions',()=>{
  assert.doesNotMatch(js,/fetch\(|localStorage|Me\.award|Mastery\.record|Tutor\./);
  for(const phrase of ['Skip check','Try again','Review idea','not a mastery score','same launch speed and landing height','along a streamline','iron and nickel','no net external force','finite speed','calibrated starting ratio'])assert.ok(js.includes(phrase),phrase);
  assert.match(js,/if\(!detail.isConnected\)return/);assert.match(js,/if\(detail.open&&!ready&&start\)/);assert.match(js,/if\(!detail.open&&stop\)/);
});
