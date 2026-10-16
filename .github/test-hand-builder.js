const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function fixture(){
 let now=1000;const added=[],messages=[],history=[],c={cfg:{buildMode:true},prevG:{Left:'none',Right:'none'},holdT:{Left:0,Right:0},radial:{side:null,hot:-1},gest:{Left:'none',Right:'none'},grab:{Left:null,Right:null},performance:{now:()=>now},lastSpawnT:0,wx:x=>x,wy:y=>y,addBody:(x,y,o)=>{added.push({x,y,...o});return added.length-1;},refreshInspect(){},spawn(){},toast(){},$:()=>({set textContent(v){messages.push(v);}}),window:{PeqSbxUX:true},PeqSbxUX:{push:x=>history.push(x)}};
 vm.createContext(c);vm.runInContext(html.match(/var SPAWN=\[[^;]+;/)[0]+html.slice(html.indexOf('    function buildStatus(message)'),html.indexOf('    /* InteractionRenderer — canvas-drawn')),c);
 const p=Array.from({length:21},()=>({x:200,y:200}));
 function frame(g,dt=33,x=200,y=200,side='Right'){now+=dt;c.gest[side]=g;p[9]={x,y};c.handleBuild(side,p);}
 function arm(i=0,side='Right'){frame('palm',33,200,200,side);frame('palm',360,200,200,side);const a=-Math.PI/2+i*Math.PI*2/5;frame('palm',33,200+60*Math.cos(a),200+60*Math.sin(a),side);assert.equal(c.radial.hot,i);}
 return {c,added,messages,history,frame,arm};
}
test('Hand creation survives intermediate closing poses for all five objects and both hands',()=>{
 for(const side of ['Left','Right'])for(let i=0;i<5;i++){
  const f=fixture();f.arm(i,side);for(let j=0;j<5;j++)f.frame('none',33,200,200,side);f.frame('fist',33,200,200,side);
  assert.equal(f.added.length,1);assert.equal(f.added[0].m,f.c.SPAWN[i].o.m);assert.equal(f.added[0].q,f.c.SPAWN[i].o.q);assert.equal(f.added[0].x,200);assert.equal(f.added[0].y,200);assert.deepEqual(f.history,['hand-add']);assert.match(f.messages.at(-1),/^Added /);
  for(let j=0;j<30;j++)f.frame('fist',33,200,200,side);assert.equal(f.added.length,1,'Held fist must not repeat');
 }
});
test('Build cancels stale selections instead of adding when a fist arrives late',()=>{const f=fixture();f.arm();f.frame('fist',901);assert.equal(f.added.length,0);assert.equal(f.c.radial.side,null);});
test('A closed hand without an armed sector adds nothing',()=>{const f=fixture();f.frame('fist');f.frame('palm');f.frame('palm',360);f.frame('fist');assert.equal(f.added.length,0);assert.match(f.messages.at(-1),/No object selected/);});
test('Move mode and tracking-loss cancellation never add a pending object',()=>{
 const f=fixture();f.arm();f.c.cfg.buildMode=false;f.frame('fist');assert.equal(f.added.length,0);assert.equal(f.c.radial.side,null);
 f.c.cfg.buildMode=true;f.arm();f.c.radialClose('Right');f.frame('fist');assert.equal(f.added.length,0);
});
test('Second hand cannot commit the first hand wheel; cooldown and rearming work',()=>{const f=fixture();f.arm();f.frame('fist',33,200,200,'Left');assert.equal(f.added.length,0);f.frame('fist');assert.equal(f.added.length,1);f.arm(2);f.frame('fist');assert.equal(f.added.length,2);});
test('Fist-grab cannot override an armed wheel',()=>{
 const ctx={dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),gest:{Right:'palm'},radial:{side:'Right'},prevPd:{Right:.6},pinchMiss:{Right:0},intent:{Right:null},grab:{Right:null},cfg:{altGrab:true},acquire(){throw Error('Wheel confirmation must not acquire a body');}};
 vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('    function detect(p,side)'),html.indexOf('    function pinchWorld(p)')),ctx);
 const p=Array.from({length:21},()=>({x:0,y:50}));p[0]={x:0,y:100};p[9]={x:0,y:0};p[4]={x:-60,y:80};p[8]={x:0,y:80};
 assert.equal(ctx.detect(p,'Right'),'fist');
});
test('Hands exposes Add objects without a camera request or hidden advanced-controls detour',()=>{const studio=fs.readFileSync(path.join(__dirname,'../experience/sandbox-studio.js'),'utf8');assert.match(studio,/data-hand-mode="add"/);assert.match(studio,/role="status" aria-live="polite"/);assert.doesNotMatch(studio,/Move up or down/);assert.doesNotMatch(studio,/getUserMedia\(/);});
