/* Assemble authored experience modules into the existing single-file distribution. */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),target=path.join(root,'index.html');
let html=fs.readFileSync(target,'utf8');
function embed(name,file,firstStart,firstEnd){
  const start='/* EXPERIENCE:'+name+':START */',end='/* EXPERIENCE:'+name+':END */';
  const value=start+'\n'+fs.readFileSync(path.join(root,'experience',file),'utf8')+'\n'+end;
  if(html.includes(start)) {const a=html.indexOf(start),b=html.indexOf(end,a);if(b<0)throw Error(name);html=html.slice(0,a)+value+html.slice(b+end.length);}
  else {const a=html.indexOf(firstStart),b=firstEnd?html.indexOf(firstEnd,a):a;if(a<0||b<0)throw Error('Missing insertion point '+name);html=html.slice(0,a)+value+'\n'+html.slice(b);}
}
embed('LAUNCH','launch.js','var Landing=(function(){','/* ===== SANDBOX WORKSPACE UX');
embed('MODEL','cradle-model.js','var Sandbox=(function(){');
embed('STUDIO','cradle-studio.js','  function accel(){ var n=B.length');
embed('HOME','home.js','function viewHome(){','function recCard(');
const cssStart='<!-- EXPERIENCE:CSS:START -->',cssEnd='<!-- EXPERIENCE:CSS:END -->';
const css=cssStart+'\n<style id="experience-css">\n'+fs.readFileSync(path.join(root,'experience','experience.css'),'utf8')+'\n</style>\n'+cssEnd;
if(html.includes(cssStart)){const a=html.indexOf(cssStart),b=html.indexOf(cssEnd,a);html=html.slice(0,a)+css+html.slice(b+cssEnd.length);}
else html=html.replace('</head>',css+'\n</head>');
if(process.argv.includes('--check')){
  if(fs.readFileSync(target,'utf8')!==html)throw Error('Experience sources and index.html differ. Run node .github/build-experience.js');
  console.log('Experience artifact matches its sources');
}else{fs.writeFileSync(target,html);console.log('Built launch, command centre, cradle model, studio and styles into index.html');}
