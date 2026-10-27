import {normalizeCircuit, circuitModel, sampleCircuit, circuitMeasurement, circuitSource, circuitHostedUrl} from './circuit-model.mjs';

let serial=0;
const signals=[
  {key:'outputVoltage',label:'Node B potential',unit:'V',color:'#58b8a2'},
  {key:'r1Voltage',label:'R₁ voltage drop',unit:'V',color:'#82aaff'},
  {key:'r2Voltage',label:'R₂ voltage drop',unit:'V',color:'#ddaa62'},
  {key:'supplyVoltage',label:'Supply voltage',unit:'V',color:'#c593e9'},
  {key:'capacitorVoltage',label:'Capacitor voltage',unit:'V',color:'#58b8a2'},
  {key:'loopCurrent',label:'R₁ current',unit:'A',color:'#82aaff'},
  {key:'r2Current',label:'R₂ current',unit:'A',color:'#ddaa62'},
  {key:'sourceCurrent',label:'Supply current',unit:'A',color:'#c593e9'},
  {key:'resistorPower',label:'Total resistor power',unit:'W',color:'#ddaa62'},
  {key:'capacitorPower',label:'Capacitor power absorbed',unit:'W',color:'#58b8a2'},
  {key:'capacitorEnergy',label:'Capacitor stored energy',unit:'J',color:'#58b8a2'},
];
const names={ohm:'Ohm’s law',series:'Series resistors',parallel:'Parallel branches',divider:'Voltage divider',rc:'RC transient'};
function quantity(value,unit) {
  if (value===null || !Number.isFinite(value)) return '—';
  if (Object.is(value,-0) || Math.abs(value)<1e-18) value=0;
  const magnitude=Math.abs(value);
  const [scale,prefix]=magnitude===0 ? [1,''] : magnitude>=1e6 ? [1e6,'M'] : magnitude>=1e3 ? [1e3,'k'] : magnitude>=1 ? [1,''] : magnitude>=1e-3 ? [1e-3,'m'] : magnitude>=1e-6 ? [1e-6,'µ'] : magnitude>=1e-9 ? [1e-9,'n'] : [1,''];
  return `${Number((value/scale).toPrecision(4))} ${prefix}${unit}`;
}
function download(filename,content) {
  const url=URL.createObjectURL(new Blob([content],{type:'text/plain'}));
  const link=document.createElement('a'); link.href=url; link.download=filename; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/** Native, local preset-circuit bench. The host owns persistence and the studio lifecycle. */
export function mountCircuitBench(workspace,{state={},onChange=()=>true,storageAvailable=true,studioFactory}={}) {
  if (typeof studioFactory!=='function') throw new TypeError('Circuit bench requires the shared experiment studio');
  const id=`cb-${++serial}`;
  let parameters=normalizeCircuit(state), selected='r1', snapshot=sampleCircuit(parameters), studio=null, playing=false;
  let frame=null, timer=null, disposed=false, saved=storageAvailable;
  const abort=new AbortController(), listen=(element,type,handler)=>element.addEventListener(type,handler,{signal:abort.signal});
  const twoResistors=()=>['series','parallel','divider'].includes(parameters.circuit);
  workspace.innerHTML=`
    <section class="cb-bench" aria-label="Circuit workbench">
      <header class="cb-heading"><div><span class="pt-eyebrow">LOCAL CIRCUIT LABORATORY</span><h2 tabindex="-1">Make the circuit explain itself.</h2><p class="pt-muted">Choose a circuit, inspect a component, and follow the same voltages and currents through time.</p></div><span class="cb-local">Runs on your device</span></header>
      <div class="cb-layout">
        <section class="cb-canvas-panel" aria-label="Interactive schematic">
          <div class="cb-canvas-top"><span data-circuit-title></span><div class="cb-canvas-transport" role="group" aria-label="Circuit playback"><span data-circuit-time></span><button type="button" data-circuit-play aria-label="Play circuit experiment">Play</button><button type="button" data-circuit-reset aria-label="Reset circuit time" title="Reset circuit time">↤</button></div></div>
          <svg class="cb-schematic" viewBox="0 0 760 400" role="group" aria-label="Circuit schematic. Tab to a component, then press Enter to inspect it."></svg>
          <div class="cb-schematic-foot"><span><i class="cb-dot"></i> Node potentials are relative to ground</span><span data-direction>Arrow marks positive conventional current</span></div>
          <div class="cb-readouts" aria-label="Live circuit readings"><div><span>Supply current</span><strong data-reading="sourceCurrent"></strong></div><div><span>Node B potential</span><strong data-reading="outputVoltage"></strong></div><div><span data-third-label>Total resistor power</span><strong data-reading="third"></strong></div></div>
          <div class="cb-probe" aria-label="Selected component measurements">
            <div class="cb-probe-heading"><div><span class="pt-eyebrow">COMPONENT PROBE</span><h3 data-probe-title></h3></div><label class="cb-sr" for="${id}-probe">Inspect component</label><select id="${id}-probe" data-probe aria-label="Inspect component"></select></div>
            <dl class="cb-probe-values"><div><dt>Voltage</dt><dd data-probe-value="voltage"></dd></div><div><dt>Current</dt><dd data-probe-value="current"></dd></div><div><dt data-probe-power-label>Power dissipated</dt><dd data-probe-value="power"></dd></div><div data-probe-energy-label hidden><dt>Stored energy</dt><dd data-probe-value="energy"></dd></div></dl>
            <p class="pt-muted" data-probe-convention></p><p class="cb-probe-equation" data-probe-equation></p>
          </div>
        </section>
        <aside class="cb-settings pt-panel"><h3>Build an experiment</h3>
          <label class="cb-field">Circuit<select data-key="circuit"><option value="ohm">Ohm’s law · one resistor</option><option value="series">Two resistors · series</option><option value="parallel">Two resistors · parallel</option><option value="divider">Voltage divider · unloaded</option><option value="rc">RC · charge and discharge</option></select></label>
          <div class="cb-input-grid">
            <label class="cb-field">Supply (V)<input data-key="voltage" type="number" min="0.1" max="24" step="0.1"></label>
            <label class="cb-field">Resistance R₁ (Ω)<input data-key="resistance" type="number" min="10" max="1000000" step="10"></label>
            <label class="cb-field" data-r2-label>Resistance R₂ (Ω)<input data-key="resistance2" type="number" min="10" max="1000000" step="10"></label>
            <label class="cb-field" data-cap-label>Capacitance (µF)<input data-cap type="number" min="0.001" max="10000" step="0.1"></label>
          </div>
          <div class="cb-switch-controls" data-rc-controls hidden><span class="cb-field-title">Switch experiment</span><div class="cb-switch-buttons" role="group" aria-label="RC initial condition"><button type="button" data-mode="charge">Charge</button><button type="button" data-mode="discharge">Discharge</button></div><p class="pt-muted" data-rc-initial></p></div>
          <p class="cb-prediction" data-prediction></p>
          <details class="cb-presets"><summary>Try a circuit</summary><div class="cb-preset-list"><button type="button" data-preset="divider">Half the supply<span>6 V · equal resistors</span></button><button type="button" data-preset="parallel">Split the current<span>6 V · 1 kΩ and 2 kΩ</span></button><button type="button" data-preset="rc">Watch one time constant<span>5 V · τ = 1 s</span></button></div></details>
          <p class="pt-status" role="status" aria-live="polite"></p>
        </aside>
      </div>
      <div class="cb-studio" data-circuit-studio></div>
      <details class="cb-assumptions"><summary>Equations, reference directions & model limits</summary><p class="cb-governing" data-governing></p><p class="pt-muted" data-model-note></p><p class="pt-muted">Ideal wires and components; zero source resistance; no heating, tolerances, capacitor leakage or inductance. This bench evaluates analytic models of the five shown circuit topologies. Values and plots are predictions, not measured data. For RC, the six-time-constant timeline ends close to equilibrium, not at exact equilibrium.</p></details>
      <section class="cb-external" aria-label="Optional external circuit editor"><div><h3>Explore arbitrary circuits in CircuitJS</h3><p class="pt-muted">Optional external editor. Launching sends these circuit settings to falstad.com and needs an internet connection. The native bench above works offline.</p></div><div class="pt-actions"><button type="button" data-launch>Open CircuitJS</button><button type="button" data-export-circuit>Export circuit source</button><a class="pt-link" data-external target="_blank" rel="noopener noreferrer">Open in new tab ↗</a></div><div data-frame-host></div><p class="pt-muted">CircuitJS is a separate numerical engine. Reopening applies the current settings; keep edits made there using its File → Export as Text command.</p></section>
      <footer class="pt-source"><a href="https://github.com/sharpie7/circuitjs1" target="_blank" rel="noopener noreferrer">CircuitJS1 · optional hosted editor ↗</a><span>GPL-2.0-or-later</span><a href="THIRD-PARTY-NOTICES.md" target="_blank">Sources & licences</a><span>Native bench · analytic ideal models</span></footer>
    </section>`;
  const query=selector=>workspace.querySelector(selector), all=selector=>workspace.querySelectorAll(selector);
  const svg=query('.cb-schematic'), status=query('.pt-status'), host=query('[data-frame-host]');
  const light=()=>document.documentElement.dataset.physicsTheme==='light'||document.documentElement.dataset.theme==='light';
  function hasInvalid(){return !!query('input[aria-invalid="true"]');}
  function message(text,error=false){status.textContent=text;status.classList.toggle('pt-error',error);}
  function feedback(text='Settings saved on this device. The timeline starts again at t = 0.') {
    if(hasInvalid()) message('Correct the highlighted setting. The circuit and graph use your last valid values.',true);
    else if(!saved) message('Device storage is unavailable. These edits remain in this session; export the circuit to keep them.',true);
    else message(text);
  }
  function readiness(){
    const invalid=hasInvalid();
    all('[data-launch],[data-export-circuit]').forEach(button=>button.disabled=invalid);
    const link=query('[data-external]');link.setAttribute('aria-disabled',String(invalid));
    if(invalid) link.removeAttribute('href');else link.href=circuitHostedUrl(parameters,light());
    // Shared CSV must not accidentally export a different valid model while a draft is invalid.
    query('[data-circuit-studio]')?.querySelectorAll('[data-studio-export]').forEach(button=>button.disabled=invalid);
  }
  function component(key,body,label) {return `<g class="cb-component" data-component="${key}" role="button" tabindex="0" aria-label="Inspect ${label}" aria-pressed="false">${body}</g>`;}
  function resistor(key,x,y,vertical=false) {
    const symbol=`<rect class="cb-hit" x="-76" y="-47" width="152" height="94" rx="14"/><path class="cb-wire" d="M -75 0 H -46 M 46 0 H 75"/><rect class="cb-symbol" x="-46" y="-15" width="92" height="30" rx="2"/>`;
    return component(key,`<g transform="translate(${x} ${y})${vertical?' rotate(90)':''}">${symbol}</g><text class="cb-label" x="${vertical?x+39:x}" y="${vertical?y-12:y-37}" text-anchor="${vertical?'start':'middle'}">${key==='r1'?'R₁':'R₂'}</text><text class="cb-value" data-svg-value="${key}" x="${vertical?x+39:x}" y="${vertical?y+25:y+44}" text-anchor="${vertical?'start':'middle'}"></text>`,key==='r1'?'resistor R1':'resistor R2');
  }
  function drawSchematic() {
    const parallel=parameters.circuit==='parallel',rc=parameters.circuit==='rc',two=twoResistors();
    const source=component('source','<rect class="cb-hit" x="69" y="154" width="102" height="112" rx="16"/><circle class="cb-symbol" cx="120" cy="210" r="37"/><path class="cb-mark" d="M 111 194 H 129 M 120 185 V 203 M 111 226 H 129"/><text class="cb-label" x="60" y="207" text-anchor="end">Vₛ</text><text class="cb-value" data-svg-value="source" x="60" y="231" text-anchor="end"></text>','DC supply');
    const ground=component('ground','<rect class="cb-hit" x="294" y="306" width="132" height="79" rx="12"/><path class="cb-wire" d="M 360 330 V 345 M 340 345 H 380 M 347 353 H 373 M 354 361 H 366"/><text class="cb-ground-label" x="405" y="360">0 V</text>','ground reference');
    let wiring='<path class="cb-wire" d="M 120 173 V 100 M 120 247 V 330 H 610"/>';
    let elements=source+ground;
    if(parallel) {
      wiring+='<path class="cb-wire" d="M 120 100 H 610 V 135 M 380 100 V 135 M 380 285 V 330 M 610 285 V 330"/>';
      elements+=resistor('r1',380,210,true)+resistor('r2',610,210,true);
    } else {
      wiring+=`<path class="cb-wire" d="M ${rc?'260':'120'} 100 H 285 M 435 100 H 610 V ${rc?'197':two?'135':'330'}"/>`;
      elements+=resistor('r1',360,100);
      if(two) {wiring+='<path class="cb-wire" d="M 610 285 V 330"/>';elements+=resistor('r2',610,210,true);}
      if(rc) {
        wiring+='<path class="cb-wire" d="M 120 100 H 218 M 218 151 H 195 V 330 M 610 223 V 330"/>';
        elements+=`<g class="cb-switch" role="button" tabindex="0" data-switch aria-label="${parameters.rcMode==='charge'?'Switch to a new discharge experiment':'Switch to a new charge experiment'}"><rect class="cb-hit" x="207" y="75" width="65" height="90" rx="9"/><circle class="cb-node" cx="218" cy="100" r="4"/><circle class="cb-node" cx="218" cy="151" r="4"/><path class="cb-switch-arm" d="M 260 100 L 223 ${parameters.rcMode==='charge'?'100':'146'}"/><circle class="cb-node" cx="260" cy="100" r="4"/><text class="cb-switch-label" x="237" y="65" text-anchor="middle">${parameters.rcMode==='charge'?'charge':'discharge'}</text></g>`;
        elements+=component('capacitor','<rect class="cb-hit" x="558" y="164" width="104" height="92" rx="14"/><path class="cb-symbol" d="M 580 197 H 640 M 580 223 H 640"/><text class="cb-label" x="665" y="198">C</text><text class="cb-value" data-svg-value="capacitor" x="665" y="224"></text>','capacitor C');
      }
    }
    const arrow=parallel?'<path class="cb-current" d="M 338 145 V 174"/><path class="cb-current-head" d="M 332 166 L 338 175 L 344 166"/><text class="cb-value" x="322" y="165" text-anchor="end">I₁</text>':'<path class="cb-current" d="M 463 100 H 498"/><path class="cb-current-head" d="M 490 94 L 499 100 L 490 106"/><text class="cb-value" x="481" y="82" text-anchor="middle">I₁</text>';
    svg.innerHTML=`<title>${names[parameters.circuit]}: interactive component measurements</title><desc>Ideal circuit with the lower return at zero volts. Select the source, resistor, capacitor when present, or ground to read exact values from the shared model.</desc>${wiring}${arrow}${elements}<circle class="cb-node cb-node-b" cx="610" cy="100" r="5"/><text class="cb-node-label" x="625" y="78">B</text><text class="cb-node-reading" data-node-b x="625" y="103"></text>`;
    const choices=[['r1','Resistor R₁'],...(two?[['r2','Resistor R₂']]:[]),...(rc?[['capacitor','Capacitor C']]:[]),['source','DC supply'],['ground','Ground reference']];
    if(!choices.some(([key])=>key===selected))selected='r1';
    query('[data-probe]').replaceChildren(...choices.map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));
    query('[data-probe]').value=selected;
  }
  function selectComponent(componentKey) {
    selected=componentKey;query('[data-probe]').value=selected;renderReadings();
    const key={r1:'r1Voltage',r2:'r2Voltage',source:'supplyVoltage',capacitor:'outputVoltage',ground:'outputVoltage'}[selected];
    if(selected!=='ground')studio?.selectSignals?.([key]);
  }
  function renderReadings() {
    query('[data-circuit-title]').textContent=names[parameters.circuit]+(parameters.circuit==='rc'?` · ${parameters.rcMode}`:'');
    query('[data-circuit-time]').textContent=`t = ${quantity(snapshot.time,'s')}`;
    query('[data-circuit-play]').textContent=playing?'Pause':snapshot.time>=circuitModel.duration(parameters)?'Replay':'Play';
    query('[data-circuit-play]').setAttribute('aria-label',playing?'Pause circuit experiment':'Play circuit experiment');
    query('[data-circuit-reset]').disabled=snapshot.time<=0&&!playing;
    query('[data-reading="sourceCurrent"]').textContent=quantity(snapshot.sourceCurrent,'A');
    query('[data-reading="outputVoltage"]').textContent=quantity(snapshot.outputVoltage,'V');
    query('[data-third-label]').textContent=parameters.circuit==='rc'?'Capacitor energy':'Total resistor power';
    query('[data-reading="third"]').textContent=quantity(parameters.circuit==='rc'?snapshot.capacitorEnergy:snapshot.resistorPower,parameters.circuit==='rc'?'J':'W');
    query('[data-node-b]').textContent=quantity(snapshot.outputVoltage,'V');
    for(const [key,value,unit] of [['r1',parameters.resistance,'Ω'],['r2',parameters.resistance2,'Ω'],['source',parameters.voltage,'V'],['capacitor',parameters.capacitance,'F']]){const element=query(`[data-svg-value="${key}"]`);if(element)element.textContent=quantity(value,unit);}
    all('[data-component]').forEach(element=>element.setAttribute('aria-pressed',String(element.dataset.component===selected)));
    const reading=circuitMeasurement(parameters,snapshot,selected);
    query('[data-probe-title]').textContent=reading.label;
    for(const [key,unit] of [['voltage','V'],['current','A'],['power','W'],['energy','J']])query(`[data-probe-value="${key}"]`).textContent=quantity(reading[key],unit);
    query('[data-probe-energy-label]').hidden=selected!=='capacitor';
    query('[data-probe-power-label]').textContent=reading.powerLabel;
    query('[data-probe-convention]').textContent=reading.convention;
    query('[data-probe-equation]').textContent=selected==='ground'?'Vground ≡ 0 V':selected==='capacitor'?'q = CV꜀  ·  I = C dV꜀/dt  ·  U = ½CV꜀²':selected==='source'?'Pdelivered = Vₛ Iₛ':'V = IR  ·  P = I²R';
    query('[data-direction]').textContent=parameters.circuit==='rc'&&parameters.rcMode==='discharge'?'I₁ < 0: discharge flows against the reference arrow':'Arrow marks positive conventional current';
  }
  function renderSettings() {
    all('[data-key]').forEach(input=>{if(document.activeElement!==input&&input.getAttribute('aria-invalid')!=='true')input.value=parameters[input.dataset.key];});
    const cap=query('[data-cap]');if(document.activeElement!==cap&&cap.getAttribute('aria-invalid')!=='true')cap.value=parameters.capacitance*1e6;
    query('[data-r2-label]').hidden=!twoResistors();query('[data-cap-label]').hidden=parameters.circuit!=='rc';query('[data-rc-controls]').hidden=parameters.circuit!=='rc';
    all('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===parameters.rcMode)));
    query('[data-rc-initial]').textContent=parameters.rcMode==='charge'?'Starts at V꜀ = 0 V; switch connects the supply.':'Starts at V꜀ = Vₛ; supply disconnects and R₁ joins ground. This starts a new experiment.';
    const p=parameters, tau=p.resistance*p.capacitance;
    const tauText=tau<1?`${(tau*1000).toPrecision(4)} ms`:`${tau.toPrecision(4)} s`;
    const predictions={ohm:`I = V/R = ${quantity(p.voltage/p.resistance,'A')}`,series:`Rtotal = R₁ + R₂ = ${quantity(p.resistance+p.resistance2,'Ω')}`,parallel:`Itotal = I₁ + I₂ = ${quantity(p.voltage/p.resistance+p.voltage/p.resistance2,'A')}`,divider:`Vout = Vₛ R₂/(R₁+R₂) = ${quantity(p.voltage*p.resistance2/(p.resistance+p.resistance2),'V')}`,rc:`τ = RC = ${tauText}; V꜀(τ) ≈ ${quantity(p.voltage*(p.rcMode==='charge'?1-Math.exp(-1):Math.exp(-1)),'V')}`};
    query('[data-prediction]').textContent=predictions[p.circuit];
    const equations={ohm:'I = Vₛ/R₁ · P = VₛI · Node B = ground = 0 V',series:'I₁ = I₂ = Vₛ/(R₁+R₂) · Vₛ = V₁+V₂ · Vout = V₂',parallel:'V₁ = V₂ = Vₛ · Iₛ = Vₛ/R₁ + Vₛ/R₂ · 1/Req = 1/R₁ + 1/R₂',divider:'Vout = VₛR₂/(R₁+R₂) · I = Vₛ/(R₁+R₂) · Vₛ = V₁+Vout',rc:p.rcMode==='charge'?'V꜀ = Vₛ(1−e⁻ᵗ/ᴿᶜ) · I₁ = (Vₛ/R)e⁻ᵗ/ᴿᶜ · U꜀ = ½CV꜀²':'V꜀ = Vₛe⁻ᵗ/ᴿᶜ · I₁ = −(Vₛ/R)e⁻ᵗ/ᴿᶜ · U꜀ = ½CV꜀²'};
    query('[data-governing]').textContent=equations[p.circuit];
    query('[data-model-note]').textContent=p.circuit==='divider'?'The output is an ideal, infinite-resistance voltmeter across R₂. A real load changes the divider ratio.':p.circuit==='rc'?'Charge and discharge are separately initialized experiments. Changing the switch resets time; it does not carry capacitor state across a switch event. Discharge export uses an equivalent 0 V drive and the specified initial capacitor voltage.':'DC readings are the instantaneous steady state of an ideal resistive circuit. Their flat time traces are expected; this model has no transient storage element.';
    readiness();
  }
  function clearHiddenDrafts(){for(const selector of ['[data-r2-label]','[data-cap-label]']){const label=query(selector);if(label.hidden){const input=label.querySelector('input');input.setAttribute('aria-invalid','false');label.querySelector('.pt-field-error').hidden=true;input.value=input.hasAttribute('data-cap')?parameters.capacitance*1e6:parameters.resistance2;}}}
  function apply(patch) {
    const previousCircuit=parameters.circuit;
    parameters=normalizeCircuit({...parameters,...patch});
    try{saved=onChange(patch)!==false;}catch{saved=false;}
    renderSettings();clearHiddenDrafts();
    drawSchematic();
    if(studio && previousCircuit!==parameters.circuit){studio.destroy();mountStudio();}
    else studio?.updateParameters(parameters);
    snapshot=studio?.getState().snapshot||sampleCircuit(parameters);renderReadings();readiness();feedback();
  }
  const definitions=[['[data-key="voltage"]','voltage','Supply voltage','V',1],['[data-key="resistance"]','resistance','Resistance R₁','Ω',1],['[data-key="resistance2"]','resistance2','Resistance R₂','Ω',1],['[data-cap]','capacitance','Capacitance','µF',1e6]];
  for(const [selector,key,label,unit,scale] of definitions){
    const input=query(selector), hint=document.createElement('span'), error=document.createElement('span');
    const range=`${Number(input.min).toLocaleString('en-US')} to ${Number(input.max).toLocaleString('en-US')} ${unit}`;
    hint.className='pt-field-help';hint.id=`${id}-${key}-hint`;hint.textContent=range;
    error.className='pt-field-error';error.id=`${id}-${key}-error`;error.dataset.error=key;error.hidden=true;
    input.after(hint,error);input.setAttribute('aria-label',`${label} (${unit})`);input.setAttribute('aria-describedby',`${hint.id} ${error.id}`);input.setAttribute('aria-invalid','false');
    listen(input,'input',()=>{const value=input.valueAsNumber,valid=Number.isFinite(value)&&value>=Number(input.min)&&value<=Number(input.max);input.setAttribute('aria-invalid',String(!valid));error.hidden=valid;error.textContent=valid?'':`Enter ${range}.`;if(!valid){readiness();feedback();return;}apply({[key]:value/scale});});
  }
  listen(query('[data-key="circuit"]'),'change',event=>apply({circuit:event.target.value}));
  listen(query('[data-probe]'),'change',event=>selectComponent(event.target.value));
  listen(query('[data-circuit-play]'),'click',()=>{if(studio?.getState().playing)studio.pause();else studio?.play();});
  listen(query('[data-circuit-reset]'),'click',()=>{studio?.pause();studio?.seek(0);});
  function activateSchematic(event){
    const component=event.target.closest('[data-component]'), switchElement=event.target.closest('[data-switch]');
    if(!component&&!switchElement)return;
    if(event.type==='keydown'&&event.key!=='Enter'&&event.key!==' ')return;
    if(event.type==='keydown')event.preventDefault();
    if(component)selectComponent(component.dataset.component);
    else {apply({rcMode:parameters.rcMode==='charge'?'discharge':'charge'});query('[data-switch]')?.focus();}
  }
  listen(svg,'click',activateSchematic);listen(svg,'keydown',activateSchematic);
  all('[data-mode]').forEach(button=>listen(button,'click',()=>apply({rcMode:button.dataset.mode})));
  const presets={divider:{circuit:'divider',voltage:6,resistance:1000,resistance2:1000},parallel:{circuit:'parallel',voltage:6,resistance:1000,resistance2:2000},rc:{circuit:'rc',voltage:5,resistance:10000,capacitance:0.0001,rcMode:'charge'}};
  all('[data-preset]').forEach(button=>listen(button,'click',()=>{all('input[aria-invalid="true"]').forEach(input=>input.setAttribute('aria-invalid','false'));all('.pt-field-error').forEach(error=>error.hidden=true);apply(presets[button.dataset.preset]);}));
  listen(query('[data-external]'),'click',event=>{if(hasInvalid()){event.preventDefault();return;}event.currentTarget.href=circuitHostedUrl(parameters,light());});
  listen(query('[data-export-circuit]'),'click',()=>{if(hasInvalid())return;download(`entelloq-${parameters.circuit}${parameters.circuit==='rc'?'-'+parameters.rcMode:''}.txt`,circuitSource(parameters));message('Circuit source exported. It includes the current topology and initial conditions.');});
  const offline=()=>{if(!navigator.onLine)message('You are offline. The native circuit bench still works; reconnect before opening CircuitJS.',true);};
  listen(window,'offline',offline);
  listen(query('[data-launch]'),'click',()=>{
    if(hasInvalid())return;clearTimeout(timer);frame?.remove();frame=null;
    if(!navigator.onLine){offline();return;}
    frame=document.createElement('iframe');frame.className='pt-circuit-frame';frame.title='CircuitJS external circuit simulator';frame.referrerPolicy='no-referrer';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads');frame.setAttribute('allow',"camera 'none'; microphone 'none'; geolocation 'none'");
    const current=frame;
    listen(frame,'load',()=>{if(disposed||frame!==current)return;clearTimeout(timer);message('CircuitJS frame loaded. Its cross-origin simulation cannot be inspected here; if the canvas stays blank, retry or open a new tab.');});
    listen(frame,'error',()=>{if(disposed||frame!==current)return;clearTimeout(timer);message('CircuitJS could not connect. Check your connection, retry, or open it in a new tab.',true);});
    frame.src=circuitHostedUrl(parameters,light());host.replaceChildren(frame);message('Connecting to the optional CircuitJS editor…');
    timer=setTimeout(()=>{if(!disposed&&frame===current)message('CircuitJS is taking longer to respond. Retry or use Open in new tab. The local bench remains available.',true);},20000);
  });
  drawSchematic();renderSettings();renderReadings();
  function mountStudio(){
    const keys=new Set(['outputVoltage','r1Voltage','supplyVoltage','loopCurrent','sourceCurrent','resistorPower']);
    if(twoResistors()){keys.add('r2Voltage');if(parameters.circuit==='parallel')keys.add('r2Current');}
    if(parameters.circuit==='rc'){keys.add('capacitorEnergy');keys.add('capacitorPower');}
    studio=studioFactory(query('[data-circuit-studio]'),{model:circuitModel,parameters,signals:signals.filter(signal=>keys.has(signal.key)),title:'Measure the circuit through time',onState:current=>{if(disposed)return;snapshot=current.snapshot;playing=current.playing;renderReadings();readiness();}});
    selectComponent(selected);
  }
  mountStudio();
  feedback('Ready. Select a component to inspect it; press Play to follow the model. No external connection has been made.');
  return ()=>{disposed=true;clearTimeout(timer);abort.abort();frame?.remove();studio?.destroy();};
}
