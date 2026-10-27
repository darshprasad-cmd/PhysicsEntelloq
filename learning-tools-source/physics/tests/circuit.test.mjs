import test from 'node:test';
import assert from 'node:assert/strict';
import {CIRCUIT_TYPES, normalizeCircuit, sampleCircuit, circuitModel, circuitSource, circuitHostedUrl, circuitMeasurement} from '../circuit-model.mjs';

function near(actual,expected,relative=1e-10,absolute=1e-14){assert.ok(Math.abs(actual-expected)<=Math.max(absolute,Math.abs(expected)*relative),`${actual} differs from ${expected}`);}

test('DC Ohm circuit conserves power and reports node B at the grounded return',()=>{
  for(const voltage of [.1,5,24])for(const resistance of [10,1000,1e6]){
    const s=sampleCircuit({circuit:'ohm',voltage,resistance},5);
    near(s.loopCurrent,voltage/resistance);near(s.sourceCurrent,s.loopCurrent);
    near(s.r1Voltage,voltage);near(s.outputVoltage,0);near(s.sourcePower,s.resistorPower);
    near(s.resistorPower,voltage**2/resistance);near(s.capacitorEnergy,0);
  }
});

test('series and unloaded divider obey Kirchhoff voltage law with identical branch current',()=>{
  for(const circuit of ['series','divider'])for(const [resistance,resistance2] of [[10,1e6],[1000,2000],[1e6,10]]){
    const p={circuit,voltage:12,resistance,resistance2},s=sampleCircuit(p);
    near(s.loopCurrent,12/(resistance+resistance2));near(s.r2Current,s.loopCurrent);
    near(s.r1Voltage+s.r2Voltage,12);near(s.outputVoltage,12*resistance2/(resistance+resistance2));
    near(s.sourcePower,s.r1Power+s.r2Power);near(s.equivalentResistance,resistance+resistance2);
  }
});

test('parallel branches obey Kirchhoff current law and common voltage, including unequal resistors',()=>{
  const p={circuit:'parallel',voltage:6,resistance:1000,resistance2:2000},s=sampleCircuit(p);
  near(s.loopCurrent,.006);near(s.r2Current,.003);near(s.sourceCurrent,.009);
  near(s.r1Voltage,6);near(s.r2Voltage,6);near(s.outputVoltage,6);
  near(s.sourceCurrent,s.loopCurrent+s.r2Current);near(s.equivalentResistance,2000/3);
  near(s.sourcePower,s.resistorPower);
});

test('RC charging endpoints, one time constant, signed current and voltage balance match the analytic solution',()=>{
  const p={circuit:'rc',rcMode:'charge',voltage:5,resistance:1000,capacitance:1e-6},tau=.001;
  const initial=sampleCircuit(p,0),one=sampleCircuit(p,tau),late=sampleCircuit(p,tau*1000);
  near(initial.capacitorVoltage,0);near(initial.loopCurrent,.005);near(initial.capacitorEnergy,0);
  near(one.capacitorVoltage,5*(1-Math.exp(-1)));near(one.loopCurrent,.005*Math.exp(-1));
  near(late.capacitorVoltage,5);near(late.loopCurrent,0);near(late.capacitorEnergy,.5e-6*25);
  for(const factor of [0,.1,1,3,6]){const s=sampleCircuit(p,tau*factor);near(s.r1Voltage+s.capacitorVoltage,5);near(s.sourcePower,s.resistorPower+s.capacitorPower);}
});

test('RC discharge starts charged, isolates the supply, and returns energy through a negative reference current',()=>{
  const p={circuit:'rc',rcMode:'discharge',voltage:12,resistance:2000,capacitance:1e-5},tau=.02;
  const initial=sampleCircuit(p,0),one=sampleCircuit(p,tau),late=sampleCircuit(p,1000*tau);
  near(initial.capacitorVoltage,12);near(initial.loopCurrent,-.006);near(initial.sourceCurrent,0);near(initial.sourcePower,0);
  near(one.capacitorVoltage,12/Math.E);near(one.r1Voltage,-12/Math.E);assert.ok(one.capacitorPower<0);assert.ok(one.r1Power>0);
  near(late.capacitorVoltage,0);near(late.capacitorEnergy,0);
  for(const factor of [0,.1,1,3,6]){const s=sampleCircuit(p,tau*factor);near(s.r1Voltage+s.capacitorVoltage,0);near(s.resistorPower+s.capacitorPower,0);}
});

