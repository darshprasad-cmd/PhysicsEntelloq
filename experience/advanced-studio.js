/* Advanced Studio is a voluntary learning boundary, never an authentication gate.
   The existing authored treatments and numerical solvers remain the source of truth. */
var AdvancedStudio=(function(){
  var gate=null,ack=false,ACK='peq_studio_ack_v1',LAST='peq_studio_last_v1';
  var fields={
    'lagrangian':{name:'Analytical mechanics',mark:'δS = 0',question:'What makes a path physical?',description:'Move from forces to action, canonical coordinates and the structure of phase space.',needs:'Newtonian mechanics · multivariable calculus · ODEs',method:'Symplectic integration',foundation:'mechanics',art:'orbit'},
    'lorentz':{name:'Spacetime & relativity',mark:'ds²',question:'What survives a change of observer?',description:'Rebuild simultaneity with Lorentz transformations, rapidity and spacetime geometry.',needs:'Classical mechanics · linear algebra · calculus',method:'Spacetime transformations',foundation:'modern',art:'cone'},
    'maxwell-waves':{name:'Fields & electrodynamics',mark:'∇ × E',question:'How does a field carry a wave?',description:'Derive propagation from Maxwell’s equations, then confront a discretised field.',needs:'Electromagnetism · vector calculus · wave equations',method:'Yee-grid field solver',foundation:'em',art:'wave'},
    'schrodinger-1d':{name:'Quantum mechanics',mark:'Ĥψ = Eψ',question:'Why are only some energies allowed?',description:'Meet bound states as an eigenvalue problem and test a numerical shooting method.',needs:'Introductory quantum physics · linear algebra · ODEs',method:'Numerov shooting',foundation:'modern',art:'levels'},
    'partition-function':{name:'Statistical mechanics',mark:'Z(β)',question:'How does a population become a law?',description:'Connect microscopic states to ensembles, thermodynamic response and fluctuations.',needs:'Thermodynamics · probability · calculus',method:'Partition-sum computation',foundation:'thermo',art:'bars'},
    'chaos':{name:'Nonlinear dynamics',mark:'λ',question:'When does prediction break down?',description:'Explore bifurcations, sensitivity and the limits of long-term numerical prediction.',needs:'Differential equations · stability · logarithms',method:'Lyapunov estimation',foundation:'mechanics',art:'branch'}
  };
  function field(id){return Object.prototype.hasOwnProperty.call(fields,id)?fields[id]:null;}
  function treatments(){return Adv.list().filter(function(t){return t&&field(t.id);});}
  function ready(){if(ack)return true;try{return sessionStorage.getItem(ACK)==='1';}catch(e){return false;}}
  function last(){try{var id=localStorage.getItem(LAST);return field(id)&&Adv.get(id)?id:null;}catch(e){return null;}}
  function focusTitle(host){var h=host.querySelector('h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
  function art(kind){
    var drawing={
      orbit:'<ellipse cx="120" cy="66" rx="78" ry="42"/><ellipse cx="120" cy="66" rx="52" ry="28"/><ellipse cx="120" cy="66" rx="26" ry="14"/><path d="M20 66H220M120 8V124" opacity=".3"/>',
      cone:'<path d="M54 8 186 124M186 8 54 124M120 8V124M22 66H218"/><path d="M80 34Q120 51 160 34M80 98Q120 81 160 98" opacity=".4"/>',
      wave:'<path d="M10 66Q25 8 40 66T70 66T100 66T130 66T160 66T190 66T220 66"/><path d="M10 86Q25 28 40 86T70 86T100 86T130 86T160 86T190 86T220 86" opacity=".25"/>',
      levels:'<path d="M35 20V116H205V20M35 88H205M35 60H205M35 32H205" opacity=".4"/><path d="M35 88Q120 38 205 88M35 60Q77 20 120 60T205 60"/>',
      bars:'<path d="M22 110H222" opacity=".4"/><path d="M40 110V20M68 110V45M96 110V63M124 110V77M152 110V86M180 110V94M208 110V99" stroke-width="8"/>',
      branch:'<path d="M18 66H82L136 36 201 16M82 66 136 96 201 116M136 36 201 52M136 96 201 80M201 16 224 8M201 16 224 24M201 52 224 44M201 52 224 60M201 80 224 72M201 80 224 88M201 116 224 108M201 116 224 124"/>'
    };
    return '<svg viewBox="0 0 240 132" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">'+drawing[kind]+'</svg>';
  }
  function index(host){
    var ts=treatments(),steps=ts.reduce(function(n,t){return n+(t.derivation||[]).length;},0),problems=ts.reduce(function(n,t){return n+(t.problems||[]).length;},0),resume=last();
    setCrumb([{t:'Advanced Studio'}]);
    host.innerHTML='<div class="wrap as-index"><header class="as-heading"><span class="as-kicker">PHYSICS ENTELLOQ / ADVANCED STUDIO</span><span class="as-level">Upper-undergraduate · deeper extensions</span></header>'+
      '<section class="as-hero"><div class="as-hero-copy"><div class="as-kicker">BEYOND THE FOUNDATIONS</div><h1>The structure<br>beneath <em>the laws.</em></h1><p>Derive the model. Test its limits.<br>Learn what survives when the familiar picture breaks.</p><button class="as-primary" id="studio-choose">Choose a treatment <span aria-hidden="true">↓</span></button><span class="as-hero-note">A separate space for mathematically fluent learners.</span></div><figure class="as-portrait"><div class="as-portrait-label"><span>01 / PHASE SPACE</span><span>q · p</span></div>'+art('orbit')+'<div class="as-formula" aria-hidden="true">δ ∫ L dt = 0</div><figcaption>From a trajectory to its underlying structure.<br>Illustrative phase-space motif; not simulation output.</figcaption></figure></section>'+
      '<section class="as-boundary" aria-labelledby="studio-boundary-title"><div><span class="as-kicker">BEFORE YOU ENTER</span><h2 id="studio-boundary-title">This is not an introductory course.</h2></div><div><p>Expect multivariable calculus, linear algebra and differential equations, plus the physics listed for each treatment. The core is advanced undergraduate; some perspectives go further.</p><p>Preview freely. Opening a treatment asks you to choose whether you’re ready. There is no exam, score or requirement to finish this area.</p><button class="as-link" data-go="learn">Still building those foundations? Start in Learn <span aria-hidden="true">↗</span></button></div></section>'+
      '<div class="as-catalog-head" id="studio-treatments"><div><span class="as-kicker">SELECT YOUR FIELD</span><h2>Six ways deeper.</h2></div><p>'+ts.length+' treatments <span>·</span> '+steps+' derivation steps <span>·</span> '+problems+' problems</p></div>'+
      (resume?'<button class="as-resume" data-studio-open="'+resume+'"><span>LAST OPENED</span><b>'+esc(field(resume).name)+'</b><span>Return to treatment ↗</span></button>':'')+
      '<div class="as-grid">'+ts.map(function(t,i){var f=field(t.id);return '<article class="as-card"><div class="as-card-top"><span>0'+(i+1)+'</span><span>'+esc(f.mark)+'</span></div><div class="as-card-art">'+art(f.art)+'</div><h3>'+esc(f.name)+'</h3><p class="as-question">'+esc(f.question)+'</p><p>'+esc(f.description)+'</p><div class="as-needs"><span>ARRIVE WITH</span>'+esc(f.needs)+'</div><footer><small>'+esc(f.method)+'</small><button data-studio-open="'+t.id+'" aria-label="Open '+esc(f.name)+' treatment">Open treatment <span aria-hidden="true">↗</span></button></footer></article>';}).join('')+'</div>'+
      '<section class="as-method"><div><span class="as-kicker">HOW TO WORK HERE</span><h2>Don’t just reach the result.<br>Find where it fails.</h2></div><ol><li><b>01 / Establish</b><span>Read the assumptions before the derivation.</span></li><li><b>02 / Derive</b><span>Follow the justified steps and compare different viewpoints.</span></li><li><b>03 / Compute</b><span>Change a model parameter. Watch convergence and failure modes.</span></li><li><b>04 / Challenge</b><span>Work the problems, inspect the sources and test the limits.</span></li></ol></section>'+
      '<footer class="as-colophon"><span>RIGOUR IS A FORM OF CURIOSITY.</span><button class="as-link" data-go="universe">Return to the Physics Universe ↗</button></footer></div>';
    host.querySelector('#studio-choose').addEventListener('click',function(){var target=host.querySelector('#studio-treatments');target.scrollIntoView({block:'start',behavior:'instant'});target.tabIndex=-1;target.focus({preventScroll:true});});
    host.querySelectorAll('[data-studio-open]').forEach(function(b){b.addEventListener('click',function(){go('adv',b.dataset.studioOpen);});});
  }
  function dismiss(){if(gate){var old=gate;gate=null;if(old.open)old.close();old.remove();}}
  function warning(host,id){
    dismiss();var f=field(id),dialog=document.createElement('dialog');gate=dialog;dialog.id='studio-gate';dialog.className='as-gate';dialog.setAttribute('aria-labelledby','studio-gate-title');dialog.setAttribute('aria-describedby','studio-gate-description');
    dialog.innerHTML='<button class="as-gate-close" id="studio-cancel" aria-label="Back to studio preview">×</button><div class="as-kicker">A DELIBERATE STEP FURTHER</div><h2 id="studio-gate-title">Ready for '+esc(f.name.toLowerCase())+'?</h2><p id="studio-gate-description">This treatment assumes advanced-undergraduate preparation. It is not a first introduction to physics.</p><div class="as-gate-needs"><span>YOU SHOULD BE COMFORTABLE WITH</span><p>'+esc(f.needs)+'</p></div><p>Expect full derivations, numerical methods and optional deeper extensions. Enter by choice; you can return to the foundations at any time.</p><button class="as-primary" id="studio-enter">I’m ready — open the treatment <span aria-hidden="true">↗</span></button><button class="as-link" id="studio-foundations">Build my foundations first →</button><small>This choice is remembered for this tab. It is not a mastery assessment.</small>';
    document.body.appendChild(dialog);
    function cancel(){dismiss();if(host.isConnected&&curView==='adv'){var b=host.querySelector('[data-studio-open="'+id+'"]');if(b)b.focus({preventScroll:true});}}
    dialog.querySelector('#studio-cancel').addEventListener('click',cancel);
    dialog.addEventListener('cancel',function(e){e.preventDefault();cancel();});
    dialog.addEventListener('click',function(e){if(e.target===dialog){var r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)cancel();}});
    dialog.addEventListener('keydown',function(e){if(e.key!=='Tab')return;var buttons=Array.from(dialog.querySelectorAll('button')),first=buttons[0],lastButton=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();lastButton.focus();}else if(!e.shiftKey&&document.activeElement===lastButton){e.preventDefault();first.focus();}});
    dialog.querySelector('#studio-enter').addEventListener('click',function(){ack=true;try{sessionStorage.setItem(ACK,'1');}catch(e){}dismiss();if(host.isConnected&&curView==='adv')open(host,id);});
    dialog.querySelector('#studio-foundations').addEventListener('click',function(){dismiss();go('learn');});
    dialog.showModal();dialog.querySelector('#studio-cancel').focus();
  }
  function open(host,id){
    Adv.stop();var f=field(id),t=Adv.get(id);if(!f||!t){index(host);return;}
    setCrumb([{t:'Advanced Studio',go:'adv'},{t:f.name}]);
    Adv.open(host,id);host.classList.add('as-reading');
    var bar=document.createElement('div');bar.className='as-reader-bar';bar.innerHTML='<button class="as-link" data-go="adv">← Studio index</button><span>ADVANCED UNDERGRADUATE · '+esc(f.method)+'</span>';host.prepend(bar);
    var note=document.createElement('div');note.className='as-reader-note';note.innerHTML='<b>Preparation</b><span>'+esc(f.needs)+'. Some perspectives extend beyond the undergraduate core.</span><button class="as-link" data-go="learn">Revisit foundations ↗</button>';host.querySelector('.av-mast-rule').before(note);
    host.querySelectorAll('.av-way-h').forEach(function(b,i){var panel=b.parentElement.querySelector('.av-way-b');b.setAttribute('aria-expanded',String(b.parentElement.classList.contains('on')));if(panel){panel.id='studio-way-'+i;b.setAttribute('aria-controls',panel.id);}b.addEventListener('click',function(){b.setAttribute('aria-expanded',String(b.parentElement.classList.contains('on')));});});
    var all=host.querySelector('#adv-wall');if(all)all.addEventListener('click',function(){host.querySelectorAll('.av-way-h').forEach(function(b){b.setAttribute('aria-expanded',String(b.parentElement.classList.contains('on')));});});
    // Name controls by their visible scientific label, retaining symbols and units.
    host.querySelectorAll('.av-s input').forEach(function(input){var label=input.closest('.av-s').querySelector('.lb span');if(label)input.setAttribute('aria-label',label.textContent.trim());});
    host.querySelectorAll('.av-stage').forEach(function(stage,i){stage.tabIndex=0;stage.setAttribute('role','region');stage.setAttribute('aria-label',f.name+' graph '+(i+1)+'. Scroll horizontally on narrow screens.');var canvas=stage.querySelector('canvas');if(canvas){canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Computed '+f.name.toLowerCase()+' plot. Model description above; numerical results and adjustable parameters below.');}});
    var model=host.querySelector('#adv-sim');if(model){var hint=document.createElement('p');hint.className='as-chart-hint';hint.textContent='Wide scientific plots: swipe a chart sideways, or focus it and use arrow keys. Parameters and numerical results follow below.';model.before(hint);}
    AppDesign.enhance(host);try{localStorage.setItem(LAST,id);}catch(e){}$('#main-scroll').scrollTop=0;focusTitle(host);
  }
  function view(host,id){dismiss();Adv.stop();host.classList.remove('as-reading');if(!id||!field(id)||!Adv.get(id)){index(host);return;}if(ready())open(host,id);else{index(host);warning(host,id);}}
  return {view:view,index:index,dismiss:dismiss,field:field,treatments:treatments,ready:ready};
})();
function viewAdv(id){stopSim();main.innerHTML='<div id="adv-host"></div>';AdvancedStudio.view(document.getElementById('adv-host'),id);}
