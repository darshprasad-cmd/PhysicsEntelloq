const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {revert}=require('./visualization-hooks.cjs');
module.exports=function(text){
  const root=path.resolve(__dirname,'..'),normal=s=>s.replace(/\r\n/g,'\n');
  const js='/* EXPERIENCE:VISUALIZATION:START */\n'+normal(fs.readFileSync(path.join(root,'experience/visualization-labs.js'),'utf8'))+'\n/* EXPERIENCE:VISUALIZATION:END */\n';
  const css='\n'+normal(fs.readFileSync(path.join(root,'experience/visualization-labs.css'),'utf8'));
  for(const slot of [js,css]){assert.equal(text.split(slot).length,2,'Exactly one source-identical visualization slot');text=text.replace(slot,'');}
  return revert(text);
};
