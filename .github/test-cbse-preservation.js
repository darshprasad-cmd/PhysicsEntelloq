// Immutable published baseline f845ae7: remove only the three additive CBSE
// slots, then compare every existing byte, including launcher/auth/labs/assets.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),normalize=text=>text.replace(/\r\n/g,'\n');
// The quality pass owns these adapter slots only. Restore their exact immutable
// published sources before comparing the historical whole-artifact digests.
// Each current source must still occur exactly once in the generated artifact.
function restoreHostBaseline(text){
  for(const [file,marker,hash] of [
    ['learning-tools.js','LEARNING-TOOLS','5aec58b1d8d6723e80d4c68a572d2f00be35972d149bb0c3aa95fc8da1b8f615'],
    ['learning-tools.css',null,'46c104c861497c8c87d84d5e48626b6bb97322bfcdeaa015b83f9b67f09e23c3'],
    ['scientific-labs.js','SCIENTIFIC-LABS','461fbc5451b45099fff0c456da2a7d52e1e88e1d90abd3609c9e4884f90c78eb']
  ]){
    const frozen=normalize(fs.readFileSync(path.join(__dirname,'fixtures/host-baseline-9d027d5',file),'utf8'));
    assert.equal(createHash('sha256').update(frozen).digest('hex'),hash,'Immutable '+file+' fixture');
    const current=normalize(fs.readFileSync(path.join(root,'experience',file),'utf8'));
    const slot=source=>marker?'/* EXPERIENCE:'+marker+':START */\n'+source+'\n/* EXPERIENCE:'+marker+':END */\n':'\n'+source;
    assert.equal(text.split(slot(current)).length,2,'One exact current '+file+' source slot');
    text=text.replace(slot(current),slot(frozen));
  }
  return text;
}
test('Host quality changes preserve every surrounding published byte (9d027d5)',()=>{
  const text=restoreHostBaseline(normalize(fs.readFileSync(path.join(root,'index.html'),'utf8')));
  assert.equal(createHash('sha256').update(text).digest('hex'),'a47854f495c56b6cb5a889b8d374eba46a284b610e06f70ce68a619f94c3a979');
});
function removeSpherometer(text){
  for(const [name,file] of [['SPHEROMETER-MODEL','spherometer-model.js'],['SPHEROMETER-LAB','spherometer-lab.js']]){
    const slot='/* EXPERIENCE:'+name+':START */\n'+normalize(fs.readFileSync(path.join(root,'experience',file),'utf8'))+'\n/* EXPERIENCE:'+name+':END */\n';
    assert.equal(text.split(slot).length,2,'One exact new '+name+' slot');text=text.replace(slot,'');
  }
  const css='\n'+normalize(fs.readFileSync(path.join(root,'experience/spherometer-lab.css'),'utf8'));
  assert.equal(text.split(css).length,2,'One exact spherometer stylesheet');return text.replace(css,'');
}
// Integration baseline: immutable visual-tools commit 5719a0c5dd59c8b31780fed392feb40f378b44c3.
// Its Git index.html blob is LF-normalized. Stripping only the independently
// released spherometer slots must recover every premerge visual-tool byte.
test('Spherometer preserves every premerge visual-tools byte (5719a0c)',()=>{
  const text=removeSpherometer(restoreHostBaseline(normalize(fs.readFileSync(path.join(root,'index.html'),'utf8'))));
  assert.equal(createHash('sha256').update(text).digest('hex'),'89edbb270dd7ff79948a442016e0a4fee0a08c6f6b47737b76405bd3d64c2d27');
});
function removeScientificAdditions(text){
  text=removeSpherometer(text);
  const learningSlot='/* EXPERIENCE:LEARNING-TOOLS:START */\n'+normalize(fs.readFileSync(path.join(root,'experience/learning-tools.js'),'utf8'))+'\n/* EXPERIENCE:LEARNING-TOOLS:END */\n';
  assert.equal(text.split(learningSlot).length,2,'One exact learning-tools integration slot');text=text.replace(learningSlot,'');
  const learningStyle='\n'+normalize(fs.readFileSync(path.join(root,'experience/learning-tools.css'),'utf8'));
  assert.equal(text.split(learningStyle).length,2,'One exact learning-tools stylesheet');text=text.replace(learningStyle,'');
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
