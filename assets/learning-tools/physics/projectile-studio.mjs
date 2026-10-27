import {normalizeState, trajectory} from './core.mjs';
import {mountExperimentStudio, formatQuantity} from './visualization-studio.mjs';
import {exportExperimentCSV} from './visualization-core.mjs';

export const projectileSignals = Object.freeze([
  {key:'x', label:'Horizontal position', unit:'m', color:'#4d91ff'},
  {key:'y', label:'Height', unit:'m', color:'#df8f28'},
  {key:'vx', label:'Horizontal velocity', unit:'m/s', color:'#4d91ff'},
  {key:'vy', label:'Vertical velocity', unit:'m/s', color:'#df8f28'},
  {key:'ax', label:'Horizontal acceleration', unit:'m/s²', color:'#4d91ff'},
  {key:'ay', label:'Vertical acceleration', unit:'m/s²', color:'#df8f28'},
  {key:'kineticSpecific', label:'Kinetic energy / mass', unit:'J/kg', color:'#4d91ff'},
  {key:'potentialSpecific', label:'Potential energy / mass', unit:'J/kg', color:'#df8f28'},
  {key:'totalSpecific', label:'Total energy / mass', unit:'J/kg', color:'#2aa78f'},
]);
// This adapter delegates every physical quantity to the existing core model.
export const projectileModel = Object.freeze({duration:parameters => trajectory(parameters).flight, sample:(parameters, time) => trajectory(parameters).stateAt(time)});
let nextId = 0;
export async function mountProjectileStudio(workspace, options = {}) {
  const imported = await import('./vendor/jsxgraph/jsxgraphcore.mjs');
  if (options.isCurrent?.() === false) return {destroy(){}, getState:() => null};
  const JXG = imported.default || imported.JXG || window.JXG, id = ++nextId;
  let parameters = (({vx, vy, g}) => ({vx, vy, g}))(normalizeState(options.state)), model = trajectory(parameters), current = model.stateAt(0), studio, destroyed = false;
  let storageAvailable = options.storageAvailable !== false;
  const abort = new AbortController();
  workspace.innerHTML = `<div class="pt-grid vs-projectile"><section class="pt-panel"><span class="pt-eyebrow">PROJECTILE LABORATORY</span><h2 tabindex="-1">One launch. Every quantity connected.</h2><p class="pt-muted">Select a time below to inspect the moving particle. Drag the velocity tip or edit its components to test a new launch.</p><div id="vs-trajectory-${id}" class="pt-board" role="img" aria-label="Projectile trajectory: horizontal position and height in metres"></div><p class="pt-axis-caption">Horizontal position x (m) · Height y (m)</p><div class="vs-trajectory-legend"><span style="--vector-color:#4d91ff">Trajectory</span><span style="--vector-color:#2aa78f">Velocity direction</span><span style="--vector-color:#df8f28">Acceleration direction</span></div><p class="pt-muted">Vector arrows show direction only; their drawn lengths are fixed. Read magnitudes from the measurement probes below.</p><p class="vs-current-position" data-position></p><div class="vs-trajectory-toolbar"><button type="button" class="pt-primary" data-canvas-play>Play flight</button><button type="button" data-canvas-reset>Reset time</button><button type="button" data-fit>Fit trajectory</button><p class="pt-muted">Scroll to zoom · Shift-drag to pan</p></div><div class="pt-metrics"><div><span>Flight time</span><strong data-flight></strong></div><div><span>Landing x</span><strong data-range></strong></div><div><span>Peak height</span><strong data-peak></strong></div></div><p class="pt-formula">x = vₓt · y = vᵧt − ½gt² · E/m = ½(vₓ² + vᵧ²) + gy</p><p class="pt-note">Ideal point projectile from y = 0; constant downward gravity and no air resistance. Negative vₓ launches left. The final sample is just before impact. Potential energy is zero at the launch plane. Energy probes show J/kg, so a mass assumption is unnecessary.</p></section><aside class="pt-panel"><h3>Set the launch velocity</h3><div id="vs-vector-${id}" class="pt-board pt-vector" role="img" aria-label="Draggable initial velocity vector in metres per second"></div><p class="pt-axis-caption">Horizontal vₓ (m/s) · Upward vᵧ (m/s)</p><div class="pt-controls"><label>Horizontal vₓ (m/s)<input data-key="vx" type="number" min="-20" max="20" step="0.1"></label><label>Upward vᵧ (m/s)<input data-key="vy" type="number" min="0.1" max="20" step="0.1"></label><label>Gravity g (m/s²)<input data-key="g" type="number" min="0.1" max="25" step="0.01"></label></div><div class="pt-actions"><button type="button" data-earth>Earth · 9.81</button><button type="button" data-moon>Moon · 1.62</button><button type="button" data-download>Export samples</button></div><p class="pt-status" role="status"></p><p class="pt-muted">Keyboard inputs provide the same control as dragging. Changes start a fresh run; playback begins paused. All graphs show model predictions.</p></aside></div><section data-projectile-studio></section><footer class="pt-source"><a href="https://github.com/jsxgraph/jsxgraph" target="_blank" rel="noopener">JSXGraph 1.14.1 ↗</a><span>MIT option</span><a href="THIRD-PARTY-NOTICES.md" target="_blank">Sources & licences</a><span>Analytical projectile model · local computation</span></footer>`;
  const query = selector => workspace.querySelector(selector);
  const listen = (element, event, handler) => element.addEventListener(event, handler, {signal:abort.signal});
  const color = getComputedStyle(workspace.closest('.physics-tools') || workspace).getPropertyValue('--pt-text').trim() || '#e8edf6';
  const boardOptions = {axis:true, showCopyright:false, showNavigation:false, keepaspectratio:false, defaultAxes:{x:{strokeColor:'#71829d', ticks:{label:{strokeColor:color}}}, y:{strokeColor:'#71829d', ticks:{label:{strokeColor:color}}}}};
  const velocityBoard = JXG.JSXGraph.initBoard(`vs-vector-${id}`, {...boardOptions, pan:{enabled:false}, zoom:{enabled:false}, boundingbox:[-23,24,23,-4]});
  const origin = velocityBoard.create('point', [0,0], {name:'', fixed:true, visible:false});
  const tip = velocityBoard.create('point', [parameters.vx, parameters.vy], {name:'v₀', size:6, fillColor:'#4d91ff', strokeColor:'#9dbbff', label:{strokeColor:color}, snapToGrid:true, snapSizeX:.1, snapSizeY:.1});
  velocityBoard.create('arrow', [origin,tip], {strokeColor:'#4d91ff',strokeWidth:3});
  const pathBoard = JXG.JSXGraph.initBoard(`vs-trajectory-${id}`, {...boardOptions, pan:{enabled:true, needShift:true}, zoom:{enabled:true, wheel:true}, boundingbox:[-2,8,20,-1]});
  pathBoard.create('curve', [time => model.at(time).x, time => model.at(time).y, () => 0, () => model.flight], {strokeColor:'#4d91ff',strokeWidth:3});
  const landing = pathBoard.create('point', [() => model.range, 0], {name:'landing',fixed:true,size:3,fillColor:'#2aa78f',strokeColor:'#2aa78f',label:{strokeColor:color}});
  const particle = pathBoard.create('point', [() => current.x, () => current.y], {name:'particle',fixed:true,size:5,fillColor:'#e87946',strokeColor:'#fff',label:{strokeColor:color}});
  // Fixed-length direction arrows are explicitly labelled; values stay in probes.
  const arrowLength = () => Math.max(2, model.peak) * .22;
  pathBoard.create('arrow', [particle, [() => current.x + arrowLength() * current.vx / (current.speed || 1), () => current.y + arrowLength() * current.vy / (current.speed || 1)]], {strokeColor:'#2aa78f',strokeWidth:3,visible:() => current.speed > 1e-10});
  pathBoard.create('arrow', [particle, [() => current.x, () => current.y - arrowLength()]], {strokeColor:'#df8f28',strokeWidth:3});
  particle.on('up', () => studio?.selectSignals(['x','y']));
  function fit() { const span = Math.max(4, Math.abs(model.range)); pathBoard.setBoundingBox([Math.min(0,model.range)-span*.12, Math.max(2,model.peak*1.3), Math.max(0,model.range)+span*.12, -Math.max(1,model.peak*.3)], false); }
  function status() {
    const invalid = !!workspace.querySelector('[aria-invalid="true"]');
    workspace.querySelectorAll('[data-download],[data-studio-export]').forEach(button => button.disabled = invalid);
    query('.pt-status').textContent = invalid ? 'Correct the highlighted setting before exporting. The prediction uses your last valid values.' : storageAvailable ? 'Edits are saved on this device.' : 'Some edits are not saved because device storage is unavailable. Export your work to keep it.';
    query('.pt-status').classList.toggle('pt-error', invalid || !storageAvailable);
  }
  function clearErrors(keys) { for (const key of keys) { const input = query(`[data-key="${key}"]`); input.setAttribute('aria-invalid','false'); query(`[data-error="${key}"]`).hidden = true; } }
  function update(patch = {}, fromDrag = false) {
    parameters = {...parameters,...patch}; model = trajectory(parameters);
    if (!fromDrag) tip.moveTo([parameters.vx,parameters.vy]);
    for (const input of workspace.querySelectorAll('[data-key]')) if (input.getAttribute('aria-invalid') !== 'true' && document.activeElement !== input) input.value = parameters[input.dataset.key];
    query('[data-flight]').textContent = model.flight.toFixed(2)+' s'; query('[data-range]').textContent = model.range.toFixed(2)+' m'; query('[data-peak]').textContent = model.peak.toFixed(2)+' m';
    landing.label.setAttribute({anchorX:model.range < 0 ? 'left' : 'right',offset:[model.range < 0 ? 8 : -8,14]});
    fit(); studio?.updateParameters(parameters); pathBoard.update();
    if (Object.keys(patch).length) storageAvailable = options.onChange?.(patch) !== false;
    status();
  }
  for (const key of ['vx','vy','g']) {
    const input = query(`[data-key="${key}"]`), units = key === 'g' ? 'm/s²' : 'm/s', help = document.createElement('span'), error = document.createElement('span');
    input.value = parameters[key]; input.setAttribute('aria-invalid','false');
    help.className = 'pt-field-help'; help.id = `vs-help-${id}-${key}`; help.textContent = `${input.min} to ${input.max} ${units}`;
    error.className = 'pt-field-error'; error.id = `vs-error-${id}-${key}`; error.dataset.error = key; error.hidden = true;
    input.after(help,error); input.setAttribute('aria-describedby',`${help.id} ${error.id}`);
    listen(input,'input',() => { const value = input.valueAsNumber, valid = Number.isFinite(value) && value >= Number(input.min) && value <= Number(input.max); input.setAttribute('aria-invalid',String(!valid)); error.hidden = valid; error.textContent = valid ? '' : `Enter ${input.min} to ${input.max} ${units}.`; if (valid) update({[key]:value}); else status(); });
  }
  tip.on('drag', () => { const next = normalizeState({...parameters,vx:Math.round(tip.X()*10)/10,vy:Math.round(tip.Y()*10)/10}); tip.moveTo([next.vx,next.vy]); clearErrors(['vx','vy']); update({vx:next.vx,vy:next.vy},true); });
  for (const [selector,g] of [['[data-earth]',9.81],['[data-moon]',1.62]]) listen(query(selector),'click',() => { clearErrors(['g']); update({g}); });
  listen(query('[data-fit]'),'click',fit);
  studio = mountExperimentStudio(query('[data-projectile-studio]'), {model:projectileModel,parameters,signals:projectileSignals,title:'Measure the flight',onState(state) { current = state.snapshot; query('[data-canvas-play]').textContent = state.playing ? 'Pause flight' : state.time === state.duration ? 'Replay flight' : 'Play flight'; pathBoard.update(); query('[data-position]').textContent = `t = ${formatQuantity(state.time)} s · x = ${formatQuantity(current.x)} m · y = ${formatQuantity(current.y)} m`; }});
  listen(query('[data-download]'),'click',() => { const url = URL.createObjectURL(new Blob([exportExperimentCSV({model:projectileModel,parameters,signals:projectileSignals,title:'Ideal projectile'})],{type:'text/csv'})); const link = document.createElement('a'); link.href = url; link.download = 'entelloq-projectile-model.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); query('.pt-status').textContent = '241 model samples exported with units and initial conditions, including launch and landing.'; });
  const resize = new ResizeObserver(() => { if (destroyed) return; for (const board of [velocityBoard,pathBoard]) { const box = board.containerObj.getBoundingClientRect(); if (box.width > 0 && box.height > 0) board.resizeContainer(box.width,box.height); } });
  listen(query('[data-canvas-play]'),'click',() => studio.getState().playing ? studio.pause() : studio.play());
  listen(query('[data-canvas-reset]'),'click',() => { studio.pause(); studio.seek(0); });
  resize.observe(query('.pt-grid')); update();
  return {getState:studio.getState,destroy() { if (destroyed) return; destroyed = true; abort.abort(); resize.disconnect(); studio.destroy(); JXG.JSXGraph.freeBoard(velocityBoard); JXG.JSXGraph.freeBoard(pathBoard); }};
}
