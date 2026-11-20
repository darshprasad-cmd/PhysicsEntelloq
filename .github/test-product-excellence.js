const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
test('Product shell and privacy slots preserve every released lever byte from c8e50cd',()=>{
 const restored=require('./product-preservation.cjs')(read('index.html'));
 assert.equal(createHash('sha256').update(restored).digest('hex'),'1276a4b8ebd9418f72eb4c44981446178ba1dd3338158683052d9ce5861cc7ce');
 assert.equal(createHash('sha256').update(require('./lever-preservation.cjs')(restored)).digest('hex'),'3e5795faa1012571abcd9ce073d55990de4d7cb19630fcf29f7ea14dcba77ded');
});
test('External session replay remains disabled even with a stored project override',()=>{
 const calls=[],ctx={window:{clarity:(...args)=>calls.push(args)},localStorage:{getItem:()=> 'override'},CLARITY_PROJECT_ID:'original-project'};vm.createContext(ctx);vm.runInContext(read('experience/privacy-analytics.js'),ctx);
 ['load','view','ev','tags','ident','upgrade'].forEach(k=>ctx.Track[k]('test'));
 assert.equal(ctx.Track.enabled(),false);assert.equal(ctx.window.PEQ_track.loaded(),false);assert.deepEqual(calls,[]);assert.doesNotMatch(read('experience/privacy-analytics.js'),/createElement|fetch\(|sendBeacon/);
});
test('Catalog IDs and direct links are unique, native and reference actual resources',()=>{
 const catalog=JSON.parse(read('assets/entelloq-physics-catalog.json'));assert.ok(catalog.length>200);assert.equal(new Set(catalog.map(e=>e.id)).size,catalog.length);
 for(const item of catalog){assert.equal(item.subject,'physics');assert.match(item.url,/^https:\/\/physics\.entelloq\.com\/\?excellence=1#science:/);assert.ok(item.title);}
 assert.ok(catalog.some(e=>e.id==='physics:sim:projectile'));assert.ok(catalog.some(e=>e.id==='physics:scene:catcradle'));
 assert.ok(catalog.some(e=>e.id==='physics:bench:lever'&&e.route==='#science:bench:lever'));
 const science=require('../assets/entelloq-science.js'),benches=catalog.filter(e=>e.kind==='Interactive practical');
 for(const query of ['mechanical advantage','fulcrum','first class lever','torque','load and effort'])assert.ok(science.search(benches,query,24).some(e=>e.id==='physics:bench:lever'),query);
});
require('../tests/entelloq-science.test.cjs');
require('../tests/entelloq-classroom.test.cjs');
