/* Original transverse-string pulse rehearsal, not calibrated apparatus.
   The pulse centre travels at a declared ideal speed and reflects at fixed ends.
   N below counts ROUND TRIPS: distance = 2*N*L (NCERT n counts one-way journeys).
   The observed clock adds one of three fixed teaching offsets then rounds to
   0.01 s. These offsets are neither random nor unbiased, and are not a student's
   reaction time. All recorded calculations use that displayed clock value. */
var PulseModel=(function(){
  'use strict';
  var EPS=1e-9,MAX_ROWS=40;
  var setups=Object.freeze({
    A:Object.freeze({label:'Ideal string A',name:'Ideal string A',speedMps:3}),
    B:Object.freeze({label:'Ideal string B',name:'Ideal string B',speedMps:4})
  });
  var config=Object.freeze({setups:setups,lengths:Object.freeze([1,1.5,2,2.5,3,3.5,4,4.5,5]),roundTrips:Object.freeze([1,3,5]),timingErrors:Object.freeze([-.04,.02,.04]),clockResolutionS:.01,maxRows:MAX_ROWS});
  function own(o,k){return o!==null&&typeof o==='object'&&Object.prototype.hasOwnProperty.call(o,k);}
  function plain(o){if(!o||typeof o!=='object'||Array.isArray(o))return false;var p=Object.getPrototypeOf(o);return (p===Object.prototype||p===null)&&!own(o,'__proto__')&&!own(o,'constructor')&&!own(o,'prototype');}
  function data(o,k){return own(o,k)&&Object.prototype.hasOwnProperty.call(Object.getOwnPropertyDescriptor(o,k),'value');}
  function fields(o,keys){return plain(o)&&keys.every(function(k){return data(o,k);});}
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function defaults(){return {setup:'A',lengthM:2,roundTrips:3,trial:0};}
  function validSettings(s){return fields(s,['setup','lengthM','roundTrips','trial'])&&typeof s.setup==='string'&&own(setups,s.setup)&&config.lengths.indexOf(s.lengthM)!==-1&&config.roundTrips.indexOf(s.roundTrips)!==-1&&Number.isInteger(s.trial)&&s.trial>=0&&s.trial<3;}
  function normalize(s){return validSettings(s)?{setup:s.setup,lengthM:s.lengthM,roundTrips:s.roundTrips,trial:s.trial}:defaults();}
  function experiment(s){
    if(!validSettings(s))throw new RangeError('Choose an available string, length, round-trip count and trial.');
    var distance=2*s.roundTrips*s.lengthM,ideal=distance/setups[s.setup].speedMps,offset=config.timingErrors[s.trial],observed=Math.round((ideal+offset)*100)/100;
    return {setup:s.setup,lengthM:s.lengthM,roundTrips:s.roundTrips,trial:s.trial,idealSpeedMps:setups[s.setup].speedMps,distanceM:distance,idealTimeS:ideal,timingErrorS:offset,observedTimeS:observed,speedMps:distance/observed};
  }
  function frame(s,elapsed){
    var e=experiment(s);if(!finite(elapsed))throw new RangeError('Replay time must be finite seconds.');
    var time=Math.max(0,Math.min(e.idealTimeS,elapsed)),journeys=time*e.idealSpeedMps/e.lengthM;
    // Snap only floating-point roundoff at an endpoint; a genuine near-end frame stays in flight.
    if(Math.abs(journeys-Math.round(journeys))<1e-12)journeys=Math.round(journeys);
    var legs=Math.floor(journeys),phase=journeys%2,complete=journeys>=2*e.roundTrips;if(complete)time=e.idealTimeS;
    return {elapsedS:time,idealTimeS:e.idealTimeS,positionM:(phase<=1?phase:2-phase)*e.lengthM,direction:legs%2===0?1:-1,polarity:legs%2===0?1:-1,returns:Math.min(e.roundTrips,Math.floor(journeys/2)),oneWayJourneys:legs,complete:complete};
  }
  function number(value){
    if(finite(value))return value;
    if(typeof value!=='string'||!value.trim()||value.length>64||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(value.trim()))return null;
    var n=Number(value);return Number.isFinite(n)?n:null;
  }
  var inputKeys=['lengthM','roundTrips','timeS','distanceM','speedMps'];
  function checkedInputs(e,input){
    var errors=[],values={};
    if(!fields(input,inputKeys))return {ok:false,errors:['Enter all five readings in the stated units; inherited or missing fields are not readings.'],inputs:null};
    inputKeys.forEach(function(k){values[k]=number(input[k]);});
    if(values.lengthM===null||Math.abs(values.lengthM-e.lengthM)>EPS)errors.push('Read the endpoint separation L in metres, not centimetres or total travel distance.');
    if(values.roundTrips===null||values.roundTrips!==e.roundTrips)errors.push('Count the selected complete round trips N; each contains two one-way journeys.');
    if(values.timeS===null||Math.abs(values.timeS-e.observedTimeS)>EPS)errors.push('Copy the captured teaching-clock reading in seconds, including its two decimal places.');
    if(values.distanceM===null||Math.abs(values.distanceM-e.distanceM)>EPS)errors.push('Total pulse travel is 2 × N × L metres: include the return journey each time.');
    if(values.speedMps===null||values.speedMps<=0||Math.abs(values.speedMps-e.speedMps)>.005+EPS)errors.push('Divide total travel 2NL by the captured time in seconds; enter speed in m/s to two decimal places or better.');
    return {ok:errors.length===0,errors:errors,inputs:values};
  }
  function check(s,elapsed,input){
    var e;try{e=experiment(s);}catch(_){return {ok:false,errors:['Choose a valid experiment setup first.'],record:null};}
    if(!finite(elapsed)||!frame(s,elapsed).complete)return {ok:false,errors:['Finish the selected round trips using replay or manual stepping before recording.'],record:null};
    var result=checkedInputs(e,input);return {ok:result.ok,errors:result.errors,record:result.ok?{setup:e.setup,lengthM:e.lengthM,roundTrips:e.roundTrips,trial:e.trial,inputs:result.inputs}:null};
  }
  function raw(value){
    if(!validSettings(value)||!data(value,'inputs'))return null;
    var e=experiment(value),checked=checkedInputs(e,value.inputs);if(!checked.ok)return null;
    // Stored observations are numbers, not expressions or strings. Unknown derived fields are ignored.
    if(!inputKeys.every(function(k){return finite(value.inputs[k]);}))return null;
    return {setup:e.setup,lengthM:e.lengthM,roundTrips:e.roundTrips,trial:e.trial,inputs:{lengthM:checked.inputs.lengthM,roundTrips:checked.inputs.roundTrips,timeS:checked.inputs.timeS,distanceM:checked.inputs.distanceM,speedMps:checked.inputs.speedMps}};
  }
  function buildTrial(value){
    var r=raw(value);if(!r)return null;var e=experiment(r);
    return {setup:r.setup,lengthM:r.lengthM,roundTrips:r.roundTrips,trial:r.trial,inputs:r.inputs,distanceM:e.distanceM,idealTimeS:e.idealTimeS,observedTimeS:e.observedTimeS,timingErrorS:e.timingErrorS,idealSpeedMps:e.idealSpeedMps,speedMps:e.distanceM/r.inputs.timeS};
  }
  function validateNotebook(value){
    if(!fields(value,['v','trials'])||value.v!==1||!Array.isArray(value.trials))return {v:1,trials:[]};
    var rows=[],seen=Object.create(null);
    // Bound validation work as well as storage; newest distinct trial for each condition wins.
    for(var i=value.trials.length-1;i>=Math.max(0,value.trials.length-200)&&rows.length<MAX_ROWS;i--){
      if(!data(value.trials,String(i)))continue;var r=raw(value.trials[i]);if(!r)continue;
      var key=r.setup+':'+r.lengthM+':'+r.roundTrips+':'+r.trial;if(seen[key])continue;seen[key]=true;rows.unshift(r);
    }
    return {v:1,trials:rows};
  }
  function summary(rows,settings){
    if(!validSettings(settings))return null;
    var trials=validateNotebook({v:1,trials:rows}).trials.filter(function(r){return r.setup===settings.setup&&r.lengthM===settings.lengthM&&r.roundTrips===settings.roundTrips;}).sort(function(a,b){return a.trial-b.trial;});
    if(trials.length!==3||!trials.every(function(r,i){return r.trial===i;}))return null;
    var distance=2*settings.roundTrips*settings.lengthM,times=trials.map(function(r){return r.inputs.timeS;}),mean=times.reduce(function(a,b){return a+b;},0)/3;
    return {n:3,setup:settings.setup,lengthM:settings.lengthM,roundTrips:settings.roundTrips,distanceM:distance,meanTimeS:mean,speedMps:distance/mean,timesS:times,timingErrors:config.timingErrors.slice()};
  }
  function cell(value){
    var text=String(value);if(typeof value!=='number'&&/^[=+\-@\t\r]/.test(text))text="'"+text;
    return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
  }
  function csv(rows){
    var lines=[['String setup','Endpoint separation L (m)','Round trips N','One-way journeys 2N','Trial','Captured time (s)','Distance 2NL (m)','Entered speed (m/s)','Calculated speed (m/s)','Ideal replay time (s)','Teaching timing offset (s)','Declared ideal speed (m/s)','Provenance'].map(cell).join(',')];
    validateNotebook({v:1,trials:rows}).trials.map(buildTrial).forEach(function(r){lines.push([setups[r.setup].label,r.lengthM,r.roundTrips,2*r.roundTrips,r.trial+1,r.inputs.timeS.toFixed(2),r.distanceM,r.inputs.speedMps,r.speedMps.toFixed(6),r.idealTimeS.toFixed(6),r.timingErrorS,r.idealSpeedMps,'Deterministic transverse-string rehearsal; not calibrated data or reaction-time measurement'].map(cell).join(','));});return lines.join('\r\n');
  }
  return Object.freeze({config:config,setups:setups,defaults:defaults,normalize:normalize,experiment:experiment,frame:frame,check:check,raw:raw,buildTrial:buildTrial,validateNotebook:validateNotebook,summary:summary,csv:csv});
})();
var PeqPulseModel=PulseModel;
if(typeof module!=='undefined'&&module.exports)module.exports=PulseModel;
