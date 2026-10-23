export const STORAGE_KEY = 'entelloq.physics.tools.v1';
export const DEFAULT_STATE = Object.freeze({tab:'equations', latex:'F=ma', vx:8, vy:10, g:9.81, circuit:'ohm', voltage:5, resistance:1000, capacitance:0.000001});
export const clamp = (value,min,max,fallback=min) => Number.isFinite(Number(value)) ? Math.min(max,Math.max(min,Number(value))) : fallback;
export function normalizeState(input={}) {
  if (!input || typeof input !== 'object') input={};
  return {
    tab:['equations','trajectory','circuits'].includes(input.tab)?input.tab:'equations',
    latex:typeof input.latex==='string'?input.latex.slice(0,10000):DEFAULT_STATE.latex,
    vx:clamp(input.vx??8,-20,20,8), vy:clamp(input.vy??10,0.1,20,10), g:clamp(input.g??9.81,0.1,25,9.81),
    circuit:input.circuit==='rc'?'rc':'ohm', voltage:clamp(input.voltage??5,0.1,24,5),
    resistance:clamp(input.resistance??1000,10,1000000,1000), capacitance:clamp(input.capacitance??0.000001,1e-9,0.01,0.000001),
  };
}
export function trajectory({vx,vy,g}) {
  const flight=2*vy/g;
  return {flight, range:vx*flight, peak:vy*vy/(2*g), speed:Math.hypot(vx,vy), at:t=>({x:vx*t,y:vy*t-0.5*g*t*t})};
}
export function circuitText(state) {
  const s=normalizeState(state);
  const lines=['$ 1 0.000005 10.20027730826997 50 5 43',`v 96 224 96 96 0 0 40 ${s.voltage} 0 0 0.5`,`r 96 96 256 96 0 ${s.resistance}`,
    s.circuit==='rc'?`c 256 96 256 224 0 ${s.capacitance} 0`:'w 256 96 256 224 0','w 256 224 96 224 0'];
  return lines.join('\n')+'\n';
}
export function circuitUrl(state, light=false) {
  const url=new URL('https://www.falstad.com/circuit/circuitjs.html');
  url.searchParams.set('cct',circuitText(state));
  url.searchParams.set('whiteBackground',String(light));
  url.searchParams.set('conventionalCurrent','true');
  url.searchParams.set('running','true');
  return url.href;
}
export function readState(storage) {
  try {return normalizeState(JSON.parse(storage.getItem(STORAGE_KEY)||'{}'));} catch {return normalizeState();}
}
export function writeState(storage,state) {
  try {storage.setItem(STORAGE_KEY,JSON.stringify(normalizeState(state)));return true;} catch {return false;}
}
