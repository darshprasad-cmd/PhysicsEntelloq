// Immutable published baseline f845ae7: remove only the three additive CBSE
// slots, then compare every existing byte, including launcher/auth/labs/assets.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),normalize=text=>text.replace(/\r\n/g,'\n');
test('CBSE additions preserve every pre-existing published application byte',()=>{
  let text=normalize(fs.readFileSync(path.join(root,'index.html'),'utf8'));
  for(const pattern of [/\n<!-- CBSE-ENTRY:START -->[\s\S]*?<!-- CBSE-ENTRY:END -->/g,/\/\* EXPERIENCE:CBSE-STUDY:START \*\/[\s\S]*?\/\* EXPERIENCE:CBSE-STUDY:END \*\/\n/g]){
    assert.equal([...text.matchAll(pattern)].length,1,'One unambiguous approved addition');
    text=text.replace(pattern,'');
  }
  const style='\n'+normalize(fs.readFileSync(path.join(root,'experience/cbse-study.css'),'utf8'));
  assert.equal(text.split(style).length,2,'Only one source-identical stylesheet addition');
  text=text.replace(style,'');
  assert.equal(createHash('sha256').update(text).digest('hex'),'b9f22b7b69fe000691ff070e77f71f9de7d57b95cd3250682d40c3d04efeece5');
});
