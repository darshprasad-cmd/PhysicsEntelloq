/* Original school spherometer model. Screw readings are integer 0.01 mm ticks.
   The ideal support is an equilateral triangle, nominal side 30 mm. The three
   ruler readings below are measurement estimates, not three unequal true legs.
   Four fixed paired-contact readings model small observation differences; they
   are reproducible teaching data, not measured surfaces or a calibrated device. */
var SpherometerModel=(function(){
  'use strict';
  var config=Object.freeze({pitchMm:1,divisions:100,tickMm:0.01,minTicks:0,maxTicks:700});
  var samples={
    convex:{name:'Convex spherical surface',kind:'convex',legReadings:[30,30.5,29.5],flatTicks:[300,301,299,302],curveTicks:[250,252,248,252]},
    concave:{name:'Concave spherical surface',kind:'concave',legReadings:[30,30.5,29.5],flatTicks:[300,301,299,302],curveTicks:[375,377,373,377]}
  };
  Object.keys(samples).forEach(function(id){var s=samples[id];Object.freeze(s.legReadings);Object.freeze(s.flatTicks);Object.freeze(s.curveTicks);Object.freeze(s);});
  Object.freeze(samples);
  function own(object,key){return object!==null&&typeof object==='object'&&typeof key==='string'&&Object.prototype.hasOwnProperty.call(object,key);}
  function integer(value,min,max){return Number.isInteger(value)&&value>=min&&value<=max;}
  function tick(value){return integer(value,config.minTicks,config.maxTicks);}
  function sample(id){if(!own(samples,id))throw new RangeError('Unknown spherometer surface');return samples[id];}
  function contact(id,position,surface){var s=sample(id);if(surface===undefined)surface='flat';if(!integer(position,0,s.flatTicks.length-1)||(surface!=='flat'&&surface!=='curve'))throw new RangeError('Invalid placement or contact surface');return surface==='flat'?s.flatTicks[position]:s.curveTicks[position];}
  function reading(ticks){if(!tick(ticks))throw new RangeError('Invalid screw reading');return {ticks:ticks,mainMm:Math.floor(ticks/config.divisions),division:ticks%config.divisions,mm:ticks/config.divisions};}
  function turn(current,requested,contactTicks){
    if(!tick(current)||typeof requested!=='number'||!Number.isFinite(requested)||!tick(contactTicks))throw new RangeError('Invalid screw movement');
    var rounded=Math.round(requested),next=Math.max(config.minTicks,Math.min(rounded,contactTicks,config.maxTicks));
    return {ticks:next,contact:next===contactTicks,limited:next!==rounded};
  }
  function sagitta(flatTicks,curveTicks){if(!tick(flatTicks)||!tick(curveTicks))throw new RangeError('Invalid paired readings');return Math.abs(flatTicks-curveTicks)/config.divisions;}
  function radius(lMm,hMm){
    if(typeof lMm!=='number'||typeof hMm!=='number'||!Number.isFinite(lMm)||!Number.isFinite(hMm)||lMm<=0||hMm<=0||hMm>lMm/Math.sqrt(3))throw new RangeError('A positive, shallow spherical cap is required');
    var value=(lMm/6)*(lMm/hMm)+hMm/2;
    if(!Number.isFinite(value)||value<=0)throw new RangeError('Curvature is outside the numeric range');
    return value;
  }
  function buildTrial(value){
    if(!value||typeof value!=='object'||!['sample','position','flatTicks','curveTicks','legs'].every(function(key){return own(value,key);})||!own(samples,value.sample))return null;
    var s=samples[value.sample];
    if(!integer(value.position,0,s.flatTicks.length-1)||value.flatTicks!==contact(value.sample,value.position,'flat')||value.curveTicks!==contact(value.sample,value.position,'curve')||!Array.isArray(value.legs)||value.legs.length!==3)return null;
    if(![0,1,2].every(function(i){return own(value.legs,String(i))&&typeof value.legs[i]==='number'&&Number.isFinite(value.legs[i])&&value.legs[i]===s.legReadings[i];}))return null;
    var legs=value.legs.slice(),l=(legs[0]+legs[1]+legs[2])/3,h=sagitta(value.flatTicks,value.curveTicks);
    return {sample:value.sample,position:value.position,flatTicks:value.flatTicks,curveTicks:value.curveTicks,legs:legs,l:l,h:h,R:radius(l,h)};
  }
  function raw(trial){return {sample:trial.sample,position:trial.position,flatTicks:trial.flatTicks,curveTicks:trial.curveTicks,legs:trial.legs.slice()};}
  function validateNotebook(value){
    if(!value||value.v!==1||!Array.isArray(value.trials))return {v:1,trials:[]};
    return {v:1,trials:value.trials.slice(-90).map(buildTrial).filter(Boolean).map(raw)};
  }
  function validRows(rows){return validateNotebook({v:1,trials:rows}).trials.map(buildTrial);}
  function summary(rows,id){
    if(!own(samples,id)||!Array.isArray(rows))return null;
    var trials=validRows(rows).filter(function(r){return r.sample===id;});
    if(!trials.length)return {n:0,unique:0,meanH:null,meanR:null,radiusFromMeanH:null,rangeH:null};
    var heights=trials.map(function(r){return r.h;}),totalH=heights.reduce(function(a,b){return a+b;},0),totalR=trials.reduce(function(a,r){return a+r.R;},0);
    var meanH=totalH/trials.length;
    return {n:trials.length,unique:new Set(trials.map(function(r){return r.position;})).size,meanH:meanH,meanR:totalR/trials.length,radiusFromMeanH:radius(trials[0].l,meanH),rangeH:Math.max.apply(null,heights)-Math.min.apply(null,heights)};
  }
  function csv(rows){
    var headings='Surface,Placement,Flat reading (mm),Curved reading (mm),AB (mm),BC (mm),CA (mm),Mean leg separation (mm),Sagitta magnitude (mm),Radius magnitude (mm)';
    return [headings].concat(validRows(rows).map(function(r){return [samples[r.sample].name,r.position+1,(r.flatTicks/100).toFixed(2),(r.curveTicks/100).toFixed(2),r.legs[0].toFixed(2),r.legs[1].toFixed(2),r.legs[2].toFixed(2),r.l.toFixed(2),r.h.toFixed(2),r.R.toFixed(2)].join(',');})).join('\r\n');
  }
  return {config:config,samples:samples,own:own,contact:contact,reading:reading,turn:turn,sagitta:sagitta,radius:radius,buildTrial:buildTrial,summary:summary,validateNotebook:validateNotebook,csv:csv};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=SpherometerModel;
