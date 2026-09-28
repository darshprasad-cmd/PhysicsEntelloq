const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),core=require('../experience/camera-physics/physics.js');
const observation=(c='book',x=.3)=>({class:c,score:.9,bbox:[x,.25,.3,.4]});
const hand=[{landmarks:[{x:.32,y:.45},{x:.5,y:.55}]}];
function stable(){const t=core.createTracker();for(let i=0;i<3;i++)t.update([observation()],hand,i*300);return t.current(600)[0];}
test('Tracking requires valid supported detector evidence, not just a hand',()=>{
 const t=core.createTracker();assert.deepEqual(t.update([],hand,0),[]);assert.deepEqual(t.update([{...observation(),score:.1},{...observation(),bbox:[0,0,NaN,1]},observation('person')],hand,100),[]);assert.equal(t.update([observation()],hand,200).length,1);
});
test('Persistent detections establish identity; smoothed tracking expires after 700ms',()=>{
 const t=core.createTracker();const a=t.update([observation()],hand,0)[0],b=t.update([observation('book',.32)],hand,80)[0];assert.equal(a.id,b.id);assert.ok(b.bbox[0]>.3&&b.bbox[0]<.32);assert.equal(b.stable,false);assert.equal(t.update([observation()],hand,160)[0].stable,true);assert.equal(t.current(900).length,0);
});
test('Separate objects retain separate identities and implausible jumps do not snap',()=>{
 const t=core.createTracker();const first=t.update([observation('book',.05),{...observation('book',.7),bbox:[.7,.25,.2,.4]}],[],0);assert.equal(new Set(first.map(t=>t.id)).size,2);const far=t.update([{...observation('book',.4),bbox:[.4,.8,.1,.1]}],[],100);assert.equal(far.length,3);
});
test('A missing hand removes inferred support; image proximity has no fake probability',()=>{
 const track=stable(),a=core.interpret(track,{});assert.equal(a.scenario,'held');assert.equal(a.profile.confidence.contact,null);assert.match(a.inferences[0],/not measured/);const b=core.interpret({...track,contact:null},{});assert.equal(b.scenario,'unknown');assert.deepEqual(b.forces.map(x=>x.id),['weight']);assert.ok(b.assumptions.some(x=>x.includes('does not imply free fall')));
});
test('Still image coordinates never assert equilibrium or infer a mass',()=>{
 const a=core.interpret(stable(),{});assert.equal(a.stationary,false);assert.equal(a.profile.estimated_mass,null);assert.ok(a.forces.every(f=>f.newtons===null));assert.match(a.equations[0],/m a/);assert.equal(a.profile.orientation,null);assert.equal(a.profile.estimated_dimensions,null);
});
test('User-entered mass generates SI model values only; invalid mass remains unknown',()=>{
 const a=core.interpret(stable(),{mass:2,stationary:true});assert.equal(a.forces[0].newtons,19.62);assert.equal(a.forces[1].newtons,19.62);assert.equal(a.profile.estimated_mass.source,'user-entered');for(const mass of [NaN,Infinity,-3,0,1001,'2'])assert.equal(core.interpret(stable(),{mass}).profile.estimated_mass,null);
});
test('All selected scenarios produce coherent model-specific forces and equations',()=>{
 const expected={held:['weight','hand'],table:['weight','normal'],push:['weight','normal','push','friction'],string:['weight','tension'],incline:['weight','normal','friction']};for(const [scenario,ids]of Object.entries(expected)){const a=core.interpret(stable(),{scenario});assert.deepEqual(a.forces.map(f=>f.id),ids);assert.ok(a.equations.length>0);assert.ok(a.assumptions.includes('Scenario selected by you, not identified by the camera.'));}
});
test('Inclined support normal is perpendicular; gravity never rotates with the object',()=>{
 for(const angle of [0,25,45,75]){const a=core.interpret(stable(),{scenario:'incline',angle,stationary:true}),g=a.forces[0].direction,n=a.forces[1].direction,f=a.forces[2].direction;assert.deepEqual(g,{x:0,y:1});assert.ok(Math.abs(n.x*f.x+n.y*f.y)<1e-12);assert.ok(Math.abs(Math.hypot(n.x,n.y)-1)<1e-12);assert.ok(a.equations.some(x=>x.includes('μₛ')));assert.ok(a.assumptions.some(x=>x.includes('Coefficient unknown')));}
});
test('Mirrored overlay uses the same normalised frame as the video',()=>{const p=core.project([.1,.2,.3,.4],640,360,true);for(const [k,v]of Object.entries({x:384,y:72,w:192,h:144}))assert.ok(Math.abs(p[k]-v)<1e-9);});
test('Camera feature is modular and isolated from production backend and recording',()=>{
 const js=['physics','vision','rendering','ui'].map(n=>fs.readFileSync(path.join(root,'experience/camera-physics',n+'.js'),'utf8')).join('\n');assert.doesNotMatch(js,/MediaRecorder|Tutor\.|GROQ|Authorization|localStorage|fetch\(/);assert.match(js,/audio:false/);assert.match(js,/segmentation:false,depth:false,orientation:false/);assert.match(js,/visibilitychange/);assert.match(js,/getTracks\(\)\.forEach/);assert.match(js,/if\(!live\(t\)\)/);
});
