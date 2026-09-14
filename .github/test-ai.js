const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {setImmediate:drain}=require('node:timers/promises');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const endpoint='https://groq-proxy.physicsedge.workers.dev/v1/chat/completions';
function section(start,end){const a=html.indexOf(start),b=html.indexOf(end,a);assert.ok(a>=0&&b>a,'source section exists: '+start);return html.slice(a,b);}
function element(){
  const children=[],events={},classes=new Set();
  return {children,events,style:{},textContent:'',innerHTML:'',value:'',dataset:{},scrollHeight:0,
    classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(){},contains:k=>classes.has(k)},
    addEventListener:(name,fn)=>events[name]=fn,appendChild(node){children.push(node);node.parentNode=this;},
    querySelector(){return this.body||(this.body=element());},insertAdjacentHTML(){},focus(){}};
}
function fixture(response){
  const requests=[],nodes=new Map(),storage=new Map([['peq_groq_key','legacy-browser-key-must-not-be-used']]),storageReads=[],spoken=[],notices=[],timeouts=new Map();
  const node=selector=>{if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);};
  const ctx={navigator:{onLine:true},TextDecoder,AbortController,
    setTimeout:(fn,ms)=>{if(ms===45000){const id={};timeouts.set(id,fn);return id;}fn();},clearTimeout:id=>timeouts.delete(id),$:node,$$:()=>[],ce:element,
    esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt:s=>s,
    document:{body:{contains:()=>true}},window:{},toast:message=>notices.push(message),
    localStorage:{getItem:key=>{storageReads.push(key);return storage.get(key)||null;},setItem:(key,value)=>storage.set(key,value)},
    Me:{award(){}},Voice:{setOrb(){},ttsOn:()=>false,setState(){},speak:s=>spoken.push(s)},
    DB:[{name:'Energy',summary:'Energy is conserved.',_s:'energy conserved'}],DMAP:{mechanics:{n:'Mechanics'}},topicsOf:()=>[{name:'Energy'}],
    fetch:async(url,options)=>{requests.push({url,headers:options.headers,body:JSON.parse(options.body)});return typeof response==='function'?response(url,options):response;}};
  vm.createContext(ctx);
  vm.runInContext(section('var AI_PROXY=','var reduced='),ctx);
  vm.runInContext(section('var Personas=(function(){','var Voice=(function(){'),ctx);
  vm.runInContext(section('var Tutor=(function(){','/* ===== SIX LENSES'),ctx);
  vm.runInContext(section('  async function enrich(t,lens,el){','  function deepenBtn('),ctx);
  vm.runInContext(section('var Practice=(function(){','/* ===== IMMERSION:'),ctx);
  vm.runInContext(section('var Solve=(function(){','/* ===== RESEARCH LAB'),ctx);
  ctx.Tutor.init();
  return {ctx,requests,node,storage,storageReads,spoken,notices,timeouts,answer:()=>node('#tu-thread').children.at(-1).body.textContent};
}
function completion(content){return Response.json({choices:[{message:{content}}]});}
function assertRequest(request,{json=false,stream=false,tokens=2048}={}){
  assert.equal(request.url,endpoint);
  assert.deepEqual(Object.keys(request.headers),['Content-Type']);
  assert.equal(request.headers['Content-Type'],'application/json');
  assert.equal(request.body.model,'openai/gpt-oss-120b');
  assert.equal(request.body.include_reasoning,false);
  assert.equal(request.body.reasoning_effort,'low');
  assert.equal(request.body.max_completion_tokens,tokens);
  assert.equal('max_tokens' in request.body,false);
  assert.equal('reasoning_format' in request.body,false);
  assert.equal(!!request.body.stream,stream);
  if(json)assert.equal(request.body.response_format.type,'json_object');
  assert.doesNotMatch(JSON.stringify(request),/legacy-browser-key|Bearer|api[_-]?key/i);
}
test('Saved personal keys cannot override the shared endpoint or enter requests',()=>{
  const f=fixture();
  assert.equal(f.ctx.aiURL(),endpoint);
  assert.deepEqual(Object.keys(f.ctx.aiHeaders()),['Content-Type']);
  assert.deepEqual(f.storageReads,[]);
  assert.doesNotMatch(html,/id="tu-key"|PEQ_setAIKey|peq_groq_key|GROQ_KEY|api\.groq\.com/);
});
test('Tutor streams final text across split UTF-8 chunks with persona and experiment context',async()=>{
  const raw='data: '+JSON.stringify({choices:[{delta:{reasoning:'internal reasoning'}}]})+'\n\n'+
    'data: '+JSON.stringify({choices:[{delta:{content:'Force = mass × acceleration.'}}]})+'\n\n'+'data: [DONE]\n\n';
  const bytes=new TextEncoder().encode(raw);
  const f=fixture(new Response(new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=7)controller.enqueue(bytes.slice(i,i+7));controller.close();}})));
  f.ctx.Tutor.persona('research');
  f.ctx.Tutor.ask('Explain my rope measurement.','Measured peak tension: 12 N; ideal elastic model.');
  await drain();
  assertRequest(f.requests[0],{stream:true});
  assert.match(f.requests[0].body.messages[0].content,/Sandbox's research scientist/);
  assert.match(f.requests[0].body.messages[0].content,/12 N; ideal elastic model/);
  assert.equal(f.requests[0].body.messages.at(-1).content,'Explain my rope measurement.');
  assert.equal(f.answer(),'Force = mass × acceleration.');
  assert.deepEqual(f.spoken,['Force = mass × acceleration.']);
  assert.equal(f.timeouts.size,0);
});
test('Truncated, errored and interrupted streams label partial text without speaking or remembering it',async()=>{
  const partial='data: '+JSON.stringify({choices:[{delta:{content:'Partial explanation'}}]})+'\n\n';
  const failures=[
    'data: '+JSON.stringify({choices:[{delta:{},finish_reason:'length'}]})+'\n\ndata: [DONE]\n\n',
    'data: '+JSON.stringify({error:{message:'provider-internal-diagnostic'}})+'\n\n',
    'event: error\ndata: '+JSON.stringify({message:'provider-internal-diagnostic'})+'\n\n',
    'data: '+JSON.stringify({type:'error',message:'provider-internal-diagnostic'})+'\n\n',
    '',
    'data: {malformed}\n\ndata: [DONE]\n\n',
  ];
  for(const ending of failures){
    let retry=false;
    const f=fixture(()=>new Response(retry?'data: '+JSON.stringify({choices:[{delta:{content:'Complete retry'}}]})+'\n\ndata: [DONE]\n\n':partial+ending));
    await f.ctx.Tutor.ask('Explain motion.');
    assert.match(f.answer(),/^Incomplete answer/);
    assert.match(f.answer(),/Partial explanation/);
    assert.doesNotMatch(f.answer(),/provider-internal-diagnostic/);
    assert.deepEqual(f.spoken,[]);
    assert.equal(f.timeouts.size,0);
    retry=true;await f.ctx.Tutor.ask('Try again.');
    assert.equal(f.answer(),'Complete retry');
    assert.deepEqual(f.spoken,['Complete retry']);
    assert.equal(f.requests[1].body.messages.filter(message=>message.role==='assistant').length,0);
    assert.doesNotMatch(JSON.stringify(f.requests[1].body.messages),/Partial explanation/);
  }
});
test('DONE with empty or whitespace-only content uses the ordinary failure fallback',async()=>{
  for(const content of ['', '   ']){
    const f=fixture(new Response('data: '+JSON.stringify({choices:[{delta:{content}}]})+'\n\ndata: [DONE]\n\n'));
    await f.ctx.Tutor.ask('Why?');
    assert.match(f.answer(),/I can't reach the live AI right now/);
    assert.deepEqual(f.spoken,[]);
    assert.equal(f.timeouts.size,0);
  }
});
test('A stalled stream is aborted after 45 seconds and its partial answer stays incomplete',async()=>{
  let signal;
  const f=fixture((_url,options)=>{
    signal=options.signal;
    return new Response(new ReadableStream({start(controller){
      controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta:{content:'Unfinished thought'}}]})+'\n\n'));
      signal.addEventListener('abort',()=>controller.error(new Error('aborted-internal')),{once:true});
    }}));
  });
  const pending=f.ctx.Tutor.ask('Explain a stalled request.');
  await drain();
  assert.equal(f.timeouts.size,1);
  f.timeouts.values().next().value();
  await pending;
  assert.equal(signal.aborted,true);
  assert.equal(f.timeouts.size,0);
  assert.match(f.answer(),/^Incomplete answer/);
  assert.match(f.answer(),/Unfinished thought/);
  assert.deepEqual(f.spoken,[]);
});
test('DONE cancels a still-open stream and clears its timeout immediately',async()=>{
  let cancelled=false,signal;
  const f=fixture((_url,options)=>{
    signal=options.signal;
    return new Response(new ReadableStream({
      start(controller){controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta:{content:'Finished'}}]})+'\n\ndata: [DONE]\n\n'));},
      cancel(){cancelled=true;},
    }));
  });
  await f.ctx.Tutor.ask('Explain the result.');
  assert.equal(f.answer(),'Finished');
  assert.equal(cancelled,true);
  assert.equal(signal.aborted,true);
  assert.equal(f.timeouts.size,0);
});
test('Provider failure and offline tutor retain useful fallback without requesting a key',async()=>{
  const f=fixture(new Response('{}',{status:503}));
  f.ctx.Tutor.ask('Explain energy.');await drain();
  assert.match(f.answer(),/Energy is conserved/);
  f.ctx.navigator.onLine=false;
  f.ctx.Tutor.ask('Why?');await drain();
  assert.equal(f.requests.length,1);
  assert.match(f.answer(),/try again in a moment/);
  assert.doesNotMatch(f.answer(),/key|quota|Groq/i);
  assert.match(f.notices.at(-1),/Offline/);
});
test('Lesson enrichment consumes standard completion text and caches it per lens',async()=>{
  const f=fixture(completion('Energy transfers between forms.')),output=element();
  const topic={id:'energy',name:'Energy',domain:'mechanics'},lens={k:'intuition',c:'#fff',p:'Explain %T intuitively.'};
  await f.ctx.enrich(topic,lens,output);
  assertRequest(f.requests[0]);
  assert.match(f.requests[0].body.messages[1].content,/Explain Energy intuitively/);
  assert.equal(output.innerHTML,'Energy transfers between forms.');
  await f.ctx.enrich(topic,lens,element());
  assert.equal(f.requests.length,1);
});
test('Practice preserves structured question output and falls back if JSON is invalid',async()=>{
  let valid=true;
  const item={q:'What is conserved?',o:['Energy','Speed','Force','Position'],a:0,e:'Energy is conserved in an isolated system.'};
  const f=fixture(()=>completion(valid?JSON.stringify(item):'invalid JSON'));
  const question=await f.ctx.Practice.generate('mechanics',3);
  assertRequest(f.requests[0],{json:true});
  assert.match(f.requests[0].body.messages[1].content,/ADVANCED \/ Olympiad/);
  assert.equal(question.q,item.q);assert.equal(question.a,0);assert.equal(question._lvl,3);
  valid=false;
  const fallback=await f.ctx.Practice.generate('mechanics',1);
  assert.equal(fallback.q,f.ctx.Practice.fallback('mechanics').q);
  f.ctx.navigator.onLine=false;
  await f.ctx.Practice.generate('mechanics',1);
  assert.equal(f.requests.length,2);
});
test('Solver renders JSON steps and units, escapes provider text, and recovers from failure',async()=>{
  let fail=false;
  const result={problem:'<script>bad()</script>',given:['m = 2 kg','a = 3 m/s²'],concepts:[{name:'Newton’s second law',why:'Net force accelerates mass.'}],steps:[{title:'Calculate force',reasoning:'Apply F = ma.',math:'F = 2 * 3 = 6 N'}],answer:'6 N'};
  const f=fixture(()=>fail?new Response('{}',{status:429}):completion(JSON.stringify(result))),host=element();
  f.ctx.Solve.setLevel('Olympiad');
  await f.ctx.Solve.run('Find the force.',host);
  assertRequest(f.requests[0],{json:true,tokens:4096});
  assert.match(f.requests[0].body.messages[0].content,/Difficulty level: Olympiad/);
  assert.match(host.innerHTML,/F = 2 \* 3 = 6 N/);
  assert.match(host.innerHTML,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(host.innerHTML,/<script>/);
  fail=true;await f.ctx.Solve.run('Try again.',host);
  assert.match(host.innerHTML,/try again in a moment/);
  assert.doesNotMatch(host.innerHTML,/Groq key|add a key/i);
  fail=false;await f.ctx.Solve.run('Retry.',host);
  assert.match(host.innerHTML,/6 N/);
});
