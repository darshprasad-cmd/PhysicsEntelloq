/* Short, optional recall checks for Foundation and Intermediate Learn only.
   Authored alternatives, no generated distractors, grading service or stored scores. */
var LearnFlow=(function(){
  // One targeted recall check per core idea: exact phrase, plausible alternative.
  var pairs={
    'kinematics':[['independently','as the same motion'],['velocity','displacement'],['displacement','acceleration']],
    'projectile':[['45°','90°'],['zero','maximum'],['equals','is greater than']],
    'newton-laws':[['inertial','accelerating'],['different bodies','the same body'],['on one chosen body','exerted by that body on others']],
    'friction':[['harder','easier'],['independent','directly proportional to the size'],['perpendicular','parallel']],
    'work-energy':[['area','slope'],['−dU/dx','+dU/dx'],['rate','total amount']],
    'momentum':[['vector','scalar'],['e = 0','e = 1'],['external','internal']],
    'circular-motion':[['not a new force','an additional force'],['direction changes','direction stays fixed'],['rotating','inertial']],
    'shm':[['independent of','proportional to'],['kinetic and potential','mass and charge'],['equilibrium','the extremes']],
    'fluids':[['weight','volume'],['lower','higher'],['faster','slower']],
    'elasticity':[['permanent','fully reversible'],['volume','temperature'],['½','2']],
    'wave-basics':[['medium','amplitude'],['⟂','∥'],['amplitude²','amplitude']],
    'superposition':[['add','cancel'],['constant phase relationship','identical amplitudes'],['redistributed','destroyed']],
    'standing-waves':[['zero','maximum'],['Boundary conditions','Colour'],['odd','even']],
    'doppler':[['higher','lower'],['medium matters','medium does not matter'],['relative velocity','motion relative to air']],
    'sound-intensity':[['×10','×2'],['1/r²','1/r'],['rising','falling']],
    'beats':[['equal','widely separated'],['average','sum']],
    'temp-heat':[['constant','steadily increasing'],['1 kg','1 m³'],['radiation','refraction']],
    'kinetic-theory':[['translational KE','momentum'],['½k_BT','k_BT²'],['high pressure / low temperature','low pressure / high temperature']],
    'first-law':[['Q = 0','W = 0'],['W = 0','Q = 0'],['state function','path-dependent quantity']],
    'heat-engines':[['Carnot','100% at any temperatures'],['colder','hotter'],['reverse','thermal equilibrium']],
    'thermal-expansion':[['buckling','evaporation'],['bend','remain straight'],['expands','contracts']],
    'heat-transfer':[['no medium','a material medium'],['absorber and emitter','reflector only'],['electricity','sound only']],
    'reflection':[['converge','diverge'],['consistent','different for every ray'],['virtual','real']],
    'refraction':[['toward','away from'],['above','below'],['wavelength','intensity']],
    'lenses':[['f > 0','f < 0'],['inverted','erect'],['adds','multiplies']],
    'interference-optics':[['increases','decreases'],['widens','narrows'],['constructive','destructive']],
    'polarization':[['perpendicular','parallel'],['partially polarized','always unpolarized'],['cannot','can']],
    'optical-instruments':[['long objective','short objective'],['converging','diverging'],['lens shape','retina position']],
    'charge':[['conserved','created'],['Conductors','Insulators'],['induction','nuclear fusion only']],
    'coulomb':[['inverse-square','inverse-cube'],['vector sum','sum of magnitudes'],['stronger','weaker']],
    'e-field':[['away from positive','toward positive'],['never cross','cross at every charge'],['E = 0','E is maximum']],
    'potential':[['scalar','vector'],['perpendicular','parallel'],['equipotentials','surfaces of varying potential']],
    'capacitance':[['C = ΣCᵢ','1/C = Σ1/Cᵢ'],['increases','decreases'],['½ε₀E²','½ε₀E']],
    'dielectrics':[['opposing','reinforcing'],['raise','reduce'],['align','lose all charge']],
    'ohms-law':[['shape too','material only'],['rises','falls'],['tiny','near c']],
    'resistor-networks':[['same current','same voltage'],['less','greater'],['no current','maximum current']],
    'kirchhoff':[['charge','voltage'],['voltage drops','resistances'],['opposite way','physically impossible direction']],
    'power-electrical':[['I²R','IR²'],['minimizes','increases'],['watts','joules']],
    'emf-internal':[['energy per unit charge','force per unit charge'],['equals','is much greater than'],['no current','maximum current']],
    'rc-circuits':[['63%','100%'],['slower','faster'],['steady DC','all changing signals']],
    'magnetic-field':[['right-hand','left-hand for positive charges'],['no force','maximum force'],['no work','positive work']],
    'em-induction':[['opposes','reinforces'],['larger','smaller'],['braking','perpetual motion']],
    'inductance':[['current changes','steady current'],['magnetic','gravitational'],['Mutual','Zero']],
    'ac-circuits':[['minimum','maximum'],['cosφ','sinφ'],['lead','lag']],
    'transformers':[['decreases','increases'],['changing flux','constant flux'],['eddy currents','perfect energy conservation']],
    'em-waves':[['perpendicular','parallel'],['regardless of','proportional to'],['radio','gamma']],
    'photoelectric':[['no electrons','many electrons'],['number of electrons','max KE'],['instantaneous','delayed until energy accumulates']],
    'bohr-model':[['quantized','continuous'],['discrete','continuous'],['one-electron','many-electron']],
    'matter-waves':[['momentum','charge'],['tiny electron wavelength','large electron size'],['universal','exclusive to light']],
    'atomic-spectra':[['bright','dark'],['unique','identical'],['bremsstrahlung','total internal reflection']],
    'radioactivity':[['helium nucleus','electron'],['constant','rapidly temperature-dependent'],['1 decay/s','1 joule/s']],
    'nuclear-binding':[['iron and nickel','hydrogen only'],['release','always absorb'],['931.5 MeV','931.5 eV']],
    'fission-fusion':[['critical','arbitrarily small'],['Coulomb repulsion','magnetic attraction'],['reaction','name of the process alone']],
    'center-of-mass':[['accelerate','affect any internal motion without moving'],['no net external force','any external force'],['uniform density','any density distribution']],
    'terminal-velocity':[['zero','maximum'],['higher','lower'],['larger A','smaller A']],
    'resonance':[['right frequency','any frequency equally'],['limits','increases without bound'],['musical instruments','static equilibrium only']],
    'damped-oscillation':[['shrinking','growing'],['no overshoot','repeated overshoots'],['near-critical','zero']],
    'degrees-of-freedom':[['f = 3','f = 5'],['½kT','kT²'],['high','absolute-zero']],
    'dispersion-prisms':[['violet','red'],['recombine','remove'],['internal reflection','nuclear emission']],
    'human-eye':[['focal length','retina size'],['diverging','converging'],['converging','diverging']],
    'electric-dipole':[['no net force','a net force'],['1/r³','1/r²'],['aligned','anti-aligned']],
    'van-de-graaff':[['outside','inside surface'],['ionizes','cools'],['accelerate','create']],
    'wheatstone':[['no current','maximum current'],['independent','directly proportional to the size'],['Wheatstone bridge','transformer']],
    'drift-velocity':[['tiny','near light speed'],['finite','infinite'],['relaxation time','wire colour']],
    'semiconductors':[['forward bias','reverse bias'],['rises','falls'],['potential barrier','permanent current source']],
    'carbon-dating':[['falls','rises'],['age','temperature'],['50,000','5 billion']]
  };
  // Qualify compact teaching statements without changing shared content or models.
  var corrections={
    'newton-laws':{1:'Action–reaction pairs act on different bodies, not on the same free-body diagram.',2:'A free-body diagram shows the external forces on one chosen body, not the forces it exerts on other bodies.'},
    'fluids':{0:'A body floating at rest has buoyant force equal to its weight.',1:'At equal height along a streamline, faster ideal steady flow has lower pressure.'},
    'standing-waves':{2:'An ideal pipe closed at one end and open at the other supports only odd harmonics.'},
    'temp-heat':{0:'For a pure substance at fixed pressure, temperature stays constant during an equilibrium phase change.'},
    'refraction':{0:'At oblique incidence, light bends toward the normal on entering a higher-index medium.',1:'Total internal reflection occurs above the critical angle when travelling from higher to lower refractive index.'},
    'matter-waves':{0:'De Broglie wavelength is h/p: it grows as momentum decreases, not simply as mass decreases.'},
    'radioactivity':{1:'For a given isotope in ordinary introductory decay models, half-life is constant.'},
    'nuclear-binding':{0:'Binding energy per nucleon peaks in the iron and nickel region.',1:'Suitable fusion reactions of light nuclei and fission of heavy nuclei release energy.',2:'The rest energy of 1 atomic mass unit is about 931.5 MeV.'},
    'fission-fusion':{2:'Energy yield and radioactive products depend on the specific reaction; fusion is not automatically radiation-free.'},
    'center-of-mass':{0:'Internal forces alone cannot accelerate the centre of mass of an isolated system.',1:'In an explosion from rest with no net external force, the centre of mass stays put.',2:'For a symmetric body with uniform density, the centre of mass is at its geometric centre.'},
    'terminal-velocity':{1:'With other parameters fixed in a quadratic-drag model, more mass or less drag gives higher terminal speed.'},
    'wheatstone':{2:'A meter bridge is a practical Wheatstone bridge; a potentiometer instead uses a voltage-null comparison.'},
    'drift-velocity':{1:'The electromagnetic signal propagates at a finite speed through the circuit, much faster than electron drift.'},
    'semiconductors':{0:'A p–n diode conducts readily in forward bias and has small reverse leakage below breakdown.'},
    'carbon-dating':{0:'After an organism dies and carbon exchange stops, its C-14 ratio falls through radioactive decay.',1:'Comparing the remaining ratio with a calibrated starting ratio estimates the age.'}
  };
  var scope={
    'projectile':'Model: no air resistance, uniform gravity; range comparisons use the same launch speed and landing height.',
    'circular-motion':'The constant-speed statement describes uniform circular motion.',
    'fluids':'Model: steady, incompressible, inviscid flow; continuity assumes a pipe without leaks.',
    'elasticity':'The energy formula assumes linear elastic behaviour.',
    'sound-intensity':'Inverse-square spreading assumes an isotropic point source without absorption or reflections.',
    'kinetic-theory':'Model: a classical ideal gas; equipartition applies to active quadratic energy terms.',
    'first-law':'Model: ideal gas with pressure–volume work only. Q is heat in; W is work done by the gas.',
    'thermal-expansion':'Water statement: liquid water between 0 and 4 °C at ordinary pressure.',
    'reflection':'Convergence statements refer to rays parallel and close to the optical axis.',
    'lenses':'Model: thin lenses in air; the beyond-2f image is for a converging lens and a real object.',
    'interference-optics':'Model: coherent, in-phase double slits, distant screen and small angles.',
    'potential':'Conductors are equipotentials in electrostatic equilibrium.',
    'capacitance':'Field-energy formula: vacuum. Dielectric comparison assumes the same geometry, fully filled.',
    'dielectrics':'Breakdown strength depends on the chosen material and conditions.',
    'ohms-law':'Temperature trends are typical, not universal; semiconductor behaviour depends on doping and temperature.',
    'resistor-networks':'Resistance comparisons assume positive, finite resistances.',
    'kirchhoff':'Model: lumped circuits without unaccounted changing magnetic flux.',
    'emf-internal':'Model: fixed EMF with a positive, constant internal resistance.',
    'rc-circuits':'Model: ideal series RC circuit; charging begins uncharged with a constant source.',
    'ac-circuits':'Resonance statement: a series RLC circuit driven sinusoidally at fixed voltage.',
    'transformers':'Voltage/current ratios assume an ideal transformer; steady DC gives no sustained induction.',
    'em-waves':'Field geometry describes a plane electromagnetic wave in vacuum.',
    'photoelectric':'Model: ordinary single-photon photoemission from a fixed material.',
    'bohr-model':'A historical, non-relativistic model for hydrogen-like atoms, not a general quantum theory.',
    'electric-dipole':'The 1/r³ dependence is the far field, well beyond the dipole separation.',
    'van-de-graaff':'Charge distribution assumes electrostatic equilibrium with no charge left inside the cavity.',
    'dispersion-prisms':'Colour ordering assumes ordinary glass with normal dispersion in visible light.'
  };
  function eligible(t){return !!t&&(t.lvl===1||t.lvl===2)&&!!pairs[t.id];}
  function cards(t){return (t.points||[]).map(function(point,i){
    var idea=corrections[t.id]&&corrections[t.id][i]||point,pair=pairs[t.id][i];
    var order=(t.id.length+i)%2,options=order?[pair[1],pair[0]]:pair.slice();
    return {idea:idea,prompt:idea.replace(pair[0],'_____'),options:options,answer:order};
  });}
  function mount(t,resources){
    if(!eligible(t))return;
    var root=document.querySelector('#main .lesson'),column=root.querySelector('.l-main');
    root.classList.add('learn-guided');
    var companion=root.querySelector('.l-comp');if(companion)companion.remove();
    var note=column.querySelector('.l-style-note');if(note)note.remove();
    var core=column.querySelector('.l-pts'),host=document.createElement('section');
    host.className='learn-flow';host.setAttribute('aria-label','Guided ideas and checkpoints');
    core.replaceWith(host);column.insertBefore(host,column.querySelector('#lens-host'));
    var deck=cards(t),at=0,phase='idea',answers=deck.map(function(){return null;});
    host.innerHTML='<div class="learn-flow-top"><span>LEARN · ONE IDEA AT A TIME</span><span class="learn-count"></span></div>'+
      '<nav class="learn-steps" aria-label="Lesson ideas"></nav><div class="learn-card"></div>';
    var panel=host.querySelector('.learn-card'),steps=host.querySelector('.learn-steps');
    function button(action,label,primary){return '<button type="button" class="btn '+(primary?'btn-pri':'btn-ghost')+'" data-lf="'+action+'">'+label+'</button>';}
    function draw(focus){
      host.querySelector('.learn-count').textContent=phase==='end'?'Review':(at+1)+' / '+deck.length;
      steps.innerHTML=deck.map(function(c,i){return '<button type="button" data-step="'+i+'"'+(i===at&&phase!=='end'?' aria-current="step"':'')+' aria-label="Idea '+(i+1)+(answers[i]===null?'':answers[i]==='skip'?', skipped':answers[i]===c.answer?', checked correctly':', revisit')+'">'+(i+1)+'<span>'+(answers[i]===null?'Idea':answers[i]==='skip'?'Skipped':answers[i]===c.answer?'Checked':'Revisit')+'</span></button>';}).join('');
      var c=deck[at],picked=answers[at],answered=typeof picked==='number';
      if(phase==='end'){
        var checked=deck.filter(function(d,i){return answers[i]===d.answer;}).length;
        panel.innerHTML='<h2 tabindex="-1">A moment to connect it.</h2><p>You checked '+checked+' of '+deck.length+' ideas correctly in this visit. These are practice checks, not a mastery score.</p><p>Try explaining '+esc(t.name)+' in your own words, or open an exploration below.</p><div class="learn-actions">'+button('restart','Review the ideas',false)+'</div>';
      }else if(phase==='idea'){
        panel.innerHTML='<div class="learn-kicker">IDEA '+(at+1)+'</div><h2 tabindex="-1">The short version.</h2><p class="learn-idea">'+esc(c.idea)+'</p>'+(scope[t.id]?'<p class="learn-scope">'+esc(scope[t.id])+'</p>':'')+'<div class="learn-actions">'+button('check','Check this idea →',true)+button('skip','Skip check',false)+'</div>';
      }else{
        panel.innerHTML='<div class="learn-kicker">CHECKPOINT '+(at+1)+'</div><h2 tabindex="-1">What completes this idea?</h2><p class="learn-idea">'+esc(c.prompt)+'</p>'+(scope[t.id]?'<p class="learn-scope">'+esc(scope[t.id])+'</p>':'')+'<div class="learn-options" role="group" aria-label="Choose an answer">'+c.options.map(function(o,i){return '<button type="button" data-answer="'+i+'"'+(answered?' disabled':'')+' class="learn-option'+(answered&&i===c.answer?' is-correct':answered&&i===picked?' is-wrong':'')+'"><span aria-hidden="true">'+String.fromCharCode(65+i)+'</span>'+esc(o)+(answered&&i===c.answer?' <b>Correct</b>':answered&&i===picked?' <b>Your answer</b>':'')+'</button>';}).join('')+'</div>'+
          (answered?'<div class="learn-feedback" tabindex="-1" role="status"><strong>'+(picked===c.answer?'That’s it.':'Not quite — here’s the idea.')+'</strong><p>'+esc(c.idea)+'</p></div>':'')+
          '<div class="learn-actions">'+(answered?button('next',at===deck.length-1?'Finish checks →':'Next idea →',true)+(picked!==c.answer?button('retry','Try again',false):''):button('skip','Skip check',false))+button('review','Review idea',false)+'</div>';
      }
      if(focus){var target=panel.querySelector(focus==='feedback'?'.learn-feedback':'h2');if(target)target.focus({preventScroll:true});host.scrollIntoView({block:'nearest',behavior:'instant'});}
    }
    host.addEventListener('click',function(e){
      var b=e.target.closest('button');if(!b||!host.contains(b))return;
      if(b.hasAttribute('data-step')){at=+b.dataset.step;phase='idea';draw(true);return;}
      if(b.hasAttribute('data-answer')){if(typeof answers[at]==='number')return;answers[at]=+b.dataset.answer;draw('feedback');return;}
      var action=b.dataset.lf;
      if(action==='check')phase='check';
      if(action==='review')phase='idea';
      if(action==='retry'){answers[at]=null;phase='check';}
      if(action==='restart'){at=0;phase='idea';}
      if(action==='skip'||action==='next'){if(action==='skip'&&answers[at]===null)answers[at]='skip';if(at===deck.length-1)phase='end';else{at++;phase='idea';}}
      draw(true);
    });draw(false);
    // Defer visual tools until their actual container is visible. No hidden canvases.
    function disclosure(selector,title,description,start,stop){
      var node=column.querySelector(selector);if(!node)return;
      var detail=document.createElement('details');detail.className='learn-extra';
      detail.innerHTML='<summary><span><strong>'+esc(title)+'</strong><small>'+esc(description)+'</small></span><span class="learn-plus" aria-hidden="true">+</span></summary><div class="learn-extra-body"></div>';
      node.replaceWith(detail);detail.lastElementChild.appendChild(node);
      var ready=false;
      detail.addEventListener('toggle',function(){
        if(!detail.isConnected)return;
        if(detail.open&&!ready&&start){start();ready=true;if(typeof AppDesign!=='undefined')AppDesign.enhance(detail);}
        if(!detail.open&&stop){stop();ready=false;}
      });return detail;
    }
    var extra=disclosure('.l-exam','Did you know?','Small details that help the idea stick.');
    if(extra){extra.classList.add('learn-curiosity');var heading=extra.querySelector('.h');if(heading)heading.remove();column.insertBefore(extra,host.nextSibling);}
    disclosure('#lens-host','Explore this idea','Experience · predict · visual · math · frontier · real world',resources.lens,resources.stopLens);
    disclosure('.l-sim','See it in motion','A live model. Change something and watch what happens.',resources.sim,resources.stopSim);
    disclosure('#expt-host','Try a small experiment','A practical way to test this concept.',resources.experiment);
    disclosure('#eqviz-host','Change the variables','Explore how the equation responds.',resources.equation);
    disclosure('.l-eqs','Formula notebook','The equations, here when you need them.');
    disclosure('#mrep-host','Another way to see it','Words, diagrams and mathematical representations.',resources.representations,resources.stopRepresentations);
    disclosure('#ways-host','Choose another route','Different ways into the same concept.',resources.ways);
    disclosure('#conn-host','Connect the dots','Prerequisites and neighbouring ideas.',resources.connections);
  }
  return {eligible:eligible,cards:cards,mount:mount};
})();
