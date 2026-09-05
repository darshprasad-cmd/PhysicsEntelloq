const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('Mobile navigation has five primary destinations; expanded routes remain in Explore',()=>{
 const nav=html.match(/<nav class="mtab">([\s\S]*?)<\/nav>/)[1];
 assert.deepEqual([...nav.matchAll(/data-go="([^"]+)"/g)].map(m=>m[1]),['home','universe','learn','lab','progress']);
 const js=fs.readFileSync(path.join(root,'experience/app-design.js'),'utf8');
 for(const route of ['solve','practice','sandbox','research','settings'])assert.ok(js.includes("['"+route+"',"));
 assert.ok(js.includes('showModal()'));assert.ok(js.includes('lastTrigger.focus'));
});
test('Field atlas renders from content data and includes filter empty states',()=>{
 const nodes=new Map(),main={innerHTML:''};const node=()=>({innerHTML:'',addEventListener(){}});
 const topics=[{id:'force',domain:'mechanics',name:'Force',summary:'A push or pull.'}];
 const context={main,DOMAINS:[{k:'mechanics',n:'Mechanics',c:'#7dd3fc'}],DMAP:{mechanics:{n:'Mechanics'}},DB:topics,Me:{domDone:()=>0,recommend:()=>topics,isDone:()=>false},Graph:{readiness:()=>({missing:[],ready:true}),prereqsOf:()=>[],unlocks:()=>[],relatedOf:()=>[]},Mastery:{queue:()=>[]},topicsOf:()=>topics,topicById:()=>topics[0],AppDesign:{icon:()=>'<svg></svg>'},esc:s=>s,setCrumb(){},matchMedia:()=>({matches:false}),$:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)},$$:()=>[]};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'experience/atlas.js'),'utf8'),context);
 context.viewUniverse();assert.match(main.innerHTML,/Everything is connected/);assert.match(nodes.get('#atlas-results').innerHTML,/data-field="mechanics"/);
 context.viewLibrary();assert.match(main.innerHTML,/1 connected concepts/);assert.match(main.innerHTML,/data-link="domain:mechanics"/);assert.doesNotMatch(main.innerHTML,/undefined/);
});
test('Instrument dialog exposes keyboard controls without changing scientific models',()=>{
 assert.match(html,/id="lab-full" role="dialog" aria-modal="true"/);
 assert.match(html,/id="lf-focus" aria-pressed="false" aria-label="Expand experiment"/);
 assert.match(html,/class="inv-sh" aria-expanded=/);
 assert.match(html,/AppDesign\.enterLab\(\)/);assert.match(html,/AppDesign\.exitLab\(\)/);
 assert.match(html,/Live simulations/);assert.match(html,/Practical protocols/);
});
