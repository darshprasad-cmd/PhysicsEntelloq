const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'experience/scientific-labs.js'),'utf8');
function context(){const c={go(){},viewLab(){},Landing:{pending(){return true;}},AppDesign:{afterView(){}},window:{addEventListener(){}},location:{hash:''}};vm.createContext(c);vm.runInContext(source,c);return c.ScientificLabs;}
test('Only the five owned scientific routes resolve, including hostile property names',()=>{const app=context();for(const id of ['reality','reason','discovery','robotics','proof']){assert.ok(app.get(id));assert.equal(app.hashId('#scientific:'+id),id);assert.match(app.url(id),/^assets\/scientific-labs\/[a-z]+\/(?:index|notebook)\.html\?embed=physics$/);}for(const value of ['__proto__','constructor','missing','../proof',null]){assert.equal(app.get(value),null);assert.equal(app.url(value),null);}for(const hash of ['#adv','#cbse:11','#scientific:proof:other','#scientific:__proto__'])assert.equal(app.hashId(hash),null);});
test('Scientific assets are lazy and local-service boundaries remain explicit',()=>{assert.match(source,/child\.src=url\(id\)/);assert.match(source,/frame\.remove\(\)/);assert.match(source,/local companion service/);assert.match(source,/offline draft is never marked verified/);assert.match(source,/clearTimeout\(loadTimer\)/);assert.match(source,/earlyGate\.close\(\);earlyGate\.remove\(\)/);assert.ok(!source.includes('fetch('));assert.ok(!source.includes('localStorage.clear'));assert.ok(!source.includes('localStorage.setItem'));});
test('Compact adaptation retains useful navigation and hides only duplicate app chrome',()=>{const app=context();assert.match(app.embeddedCSS('reality'),/\.sidebar nav\{display:flex/);assert.match(app.embeddedCSS('reason'),/\.notebook-toggle\{display:flex/);assert.match(app.embeddedCSS('discovery'),/\.discovery-header\{display:none/);assert.match(source,/Alt \+ Shift/);assert.match(source,/button\.focus\(\{preventScroll:true\}\)/);});

function routedContext(){
  const destinations=[];
  const c={destinations,curView:'research',labMode:'labs',clearTimeout,viewLab(){},Landing:{pending(){return true;}},AppDesign:{afterView(){}},window:{addEventListener(){}},location:{hash:'',pathname:'/',search:''}};
  c.go=(view,id)=>{c.curView=view;destinations.push({view,id});};
  c.history={pushState(_state,_title,url){c.location.hash=url.startsWith('#')?url:'';},replaceState(_state,_title,url){c.location.hash=url.includes('#')?url.slice(url.indexOf('#')):'';}};
  vm.createContext(c);vm.runInContext(source,c);return c;
}
test('Switching scientific bookmarks returns to the new tool section',()=>{
  for(const [from,to,section] of [['reality','reason','solve'],['reason','robotics','lab'],['robotics','proof','adv'],['proof','discovery','research']]){
    const c=routedContext();c.go('scientific',from);c.go('scientific',to);c.ScientificLabs.back();
    assert.equal(c.destinations.at(-1).view,section);
    assert.equal(c.location.hash,'');
  }
});
test('Reloading the same scientific tool preserves its originating Lab mode',()=>{
  const c=routedContext();c.curView='lab';c.labMode='investigate';
  c.ScientificLabs.open('reality');c.go('scientific','reality');c.labMode='labs';c.ScientificLabs.back();
  assert.equal(c.destinations.at(-1).view,'lab');assert.equal(c.labMode,'investigate');
});
