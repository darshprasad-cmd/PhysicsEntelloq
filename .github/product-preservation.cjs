/* Restore only explicit product integration slots before historical byte proofs.
   The frozen 63a86b4 sources and all older published digests remain immutable. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const hashes={SEARCH:'4eab2d7a06d86d921617bcf3228411450fe052cd1ca003a19d4c8bea8e8d5184',LAUNCH:'3df0c8bba67d0bf4bf47fce9ad26a95f6e284553becbf12fcada586de8ef5ba4','CBSE-ENTRY':'c2fbf6768c98b9ccbc3ebca7f9422be63ff3f6ddfb4eaa51cc44c4e9472be9f7',TRACK:'ef0901227489ac681b1fc87bde84150af9227142b17ab0437c17012fd21e7447'};
function fixture(name){const s=read('.github/fixtures/product-baseline-63a86b4/'+name+'.txt');assert.equal(createHash('sha256').update(s).digest('hex'),hashes[name],'Immutable product baseline '+name);return s;}
function once(text,from,to,name){assert.equal(text.split(from).length,2,'One exact product slot '+name);return text.replace(from,function(){return to;});}
module.exports=function(text){
  for(const [name,file] of [['SCIENCE-CORE','assets/entelloq-science.js'],['SCIENCE-CLASSROOM','assets/entelloq-classroom.js'],['PRODUCT-EXCELLENCE','experience/product-excellence.js']])text=once(text,'/* EXPERIENCE:'+name+':START */\n'+read(file)+'\n/* EXPERIENCE:'+name+':END */\n','',name);
  for(const file of ['assets/entelloq-science.css','experience/product-excellence.css'])text=once(text,'\n'+read(file),'',file);
  for(const [name,file] of [['SEARCH','experience/search.js'],['LAUNCH','experience/launch.js']]){var source=read(file);if(name==='LAUNCH')source=source.replace('__FOUNDER_PORTRAIT__','data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'assets/darsh-prasad.jpg')).toString('base64'));text=once(text,'/* EXPERIENCE:'+name+':START */\n'+source+'\n/* EXPERIENCE:'+name+':END */',fixture(name),name);}
  text=once(text,'<!-- CBSE-ENTRY:START -->\n'+read('experience/cbse-entry.html')+'\n<!-- CBSE-ENTRY:END -->',fixture('CBSE-ENTRY'),'CBSE-ENTRY');
  text=once(text,'/* EXPERIENCE:PRIVACY-ANALYTICS:START */\n'+read('experience/privacy-analytics.js')+'\n/* EXPERIENCE:PRIVACY-ANALYTICS:END */\n',fixture('TRACK'),'PRIVACY-ANALYTICS');
  return text;
};
