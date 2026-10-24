/* Assemble authored experience modules into the existing single-file distribution. */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),target=path.join(root,'index.html');
let html=fs.readFileSync(target,'utf8');
function embed(name,file,firstStart,firstEnd){
  const start='/* EXPERIENCE:'+name+':START */',end='/* EXPERIENCE:'+name+':END */';
  let source=fs.readFileSync(path.join(root,'experience',file),'utf8');
  if(file==='launch.js')source=source.replace('__FOUNDER_PORTRAIT__','data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'assets','darsh-prasad.jpg')).toString('base64'));
  const launchAssets={'__OBSERVATORY_BACKGROUND__':['image/webp','observatory-background.webp'],'__CINEMATIC_ORBIT__':['image/webp','reality-orbit.webp'],'__CINEMATIC_MOBILE__':['image/webp','reality-orbit-mobile.webp'],'__SANDBOX_POSTER__':['image/webp','reality-sandbox-poster.webp'],'__SANDBOX_VIDEO__':['video/mp4','reality-sandbox.mp4'],'__LEARN_CAPTURE__':['image/webp','reality-learn.webp'],'__MAP_CAPTURE__':['image/webp','reality-map.webp']};
  if(file==='launch.js'||file==='observatory-markup.js')for(const [token,[mime,asset]] of Object.entries(launchAssets))if(source.includes(token))source=source.replaceAll(token,'data:'+mime+';base64,'+fs.readFileSync(path.join(root,'assets',asset)).toString('base64'));
  const value=start+'\n'+source+'\n'+end;
  if(html.includes(start)) {const a=html.indexOf(start),b=html.indexOf(end,a);if(b<0)throw Error(name);html=html.slice(0,a)+value+html.slice(b+end.length);}
  else {const a=html.indexOf(firstStart),b=firstEnd?html.indexOf(firstEnd,a):a;if(a<0||b<0)throw Error('Missing insertion point '+name);html=html.slice(0,a)+value+'\n'+html.slice(b);}
}
embed('LAUNCH','launch.js','var Landing=(function(){','/* ===== SANDBOX WORKSPACE UX');
embed('OBSERVATORY','observatory.js','/* EXPERIENCE:LAUNCH:START */');
embed('OBSERVATORY-MARKUP','observatory-markup.js','/* EXPERIENCE:LAUNCH:START */');
embed('MODEL','cradle-model.js','var Sandbox=(function(){');
embed('CAMERA-PHYSICS','camera-physics/physics.js','var Sandbox=(function(){');
embed('CAMERA-VISION','camera-physics/vision.js','var Sandbox=(function(){');
embed('CAMERA-RENDERING','camera-physics/rendering.js','var Sandbox=(function(){');
embed('CAMERA-PANEL','camera-physics/ui.js','var Sandbox=(function(){');
embed('SANDBOX-STUDIO','sandbox-studio.js','function viewSandbox(){');
embed('STUDIO','cradle-studio.js','  function accel(){ var n=B.length');
embed('HOME','home.js','function viewHome(){','function recCard(');
embed('APPDESIGN','app-design.js','/* ===== SANDBOX WORKSPACE UX');
embed('WELCOME','welcome-tour.js','/* ===== SANDBOX WORKSPACE UX');
embed('ATLAS','atlas.js','function viewUniverse(){','/* ===== Pass 87');
embed('LIBRARY','library-entry.js','function viewLearn(){','var domFilter=');
embed('SEARCH','search.js','var Cmdk=(function(){','/* ===== SOLVE — type any problem');
embed('KATEX','vendor/katex.min.js','var Tutor=(function(){');
embed('ANSWER-FORMAT','answer-format.js','var Tutor=(function(){');
embed('PRACTICE-ANSWERS','practice-answers.js','var Practice=(function(){');
embed('ADVANCED','advanced-studio.js','function viewAdv(id){','/* #adv deep link');
embed('CBSE-STUDY','cbse-study.js','/* ===== INIT ===== */');
embed('MEASUREMENT-MODEL','measurement-model.js','/* ===== INIT ===== */');
embed('MEASUREMENT-LAB','measurement-lab.js','/* ===== INIT ===== */');
embed('PRACTICAL-GUIDES','practical-guides.js','/* ===== INIT ===== */');
embed('PRACTICAL-LIBRARY','practical-library.js','/* ===== INIT ===== */');
embed('SCIENTIFIC-LABS','scientific-labs.js','/* ===== INIT ===== */');
embed('LEARNING-TOOLS','learning-tools.js','/* ===== INIT ===== */');
embed('SPHEROMETER-MODEL','spherometer-model.js','/* ===== INIT ===== */');
embed('SPHEROMETER-LAB','spherometer-lab.js','/* ===== INIT ===== */');
const cssStart='<!-- EXPERIENCE:CSS:START -->',cssEnd='<!-- EXPERIENCE:CSS:END -->';
const css=cssStart+'\n<style id="experience-css">\n'+['experience.css','app-design.css','welcome.css','advanced-studio.css','observatory.css','observatory-theme.css','light-mode.css','sandbox-studio.css','answer-format.css','observatory-realism.css','reality-workspace.css','cbse-study.css','measurement-lab.css','practical-library.css','scientific-labs.css','learning-tools.css','spherometer-lab.css'].map(file=>fs.readFileSync(path.join(root,'experience',file),'utf8')).join('\n').replace('__OBSERVATORY_REFERENCE__','data:image/webp;base64,'+fs.readFileSync(path.join(root,'assets','observatory-reference.webp')).toString('base64'))+'\n</style>\n'+cssEnd;
if(html.includes(cssStart)){const a=html.indexOf(cssStart),b=html.indexOf(cssEnd,a);html=html.slice(0,a)+css+html.slice(b+cssEnd.length);}
else html=html.replace('</head>',css+'\n</head>');
const entryStart='<!-- CBSE-ENTRY:START -->',entryEnd='<!-- CBSE-ENTRY:END -->';
const entry=entryStart+'\n'+fs.readFileSync(path.join(root,'experience/cbse-entry.html'),'utf8')+'\n'+entryEnd;
if(html.includes(entryStart)){const a=html.indexOf(entryStart),b=html.indexOf(entryEnd,a);if(b<0)throw Error('Missing CBSE entry end');html=html.slice(0,a)+entry+html.slice(b+entryEnd.length);}
else html=html.replace('<body>','<body>\n'+entry);
const guideStart='<!-- FEATURE-GUIDE:START -->',guideEnd='<!-- FEATURE-GUIDE:END -->';
const guide=guideStart+'\n<style>'+fs.readFileSync(path.join(root,'assets/feature-tutorials.css'),'utf8')+'</style>\n<script data-app="physics">'+fs.readFileSync(path.join(root,'assets/feature-tutorials.js'),'utf8')+'</script>\n'+guideEnd;
if(html.includes(guideStart)){const a=html.indexOf(guideStart),b=html.indexOf(guideEnd,a);html=html.slice(0,a)+guide+html.slice(b+guideEnd.length);}
else html=html.replace('</body>',guide+'\n</body>');
if(process.argv.includes('--check')){
  if(fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==html.replace(/\r\n/g,'\n'))throw Error('Experience sources and index.html differ. Run node .github/build-experience.js');
  console.log('Experience artifact matches its sources');
}else{fs.writeFileSync(target,html);console.log('Built launch, command centre, cradle model, studio and styles into index.html');}
