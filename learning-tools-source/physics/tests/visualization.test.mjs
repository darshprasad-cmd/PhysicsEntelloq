import test from 'node:test';
import assert from 'node:assert/strict';
import {trajectory} from '../core.mjs';
import {projectileModel, projectileSignals} from '../projectile-studio.mjs';
import {createExperimentSession, sampleModel, sampleSeries, signalsByUnit, exportExperimentCSV, createSnapshotRecorder} from '../visualization-core.mjs';

const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
test('projectile adapter samples authoritative model with consistent velocities and specific energy', () => {
  for (const vx of [-20,-8,0,8,20]) for (const vy of [.1,10,20]) for (const g of [.1,1.62,9.81,25]) {
    const parameters = {vx,vy,g}, source = trajectory(parameters), rows = sampleSeries(projectileModel, parameters);
    for (const row of rows) {
      assert.deepEqual(row, source.stateAt(row.time));
      near(row.x, vx * row.time); near(row.y, vy * row.time - .5 * g * row.time ** 2);
      near(row.vy, vy - g * row.time); near(row.totalSpecific, .5 * (vx * vx + vy * vy));
      near(row.kineticSpecific + row.potentialSpecific, row.totalSpecific); assert.equal(row.ay,-g);
    }
    near(rows.at(-1).y,0); near(rows.at(-1).x,source.range); near(sampleModel(projectileModel,parameters,source.flight/2).y,source.peak);
  }
});
test('pause, replay, seek, speed and stepping are deterministic and clamp endpoints', () => {
  const parameters = {vx:-8,vy:10,g:9.81}, session = createExperimentSession({model:projectileModel,parameters});
  session.tick(1); assert.equal(session.getState().time,0);
  session.play(); session.tick(.25); session.setSpeed(2); session.tick(.125); near(session.getState().time,.5);
  const recorded = session.getState().snapshot; session.pause(); session.tick(100); assert.deepEqual(session.getState().snapshot,recorded);
  session.seek(0); session.play(); session.setSpeed(1); session.tick(.5); assert.deepEqual(session.getState().snapshot,recorded);
  session.step(-100); assert.equal(session.getState().time,0); assert.equal(session.getState().playing,false);
  session.seek(999); assert.equal(session.getState().time,session.getState().duration); assert.equal(session.getState().playing,false);
  session.play(); assert.equal(session.getState().time,0); session.tick(999); assert.equal(session.getState().playing,false);
  assert.throws(() => session.seek(NaN)); assert.throws(() => session.tick(-1)); assert.throws(() => session.setSpeed(0));
});
test('parameter revisions reset all linked state and bookmarks without mutating old snapshots', () => {
  const parameters = {vx:8,vy:10,g:9.81}, session = createExperimentSession({model:projectileModel,parameters});
  const initial = session.getState(); parameters.vx = 20; assert.equal(session.getState().parameters.vx,8);
  session.seek(.5); session.bookmark('A'); session.seek(1); session.bookmark('B');
  const comparison = session.compare(); near(comparison.A.time,.5); near(comparison.B.time,1); near(comparison.B.y-comparison.A.y,1.32125);
  session.updateParameters({g:1.62}); const state = session.getState(); assert.equal(state.time,0); assert.equal(state.revision,1); assert.deepEqual(state.bookmarks,{A:null,B:null}); assert.equal(initial.parameters.g,9.81);
  assert.ok(Object.isFrozen(state.snapshot)); assert.ok(Object.isFrozen(state.parameters)); assert.throws(() => { state.snapshot.x = 100; });
  session.updateParameters({g:1.62}); assert.equal(session.getState().revision,1);
});
test('subscribers receive a single synchronized snapshot and are released on destroy', () => {
  const session = createExperimentSession({model:projectileModel,parameters:{vx:8,vy:10,g:9.81}}); let count = 0;
  const remove = session.subscribe(state => { count++; near(state.snapshot.x,state.time * state.parameters.vx); });
  session.seek(.5); assert.equal(count,2); remove(); session.seek(1); assert.equal(count,2);
  session.subscribe(() => count++); const before = count; session.destroy(); assert.equal(count,before); assert.throws(() => session.play(),/destroyed/); assert.throws(() => session.subscribe(() => {}),/destroyed/);
});
test('signal unit groups cannot overlay incompatible quantities, CSV is reproducible and includes SI metadata', () => {
  const groups = signalsByUnit(projectileSignals); assert.deepEqual([...groups.keys()],['m','m/s','m/s²','J/kg']); assert.equal(groups.get('J/kg').length,3);
  assert.throws(() => signalsByUnit([{key:'x',unit:'m'},{key:'x',unit:'s'}])); assert.throws(() => signalsByUnit([{key:'x'}]));
  const options = {model:projectileModel,parameters:{vx:-8,vy:10,g:9.81},signals:projectileSignals};
  const csv = exportExperimentCSV(options); assert.equal(exportExperimentCSV(options),csv); assert.match(csv,/# parameters: \{"vx":-8,"vy":10,"g":9.81\}/); assert.match(csv,/"totalSpecific \[J\/kg\]"/);
  const data = csv.trim().split('\n').slice(5).map(row => row.split(',').map(Number)); assert.equal(data.length,241); assert.equal(data[0][0],0); near(data.at(-1)[0],trajectory(options.parameters).flight); near(data.at(-1)[1],trajectory(options.parameters).range); assert.ok(data.flat().every(Number.isFinite));
  assert.throws(() => sampleSeries(projectileModel,options.parameters,10002)); assert.throws(() => createExperimentSession({model:{duration:() => 0,sample:() => ({x:0})}})); assert.throws(() => sampleModel({duration:() => 1,sample:() => ({x:Infinity})},{},0));
});
test('recorded snapshots are immutable, strictly ordered, bounded and never interpolated', () => {
  const recorder = createSnapshotRecorder({maxSnapshots:3,maxBytes:1000}), source = {position:{x:1,y:2},samples:[1,2]};
  recorder.append(0,source); source.position.x = 99; source.samples.push(3); assert.equal(recorder.at(0).snapshot.position.x,1); assert.deepEqual(recorder.at(0).snapshot.samples,[1,2]);
  recorder.append(1,{x:3}); recorder.append(2,{x:5}); assert.equal(recorder.at(1.9).time,1); assert.equal(recorder.at(3),null); assert.equal(recorder.at(-1),null);
  recorder.append(3,{x:7}); assert.equal(recorder.getInfo().count,3); assert.equal(recorder.getInfo().dropped,1); assert.equal(recorder.at(0),null); assert.ok(recorder.getInfo().bytes <= 1000);
  assert.throws(() => recorder.append(3,{x:8})); assert.throws(() => recorder.append(4,{x:NaN})); assert.throws(() => {recorder.getFrames()[0].snapshot.x=88;});
  recorder.clear(); assert.equal(recorder.getInfo().count,0); assert.equal(recorder.at(0),null);
});
test('recording byte limit evicts old frames and rejects oversized frame atomically', () => {
  const recorder = createSnapshotRecorder({maxSnapshots:100,maxBytes:128});
  for (let i=0;i<20;i++) recorder.append(i,{x:i,label:'sensor'});
  const before = recorder.getFrames(); assert.ok(recorder.getInfo().bytes <= 128); assert.ok(recorder.getInfo().count < 20);
  assert.throws(() => recorder.append(21,{text:'x'.repeat(1000)}),/byte limit/); assert.deepEqual(recorder.getFrames(),before);
});
