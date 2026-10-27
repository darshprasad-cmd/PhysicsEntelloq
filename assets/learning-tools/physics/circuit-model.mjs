/** Bounded ideal circuit models. All calculations use SI units and one ground reference. */
export const CIRCUIT_TYPES = Object.freeze(['ohm', 'series', 'parallel', 'divider', 'rc']);
export const CIRCUIT_DEFAULTS = Object.freeze({circuit:'ohm', voltage:5, resistance:1000, resistance2:1000, capacitance:1e-6, rcMode:'charge'});
export const CIRCUIT_BOUNDS = Object.freeze({voltage:[0.1,24], resistance:[10,1e6], resistance2:[10,1e6], capacitance:[1e-9,0.01]});
const bounded = (value, key) => {
  const number = Number(value), [minimum, maximum] = CIRCUIT_BOUNDS[key];
  return value !== null && value !== '' && Number.isFinite(number) ? Math.min(maximum,Math.max(minimum,number)) : CIRCUIT_DEFAULTS[key];
};
export function normalizeCircuit(input={}) {
  if (!input || typeof input !== 'object') input={};
  return {
    circuit:CIRCUIT_TYPES.includes(input.circuit) ? input.circuit : 'ohm',
    voltage:bounded(input.voltage,'voltage'), resistance:bounded(input.resistance,'resistance'),
    resistance2:bounded(input.resistance2,'resistance2'), capacitance:bounded(input.capacitance,'capacitance'),
    rcMode:input.rcMode==='discharge' ? 'discharge' : 'charge',
  };
}

/** R1 current is positive left-to-right (downward for the parallel topology).
 * The disconnected supply delivers zero current during RC discharge.
 * capacitorPower is positive for energy entering the capacitor. */
export function sampleCircuit(parameters, time=0) {
  const p=normalizeCircuit(parameters), t=Number.isFinite(time) ? Math.max(0,time) : 0;
  const {voltage:v, resistance:r1, resistance2:r2, capacitance:c}=p;
  let loopCurrent=0, r2Current=0, r1Voltage=0, r2Voltage=0, outputVoltage=0;
  let sourceCurrent=0, capacitorVoltage=0, capacitorCurrent=0, driveVoltage=v;
  let equivalentResistance=r1;
  if (p.circuit==='rc') {
    const decay=Math.exp(-t/(r1*c));
    const charging=p.rcMode==='charge';
    driveVoltage=charging ? v : 0;
    capacitorVoltage=charging ? v*(-Math.expm1(-t/(r1*c))) : v*decay;
    loopCurrent=(charging ? 1 : -1)*v/r1*decay;
    r1Voltage=loopCurrent*r1;
    capacitorCurrent=loopCurrent;
    sourceCurrent=charging ? loopCurrent : 0;
    outputVoltage=capacitorVoltage;
  } else if (p.circuit==='parallel') {
    r1Voltage=r2Voltage=outputVoltage=v;
    loopCurrent=v/r1; r2Current=v/r2; sourceCurrent=loopCurrent+r2Current;
    equivalentResistance=1/(1/r1+1/r2);
  } else if (p.circuit==='series' || p.circuit==='divider') {
    equivalentResistance=r1+r2;
    loopCurrent=r2Current=sourceCurrent=v/equivalentResistance;
    r1Voltage=loopCurrent*r1; r2Voltage=outputVoltage=loopCurrent*r2;
  } else {
    loopCurrent=sourceCurrent=v/r1; r1Voltage=v;
    // B is the node after R1: an ideal wire ties it to the ground return.
    outputVoltage=0;
  }
  const r1Power=r1Voltage*loopCurrent, r2Power=r2Voltage*r2Current;
  return {
    time:t, supplyVoltage:v, driveVoltage, outputVoltage, r1Voltage, r2Voltage,
    loopCurrent, r2Current, sourceCurrent, capacitorVoltage, capacitorCurrent,
    r1Power, r2Power, resistorPower:r1Power+r2Power,
    sourcePower:v*sourceCurrent, capacitorPower:capacitorVoltage*capacitorCurrent,
    capacitorEnergy:0.5*c*capacitorVoltage**2,
    equivalentResistance, tau:r1*c,
  };
}

