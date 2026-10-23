/* CBSE entry is a separate local preference, not identity, progress or mastery.
   Maps are partial resource links, not certification of syllabus completion. */
var CbseStudy=(function(){
  'use strict';
  var KEY='peq_cbse_study_v1',memory=null,dialog=null,step=0,draft={},origin=null,firstVisit=false,profileSaved=true;
  var source9='https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/ScienceSt_SecP1_2026-27.pdf';
  var source10='https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Science_SecP1_2026-27.pdf';
  var sourceSenior='https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Physics_SecP2_2026-27.pdf';
  function unit(id,title,lessons,gap){return {id:id,title:title,lessons:lessons,gap:gap};}
  var courses={
    '9':{name:'Science · Physics strand',source:source9,note:'Standard Science, 2026–27. The separate advanced-level syllabus is not mapped here. Earth as a System is shared across science disciplines and remains a coverage gap.',units:[
      unit('motion','Motion',['kinematics'],'Class-specific graph interpretation and measured-motion tasks still need review.'),
      unit('forces','Force and laws of motion',['newton-laws','friction'],'Everyday force diagrams and Class 9 assessment coverage are still being checked.'),
      unit('energy','Work, energy and simple machines',['work-energy'],'Dedicated lever, pulley and inclined-plane mechanical-advantage lessons are still needed.'),
      unit('sound','Sound',['wave-basics','sound-intensity'],'Echo, reverberation, echolocation and a Class 9 practical sequence are not yet fully mapped.'),
      unit('earth','Earth as a system',[],'Shared Earth-science connections need an authored interdisciplinary sequence.')
    ]},
    '10':{name:'Science · Physics strand',source:source10,note:'The official PDF lists Effects of Current but also contains a broader teacher-note exclusion. Confirm examination eligibility with your school. Motor, induction and generator material is explicitly formative-only; it is not included in the assessed-path claim here.',units:[
      unit('light','Light: reflection and refraction',['reflection','refraction','lenses'],'Class 10 sign-convention practice and ray-diagram marking criteria still need review.'),
      unit('eye','Human eye and the colourful world',['human-eye','dispersion-prisms'],'Scattering explanations and the complete class-specific assessment set remain gaps.'),
      unit('electricity','Electricity',['ohms-law','resistor-networks','power-electrical'],'Domestic-circuit safety and the full prescribed practical record are not covered by these links.'),
      unit('magnetism','Magnetic effects of current',['magnetic-field','biot-savart','ac-circuits'],'These broad concepts extend beyond Class 10. Follow your school scope; examination eligibility needs clarification.')
    ]},
    '11':{name:'Physics · Subject 042',source:sourceSenior,note:'Linked concepts can extend beyond the school treatment. This is an organised starting map, not a complete CBSE course or a replacement for supervised practical work.',units:[
      unit('measurements','Units and measurements',[],'Dedicated SI, significant-figure, uncertainty and dimensional-analysis lessons are needed.'),
      unit('kinematics','Kinematics',['kinematics','projectile','circular-motion'],'Vector operations, measurement and class-specific derivation coverage require review.'),
      unit('laws','Laws of motion',['newton-laws','friction','momentum'],'Banked-road and concurrent-force problems need a complete assessed sequence.'),
      unit('work','Work, energy and power',['work-energy','momentum'],'Variable-force work and vertical-circle reasoning are not yet fully mapped.'),
      unit('rotation','Systems of particles and rotation',['center-of-mass','rotational'],'Rigid-body equilibrium and a complete moment-of-inertia problem set need review.'),
      unit('gravitation','Gravitation',['gravitation'],'Altitude/depth variation and satellite-energy outcomes need explicit coverage checks.'),
      unit('matter','Properties of bulk matter',['elasticity','fluids','terminal-velocity','temp-heat','thermal-expansion','heat-transfer'],'Surface tension, calorimetry and prescribed experiments are not a complete sequence yet.'),
      unit('thermodynamics','Thermodynamics',['first-law','second-law'],'State changes, cycles and sign-convention assessment coverage require review.'),
      unit('kinetic','Kinetic theory',['kinetic-theory','degrees-of-freedom'],'Mean free path and the complete class-specific practice set require review.'),
      unit('waves','Oscillations and waves',['shm','wave-basics','superposition','standing-waves','beats'],'Organ-pipe, pendulum and spring outcomes still need objective-by-objective checks.')
    ]},
    '12':{name:'Physics · Subject 042',source:sourceSenior,note:'Use the current school scope alongside this resource map. Linked lessons and simulations do not establish complete syllabus coverage or practical certification.',units:[
      unit('electrostatics','Electrostatics',['charge','coulomb','e-field','electric-dipole','gauss','potential','capacitance','dielectrics'],'All prescribed geometries, derivations and assessment outcomes still need review.'),
      unit('current','Current electricity',['ohms-law','drift-velocity','resistor-networks','emf-internal','kirchhoff','wheatstone'],'Temperature dependence, cells and practical observations need full coverage checks.'),
      unit('magnetic','Magnetic effects and magnetism',['magnetic-field','biot-savart'],'Magnetism in matter and moving-coil galvanometer outcomes need authored coverage.'),
      unit('induction','Induction and alternating current',['em-induction','inductance','ac-circuits','transformers'],'Resonance, power factor and generator outcomes need class-specific checks.'),
      unit('emwaves','Electromagnetic waves',['em-waves'],'Displacement current and spectrum applications require assessment review.'),
      unit('optics','Optics',['reflection','refraction','lenses','optical-instruments','interference-optics','diffraction'],'Complete optical-instrument derivations and prescribed experiments remain under review.'),
      unit('dual','Dual nature of radiation and matter',['photoelectric','matter-waves'],'Class-specific graphs and the complete evidence-reasoning set are not yet verified.'),
      unit('nuclei','Atoms and nuclei',['bohr-model','nuclear-binding','fission-fusion'],'Rutherford scattering and nuclear-size outcomes need explicit coverage checks.'),
      unit('electronics','Electronic devices',['semiconductors'],'Rectifier graphs and the complete semiconductor assessment sequence need review.')
    ]}
  };
  var goals={foundations:'Build understanding',revision:'Revise key ideas',practice:'Practise explaining'},times=['10','20','30'];
  function valid(value){
    if(!value||value.v!==1)return null;
    if(value.status==='skipped')return {v:1,status:'skipped'};
    var course=Object.prototype.hasOwnProperty.call(courses,value.class)?courses[value.class]:null;
    if(value.status!=='ready'||typeof value.class!=='string'||!course||!Object.prototype.hasOwnProperty.call(goals,value.goal)||times.indexOf(value.minutes)<0||!course.units.some(function(u){return u.id===value.focus;}))return null;
    return {v:1,status:'ready',class:value.class,goal:value.goal,minutes:value.minutes,focus:value.focus};
  }
  function read(){if(memory)return memory;try{var raw=localStorage.getItem(KEY);if(raw!==null)return valid(JSON.parse(raw));}catch(e){}return null;}
  function save(value){memory=valid(value);try{localStorage.setItem(KEY,JSON.stringify(memory));profileSaved=true;return true;}catch(e){profileSaved=false;return false;}}
  function plan(profile){var course=courses[profile.class],chosen=course.units.find(function(u){return u.id===profile.focus;})||course.units[0];var ready=chosen.lessons.length?chosen:course.units.find(function(u){return u.lessons.length;});return {unit:chosen,resource:ready,minutes:Number(profile.minutes),study:Math.round(Number(profile.minutes)*.4),recall:Math.round(Number(profile.minutes)*.4),check:Math.round(Number(profile.minutes)*.2)};}
  function focusHeading(scope){var h=scope.querySelector('h1,h2');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
  function question(){
    if(step===0)return {key:'class',title:'Which class are you studying?',help:'A separate CBSE path for your class. You can still explore everything.',options:['9','10','11','12'].map(function(v){return [v,'Class '+v,Number(v)<11?'Integrated Science · Physics strand':'Physics · Subject 042'];})};
    if(step===1)return {key:'goal',title:'What would help you today?',help:'A starting preference—not a test or a label about your ability.',options:[['foundations',goals.foundations,'Start with explanations and a physical picture.'],['revision',goals.revision,'Recall first, then revisit what feels unclear.'],['practice',goals.practice,'Explain your reasoning before checking the answer.']]};
    if(step===2)return {key:'minutes',title:'How much time do you have?',help:'We will suggest a small session, without a timer or pressure.',options:times.map(function(v){return [v,v+' minutes',v==='10'?'A quick idea and a recall check.':v==='20'?'Explore, explain and reflect.':'A deeper explanation and another example.'];})};
    return {key:'focus',title:'Where would you like to start?',help:'Choose a topic, not a confidence score. Gaps stay visible in your course map.',options:courses[draft.class].units.map(function(u){return [u.id,u.title,u.lessons.length?'Existing concepts to explore':'Learning sequence still to be authored'];})};
  }
  function renderQuestion(){var q=question();
    dialog.innerHTML='<div class="cbse-q-top"><span>ENTELLOQ / YOUR STARTING POINT</span><button type="button" data-cbse-dismiss aria-label="Skip questionnaire and explore">×</button></div><div class="cbse-q-progress" aria-label="Question '+(step+1)+' of 4">'+[0,1,2,3].map(function(i){return '<i class="'+(i<=step?'on':'')+'"></i>';}).join('')+'</div><p class="cbse-kicker">QUESTION '+(step+1)+' OF 4 · CBSE 2026–27</p><h2 id="cbse-q-title" tabindex="-1">'+esc(q.title)+'</h2><p id="cbse-q-help">'+esc(q.help)+'</p><form id="cbse-form"><fieldset class="cbse-choices"><legend class="cbse-sr">'+esc(q.title)+'</legend>'+q.options.map(function(o){return '<label class="cbse-choice"><input type="radio" name="choice" value="'+o[0]+'" required'+(draft[q.key]===o[0]?' checked':'')+'><span><strong>'+esc(o[1])+'</strong><small>'+esc(o[2])+'</small></span></label>';}).join('')+'</fieldset><footer class="cbse-q-actions">'+(step?'<button type="button" data-cbse-back>Back</button>':'<button type="button" data-cbse-dismiss>Skip for now</button>')+'<button class="cbse-primary" type="submit">'+(step===3?'Open my class section':'Continue')+' →</button></footer></form><p class="cbse-privacy">Only study preferences are saved in this browser. No name, age, school or account needed. Change them any time.</p>';
    dialog.querySelector('.cbse-q-progress').setAttribute('role','img');
    dialog.querySelectorAll('[data-cbse-dismiss]').forEach(function(b){b.addEventListener('click',dismiss);});
    var back=dialog.querySelector('[data-cbse-back]');if(back)back.addEventListener('click',function(){step--;renderQuestion();});
    dialog.querySelector('form').addEventListener('submit',function(e){e.preventDefault();var selected=dialog.querySelector('input:checked');if(!selected)return;var previous=draft.class;draft[q.key]=selected.value;if(q.key==='class'&&previous!==draft.class)delete draft.focus;if(step<3){step++;renderQuestion();}else finish();});
    dialog.scrollTop=0;focusHeading(dialog);
  }
  function show(initial){if(dialog&&dialog.open)return;firstVisit=!!initial;origin=document.activeElement;var previous=read();draft=previous&&previous.status==='ready'?Object.assign({},previous):{};step=0;
    var early=firstVisit&&window.__peqCbseEntry;if(early&&Object.prototype.hasOwnProperty.call(courses,early.class)){draft.class=early.class;if(early.next)step=1;}
    if(!dialog){dialog=document.createElement('dialog');dialog.id='cbse-questionnaire';dialog.className='cbse-questionnaire';dialog.setAttribute('aria-labelledby','cbse-q-title');dialog.setAttribute('aria-describedby','cbse-q-help');dialog.addEventListener('cancel',function(e){e.preventDefault();dismiss();});document.body.appendChild(dialog);}
    renderQuestion();dialog.showModal();var gate=document.getElementById('cbse-entry');if(gate)gate.remove();focusHeading(dialog);
  }
  function close(){dialog.close();if(origin&&origin.isConnected)origin.focus({preventScroll:true});}
  function dismiss(){if(!read())save({v:1,status:'skipped'});close();if(firstVisit&&!initialDestination)originalLandingShow();}
  function finish(){var persisted=save(Object.assign({},draft,{v:1,status:'ready'}));close();if(firstVisit&&initialDestination&&!/^#cbse/.test(location.hash))return;go('cbse',draft.class);if(!persisted){var notice=main.querySelector('.cbse-storage');if(notice)notice.hidden=false;}}
  function explicitDestination(){return Boolean(window.__peqShare||location.hash&&location.hash!=='#home'&&location.hash!=='#landing');}
  function rows(course){return course.units.map(function(u,i){var links=u.lessons.filter(function(id){return !!topicById(id);});return '<article class="cbse-unit"><div class="cbse-unit-title"><span>'+String(i+1).padStart(2,'0')+'</span><div><h2>'+esc(u.title)+'</h2><small>'+ (links.length?'Partial resource map · '+links.length+' linked concepts':'Coverage gap · no lesson linked')+'</small></div></div><div class="cbse-resource-links">'+links.map(function(id){return '<button type="button" data-cbse-lesson="'+id+'">'+esc(topicById(id).name)+' ↗</button>';}).join('')+'</div><p>'+esc(u.gap)+'</p></article>';}).join('');}
  function render(courseId){var p=read(),id=courses[courseId]?courseId:p&&p.status==='ready'?p.class:'9',c=courses[id];
    setCrumb([{t:'CBSE'},{t:'Class '+id},{t:'Physics'}]);
    var personalized=p&&p.status==='ready'&&p.class===id?plan(p):null;
    main.innerHTML='<section class="wrap cbse-dashboard"><header class="cbse-heading"><div><p class="cbse-kicker">YOUR CURRICULUM / 2026–27</p><h1>Class '+id+'.<br><span>Your physics path.</span></h1><p>'+esc(c.name)+'</p></div><button type="button" data-cbse-edit>Personalise my path</button></header><nav class="cbse-classes" aria-label="CBSE class sections">'+Object.keys(courses).map(function(k){return '<button type="button" data-cbse-class="'+k+'"'+(k===id?' aria-current="page"':'')+'>Class '+k+'</button>';}).join('')+'</nav><nav class="cbse-subjects" aria-label="Subject sections"><span aria-current="page">Physics · this app</span><a href="https://biology.entelloq.com/#cbse:'+id+'">Biology · separate app ↗</a><button type="button" data-go="learn">General exploration →</button></nav><p class="cbse-storage" role="status" hidden>Your browser could not save these preferences. They work for this session; notes and progress were not changed.</p>'+
      (personalized?'<section class="cbse-session" aria-labelledby="cbse-session-title"><p class="cbse-kicker">A '+personalized.minutes+'-MINUTE START / '+esc(goals[p.goal]).toUpperCase()+'</p><h2 id="cbse-session-title">'+esc(personalized.unit.title)+'</h2><p>'+ (p.goal==='revision'?'Begin with what you can recall, then reopen the explanation.':p.goal==='practice'?'Make a prediction and explain it in your own words before checking.':'Begin with the physical picture, then connect it to the relationship.')+'</p><ol><li><b>'+personalized.study+' min</b> '+(p.goal==='foundations'?'Explore the concept and its diagram.':'Write or sketch what you remember without looking.')+'</li><li><b>'+personalized.recall+' min</b> '+(p.goal==='foundations'?'Close the explanation and explain it yourself.':'Open the concept; compare your reasoning with its explanation.')+'</li><li><b>'+personalized.check+' min</b> Note one correction and a question to revisit.</li></ol>'+(!personalized.unit.lessons.length?'<p>Your selected sequence is not ready. Start with the related class resources below; this does not fill that gap.</p>':'')+'<button type="button" class="cbse-primary" data-cbse-lesson="'+personalized.resource.lessons[0]+'">Open '+esc(topicById(personalized.resource.lessons[0]).name)+' ↗</button><p class="cbse-fine">A suggested routine, not a mastery estimate. Your existing notes and learning history stay unchanged.</p></section>':'<section class="cbse-session"><h2>A course map, separate from exploration.</h2><p>Choose your study goal, session length and starting topic to build a personal starting routine.</p><button type="button" class="cbse-primary" data-cbse-edit>Set my starting point →</button></section>')+
      '<section class="cbse-scope"><h2>Clear about what is ready.</h2><p>This is a partial map of existing concepts—not a completed CBSE course. Resource links do not certify full chapter coverage, exam readiness or mastery. '+esc(c.note)+'</p><p>Class 9–10 Science also includes Biology, Chemistry and Earth-science content. These separate Physics sections do not cover the whole Science subject. Profiles stay local to each app’s browser origin.</p><a href="'+c.source+'" target="_blank" rel="noopener noreferrer">Check the official CBSE syllabus (PDF) ↗</a></section><div class="cbse-units">'+rows(c)+'</div><footer class="cbse-footer"><button type="button" data-cbse-edit>Edit study preferences</button><button type="button" data-cbse-clear>Clear only study preferences</button><button type="button" data-go="home">General home →</button><p>Independent learning support. Not CBSE-endorsed. Simulations supplement—not replace—school practical work.</p></footer></section>';
    if(!profileSaved)main.querySelector('.cbse-storage').hidden=false;
    main.querySelectorAll('[data-cbse-edit]').forEach(function(b){b.addEventListener('click',function(){show(false);});});
    main.querySelectorAll('[data-cbse-class]').forEach(function(b){b.addEventListener('click',function(){go('cbse',b.dataset.cbseClass);});});
    main.querySelectorAll('[data-cbse-lesson]').forEach(function(b){b.addEventListener('click',function(){var session=!!b.closest('.cbse-session');go('lesson',b.dataset.cbseLesson);if(session&&p&&p.goal==='practice'){var predict=main.querySelector('.lens-tab[data-k="B"]');if(predict){predict.click();predict.scrollIntoView({block:'center',behavior:'instant'});predict.focus({preventScroll:true});}}else if(session&&p&&p.goal==='revision'){var core=main.querySelector('.l-pts');if(core){core.scrollIntoView({block:'start',behavior:'instant'});core.tabIndex=-1;core.focus({preventScroll:true});}}});});
    main.querySelector('[data-cbse-clear]').addEventListener('click',function(){if(!confirm('Clear only your CBSE study preferences? Your notes and progress will stay.'))return;memory={v:1,status:'skipped'};try{localStorage.removeItem(KEY);}catch(e){profileSaved=false;}render(id);show(false);});
    AppDesign.afterView();focusHeading(main);
  }
  if(window.__peqCbseEntry&&window.__peqCbseEntry.skipped)memory={v:1,status:'skipped'};
  var originalGo=go,initialRoute=true,initialDestination=explicitDestination(),originalLandingShow=Landing.show,originalLandingPending=Landing.pending,originalLandingVisible=Landing.visible;
  go=function(v,id){var first=initialRoute;initialRoute=false;var p=read(),hash=/^#cbse(?::(9|10|11|12))?$/.exec(location.hash);if(first&&hash){v='cbse';id=hash[1]||p&&p.class||'9';}else if(first&&v==='home'&&!explicitDestination()&&p&&p.status==='ready'){v='cbse';id=p.class;}
    if(v==='cbse'){originalGo('home');curView='cbse';nav('cbse');render(id);try{history.replaceState(null,'','#cbse:'+((courses[id]&&id)||p&&p.class||'9'));}catch(e){}return;}
    if(!first&&/^#cbse/.test(location.hash)){try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}}
    originalGo(v,id);
  };
  Landing.pending=function(){var p=read();return !p||(p.status!=='ready'&&!initialDestination&&originalLandingPending());};
  Landing.show=function(){if(!read())show(true);else originalLandingShow();};
  Landing.visible=function(){return !!(dialog&&dialog.open)||originalLandingVisible();};
  Onboard.show=function(){show(false);};
  var originalAfter=AppDesign.afterView;
  AppDesign.afterView=function(){originalAfter();if(curView==='home'&&!main.querySelector('[data-cbse-home]')){var row=document.createElement('section');row.className='cbse-home-link';row.innerHTML='<div><small>CBSE / CLASSES 9–12</small><strong>Your class. Your starting point.</strong></div><button type="button" data-cbse-home>Open CBSE sections →</button>';main.prepend(row);row.querySelector('button').addEventListener('click',function(){go('cbse');});}};
  var originalInit=AppDesign.init;
  AppDesign.init=function(){originalInit();var grid=document.querySelector('.pe-explore-grid');if(grid){var b=document.createElement('button');b.type='button';b.innerHTML=AppDesign.icon('learn')+'<span><b>CBSE sections</b><small>Classes 9–12 · your study path</small></span>'+AppDesign.icon('arrow');b.addEventListener('click',function(){document.querySelector('#pe-explore-sheet').close();go('cbse');});grid.prepend(b);}};
  window.addEventListener('hashchange',function(){var h=/^#cbse(?::(9|10|11|12))?$/.exec(location.hash);if(h)go('cbse',h[1]);});
  return {key:KEY,courses:courses,validate:valid,read:read,save:save,plan:plan,show:show,render:render};
})();
