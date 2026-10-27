/* Run with node --test .github/test-guided-practicals.js. The data contract is
 * checked against the independently audited CBSE inventory, not a second list
 * copied from the implementation. Numerical checks below use physical laws. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const context={console};context.window=context;context.globalThis=context;
vm.createContext(context);
for(const name of ['procedure-xi.js','procedure-xii.js'])vm.runInContext(fs.readFileSync(path.join(root,'experience',name),'utf8'),context,{filename:name});
const modules=context.PeqProcedureModules;
const inventory=JSON.parse(fs.readFileSync(path.join(root,'docs/cbse/practicals.json'),'utf8'));
const expected=inventory.requirements.filter(e=>/^p(?:11|12)-[ab]-[ea]\d\d$/.test(e.id)).map(e=>e.id).sort();
const byId=id=>modules.find(m=>m.id===id);
function options(c){return (c.options||[]).map(o=>typeof o==='object'?o.value:o);}
function defaults(m){return Object.fromEntries(m.controls.map(c=>[c.key,c.value??c.default??(Array.isArray(c.options)?options(c)[0]:c.min)]));}
function cases(m){const initial=defaults(m),out=[initial];for(const c of m.controls){for(const value of Array.isArray(c.options)?options(c):[c.min,c.max,(Number(c.min)+Number(c.max))/2])out.push({...initial,[c.key]:value});}let corners=[initial];for(const c of m.controls){const values=Array.isArray(c.options)?options(c):[c.min,c.max];if(corners.length*values.length>512)break;corners=corners.flatMap(v=>values.map(value=>({...v,[c.key]:value})));}out.push(...corners);return out;}
function measured(m,values){const rows=m.measure(values);assert.ok(Array.isArray(rows)&&rows.length>0,m.id+' measurement rows');for(const row of rows){assert.ok(typeof row.label==='string'&&row.label.length>0,m.id+' reading label');assert.ok(typeof row.unit==='string',m.id+' unit');if(typeof row.value==='number')assert.ok(Number.isFinite(row.value),m.id+' '+row.label+' finite');else assert.ok(typeof row.value==='string'&&row.value.length>0&&!/(?:^|\s)(?:NaN|undefined|Infinity)(?:$|\s)/.test(row.value),m.id+' '+row.label+' readable');}return rows;}
function frame(m,values,step,completed=false){return m.render({step,completed,values,trial:0});}
function reading(id,values,label){const m=byId(id),r=m.measure({...defaults(m),...values}).find(r=>r.label===label);assert.ok(r,id+' missing reading '+label);assert.equal(typeof r.value,'number',id+' '+label+' is numerical');return r.value;}
function close(actual,expected,message,tolerance=5.1e-4){assert.ok(Math.abs(actual-expected)<=tolerance,message+': expected '+expected+', received '+actual);}

test('Every XI/XII standard practical and activity has exactly one executable module',()=>{
 assert.equal(expected.length,62);assert.ok(Array.isArray(modules));
 assert.deepEqual(Array.from(modules,m=>m.id).sort(),expected);
 assert.equal(new Set(modules.map(m=>m.id)).size,62);
 assert.equal(modules.filter(m=>m.id.startsWith('p11-')).length,34);
 assert.equal(modules.filter(m=>m.id.startsWith('p12-')).length,28);
 for(const id of ['p12-a-e03','p12-a-e05'])assert.ok(byId(id).controls.some(c=>Array.isArray(c.options)&&options(c).length>=2),id+' offers both prescribed alternatives');
});

test('Each workflow has apparatus actions, visible observations and explicit model limits',()=>{
 for(const m of modules){
  assert.ok(typeof m.family==='string'&&m.family.length>2,m.id+' family');
  assert.ok(m.apparatus.length>=2&&m.apparatus.every(x=>typeof x==='string'&&x.length>1),m.id+' apparatus');
  const model=typeof m.model==='function'?m.model(defaults(m)):m.model,formula=typeof m.formula==='function'?m.formula(defaults(m)):m.formula;
  assert.ok(typeof model==='string'&&model.length>25,m.id+' model boundaries');
  assert.ok(typeof formula==='string'&&formula.length>3,m.id+' formula');
  assert.ok(Array.isArray(m.steps)&&m.steps.length>=4,m.id+' multi-step procedure');
  for(const s of m.steps){for(const k of ['title','instruction','action','observe'])assert.ok(typeof s[k]==='string'&&s[k].length>3,m.id+' '+k);assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y)&&s.x>=0&&s.x<=100&&s.y>=0&&s.y<=100,m.id+' hotspot percent bounds');}
  assert.equal(typeof m.render,'function');assert.equal(typeof m.measure,'function');
 }
});

test('Every control boundary and select alternative yields finite, deterministic readings',()=>{
 for(const m of modules){
  assert.ok(Array.isArray(m.controls),m.id+' control declaration');assert.equal(new Set(m.controls.map(c=>c.key)).size,m.controls.length,m.id+' distinct controls');
  for(const c of m.controls){assert.match(c.key,/^[a-zA-Z][a-zA-Z0-9_-]*$/);assert.ok(c.label?.length>1,m.id+' control label');if(Array.isArray(c.options))assert.ok(options(c).length>=2,m.id+' alternatives');else assert.ok(Number.isFinite(c.min)&&Number.isFinite(c.max)&&c.min<c.max,m.id+' numeric bounds');}
  for(const values of cases(m)){const before=JSON.stringify(values),rows=measured(m,values);assert.equal(JSON.stringify(values),before,m.id+' does not mutate controls');assert.equal(JSON.stringify(m.measure(values)),JSON.stringify(rows),m.id+' repeatable ideal model');}
 }
});

test('Apparatus changes across procedure stages without executable or broken SVG markup',()=>{
 for(const m of modules){
  const values=defaults(m),frames=[];
  for(let step=0;step<=m.steps.length;step++){
   const markup=frame(m,values,step,step===m.steps.length);assert.ok(typeof markup==='string'&&markup.length>100,m.id+' svg scene');
   assert.doesNotMatch(markup,/<(?:script|foreignObject|iframe|image)\b|\bon\w+\s*=|javascript:/i,m.id+' safe SVG');
   assert.doesNotMatch(markup,/\b[\w:-]+=["'][^"']*(?:NaN|undefined|Infinity)[^"']*["']/,m.id+' finite SVG attributes');
   assert.match(markup,/<(?:path|rect|circle|line|ellipse|polygon|polyline|g)\b/,m.id+' drawn apparatus');frames.push(markup);
  }
  assert.ok(new Set(frames).size>=Math.min(3,m.steps.length),m.id+' visible progression beyond static text');
  for(const values of cases(m))assert.doesNotMatch(frame(m,values,m.steps.length,true),/\b[\w:-]+=["'][^"']*(?:NaN|undefined|Infinity)[^"']*["']/,m.id+' finite rendered geometry');
 }
});

test('Scientific validity gates reject invalid readings and demonstrations produce admissible settings',()=>{
 let gates=0;
 for(const m of modules){if(!m.validate)continue;gates++;assert.equal(typeof m.validate,'function',m.id);for(const values of cases(m))assert.equal(typeof m.validate(values),'string',m.id+' actionable gate');if(m.demonstrate){const initial=defaults(m),snapshot=JSON.stringify(initial),values=m.demonstrate(initial);assert.equal(JSON.stringify(initial),snapshot,m.id+' demonstration preserves caller state');assert.equal(m.validate(values),'',m.id+' demonstration meets measurement condition');measured(m,values);for(const c of m.controls)if(!Array.isArray(c.options))assert.ok(Number.isFinite(values[c.key])&&values[c.key]>=c.min&&values[c.key]<=c.max,m.id+' demonstrated settings in apparatus range');}}
 assert.ok(gates>=3,'Null, focus and resonance tasks require scientific readiness gates');
 const bridge=byId('p12-a-e02');assert.ok(bridge.validate(defaults(bridge)).length>0,'An unbalanced bridge is not a valid observation');
});

test('Wire resistivity uses metre/millimetre conversion and preserves very small positive readings',()=>{
 for(const [wire,rho] of Object.entries({nichrome:1.1e-6,constantan:4.9e-7,copper:1.68e-8})){
  const values={wire,length:1.2,diameter:.2,voltage:.1},R=rho*values.length/(Math.PI*(values.diameter/1000)**2/4);
  close(reading('p12-a-e01',values,'Resistance'),R,wire+' resistance');
  close(reading('p12-a-e01',values,'Current'),values.voltage/R,wire+' Ohm law');
  close(reading('p12-a-e01',values,'Resistivity'),rho,wire+' nonzero resistivity',rho*1e-6);
 }
});

test('Pendulum uses pivot-to-centre metres, full cycles and an explicitly mass-independent period',()=>{
 const T=2*Math.PI*Math.sqrt(1/9.81);
 close(reading('p11-a-e07',{length:100,cycles:20},'Period'),T,'one metre pendulum');
 close(reading('p11-a-e07',{length:100,cycles:20},'Elapsed for complete cycles'),20*T,'twenty full cycles');
 close(reading('p11-a-e07',{length:100,cycles:20},'T²'),T*T,'period squared');
 close(reading('p11-a-e08',{length:90,mass:25},'Period'),reading('p11-a-e08',{length:90,mass:200},'Period'),'mass-independent model');
});

test('Spherometer retains sagitta magnitude and correct equilateral-foot geometry',()=>{
 for(const surface of ['convex','concave'])close(reading('p11-a-e04',{spacing:30,sagitta:.5,surface},'Curvature radius magnitude'),300.25,surface+' R=l²/(6h)+h/2');
 close(reading('p11-a-e04',{spacing:30,sagitta:.5,surface:'concave'},'Signed height difference'),-.5,'concave signed sagitta');
});

test('Elastic extensions use SI area and distinguish Young modulus from spring stiffness',()=>{
 const expected=1*9.81*1.5/(Math.PI*(.6/1000)**2/4*200e9)*1000;
 close(reading('p11-b-e01',{mass:1,length:1.5,diameter:.6},'Extension'),expected,'wire extension in mm');
 close(reading('p11-b-e01',{mass:1,length:1.5,diameter:.6},'Chosen modulus'),200,'chosen Y in GPa');
 close(reading('p11-b-e02',{mass:.2,stiffness:40},'Extension'),.2*9.81/40*1000,'spring extension in mm');
 close(reading('p11-b-e02',{mass:.2,stiffness:40},'Spring constant'),40,'spring stiffness');
});

test('Metre-bridge null obeys the actual gap assignment and both combination alternatives',()=>{
 const values={unknown:12,reference:8,jockey:60};
 close(reading('p12-a-e02',values,'Balance length'),60,'12 Ω in left gap gives 60 cm');
 close(reading('p12-a-e02',values,'Resistance inferred at this position'),12,'X=Rl/(100-l)');
 for(const [connection,X] of [['series',18],['parallel',4]]){
  const values={connection,reference:12,jockey:100*X/(X+12)};
  close(reading('p12-a-e03',values,'Predicted equivalent'),X,connection+' equivalent');
  close(reading('p12-a-e03',values,'Bridge inference'),X,connection+' bridge inference');
  close(reading('p12-a-e03',values,'Null length'),values.jockey,connection+' null length');
 }
});

test('Half-deflection and meter conversion include the loading correction and correct shunt topology',()=>{
 const R=4000,G=60,S=R*G/(R+G),values={series:R,shunt:S};
 close(reading('p12-a-e04',values,'Deflection ratio'),.5,'exact half-deflection');
 close(reading('p12-a-e04',values,'G inferred if half-deflection holds'),G,'G=RS/(R-S)');
 close(reading('p12-a-e05',{meter:'voltmeter',fraction:.5},'Series resistance'),2940,'3 V range with 1 mA movement');
 close(reading('p12-a-e05',{meter:'ammeter',fraction:.5},'Parallel shunt'),.001*60/(.1-.001),'0.1 A shunt');
 close(reading('p12-a-e05',{meter:'voltmeter',fraction:.5},'Converted meter'),1.5,'half range voltmeter');
 close(reading('p12-a-e05',{meter:'ammeter',fraction:.5},'Converted meter'),.05,'half range ammeter');
});

test('AC sonometer distinguishes magnetic attraction frequency from electrical frequency',()=>{
 const values={length:35,mass:.5},mechanical=Math.sqrt(.5*9.81/.001)/(2*.35);
 close(reading('p12-a-e06',values,'Wire natural frequency'),mechanical,'wire fundamental');
 close(reading('p12-a-e06',values,'Inferred AC frequency at resonance'),mechanical/2,'two attractive forces per AC cycle');
});

test('Converging and diverging lens readings obey their stated object sign conventions',()=>{
 close(reading('p12-b-e03',{object:30,screen:30},'Conjugate image distance'),30,'convex lens 2f image');
 close(reading('p12-b-e03',{object:30,screen:30},'Focal length from focused pair'),15,'uv/(u+v) for magnitudes');
 close(reading('p12-b-e04',{virtual:10,screen:20},'New conjugate v'),20,'concave lens with virtual object');
 close(reading('p12-b-e04',{virtual:10,screen:20},'Model concave focal length'),-20,'diverging lens negative f');
 close(reading('p12-b-e04',{virtual:10,screen:20},'Focus residual'),0,'conjugate screen is focused');
});

test('Prism minimum deviation is symmetric and total internal reflection has no invented emergent ray',()=>{
 const i=Math.asin(1.5*Math.sin(Math.PI/6))*180/Math.PI,values={incidence:i,index:1.5};
 close(reading('p12-b-e05',values,'Emergence'),i,'i=e at symmetric minimum');
 close(reading('p12-b-e05',values,'Deviation'),2*i-60,'minimum angular deviation');
 close(reading('p12-b-e05',values,'Minimum deviation'),2*i-60,'Snell law prediction');
 const m=byId('p12-b-e05'),rows=m.measure({...defaults(m),incidence:35,index:1.6});
 assert.match(rows.find(r=>r.label==='Emergence').value,/No transmitted ray/);
 assert.match(rows.find(r=>r.label==='Deviation').value,/Total internal reflection/);
});

test('Apparent-depth and both liquid-index methods preserve their distinct geometric references',()=>{
 close(reading('p12-b-e06',{thickness:1.2,index:1.5},'Apparent-mark height'),.4,'image shift');
 close(reading('p12-b-e06',{thickness:1.2,index:1.5},'Apparent depth'),.8,'apparent depth from top surface');
 const n=1.33,F=1/(1/20-(n-1)/30),d=.3,pin=d+(30-d)/n;
 close(reading('p12-b-e07',{index:n,pin:F},'Wet coincidence F'),F,'wet lens power');
 close(reading('p12-b-e07',{index:n,pin:F},'Index inferred if at coincidence'),n,'liquid lens index');
 close(reading('p12-b-e08',{index:n,depth:d,pin},'Pin height above surface H'),pin-d,'height is referenced to liquid surface');
 close(reading('p12-b-e08',{index:n,depth:d,pin},'Index inferred if at coincidence'),n,'liquid mirror index');
});

test('Single-slit diffraction converts millimetres/nanometres and widens when the slit narrows',()=>{
 const values={width:.2,distance:1.5,wavelength:650};
 close(reading('p12-b-a05',values,'Central maximum width'),9.75,'2λD/a in mm');
 close(reading('p12-b-a05',values,'First minimum angle'),Math.asin(650e-9/.0002)*180/Math.PI,'first minimum angle');
 close(reading('p12-b-a05',{...values,width:.1},'Central maximum width'),19.5,'halving slit width doubles central width');
});

test('Guided player preserves legacy work and operates without remote APIs or camera activation',()=>{
 const source=fs.readFileSync(path.join(root,'experience/guided-practicals.js'),'utf8');
 assert.doesNotMatch(source,/localStorage\.clear\(|getUserMedia|\bfetch\(|XMLHttpRequest|Tutor\.ask/);
 assert.match(source,/procedure-record/);assert.match(source,/procedure-export/);assert.match(source,/procedure-reset/);
 assert.match(source,/conduct/);
});

module.exports={modules,byId,defaults,cases,measured};