export const circuitModel = Object.freeze({
  duration(parameters) { const p=normalizeCircuit(parameters); return p.circuit==='rc' ? 6*p.resistance*p.capacitance : 10; },
  playbackTimeScale(parameters) { const p=normalizeCircuit(parameters); return p.circuit==='rc' ? p.resistance*p.capacitance : 1; },
  sample:sampleCircuit,
});

/** Source text uses the established CircuitJS cct URL format. No network is used.
 * Capacitor fields explicitly include both present and reset voltage.
 * During discharge the ideal disconnected-source/ground switch is represented
 * by its equivalent 0 V drive and a capacitor initially charged to supplyVoltage. */
export function circuitSource(parameters) {
  const p=normalizeCircuit(parameters);
  const discharge=p.circuit==='rc' && p.rcMode==='discharge';
  // Keep a small step relative to tau for the hosted solver's transient example.
  const timestep=p.circuit==='rc' ? Math.min(5e-6,p.resistance*p.capacitance/100) : 5e-6;
  const lines=[`$ 1 ${timestep} 10.20027730826997 50 5 43`,`v 96 224 96 96 0 0 40 ${discharge?0:p.voltage} 0 0 0.5`];
  if (p.circuit==='parallel') {
    lines.push('w 96 96 256 96 0',`r 256 96 256 224 0 ${p.resistance}`,'w 256 96 416 96 0',`r 416 96 416 224 0 ${p.resistance2}`,'w 416 224 256 224 0','w 256 224 96 224 0');
  } else {
    lines.push(`r 96 96 256 96 0 ${p.resistance}`);
    if (p.circuit==='rc') lines.push(`c 256 96 256 224 0 ${p.capacitance} ${discharge?p.voltage:0} ${discharge?p.voltage:0}`);
    else if (p.circuit==='series' || p.circuit==='divider') lines.push(`r 256 96 256 224 0 ${p.resistance2}`);
    else lines.push('w 256 96 256 224 0');
    lines.push('w 256 224 96 224 0');
  }
  return lines.join('\n')+'\n';
}

export function circuitHostedUrl(parameters, light=false) {
  const url=new URL('https://www.falstad.com/circuit/circuitjs.html');
  url.searchParams.set('cct',circuitSource(parameters));
  url.searchParams.set('whiteBackground',String(light));
  url.searchParams.set('conventionalCurrent','true');
  url.searchParams.set('running','true');
  return url.href;
}

export function circuitMeasurement(parameters, snapshot, component) {
  const p=normalizeCircuit(parameters), s=snapshot || sampleCircuit(p);
  if (component==='source') return {label:'DC supply', voltage:p.voltage, current:s.sourceCurrent, power:s.sourcePower, powerLabel:'Power delivered', convention:p.circuit==='rc' && p.rcMode==='discharge' ? 'Supply is disconnected: its terminals retain the set voltage, but it delivers no current.' : 'Voltage: upper terminal relative to ground. Current: leaving the positive terminal.'};
  if (component==='r2') return {label:'Resistor R₂', voltage:s.r2Voltage, current:s.r2Current, power:s.r2Power, powerLabel:'Power dissipated', convention:'Voltage drop and positive current are from the upper terminal toward ground.'};
  if (component==='capacitor') return {label:'Capacitor C', voltage:s.capacitorVoltage, current:s.capacitorCurrent, power:s.capacitorPower, energy:s.capacitorEnergy, powerLabel:'Power absorbed', convention:'Voltage: upper plate relative to ground. Positive current enters the upper plate; negative power means stored energy is leaving.'};
  if (component==='ground') return {label:'Ground reference', voltage:0, current:null, power:null, powerLabel:'Power', convention:'This node defines 0 V. Ground is a voltage reference; it is not a component with its own branch current or power.'};
  return {label:'Resistor R₁', voltage:s.r1Voltage, current:s.loopCurrent, power:s.r1Power, powerLabel:'Power dissipated', convention:p.circuit==='parallel' ? 'Voltage drop and positive current are from the upper terminal toward ground.' : 'Voltage drop and positive current are left to right. A negative reading means the actual direction is reversed.'};
}
