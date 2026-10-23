import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeState,trajectory,circuitText,circuitUrl,readState,writeState} from '../core.mjs';
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
