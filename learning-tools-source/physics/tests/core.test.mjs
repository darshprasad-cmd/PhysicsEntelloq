import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeState,trajectory,circuitText,circuitUrl,readState,writeState,STORAGE_KEY,FIELD_STORAGE_PREFIX} from '../core.mjs';
test('projectile agrees with closed-form endpoints, symmetry and leftward launch',()=>{
  for(const vx of [-8,0,8]){const m=trajectory({vx,vy:10,g:9.81});assert.ok(Math.abs(m.at(m.flight).y)<1e-10);assert.ok(Math.abs(m.at(m.flight/2).y-m.peak)<1e-10);assert.equal(m.range,vx*m.flight);assert.ok(m.at(0).x===0);}
});
test('invalid stored fields are bounded and never injected into circuit source',()=>{
  const s=normalizeState({vx:Infinity,vy:-10,g:0,resistance:'100\nw bad',voltage:-1,latex:'x'.repeat(11000)});assert.equal(s.vx,8);assert.equal(s.vy,.1);assert.equal(s.g,.1);assert.equal(s.resistance,1000);assert.equal(s.voltage,.1);assert.equal(s.latex.length,10000);assert.equal(circuitText(s).split('\n').length,6);
});
test('CircuitJS source forms closed DC and RC loops and URL round-trips',()=>{
  const s=normalizeState({circuit:'rc',resistance:2000,voltage:12,capacitance:.000002});const source=circuitText(s);assert.match(source,/r 96 96 256 96 0 2000/);assert.match(source,/c 256 96 256 224 0 0.000002 0/);assert.equal(new URL(circuitUrl(s,true)).searchParams.get('cct'),source);assert.equal(new URL(circuitUrl(s,true)).origin,'https://www.falstad.com');assert.equal(new URL(circuitUrl(s,true)).searchParams.get('whiteBackground'),'true');
});
test('corrupt or denied storage is recoverable without losing defaults',()=>{
  assert.equal(readState({getItem:()=>'{broken'}).g,9.81);assert.equal(readState(null).vx,8);assert.equal(writeState(null,{}),false);assert.equal(writeState({setItem:()=>{throw Error('denied');}},{}),false);
});
function memory(initial={}){const values=new Map(Object.entries(initial));return{values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}
test('legacy migration is read-only and each edited field overrides only its old value',()=>{
  const legacy=JSON.stringify(normalizeState({latex:'E=mc^2',vx:-4,circuit:'rc',voltage:12}));const storage=memory({[STORAGE_KEY]:legacy});
  assert.equal(readState(storage).latex,'E=mc^2');assert.equal(storage.values.size,1);
  const stale=readState(storage);stale.vx=9.3;assert.equal(writeState(storage,stale,['vx']),true);
  assert.equal(readState(storage).vx,9.3);assert.equal(readState(storage).latex,'E=mc^2');assert.equal(readState(storage).voltage,12);assert.equal(storage.getItem(STORAGE_KEY),legacy);
  assert.deepEqual([...storage.values.keys()].sort(),[STORAGE_KEY,FIELD_STORAGE_PREFIX+'vx'].sort());
});
test('pre-opened equation, graph and circuit sessions cannot overwrite each other',()=>{
  const storage=memory();const a=readState(storage),b=readState(storage),c=readState(storage);
  a.latex='F=123m';writeState(storage,a,['latex']);b.vx=9.3;writeState(storage,b,['vx']);c.voltage=12;writeState(storage,c,['voltage']);
  a.latex='F=456m';writeState(storage,a,['latex']);b.vy=11.5;writeState(storage,b,['vy']);
  const restored=readState(storage);assert.equal(restored.latex,'F=456m');assert.equal(restored.vx,9.3);assert.equal(restored.vy,11.5);assert.equal(restored.voltage,12);
});
test('interleaved independent writes never replace unrelated keys',()=>{
  const storage=memory();const staleEquation=readState(storage),staleGraph=readState(storage);staleEquation.latex='p=mv';staleGraph.vx=6;staleGraph.vy=14;
  const original=storage.setItem;let injected=false;storage.setItem=(key,value)=>{original(key,value);if(key===FIELD_STORAGE_PREFIX+'vx'&&!injected){injected=true;writeState(storage,staleEquation,['latex']);}};
  writeState(storage,staleGraph,['vx','vy']);const saved=readState(storage);assert.equal(saved.latex,'p=mv');assert.equal(saved.vx,6);assert.equal(saved.vy,14);
});
test('same field uses last successful save; corrupt records and other fields stay intact',()=>{
  const storage=memory({[STORAGE_KEY]:'{unreadable',[FIELD_STORAGE_PREFIX+'g']:'{unreadable'});const state=readState(storage);assert.equal(state.g,9.81);
  state.latex='x=1';writeState(storage,state,['latex']);state.latex='x=2';writeState(storage,state,['latex']);assert.equal(readState(storage).latex,'x=2');
  assert.equal(storage.getItem(STORAGE_KEY),'{unreadable');assert.equal(storage.getItem(FIELD_STORAGE_PREFIX+'g'),'{unreadable');assert.equal(writeState(storage,state,['unknown']),false);
});
test('partial or denied writes return failure without discarding the untouched fields',()=>{
  const storage=memory({[FIELD_STORAGE_PREFIX+'latex']:JSON.stringify('F=123m')});const original=storage.setItem;storage.setItem=(key,value)=>{if(key===FIELD_STORAGE_PREFIX+'vy')throw Error('quota');original(key,value);};
  assert.equal(writeState(storage,{vx:9,vy:12},['vx','vy']),false);assert.equal(readState(storage).latex,'F=123m');assert.equal(readState(storage).vx,9);assert.equal(readState(storage).vy,10);
});