test('capacitor current equals C dV/dt for charge and discharge; initial stored energy is conserved',()=>{
  for(const rcMode of ['charge','discharge']){
    const p={circuit:'rc',rcMode,voltage:7,resistance:2300,capacitance:2e-5},tau=p.resistance*p.capacitance;
    for(const multiple of [.1,.5,1,3,6]){
      const t=multiple*tau,dt=tau*1e-5,s=sampleCircuit(p,t);
      const derivative=(sampleCircuit(p,t+dt).capacitorVoltage-sampleCircuit(p,t-dt).capacitorVoltage)/(2*dt);
      near(s.capacitorCurrent,p.capacitance*derivative,1e-8);
      const heat=.5*p.capacitance*p.voltage**2*(1-Math.exp(-2*t/tau));
      const supplied=rcMode==='charge'?p.capacitance*p.voltage**2*(1-Math.exp(-t/tau)):0;
      const initial=rcMode==='discharge'?.5*p.capacitance*p.voltage**2:0;
      near(initial+supplied,s.capacitorEnergy+heat);
    }
  }
});

test('small and large legal RC constants remain finite, deterministic and visible in playback',()=>{
  for(const resistance of [10,1e6])for(const capacitance of [1e-9,.01])for(const rcMode of ['charge','discharge']){
    const p={circuit:'rc',voltage:24,resistance,capacitance,rcMode},duration=circuitModel.duration(p);
    assert.ok(duration>0&&Number.isFinite(duration));near(duration/circuitModel.playbackTimeScale(p),6);
    for(const time of [0,duration/6,duration]){const first=sampleCircuit(p,time);assert.deepEqual(first,sampleCircuit(p,time));assert.ok(Object.values(first).every(Number.isFinite));}
  }
  const tiny=sampleCircuit({circuit:'rc',voltage:5,resistance:1000,capacitance:1e-6},1e-20);
  assert.ok(tiny.capacitorVoltage>0,'expm1 retains a tiny early charging voltage');
});

test('component probes use model values and explicitly distinguish voltage reference from a branch',()=>{
  const p={circuit:'rc',rcMode:'discharge'},s=sampleCircuit(p,.0005);
  const capacitor=circuitMeasurement(p,s,'capacitor'),source=circuitMeasurement(p,s,'source'),ground=circuitMeasurement(p,s,'ground');
  near(capacitor.current,s.loopCurrent);near(capacitor.energy,s.capacitorEnergy);assert.ok(capacitor.power<0);
  near(source.current,0);near(source.voltage,5);assert.match(source.convention,/disconnected/);
  near(ground.voltage,0);assert.equal(ground.current,null);assert.equal(ground.power,null);
});

test('normalization protects the serializer and sampling from corrupt stored values',()=>{
  const p=normalizeCircuit({circuit:'<script>',voltage:Infinity,resistance:'100\nw injected',resistance2:-2,capacitance:1e9,rcMode:'other'});
  assert.equal(p.circuit,'ohm');assert.equal(p.voltage,5);assert.equal(p.resistance,1000);assert.equal(p.resistance2,10);assert.equal(p.capacitance,.01);assert.equal(p.rcMode,'charge');
  assert.ok(!circuitSource(p).includes('injected'));assert.deepEqual(sampleCircuit(p,NaN),sampleCircuit(p,0));
  assert.deepEqual(sampleCircuit(p,-3),sampleCircuit(p,0));
  for(const circuit of CIRCUIT_TYPES)assert.ok(Object.values(sampleCircuit({circuit},0)).every(Number.isFinite));
});

test('CircuitJS exports preserve legacy topology and explicit RC reset conditions with URL round trip',()=>{
  assert.equal(circuitSource({circuit:'ohm'}).split('\n').length,6);
  const charging=circuitSource({circuit:'rc',voltage:12,resistance:2000,capacitance:.000002});
  assert.match(charging,/r 96 96 256 96 0 2000/);assert.match(charging,/c 256 96 256 224 0 0.000002 0 0/);
  const discharge=circuitSource({circuit:'rc',rcMode:'discharge',voltage:12});
  assert.match(discharge,/v 96 224 96 96 0 0 40 0 0 0 0.5/);assert.match(discharge,/c 256 96 256 224 0 0.000001 12 12/);
  const parallel=circuitSource({circuit:'parallel',resistance:1000,resistance2:2000});
  assert.match(parallel,/r 256 96 256 224 0 1000/);assert.match(parallel,/r 416 96 416 224 0 2000/);
  for(const circuit of CIRCUIT_TYPES){const p={circuit},url=new URL(circuitHostedUrl(p,true));assert.equal(url.origin,'https://www.falstad.com');assert.equal(url.searchParams.get('cct'),circuitSource(p));assert.equal(url.searchParams.get('whiteBackground'),'true');}
});
