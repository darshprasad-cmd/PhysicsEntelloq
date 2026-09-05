/* Assemble authored experience modules into the existing single-file distribution. */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),target=path.join(root,'index.html');
let html=fs.readFileSync(target,'utf8');
function embed(name,file,firstStart,firstEnd){
  const start='/* EXPERIENCE:'+name+':START */',end='/* EXPERIENCE:'+name+':END */';
  let source=fs.readFileSync(path.join(root,'experience',file),'utf8');
  if(file==='launch.js')source=source.replace('__FOUNDER_PORTRAIT__','data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'assets','darsh-prasad.jpg')).toString('base64'));
  const value=start+'\n'+source+'\n'+end;
  if(html.includes(start)) {const a=html.indexOf(start),b=html.indexOf(end,a);if(b<0)throw Error(name);html=html.slice(0,a)+value+html.slice(b+end.length);}
  else {const a=html.indexOf(firstStart),b=firstEnd?html.indexOf(firstEnd,a):a;if(a<0||b<0)throw Error('Missing insertion point '+name);html=html.slice(0,a)+value+'\n'+html.slice(b);}
}
embed('LAUNCH','launch.js','var Landing=(function(){','/* ===== SANDBOX WORKSPACE UX');
embed('MODEL','cradle-model.js','var Sandbox=(function(){');
embed('STUDIO','cradle-studio.js','  function accel(){ var n=B.length');
embed('HOME','home.js','function viewHome(){','function recCard(');
embed('APPDESIGN','app-design.js','/* ===== SANDBOX WORKSPACE UX');
embed('WELCOME','welcome-tour.js','/* ===== SANDBOX WORKSPACE UX');
embed('ATLAS','atlas.js','function viewUniverse(){','/* ===== Pass 87');
embed('LIBRARY','library-entry.js','function viewLearn(){','var domFilter=');
embed('SEARCH','search.js','var Cmdk=(function(){','/* ===== SOLVE — type any problem');
embed('ADVANCED','advanced-studio.js','function viewAdv(id){','/* #adv deep link');
const cssStart='<!-- EXPERIENCE:CSS:START -->',cssEnd='<!-- EXPERIENCE:CSS:END -->';
const css=cssStart+'\n<style id="experience-css">\n'+['experience.css','app-design.css','welcome.css','advanced-studio.css'].map(file=>fs.readFileSync(path.join(root,'experience',file),'utf8')).join('\n')+'\n</style>\n'+cssEnd;
if(html.includes(cssStart)){const a=html.indexOf(cssStart),b=html.indexOf(cssEnd,a);html=html.slice(0,a)+css+html.slice(b+cssEnd.length);}
else html=html.replace('</head>',css+'\n</head>');
const guideStart='<!-- FEATURE-GUIDE:START -->',guideEnd='<!-- FEATURE-GUIDE:END -->';
const guide=guideStart+'\n<style>'+fs.readFileSync(path.join(root,'assets/feature-tutorials.css'),'utf8')+'</style>\n<script data-app="physics">'+fs.readFileSync(path.join(root,'assets/feature-tutorials.js'),'utf8')+'</script>\n'+guideEnd;
if(html.includes(guideStart)){const a=html.indexOf(guideStart),b=html.indexOf(guideEnd,a);html=html.slice(0,a)+guide+html.slice(b+guideEnd.length);}
else html=html.replace('</body>',guide+'\n</body>');
if(process.argv.includes('--check')){
  if(fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==html.replace(/\r\n/g,'\n'))throw Error('Experience sources and index.html differ. Run node .github/build-experience.js');
  console.log('Experience artifact matches its sources');
}else{fs.writeFileSync(target,html);console.log('Built launch, command centre, cradle model, studio and styles into index.html');}
