// Browser-independent state and recording contracts. Renderers consume snapshots;
// they never integrate equations or maintain a separate simulation clock.
const bounded = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
function immutable(value, depth = 0) {
  if (depth > 30) throw new TypeError('Snapshot nesting exceeds 30 levels');
  if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('Snapshot numbers must be finite');
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return Object.freeze(value.map(v => immutable(v, depth + 1)));
  if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, immutable(v, depth + 1)])));
  throw new TypeError('State must contain only plain objects, arrays and finite JSON values');
}
function durationOf(model, parameters) {
  const duration = Number(model.duration(parameters));
  if (!Number.isFinite(duration) || duration <= 0) throw new RangeError('Model duration must be finite and positive');
  return duration;
}
export function sampleModel(model, parameters, time) {
  const duration = durationOf(model, parameters);
  if (!Number.isFinite(time)) throw new TypeError('Time must be finite');
  time = bounded(time, 0, duration);
  const sample = model.sample(parameters, time);
  if (!sample || typeof sample !== 'object' || Array.isArray(sample)) throw new TypeError('Model sample must be an object');
  for (const value of Object.values(sample)) if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Model quantities must be finite numbers');
  return Object.freeze({...sample, time});
}
export function sampleSeries(model, parameters, count = 241) {
  if (!Number.isInteger(count) || count < 2 || count > 10001) throw new RangeError('Sample count must be 2 to 10001');
  const duration = durationOf(model, parameters);
  return Object.freeze(Array.from({length: count}, (_, i) => sampleModel(model, parameters, duration * i / (count - 1))));
}
export function createExperimentSession({model, parameters = {}}) {
  if (typeof model?.sample !== 'function' || typeof model?.duration !== 'function') throw new TypeError('Model needs duration(parameters) and sample(parameters,time)');
  let params = immutable(parameters), duration = durationOf(model, params), time = 0, playing = false, speed = 1, revision = 0, destroyed = false;
  let bookmarks = {A: null, B: null};
  const listeners = new Set();
  const getState = () => Object.freeze({parameters: params, time, duration, playing, speed, revision, bookmarks: immutable(bookmarks), snapshot: sampleModel(model, params, time)});
  function emit() { const state = getState(); for (const listener of listeners) listener(state); return state; }
  function alive() { if (destroyed) throw new Error('Experiment session was destroyed'); }
  const api = {
    getState,
    subscribe(listener) { alive(); listeners.add(listener); listener(getState()); return () => listeners.delete(listener); },
    updateParameters(patch) {
      alive(); const next = immutable({...params, ...patch});
      if (JSON.stringify(next) === JSON.stringify(params)) return getState();
      const nextDuration = durationOf(model, next); sampleModel(model, next, 0);
      params = next; duration = nextDuration; time = 0; playing = false; bookmarks = {A: null, B: null}; revision++; return emit();
    },
    seek(value) { alive(); if (!Number.isFinite(value)) throw new TypeError('Time must be finite'); time = bounded(value, 0, duration); if (time === duration) playing = false; return emit(); },
    step(delta = duration / 120) { alive(); playing = false; return api.seek(time + delta); },
    play() { alive(); if (time >= duration) time = 0; playing = true; return emit(); },
    pause() { alive(); playing = false; return emit(); },
    setSpeed(value) { alive(); if (![0.1, 0.25, 0.5, 1, 2, 4].includes(value)) throw new RangeError('Unsupported playback speed'); speed = value; return emit(); },
    tick(elapsedSeconds) { alive(); if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) throw new RangeError('Elapsed time must be finite and nonnegative'); return playing ? api.seek(time + elapsedSeconds * speed) : getState(); },
    bookmark(slot) { alive(); if (!['A', 'B'].includes(slot)) throw new RangeError('Use bookmark A or B'); bookmarks = {...bookmarks, [slot]: time}; return emit(); },
    compare() { return Object.freeze(Object.fromEntries(Object.entries(bookmarks).map(([key, t]) => [key, t === null ? null : sampleModel(model, params, t)]))); },
    destroy() { playing = false; destroyed = true; listeners.clear(); },
  };
  sampleModel(model, params, 0);
  return api;
}
export function signalsByUnit(signals) {
  const groups = new Map(), keys = new Set();
  for (const signal of signals) {
    if (!signal || typeof signal.key !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(signal.key) || keys.has(signal.key) || typeof signal.unit !== 'string' || !signal.unit) throw new TypeError('Signals need unique identifier keys and explicit units');
    keys.add(signal.key);
    if (!groups.has(signal.unit)) groups.set(signal.unit, []);
    groups.get(signal.unit).push(Object.freeze({...signal}));
  }
  if (!keys.size) throw new TypeError('At least one signal is required');
  return groups;
}
const csvCell = value => '"' + String(value).replaceAll('"', '""') + '"';
export function exportExperimentCSV({model, parameters, signals, count = 241, title = 'Experiment'}) {
  signalsByUnit(signals);
  const rows = sampleSeries(model, parameters, count);
  const columns = signals.map(signal => signal.key);
  for (const row of rows) for (const key of columns) if (!Number.isFinite(row[key])) throw new TypeError('Missing signal: ' + key);
  return ['# Entelloq deterministic model samples v1', '# title: ' + JSON.stringify(title), '# parameters: ' + JSON.stringify(parameters), '# sampling: uniform; includes both endpoints', ['time_s', ...signals.map(s => csvCell(`${s.key} [${s.unit}]`))].join(','), ...rows.map(row => [row.time, ...columns.map(key => row[key])].map(value => value.toPrecision(15)).join(','))].join('\n') + '\n';
}
// For nondeterministic/measured adapters: exact retained snapshots, never invented
// interpolation. Recording is bounded by count and serialized UTF-8 bytes.
export function createSnapshotRecorder({maxSnapshots = 600, maxBytes = 2 * 1024 * 1024} = {}) {
  if (!Number.isInteger(maxSnapshots) || maxSnapshots < 2 || !Number.isInteger(maxBytes) || maxBytes < 128) throw new RangeError('Invalid recording limits');
  let frames = [], bytes = 0, dropped = 0;
  return {
    append(time, snapshot) {
      if (!Number.isFinite(time) || time < 0 || (frames.length && time <= frames.at(-1).time)) throw new RangeError('Snapshot times must increase strictly');
      const frame = immutable({time, snapshot});
      const size = new TextEncoder().encode(JSON.stringify(frame)).length;
      if (size > maxBytes) throw new RangeError('One snapshot exceeds the recording byte limit');
      frames.push({frame, size, time}); bytes += size;
      while (frames.length > maxSnapshots || bytes > maxBytes) { bytes -= frames.shift().size; dropped++; }
      return frame;
    },
    at(time) {
      if (!Number.isFinite(time)) throw new TypeError('Time must be finite');
      if (!frames.length || time < frames[0].time || time > frames.at(-1).time) return null;
      let lo = 0, hi = frames.length - 1;
      while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (frames[mid].time <= time) lo = mid; else hi = mid - 1; }
      return frames[lo].frame;
    },
    getFrames: () => Object.freeze(frames.map(entry => entry.frame)),
    getInfo: () => Object.freeze({count: frames.length, bytes, dropped, start: frames[0]?.time ?? null, end: frames.at(-1)?.time ?? null, interpolation: 'previous recorded snapshot'}),
    clear() { frames = []; bytes = 0; dropped = 0; },
  };
}
