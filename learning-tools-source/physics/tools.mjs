import {normalizeState,readState,writeState} from './core.mjs';
let sequence=0;
const templates={newton:'F=ma',energy:'E_k=\\frac{1}{2}mv^2',trajectory:'y=v_y t-\\frac{1}{2}gt^2',oscillation:'x=A\\cos(\\omega t+\\phi)'};
function download(name,text,type='text/plain') {const a=document.createElement('a');const url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function localStorageOrNull(){try{return window.localStorage;}catch{return null;}}
export async function mount(container,options={}) {
  if (!(container instanceof HTMLElement)) throw new TypeError('mount requires an HTML element');
  const id=++sequence,storage=options.storage===undefined?localStorageOrNull():options.storage;
  let state=readState(storage),disposed=false,cleanup=()=>{},generation=0,storageOK=false;
  const unsavedFields=new Set();
  if(['equations','trajectory','circuits'].includes(options.initialTab))state.tab=options.initialTab;
  container.classList.add('physics-tools');
  if(parent!==window)container.classList.add('pt-embedded');
  container.innerHTML='<header class="pt-intro"><span class="pt-eyebrow">PHYSICS ENTELLOQ / LEARNING TOOLS</span><h1>Explore. Measure. Replay.</h1><p>Connect motion and circuits to their equations, measurements and recorded states.</p><nav class="pt-tabs" aria-label="Physics tools"><button data-tab="equations" type="button">Equation editor</button><button data-tab="trajectory" type="button">Motion & vectors</button><button data-tab="circuits" type="button">Circuit bench</button></nav></header><section class="pt-workspace"></section>';
  const workspace=container.querySelector('.pt-workspace');
  function latestState(){const latest=readState(storage);for(const key of unsavedFields)latest[key]=state[key];return latest;}
  function persist(fields){storageOK=writeState(storage,state,fields);for(const key of fields)if(storageOK)unsavedFields.delete(key);else unsavedFields.add(key);return storageOK;}
  function status(text,error=false){const el=workspace.querySelector('.pt-status');if(el){el.textContent=text;el.classList.toggle('pt-error',error);}}
  function storageStatus(message='Edits are saved on this device.'){const saved=storageOK&&!unsavedFields.size;if(workspace.querySelector('[aria-invalid="true"]')){status('Correct the highlighted setting before exporting or opening a simulation. The prediction uses your last valid values.'+(saved?'':' Some edits are not saved because device storage is unavailable.'),true);return;}status(saved?message:'Some edits are not saved because device storage is unavailable. Export your work to keep it.',!saved);}
  function announceSave(fields){persist(fields);storageStatus('Saved on this device.');}
  function emitEquation(detail){container.dispatchEvent(new CustomEvent('entelloq:equation',{bubbles:true,detail}));options.onEquation?.(detail);if(parent!==window)parent.postMessage({type:'entelloq:equation',...detail},location.origin);status(parent===window&&!options.onEquation?'Expression prepared below. Copy it or export it for your symbolic workbench.':'Expression sent to the host Symbolic Workbench.');}
  async function render(tab,focus=false) {
    cleanup();cleanup=()=>{};const token=++generation;state=latestState();state.tab=tab;persist(['tab']);
    container.querySelectorAll('[data-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tab===tab)));
    workspace.innerHTML='<p class="pt-loader" role="status">Opening '+({equations:'equation editor',trajectory:'interactive graphs',circuits:'circuit bench'}[tab])+'…</p>';workspace.setAttribute('aria-busy','true');
    try {
      if(tab==='equations')await equations(token);
      if(tab==='trajectory')await graphs(token);
      if(tab==='circuits')await circuits(token);
    }catch(error){if(token!==generation||disposed)return;workspace.innerHTML='<h2 tabindex="-1">Tool could not load</h2><p class="pt-status pt-error" role="alert"></p><button type="button" data-retry>Retry loading</button>';status('The local engine could not load. Check that the complete physics tools folder was copied, then retry.',true);workspace.querySelector('[data-retry]').onclick=()=>render(tab);console.error('Physics tool load failed',error);}
    if(token!==generation||disposed)return;workspace.removeAttribute('aria-busy');if(focus)workspace.querySelector('h2')?.focus({preventScroll:true});
  }
  async function equations(token) {
    const {MathfieldElement}=await import('./vendor/mathlive/mathlive.min.mjs');
    if(token!==generation||disposed)return;
    MathfieldElement.fontsDirectory=new URL('./vendor/mathlive/fonts/',import.meta.url).href;
    MathfieldElement.soundsDirectory=new URL('./vendor/mathlive/sounds/',import.meta.url).href;
    // MathLive's optional symbolic Compute Engine is deliberately unused: the host owns SymPy validation.
    MathfieldElement.computeEngine=null;
    workspace.innerHTML='<div class="pt-grid"><section class="pt-panel"><h2 tabindex="-1">An equation you can work with</h2><p class="pt-muted">Type using your keyboard, or open the maths keyboard on the field.</p><label class="pt-label" for="pt-math-'+id+'">Your expression</label><math-field id="pt-math-'+id+'" aria-label="Your mathematical expression" math-virtual-keyboard-policy="manual"></math-field><div class="pt-actions"><button type="button" class="pt-primary" data-send>Use in Symbolic Workbench</button><button type="button" data-export>Export equation</button></div><p class="pt-status" role="status"></p><details open><summary>Editable LaTeX and symbolic text</summary><label class="pt-label" for="pt-latex-'+id+'">LaTeX source</label><textarea id="pt-latex-'+id+'" spellcheck="false"></textarea><span class="pt-label">ASCII maths export</span><code class="pt-preview" data-ascii></code><button type="button" data-copy>Copy symbolic text</button></details></section><aside class="pt-panel"><h3>Start from a relationship</h3><div class="pt-stack"><button type="button" data-template="newton">Force · F = ma</button><button type="button" data-template="energy">Kinetic energy · ½mv²</button><button type="button" data-template="trajectory">Projectile height · vᵧt − ½gt²</button><button type="button" data-template="oscillation">Oscillation · A cos(ωt + φ)</button></div><p class="pt-note">Writing an equation does not check it. Send the expression to Symbolic Workbench to choose an operation and state assumptions. Units and the physical model still need your reasoning.</p><p class="pt-muted">MathLive runs locally. No expression is sent to an external service by this editor.</p></aside></div>'+sources('MathLive 0.111.1','https://github.com/arnog/mathlive','MIT');
    const field=workspace.querySelector('math-field'),latex=workspace.querySelector('textarea'),ascii=workspace.querySelector('[data-ascii]');
    state.latex=latestState().latex;field.value=state.latex;latex.value=state.latex;
    function sync(){state.latex=field.getValue('latex');latex.value=state.latex;ascii.textContent=field.getValue('ascii-math');announceSave(['latex']);}
    field.addEventListener('input',sync);latex.addEventListener('input',()=>{field.setValue(latex.value.slice(0,10000),{silenceNotifications:true});state.latex=field.value;ascii.textContent=field.getValue('ascii-math');announceSave(['latex']);});
    workspace.querySelectorAll('[data-template]').forEach(button=>button.onclick=()=>{field.value=templates[button.dataset.template];sync();field.focus();});
    workspace.querySelector('[data-send]').onclick=()=>emitEquation({latex:field.getValue('latex'),asciiMath:field.getValue('ascii-math'),source:'mathlive',version:1});
    workspace.querySelector('[data-export]').onclick=()=>{download('entelloq-equation.json',JSON.stringify({schema:'entelloq.equation.v1',latex:field.getValue('latex'),asciiMath:field.getValue('ascii-math')},null,2),'application/json');status('Equation exported.');};
    workspace.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(field.getValue('ascii-math'));status('Symbolic text copied.');}catch{status('Clipboard unavailable. Select and copy the symbolic text above.',true);}};
    ascii.textContent=field.getValue('ascii-math');storageStatus();cleanup=()=>{try{window.mathVirtualKeyboard?.hide();}catch{}field.removeEventListener('input',sync);};
  }
  function savePatch(patch){
    const fields=Object.keys(patch);state=normalizeState({...state,...patch});return persist(fields);
  }
  async function graphs(token) {
    const {mountProjectileStudio}=await import('./projectile-studio.mjs');
    if(token!==generation||disposed)return;
    const instance=await mountProjectileStudio(workspace,{state:{...state},onChange:savePatch,storageAvailable:storageOK&&!unsavedFields.size,isCurrent:()=>token===generation&&!disposed});
    if(token!==generation||disposed){instance.destroy();return;}
    cleanup=()=>instance.destroy();
  }
  async function circuits(token) {
    const [{mountCircuitBench},{mountExperimentStudio}]=await Promise.all([import('./circuit-bench.mjs'),import('./visualization-studio.mjs')]);
    if(token!==generation||disposed)return;
    cleanup=mountCircuitBench(workspace,{state:{...state},onChange:savePatch,storageAvailable:storageOK&&!unsavedFields.size,studioFactory:mountExperimentStudio});
  }
  const click=e=>{const button=e.target.closest('[data-tab]');if(button&&container.contains(button)&&button.dataset.tab!==state.tab)render(button.dataset.tab,true);};container.addEventListener('click',click);
  await render(state.tab);
  return {setPanel:panel=>render(panel==='graphs'?'trajectory':['equations','trajectory','circuits'].includes(panel)?panel:'equations',true),getState:()=>({...state}),unmount(){disposed=true;generation++;cleanup();container.removeEventListener('click',click);container.replaceChildren();container.classList.remove('physics-tools','pt-embedded');}};
}
function sources(name,url,licence){return '<footer class="pt-source"><a href="'+url+'" target="_blank" rel="noopener">'+name+' ↗</a><span>'+licence+'</span><a href="THIRD-PARTY-NOTICES.md" target="_blank">Sources & licences</a><span>Educational models · inspect assumptions</span></footer>';}
