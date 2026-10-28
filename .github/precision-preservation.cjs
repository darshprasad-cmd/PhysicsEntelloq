const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=function(text){
  const css='\n'+fs.readFileSync(path.join(__dirname,'../experience/precision-ui.css'),'utf8').replace(/\r\n/g,'\n');
  assert.equal(text.split(css).length,2,'One exact precision stylesheet');
  return require('./precision-hooks.cjs').revert(text.replace(css,''));
};
