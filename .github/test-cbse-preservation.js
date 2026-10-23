// Immutable published baseline f845ae7: remove only the three additive CBSE
// slots, then compare every existing byte, including launcher/auth/labs/assets.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),normalize=text=>text.replace(/\r\n/g,'\n');
function removeScientificAdditions(text){
  const slot='/* EXPERIENCE:SCIENTIFIC-LABS:START */\n'+normalize(fs.readFileSync(path.join(root,'experience/scientific-labs.js'),'utf8'))+'\n/* EXPERIENCE:SCIENTIFIC-LABS:END */\n';
  assert.equal(text.split(slot).length,2,'One exact scientific integration slot');text=text.replace(slot,'');
  const style='\n'+normalize(fs.readFileSync(path.join(root,'experience/scientific-labs.css'),'utf8'));
  assert.equal(text.split(style).length,2,'One exact scientific stylesheet');return text.replace(style,'');
}
test('Scientific additions preserve every published practical-release byte (cf62ad6)',()=>{
  const text=removeScientificAdditions(normalize(fs.readFileSync(path.join(root,'index.html'),'utf8')));
  assert.equal(createHash('sha256').update(text).digest('hex'),'9dc46003631d939464764fdc7d854f17259789c2465606d8272d4b4bba8cf562');
});
function removePracticalAdditions(text){
  for(const [name,file] of [['MEASUREMENT-MODEL','measurement-model.js'],['MEASUREMENT-LAB','measurement-lab.js'],['PRACTICAL-GUIDES','practical-guides.js'],['PRACTICAL-LIBRARY','practical-library.js']]){
    const slot='/* EXPERIENCE:'+name+':START */\n'+normalize(fs.readFileSync(path.join(root,'experience',file),'utf8'))+'\n/* EXPERIENCE:'+name+':END */\n';
    assert.equal(text.split(slot).length,2,'One exact, source-owned '+name+' slot');text=text.replace(slot,'');
  }
  for(const file of ['measurement-lab.css','practical-library.css']){
    const style='\n'+normalize(fs.readFileSync(path.join(root,'experience',file),'utf8'));
    assert.equal(text.split(style).length,2,'One exact '+file+' style');text=text.replace(style,'');
  }
  return text;
}
test('Measurement additions preserve every published questionnaire-release byte (1243d7e)',()=>{
  const text=removePracticalAdditions(removeScientificAdditions(normalize(fs.readFileSync(path.join(root,'index.html'),'utf8'))));
  assert.equal(createHash('sha256').update(text).digest('hex'),'a65ea108cf81eb6fc017d45f103da0c190c88eac6530cbd2d229783f4c23a823');
});
test('CBSE additions preserve every pre-existing published application byte',()=>{
  let text=removePracticalAdditions(removeScientificAdditions(normalize(fs.readFileSync(path.join(root,'index.html'),'utf8'))));
  for(const pattern of [/\n<!-- CBSE-ENTRY:START -->[\s\S]*?<!-- CBSE-ENTRY:END -->/g,/\/\* EXPERIENCE:CBSE-STUDY:START \*\/[\s\S]*?\/\* EXPERIENCE:CBSE-STUDY:END \*\/\n/g]){
    assert.equal([...text.matchAll(pattern)].length,1,'One unambiguous approved addition');
    text=text.replace(pattern,'');
  }
  const style='\n'+normalize(fs.readFileSync(path.join(root,'experience/cbse-study.css'),'utf8'));
  assert.equal(text.split(style).length,2,'Only one source-identical stylesheet addition');
  text=text.replace(style,'');
  assert.equal(createHash('sha256').update(text).digest('hex'),'b9f22b7b69fe000691ff070e77f71f9de7d57b95cd3250682d40c3d04efeece5');
});
