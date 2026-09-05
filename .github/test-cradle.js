const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{test}=require('node:test');
const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../experience/cradle-model.js'),'utf8'),context);const model=context.CradlePhysics;
const body=(x,y,fixed=false,m=.01)=>({x,y,vx:0,vy:0,m,fixed});
function settle(bs,ls,options={},seconds=10,dt=1/120){for(let t=0;t<Math.round(seconds/dt);t++)model.advance(bs,ls,{EA:80,damping:4,iterations:32,...options},dt);return model.measure(bs,ls,options.EA||80);}
function near(actual,expected,tolerance){assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} expected ${expected} ± ${tolerance}`);}
test('Hanging mass: tension = mg, extension = mgL/EA; fixed anchor stays fixed',()=>{
  const bs=[body(0,0,true),body(0,100)],ls=[{a:0,b:1,L:100}];const m=settle(bs,ls);
  near(m.peakN,.0981,.00001);near(bs[1].y,100+100*.0981/80,.00001);near(bs[0].y,0,0);near(bs[0].vy,0,0);
  near(m.elasticJ,.5*.0981*(.0981/80),1e-8);
});
test('Slack rope never pushes: zero compressive force and zero elastic energy',()=>{
  const bs=[body(0,0,true),body(50,0)],ls=[{a:0,b:1,L:100}];settle(bs,ls,{gravity:0});const m=model.measure(bs,ls,80);
  near(m.peakN,0,0);near(m.elasticJ,0,0);near(bs[1].x,50,0);
});
test('Internal forces preserve linear momentum without gravity or damping',()=>{
  const bs=[body(-60,0,false,.02),body(60,0,false,.04)],ls=[{a:0,b:1,L:100}];bs[0].vx=12;bs[1].vx=6;
  const before=bs.reduce((n,b)=>n+b.m*b.vx,0);settle(bs,ls,{gravity:0,damping:0},.5);
  near(bs.reduce((n,b)=>n+b.m*b.vx,0),before,1e-8);
});
test('Measurements use SI units at the centimetre boundary',()=>{
  const bs=[body(0,0,true),body(110,0,false,2)],ls=[{a:0,b:1,L:100}];bs[1].vx=100;
  const m=model.measure(bs,ls,80);near(m.peakN,8,1e-10);near(m.elasticJ,.4,1e-10);near(m.kineticJ,1,1e-10);
});
test('Damping dissipates free-particle energy without changing its direction',()=>{
  const bs=[body(0,0)];bs[0].vx=100;settle(bs,[],{gravity:0,damping:2},1);
  near(bs[0].vx,100*Math.exp(-2),1e-8);near(bs[0].vy,0,0);
});
test('Static result is consistent at 60, 120 and 240 Hz',()=>{
  for(const dt of [1/60,1/120,1/240]){const m=settle([body(0,0,true),body(0,100)],[{a:0,b:1,L:100}],{},8,dt);near(m.peakN,.0981,1e-5);}
});
test('Wider supports increase force for equal-length, equal-mass settled cord',()=>{
  function cord(width){const bs=[],ls=[];for(let i=0;i<=24;i++){bs.push(body(-width/2+width*i/24,95*Math.sin(Math.PI*i/24),i===0||i===24,.004));if(i)ls.push({a:i-1,b:i,L:450/24});}const m=settle(bs,ls,{},12);return {force:Math.hypot(m.forces[0].x,m.forces[0].y),vertical:m.forces[0].y+m.forces[24].y,kinetic:m.kineticJ};}
  const a=cord(260),b=cord(380);assert.ok(b.force>a.force);near(a.vertical,.004*23*9.81,.025);near(b.vertical,.004*23*9.81,.025);assert.ok(a.kinetic<1e-5&&b.kinetic<1e-5);
  console.log('Controlled comparison (N):',a.force.toFixed(4),'→',b.force.toFixed(4));
});
test('Weave remains finite across stiffness extremes and a large support displacement',()=>{
  for(const EA of [10,80,240]){const bs=[],ls=[];for(let i=0;i<64;i++){const a=i/64*Math.PI*2;bs.push(body(180*Math.cos(a),90*Math.sin(a),i%16===0,.002));if(i)ls.push({a:i-1,b:i,L:Math.hypot(bs[i].x-bs[i-1].x,bs[i].y-bs[i-1].y)});}ls.push({a:63,b:0,L:Math.hypot(bs[63].x-bs[0].x,bs[63].y-bs[0].y)});bs[0].x+=100;const m=settle(bs,ls,{EA},3);assert.ok(Number.isFinite(m.peakN)&&Number.isFinite(m.kineticJ));bs.forEach(b=>assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.vx)));}
});
test('Rejects invalid integration steps',()=>{for(const dt of [0,-1,NaN,Infinity,.1])assert.throws(()=>model.advance([],[],{},dt));});
