const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
test('Precision UI preserves every surrounding published byte (ab76e15)',()=>{
  const prior=require('./precision-preservation.cjs')(html);
  assert.equal(createHash('sha256').update(prior).digest('hex'),'654c17c742eed5b6bbce60ae4a2202023c73642a750e8f4e6e31dd3a7312082c');
});
test('Sandbox display resolution is bounded without changing model coordinates',()=>{
  const fn=html.match(/function fitc\(\)\{ var r=canvas\.getBoundingClientRect\(\)[^\n]+/)[0];
  for(const [w,h,dpr,memory,expected] of [[800,500,2,8,2],[800,500,3,4,1.5],[3840,2160,3,8,null]]){
    const transforms=[],canvas={width:0,height:0,getBoundingClientRect:()=>({width:w,height:h})};
    const ctx={setTransform:(...v)=>transforms.push(v)};
    const sandbox={canvas,ctx,devicePixelRatio:dpr,navigator:{deviceMemory:memory,hardwareConcurrency:8},Math};
    vm.runInNewContext(fn+';fitc();fitc();',sandbox);
    assert.equal(transforms.length,1,'No redraw-buffer reallocation at unchanged size');
    assert.equal(canvas._W,w);assert.equal(canvas._H,h);
    if(expected)assert.equal(canvas.width,w*expected);
    assert.ok(canvas.width*canvas.height<=4004000,'Rounded raster remains within budget');
  }
});
