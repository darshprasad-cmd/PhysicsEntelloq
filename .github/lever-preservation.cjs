/* Remove only exact new lever slots; all historical fixtures remain immutable. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),normalize=s=>s.replace(/\r\n/g,'\n');
module.exports=function(text){
  for(const [name,file] of [['LEVER-MODEL','lever-model.js'],['LEVER-LAB','lever-lab.js']]){
    const slot='/* EXPERIENCE:'+name+':START */\n'+normalize(fs.readFileSync(path.join(root,'experience',file),'utf8'))+'\n/* EXPERIENCE:'+name+':END */\n';
    assert.equal(text.split(slot).length,2,'One exact '+name+' source slot');text=text.replace(slot,'');
  }
  const css='\n'+normalize(fs.readFileSync(path.join(root,'experience/lever-lab.css'),'utf8'));
  assert.equal(text.split(css).length,2,'One exact lever stylesheet');return text.replace(css,'');
};
