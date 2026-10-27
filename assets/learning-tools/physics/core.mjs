import {circuitSource,circuitHostedUrl} from './circuit-model.mjs';
export const STORAGE_KEY = 'entelloq.physics.tools.v1';
export const FIELD_STORAGE_PREFIX = 'entelloq.physics.tools.v2.';
export const DEFAULT_STATE = Object.freeze({tab:'equations', latex:'F=ma', vx:8, vy:10, g:9.81, circuit:'ohm', voltage:5, resistance:1000, resistance2:1000, capacitance:0.000001, rcMode:'charge'});
export const clamp = (value,min,max,fallback=min) => Number.isFinite(Number(value)) ? Math.min(max,Math.max(min,Number(value))) : fallback;
export function normalizeState(input={}) {
  if (!input || typeof input !== 'object') input={};
  return {
    tab:['equations','trajectory','circuits'].includes(input.tab)?input.tab:'equations',
    latex:typeof input.latex==='string'?input.latex.slice(0,10000):DEFAULT_STATE.latex,
    vx:clamp(input.vx??8,-20,20,8), vy:clamp(input.vy??10,0.1,20,10), g:clamp(input.g??9.81,0.1,25,9.81),
    circuit:['ohm','series','parallel','divider','rc'].includes(input.circuit)?input.circuit:'ohm', voltage:clamp(input.voltage??5,0.1,24,5),
    resistance:clamp(input.resistance??1000,10,1000000,1000), capacitance:clamp(input.capacitance??0.000001,1e-9,0.01,0.000001),
    resistance2:clamp(input.resistance2??1000,10,1000000,1000), rcMode:input.rcMode==='discharge'?'discharge':'charge',
  };
}
export function trajectory({vx,vy,g}) {
  if(!Number.isFinite(vx)||!Number.isFinite(vy)||!Number.isFinite(g)||vy<=0||g<=0)throw new RangeError('Projectile requires finite vx, positive vy and positive g in SI units.');
  const flight=2*vy/g;
  const at=t=>({x:vx*t,y:vy*t-0.5*g*t*t});
  return {flight, range:vx*flight, peak:vy*vy/(2*g), speed:Math.hypot(vx,vy), at,
    stateAt(t){
      if(!Number.isFinite(t))throw new RangeError('A finite time is required.');
      const time=Math.min(flight,Math.max(0,t)),position=at(time),vertical=vy-g*time;
      // The terminal sample is the airborne state immediately before impact.
      const kineticSpecific=.5*(vx*vx+vertical*vertical),potentialSpecific=g*Math.max(0,position.y);
      return {time,x:position.x,y:Math.max(0,position.y),vx,vy:vertical,ax:0,ay:-g,speed:Math.hypot(vx,vertical),kineticSpecific,potentialSpecific,totalSpecific:kineticSpecific+potentialSpecific};
    }
  };
}
export function circuitText(state) {
  return circuitSource(normalizeState(state));
}
export function circuitUrl(state, light=false) {
  return circuitHostedUrl(normalizeState(state),light);
}
export function readState(storage) {
  let saved={};
  try {saved=normalizeState(JSON.parse(storage.getItem(STORAGE_KEY)||'{}'));} catch {saved=normalizeState();}
  // Keep the original record intact. Each edited field supersedes only its own
  // legacy value, so tabs editing independent tools never replace each other.
  for(const key of Object.keys(DEFAULT_STATE)){
    try {const value=storage.getItem(FIELD_STORAGE_PREFIX+key);if(value!==null)saved[key]=JSON.parse(value);} catch {}
  }
  return normalizeState(saved);
}
export function writeState(storage,state,fields=Object.keys(DEFAULT_STATE)) {
  try {
    if(!Array.isArray(fields)||fields.some(key=>!Object.hasOwn(DEFAULT_STATE,key)))return false;
    const normalized=normalizeState(state);
    for(const key of new Set(fields))storage.setItem(FIELD_STORAGE_PREFIX+key,JSON.stringify(normalized[key]));
    return true;
  } catch {return false;}
}
