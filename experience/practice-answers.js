/* Numerical guard for generated MCQs. Checks arithmetic, not the choice of law.
 * A tiny bounded grammar is used instead of eval/Function or provider code. */
var PracticeAnswers=(function(){
  function calculate(source){
    if(typeof source!=='string'||source.length>500)throw Error('expression');
    var tokens=source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|sqrt|abs|sin|cos|tan|pi|[()+\-*/^]/gi)||[];
    if(tokens.join('')!==source.replace(/\s/g,'')||tokens.length>140)throw Error('syntax');
    var p=0,depth=0;
    function atom(){if(++depth>24)throw Error('depth');var tok=tokens[p++],v;
      if(tok==='('){v=sum();if(tokens[p++]!==')')throw Error('parenthesis');}
      else if(/^(sqrt|abs|sin|cos|tan)$/.test(tok||'')){if(tokens[p++]!=='(')throw Error('function');v=sum();if(tokens[p++]!==')')throw Error('parenthesis');v=Math[tok](v);}
      else if(tok==='pi')v=Math.PI;
      else if(tok&&/^(?:\d|\.)/.test(tok))v=Number(tok);
      else throw Error('operand');depth--;return v;
    }
    function power(){var v=atom();if(tokens[p]==='^'){p++;v=Math.pow(v,unary());}return v;}
    function unary(){if(tokens[p]==='+'){p++;return unary();}if(tokens[p]==='-'){p++;return -unary();}return power();}
    function product(){var v=unary();while(tokens[p]==='*'||tokens[p]==='/'){var op=tokens[p++],r=unary();v=op==='*'?v*r:v/r;}return v;}
    function sum(){var v=product();while(tokens[p]==='+'||tokens[p]==='-'){var op=tokens[p++],r=product();v=op==='+'?v+r:v-r;}return v;}
    var result=sum();if(p!==tokens.length||!Number.isFinite(result)||Math.abs(result)>1e100)throw Error('result');return result;
  }
  function optionValue(s,unit){
    var m=/^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(.*?)\s*$/i.exec(s);
    if(!m||m[2]!==unit)throw Error('units');return Number(m[1]);
  }
  function validate(q){
    if(!q||typeof q.q!=='string'||!q.q.trim()||q.q.length>3000||!Array.isArray(q.o)||q.o.length!==4||!q.o.every(function(x){return typeof x==='string'&&x.trim()&&x.length<500;})||new Set(q.o.map(function(x){return x.trim().toLowerCase();})).size!==4||!Number.isInteger(q.a)||q.a<0||q.a>3||typeof q.e!=='string'||q.e.length<60||q.e.length>6000)throw Error('question');
    if(!q.solution||typeof q.solution.assumptions!=='string'||typeof q.solution.check!=='string'||!Array.isArray(q.solution.steps)||q.solution.steps.length<1||q.solution.steps.length>8||!q.solution.steps.every(function(s){return s&&typeof s.reason==='string'&&s.reason.trim()&&(!s.math||typeof s.math==='string');}))throw Error('solution');
    if(q.kind!=='conceptual'&&q.kind!=='numerical')throw Error('kind');
    if(q.kind==='numerical'){
      var v=q.verification;
      if(!v||typeof v.unit!=='string'||v.unit.length>30)throw Error('verification');
      var result=calculate(v.expression),values=q.o.map(function(o){return optionValue(o,v.unit);});
      if(!values.every(Number.isFinite)||new Set(values).size!==4)throw Error('options');
      // Permit final-answer rounding to 3 significant figures, never an arbitrary tolerance supplied by the model.
      var tolerance=Math.abs(result)*0.005,matches=values.map(function(x){return Math.abs(x-result)<=tolerance;});
      if(!matches[q.a]||matches.filter(Boolean).length!==1)throw Error('arithmetic');
    }else if(q.o.every(function(o){return /^[+-]?\d/.test(o.trim());}))throw Error('numerical question requires arithmetic');
    return q;
  }
  function coulomb(){
    var force=calculate('9e9 * abs(3e-6 * -5e-6) / (0.12^2)');
    return {kind:'numerical',q:'Two point charges, +3 μC and −5 μC, are 12 cm apart in vacuum. What is the magnitude of the electric force? Use k = 9 × 10⁹ N m²/C².',o:['0.112 N',force.toFixed(2)+' N','0.9375 N','93.75 N'],a:1,
      e:'Coulomb’s law relates the force magnitude to the product of the charge magnitudes and the inverse square of their separation. The signs determine the direction: these opposite charges attract; they do not give a negative force magnitude.',
      solution:{assumptions:'Treat the charges as stationary point charges in vacuum. Convert microcoulombs to coulombs and centimetres to metres before substitution.',
        steps:[{reason:'Convert both charges and the centre-to-centre separation to SI units.',math:'q_1 = 3\\times10^{-6}\\,\\mathrm{C},\\quad q_2=-5\\times10^{-6}\\,\\mathrm{C},\\quad r=0.12\\,\\mathrm{m}'},
          {reason:'Use the absolute value of the charge product because the question asks for a magnitude.',math:'F=\\frac{k|q_1q_2|}{r^2}=\\frac{(9\\times10^9)(3\\times10^{-6})(5\\times10^{-6})}{(0.12)^2}\\,\\mathrm{N}'},
          {reason:'Evaluate the numerator and squared separation separately, then divide. Round only the final result.',math:'F=\\frac{0.135}{0.0144}\\,\\mathrm{N}=9.375\\,\\mathrm{N}\\approx9.38\\,\\mathrm{N}'}],
        check:'The units reduce to newtons. Doubling the separation would reduce the force to one quarter. The two forces are equal in magnitude and directed toward each other.',diagram:{type:'charges',q1:3,q2:-5}},verification:{expression:'9e9 * abs(3e-6 * -5e-6) / (0.12^2)',unit:'N'}};
  }
  function offline(q,key){
    var notes={
      mechanics:['Neglect air resistance; take upward as the positive direction.','At the highest point the ball is instantaneously at rest, but its weight is still acting downward. Newton’s second law therefore gives a downward acceleration throughout the flight; zero velocity does not imply zero acceleration.','a_y=-g','Just before and after the highest point, the vertical velocity continues to decrease at the same rate.'],
      waves:['Consider a steady source and a stationary boundary between two linear media.','The source fixes how often wave crests arrive at the boundary. The transmitted wave must have the same frequency to remain continuous there; a change in wave speed is accommodated by a change in wavelength.','v=f\\lambda','If the wave speed halves while frequency is unchanged, the wavelength also halves.'],
      thermo:['The gas is ideal and the process is isothermal.','An ideal gas has internal energy determined only by temperature. Since an isothermal process leaves the temperature unchanged, the change in internal energy is zero; heat transfer and work can still be nonzero.','\\Delta U=nC_V\\Delta T=0','Using the convention that work is done by the gas, the first law gives Q = W for this process.'],
      optics:['The light starts in a higher-refractive-index medium and meets a lower-index medium.','Snell’s law requires the refracted angle to reach 90° at the critical angle. Beyond that incidence angle there is no propagating refracted ray, so total internal reflection is possible only from the optically denser to the rarer medium.','\\sin\\theta_c=\\frac{n_2}{n_1},\\quad n_1>n_2','Going from lower to higher refractive index cannot meet this critical-angle condition.'],
      electrostatics:['Consider the conducting material in electrostatic equilibrium, not a cavity containing a separate charge.','Free charges would move if a nonzero electric field existed inside the conducting material. They redistribute until their combined field cancels the interior field; only then is electrostatic equilibrium possible.','\\mathbf{E}=0','A nonzero interior field would drive charge motion and contradict the equilibrium assumption.'],
      current:['All resistances are positive and finite; the added branches are connected in parallel.','Each branch experiences the same voltage, and the branch currents add. Adding a conducting path therefore increases total conductance, making the equivalent resistance smaller than the smallest individual resistance.','\\frac{1}{R_{\\mathrm{eq}}}=\\sum_i\\frac{1}{R_i}','Two equal resistors in parallel have half the resistance of either one.'],
      magnetism:['Consider a loop threaded by a time-varying magnetic flux.','Faraday’s law relates induced electromotive force to the rate of change of magnetic flux. If the loop is closed, the induced current produces a magnetic effect opposing that change, as expressed by Lenz’s law.','\\mathcal{E}=-\\frac{d\\Phi_B}{dt}','Constant flux produces no induced EMF; it is the change in flux, not flux alone, that matters.'],
      modern:['Keep frequency fixed above the threshold and assume ordinary single-photon photoemission without saturation.','Greater intensity supplies more photons per second, so it can eject more electrons per second. Each photon still has the same energy, so the maximum electron kinetic energy does not increase.','K_{\\max}=hf-\\phi','Raising frequency, rather than intensity at fixed frequency, raises the maximum kinetic energy.'],
      quantum:['An isolated alpha-decay event emits one helium-4 nucleus.','An alpha particle contains two protons and two neutrons. Conservation of nucleon number makes the daughter mass number four smaller; conservation of charge makes its atomic number two smaller.','A_{\\mathrm{daughter}}=A-4,\\quad Z_{\\mathrm{daughter}}=Z-2','Adding the daughter’s nucleon count to the four emitted nucleons recovers the original mass number.'],
      relativity:['Compare inertial frames in special relativity, after accounting for signal-travel time.','The proper time between ticks is measured in the clock’s own rest frame. An inertial observer who sees that clock moving measures a longer interval between its ticks, so the moving clock runs slower relative to that observer’s coordinate time.','\\Delta t=\\gamma\\Delta\\tau,\\quad\\gamma=\\frac{1}{\\sqrt{1-v^2/c^2}}','At low speed the Lorentz factor approaches 1, recovering the everyday limit. A massive clock cannot reach the speed of light.']
    };
    var n=notes[key]||notes.mechanics;
    return Object.assign({},q,{e:n[1],solution:{assumptions:n[0],steps:[{reason:'Express the governing relationship.',math:n[2]}],check:n[3]}});
  }
  return {calculate:calculate,validate:validate,coulomb:coulomb,offline:offline};
})();
