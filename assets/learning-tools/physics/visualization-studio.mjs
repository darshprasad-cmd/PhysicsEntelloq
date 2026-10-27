import {createExperimentSession, sampleModel, sampleSeries, signalsByUnit, exportExperimentCSV} from './visualization-core.mjs';

const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
export const formatQuantity = value => !Number.isFinite(value) ? '—' : value === 0 ? '0' : Math.abs(value) < .001 || Math.abs(value) >= 10000 ? value.toExponential(3) : Number(value.toPrecision(5)).toString();
const colors = ['#4d91ff', '#df8f28', '#a980e8', '#2aa78f', '#db6680', '#709442'];
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], {type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function niceExtent(values) {
  let lo = Math.min(...values), hi = Math.max(...values);
  const minimum = lo, maximum = hi;
  if (hi - lo < Math.max(1e-16, Math.abs(hi) * 1e-12)) { const margin = Math.max(Math.abs(hi) * .2, 1e-6); lo -= margin; hi += margin; }
  else { const margin = (hi - lo) * .12; lo -= margin; hi += margin; }
  const raw = (hi - lo) / 4, power = 10 ** Math.floor(Math.log10(raw)), fraction = raw / power;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
  return {lo:minimum >= 0 && maximum > 0 ? Math.max(0, Math.floor(lo / step) * step) : Math.floor(lo / step) * step, hi:maximum <= 0 && minimum < 0 ? Math.min(0, Math.ceil(hi / step) * step) : Math.ceil(hi / step) * step, step};
}

/** Shared analytical experiment playback; model time always uses SI seconds. */
export function mountExperimentStudio(element, {model, parameters, signals, onState = () => {}, title = 'Measurement studio'} = {}) {
  const groups = signalsByUnit(signals.map((signal, i) => ({color:colors[i % colors.length], ...signal})));
  const allSignals = [...groups.values()].flat(), session = createExperimentSession({model, parameters});
  let unit = groups.keys().next().value, selected = new Set(groups.get(unit).map(signal => signal.key));
  let destroyed = false, raf = null, lastFrame = null, revision = -1, samples = [], zoom = 1, viewStart = 0, viewEnd = 1, plotState = null, playbackTimeScale = 1, renderedWidth = 0;
  const abort = new AbortController();
  element.classList.add('vs-studio');
  element.innerHTML = `<div class="vs-heading"><div><span class="pt-eyebrow">LINKED MEASUREMENTS</span><h3>${escapeHTML(title)}</h3></div><button type="button" data-studio-export>Export full experiment CSV</button></div>
    <div class="vs-transport" role="group" aria-label="Experiment playback"><button type="button" data-restart aria-label="Return to launch">↤ Reset time</button><button type="button" data-step-back aria-label="Step backward one frame">−1 frame</button><button class="pt-primary" type="button" data-play aria-label="Play experiment">Play</button><button type="button" data-step-forward aria-label="Step forward one frame">+1 frame</button><label>Speed <select data-speed aria-label="Playback speed"><option value="0.1">0.1×</option><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label><output class="vs-time" data-time></output></div>
    <label class="vs-timeline-label">Selected time (s)<input data-timeline type="range" min="0" max="1" step="any" value="0" aria-label="Selected experiment time in seconds"></label><p class="pt-muted vs-frame-note" data-step-note></p>
    <div class="vs-probes" aria-label="Live measurements">${allSignals.map(signal => `<button type="button" class="vs-probe" data-probe="${escapeHTML(signal.key)}" title="Plot ${escapeHTML(signal.label)}"><span>${escapeHTML(signal.label)}</span><strong data-value="${escapeHTML(signal.key)}"></strong><small>${escapeHTML(signal.unit)} · plot signal</small></button>`).join('')}</div>
    <div class="vs-plot-controls"><label>Vertical axis <select data-unit aria-label="Plot quantity units">${[...groups].map(([value, group]) => `<option value="${escapeHTML(value)}">${escapeHTML(group.map(s => s.label).join(' / '))} (${escapeHTML(value)})</option>`).join('')}</select></label><div class="vs-view-controls" role="group" aria-label="Time graph view"><button type="button" data-pan-left aria-label="Pan graph earlier">←</button><label>Zoom <select data-zoom aria-label="Time graph zoom"><option value="1">Fit</option><option value="2">2×</option><option value="4">4×</option><option value="8">8×</option></select></label><button type="button" data-pan-right aria-label="Pan graph later">→</button></div></div>
    <fieldset class="vs-signals"><legend>Overlay signals with matching units</legend><div data-signals></div></fieldset>
    <svg class="vs-plot" viewBox="0 0 700 280" role="img" tabindex="0" aria-label="Time graph; click to seek, or use arrow keys to move one frame"></svg><output class="vs-inspect" data-inspect>Point to the graph to inspect values. Click to move the experiment to that time.</output>
    <details class="vs-compare"><summary>Bookmark and compare two moments</summary><div class="vs-bookmarks"><button type="button" data-bookmark="A">Set A at current time</button><button type="button" data-jump="A" disabled>Go to A</button><button type="button" data-bookmark="B">Set B at current time</button><button type="button" data-jump="B" disabled>Go to B</button></div><div class="vs-compare-table" data-comparison><p class="pt-muted">Set A and B to compare every measured quantity at two times in this experiment.</p></div></details><p class="vs-status pt-muted" data-studio-status role="status">Paused at the initial state. Parameters, graphs and measurements share one model.</p>`;
  const query = selector => element.querySelector(selector);
  const listen = (target, event, handler) => target.addEventListener(event, handler, {signal:abort.signal});
  const graph = query('.vs-plot'), timeline = query('[data-timeline]');
  function chosen() { return groups.get(unit).filter(signal => selected.has(signal.key)); }
  function renderSignalControls() {
    const focusedSignal = document.activeElement?.dataset?.signal;
    query('[data-unit]').value = unit;
    query('[data-signals]').innerHTML = groups.get(unit).map(signal => `<label style="--signal-color:${escapeHTML(signal.color)}"><input type="checkbox" data-signal="${escapeHTML(signal.key)}" ${selected.has(signal.key) ? 'checked' : ''}><span class="vs-swatch"></span>${escapeHTML(signal.label)} (${escapeHTML(signal.unit)})</label>`).join('');
    element.querySelectorAll('[data-probe]').forEach(button => button.setAttribute('aria-pressed', String(selected.has(button.dataset.probe) && groups.get(unit).some(s => s.key === button.dataset.probe))));
    if (focusedSignal) query(`[data-signal="${focusedSignal}"]`)?.focus({preventScroll:true});
  }
  function redrawPlot(state = session.getState()) {
    query('[data-inspect]').textContent = 'Point to the graph to inspect values. Click to move the experiment to that time.';
    const group = chosen(), duration = state.duration, span = duration / zoom;
    viewStart = Math.max(0, Math.min(duration - span, viewStart)); viewEnd = viewStart + span;
    const visibleSamples = samples.filter(row => row.time >= viewStart && row.time <= viewEnd);
    // Include exact view edges, even when a narrow view falls between cached samples.
    const rows = [sampleModel(model, state.parameters, viewStart), ...visibleSamples, sampleModel(model, state.parameters, viewEnd)];
    const extent = niceExtent(rows.flatMap(row => group.map(signal => row[signal.key])));
    renderedWidth = graph.clientWidth;
    const width = Math.max(280, Math.min(700, renderedWidth)), left = width < 450 ? 66 : 78, right = width - 22, plotWidth = right - left;
    graph.setAttribute('viewBox', `0 0 ${width} 280`);
    const x = time => left + (time - viewStart) / span * plotWidth, y = value => 225 - (value - extent.lo) / (extent.hi - extent.lo) * 194;
    plotState = {x, y, extent, left, plotWidth};
    const yGrid = [];
    for (let i = 0; i <= Math.round((extent.hi - extent.lo) / extent.step); i++) { const value = extent.lo + extent.step * i, py = y(value); yGrid.push(`<line x1="${left}" y1="${py}" x2="${right}" y2="${py}" class="vs-grid"/><text x="${left - 9}" y="${py + 4}" text-anchor="end">${formatQuantity(value)}</text>`); }
    const xSteps = width < 450 ? 2 : 4;
    const xGrid = Array.from({length:xSteps+1}, (_, i) => { const time = viewStart + span * i / xSteps, px = x(time); return `<line x1="${px}" y1="31" x2="${px}" y2="225" class="vs-grid"/><text x="${px}" y="245" text-anchor="${i === 0 ? 'start' : i === xSteps ? 'end' : 'middle'}">${formatQuantity(time)}</text>`; });
    graph.innerHTML = `<title>${escapeHTML(group.map(signal => signal.label).join(', '))} against time</title><desc>Horizontal axis: time in seconds. Vertical axis: ${escapeHTML(unit)}. The solid cursor marks the selected simulation time.</desc>${yGrid.join('')}${xGrid.join('')}<text x="${left}" y="17">${escapeHTML(unit)}</text><text x="${(left+right)/2}" y="273" text-anchor="middle">Time (s)</text>${group.map(signal => `<path d="${rows.map((row, i) => `${i ? 'L' : 'M'}${x(row.time).toFixed(3)},${y(row[signal.key]).toFixed(3)}`).join(' ')}" fill="none" stroke="${escapeHTML(signal.color)}" stroke-width="2.6" vector-effect="non-scaling-stroke"/>`).join('')}<line data-plot-cursor x1="${left}" x2="${left}" y1="28" y2="228" class="vs-cursor"/><line data-inspect-cursor x1="${left}" x2="${left}" y1="28" y2="228" class="vs-inspect-cursor" visibility="hidden"/>`;
    query('[data-pan-left]').disabled = viewStart <= 0;
    query('[data-pan-right]').disabled = viewEnd >= duration;
    updateCursor(state);
  }
  function updateCursor(state) {
    const cursor = query('[data-plot-cursor]'); if (!cursor || !plotState) return;
    const px = plotState.x(state.time); cursor.setAttribute('x1', px); cursor.setAttribute('x2', px); cursor.setAttribute('visibility', state.time < viewStart || state.time > viewEnd ? 'hidden' : 'visible');
    graph.setAttribute('aria-label', `${chosen().map(s => `${s.label} (${s.unit})`).join(', ')} against time (s). Current time ${formatQuantity(state.time)} seconds. Click to seek; arrow keys step.`);
  }
  function renderComparison(state) {
    for (const slot of ['A', 'B']) { const t = state.bookmarks[slot], button = query(`[data-jump="${slot}"]`); button.disabled = t === null; button.textContent = t === null ? `Go to ${slot}` : `${slot} · ${formatQuantity(t)} s`; }
    const {A, B} = session.compare(); if (!A || !B) { query('[data-comparison]').innerHTML = '<p class="pt-muted">Set A and B to compare every measured quantity at two times in this experiment.</p>'; return; }
    query('[data-comparison]').innerHTML = `<table><caption>A at ${formatQuantity(A.time)} s · B at ${formatQuantity(B.time)} s</caption><thead><tr><th>Quantity</th><th>A</th><th>B</th><th>Δ (B − A)</th></tr></thead><tbody>${allSignals.map(signal => `<tr><th>${escapeHTML(signal.label)} (${escapeHTML(signal.unit)})</th><td>${formatQuantity(A[signal.key])}</td><td>${formatQuantity(B[signal.key])}</td><td>${formatQuantity(B[signal.key] - A[signal.key])}</td></tr>`).join('')}</tbody></table>`;
  }
  function schedule() { if (raf === null && !destroyed && session.getState().playing) raf = requestAnimationFrame(frame); }
  function frame(timestamp) { raf = null; if (destroyed) return; const elapsed = lastFrame === null ? 0 : Math.min(.1, (timestamp - lastFrame) / 1000); lastFrame = timestamp; session.tick(elapsed * playbackTimeScale); schedule(); }
  let lastBookmarks = '', lastRevision = -1, lastPlaying = null;
  renderSignalControls();
  const unsubscribe = session.subscribe(state => {
    if (state.revision !== revision) {
      revision = state.revision; samples = sampleSeries(model, state.parameters);
      playbackTimeScale = model.playbackTimeScale?.(state.parameters) ?? 1;
      if (!Number.isFinite(playbackTimeScale) || playbackTimeScale <= 0) throw new TypeError('Playback time scale must be finite and positive');
      for (const signal of allSignals) if (samples.some(row => !Number.isFinite(row[signal.key]))) throw new TypeError('Missing model signal: ' + signal.key);
      viewStart = 0; zoom = 1; query('[data-zoom]').value = '1'; redrawPlot(state);
      query('[data-step-note]').textContent = `At 1×, one playback second advances ${formatQuantity(playbackTimeScale)} s of model time. One frame = ${formatQuantity(state.duration / 120)} s (1/120 of this experiment). Parameter edits start a new run and clear bookmarks.`;
    }
    query('[data-play]').textContent = state.playing ? 'Pause' : state.time === state.duration ? 'Replay' : 'Play';
    query('[data-play]').setAttribute('aria-label', state.playing ? 'Pause experiment' : 'Play experiment');
    if (state.playing !== lastPlaying) { query('[data-studio-status]').textContent = state.playing ? 'Playing. Every view follows the selected time.' : state.time === 0 ? 'Paused at the initial state. Parameters, graphs and measurements share one model.' : 'Paused. Inspect, step or bookmark this state.'; lastPlaying = state.playing; }
    timeline.max = state.duration; timeline.value = state.time; timeline.setAttribute('aria-valuetext', `${formatQuantity(state.time)} seconds of ${formatQuantity(state.duration)} seconds`);
    query('[data-time]').textContent = `${formatQuantity(state.time)} / ${formatQuantity(state.duration)} s`;
    query('[data-step-back]').disabled = state.time <= 0; query('[data-step-forward]').disabled = state.time >= state.duration;
    allSignals.forEach(signal => query(`[data-value="${signal.key}"]`).textContent = formatQuantity(state.snapshot[signal.key]));
    updateCursor(state);
    const serialized = JSON.stringify(state.bookmarks); if (serialized !== lastBookmarks || state.revision !== lastRevision) { renderComparison(state); lastBookmarks = serialized; lastRevision = state.revision; }
    if (!state.playing) { if (raf !== null) cancelAnimationFrame(raf); raf = null; lastFrame = null; } else schedule();
    onState(state);
  });
  listen(query('[data-play]'), 'click', () => { session.getState().playing ? session.pause() : session.play(); query('[data-studio-status]').textContent = session.getState().playing ? 'Playing. Every view follows the selected time.' : 'Paused. Inspect, step or bookmark this state.'; });
  listen(query('[data-restart]'), 'click', () => { session.pause(); session.seek(0); });
  listen(query('[data-step-back]'), 'click', () => session.step(-session.getState().duration / 120));
  listen(query('[data-step-forward]'), 'click', () => session.step());
  listen(query('[data-speed]'), 'change', event => session.setSpeed(Number(event.target.value)));
  listen(timeline, 'input', () => { const target = Number(timeline.value); session.pause(); session.seek(target); });
  listen(query('[data-unit]'), 'change', event => { unit = event.target.value; selected = new Set(groups.get(unit).map(signal => signal.key)); renderSignalControls(); redrawPlot(); });
  listen(query('[data-signals]'), 'change', event => { const input = event.target.closest('[data-signal]'); if (!input) return; if (input.checked) selected.add(input.dataset.signal); else if (selected.size > 1) selected.delete(input.dataset.signal); else input.checked = true; renderSignalControls(); redrawPlot(); });
  listen(query('.vs-probes'), 'click', event => { const button = event.target.closest('[data-probe]'); if (!button) return; const signal = allSignals.find(s => s.key === button.dataset.probe); unit = signal.unit; selected = new Set([signal.key]); renderSignalControls(); redrawPlot(); query('[data-studio-status]').textContent = `Plotting ${signal.label} in ${signal.unit}.`; });
  listen(query('[data-zoom]'), 'change', event => { zoom = Number(event.target.value); const state = session.getState(); viewStart = state.time - state.duration / zoom / 2; redrawPlot(); });
  for (const direction of [-1, 1]) listen(query(direction < 0 ? '[data-pan-left]' : '[data-pan-right]'), 'click', () => { viewStart += direction * session.getState().duration / zoom / 2; redrawPlot(); });
  function pointerTime(event) { const point = graph.createSVGPoint(); point.x = event.clientX; point.y = event.clientY; const x = point.matrixTransform(graph.getScreenCTM().inverse()).x; return viewStart + Math.max(0, Math.min(1, (x - plotState.left) / plotState.plotWidth)) * (viewEnd - viewStart); }
  listen(graph, 'click', event => { session.pause(); session.seek(pointerTime(event)); });
  listen(graph, 'pointermove', event => { const time = pointerTime(event), state = session.getState(), sample = sampleModel(model, state.parameters, time); query('[data-inspect]').textContent = `t = ${formatQuantity(time)} s · ${chosen().map(signal => `${signal.label} = ${formatQuantity(sample[signal.key])} ${signal.unit}`).join(' · ')}`; const cursor = query('[data-inspect-cursor]'); cursor.setAttribute('x1', plotState.x(time)); cursor.setAttribute('x2', plotState.x(time)); cursor.setAttribute('visibility', 'visible'); });
  listen(graph, 'pointerleave', () => query('[data-inspect-cursor]')?.setAttribute('visibility', 'hidden'));
  listen(graph, 'keydown', event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); session.pause(); if (event.key === 'Home' || event.key === 'End') session.seek(event.key === 'Home' ? 0 : session.getState().duration); else session.step(session.getState().duration / 120 * (event.key === 'ArrowLeft' ? -1 : 1)); });
  element.querySelectorAll('[data-bookmark]').forEach(button => listen(button, 'click', () => session.bookmark(button.dataset.bookmark)));
  element.querySelectorAll('[data-jump]').forEach(button => listen(button, 'click', () => { session.pause(); session.seek(session.getState().bookmarks[button.dataset.jump]); }));
  listen(query('[data-studio-export]'), 'click', () => { const state = session.getState(); download('entelloq-experiment.csv', exportExperimentCSV({model, parameters:state.parameters, signals:allSignals, title})); query('[data-studio-status]').textContent = 'Exported 241 uniform model samples with units, initial conditions and both endpoints.'; });
  listen(document, 'visibilitychange', () => { if (document.hidden && session.getState().playing) { session.pause(); query('[data-studio-status]').textContent = 'Paused while the page was hidden.'; } });
  const resize = new ResizeObserver(() => { if (!destroyed && graph.clientWidth !== renderedWidth) redrawPlot(); });
  resize.observe(graph);
  function selectSignals(keys) {
    const wanted = allSignals.filter(signal => keys.includes(signal.key));
    if (!wanted.length || wanted.length !== new Set(keys).size || wanted.some(signal => signal.unit !== wanted[0].unit)) throw new TypeError('Select known signals with matching units');
    unit = wanted[0].unit; selected = new Set(keys); renderSignalControls(); redrawPlot();
  }
  return {getState:session.getState, play:session.play, pause:session.pause, seek:session.seek, updateParameters:patch => session.updateParameters(patch), selectSignals, destroy() { if (destroyed) return; destroyed = true; abort.abort(); resize.disconnect(); unsubscribe(); session.destroy(); if (raf !== null) cancelAnimationFrame(raf); raf = null; samples = []; element.replaceChildren(); element.classList.remove('vs-studio'); }};
}
