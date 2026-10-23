/* Original, deterministic teaching instruments. All lengths are integer ticks;
   zero error changes the indicated scale, not the physical jaw separation. */
var MeasurementModel=(function(){
  'use strict';
  var instruments={
    'vernier-calipers':{name:'Vernier calipers',um:100,divisions:10,mainTicks:10,max:1000,zeroMax:5,decimals:1},
    'screw-gauge':{name:'Screw gauge',um:10,divisions:50,mainTicks:50,max:2500,zeroMax:5,decimals:2}
  };
  var samples={
    sphere:{instrument:'vernier-calipers',name:'Sphere · external diameter',dimension:'Diameter',mode:'external',values:[234,235,234],positions:3,orientations:1,group:'sphere'},
    cylinder:{instrument:'vernier-calipers',name:'Cylinder · external diameter',dimension:'Diameter',mode:'external',values:[186,185,186],positions:3,orientations:1,group:'cylinder'},
    beakerDiameter:{instrument:'vernier-calipers',name:'Beaker · internal diameter',dimension:'Internal diameter',mode:'internal',values:[426,427,426],positions:3,orientations:1,group:'beaker'},
    beakerDepth:{instrument:'vernier-calipers',name:'Beaker · internal depth',dimension:'Internal depth',mode:'depth',values:[653,654,653],positions:3,orientations:1,group:'beaker'},
    wire:{instrument:'screw-gauge',name:'Wire · diameter',dimension:'Diameter',mode:'wire',values:[58,59,58,58,59,60,58,59],positions:4,orientations:2,group:'wire'},
    sheet:{instrument:'screw-gauge',name:'Sheet · thickness',dimension:'Thickness',mode:'sheet',values:[73,74,73,73],positions:4,orientations:1,group:'sheet'}
  };
  function own(object,key){return typeof key==='string'&&Object.prototype.hasOwnProperty.call(object,key);}
  function config(id){if(!own(instruments,id))throw Error('Unknown instrument');return instruments[id];}
  function integer(value,min,max){return Number.isInteger(value)&&value>=min&&value<=max;}
  function reading(id,opening,zero){var c=config(id);if(!integer(opening,0,c.max)||!integer(zero,-c.zeroMax,c.zeroMax))throw Error('Invalid instrument setting');var raw=opening+zero,main=Math.floor(raw/c.mainTicks)*c.mainTicks,division=raw-main;return {opening:opening,zero:zero,raw:raw,main:main,division:division,corrected:raw-zero,closed:opening===0};}
  function dimension(sample,position,orientation){if(!own(samples,sample))throw Error('Unknown sample');var s=samples[sample];if(!integer(position,0,s.positions-1)||!integer(orientation,0,s.orientations-1))throw Error('Invalid sample position');return s.values[position*s.orientations+orientation];}
  function move(sample,position,orientation,current,requested,calibrating){var s=samples[sample],c=config(s.instrument),target=calibrating?0:dimension(sample,position,orientation);var next=Math.max(0,Math.min(c.max,Math.round(requested)));if(!calibrating){next=s.mode==='internal'||s.mode==='depth'?Math.min(next,target):Math.max(next,target);}return {opening:next,contact:next===target,limited:next!==Math.round(requested)};}
  function mm(id,ticks){return ticks*config(id).um/1000;}
  function format(id,ticks){return mm(id,ticks).toFixed(config(id).decimals);}
  function trial(value){if(!value||!own(instruments,value.instrument)||!own(samples,value.sample))return null;var c=config(value.instrument),s=samples[value.sample];if(s.instrument!==value.instrument||!integer(value.position,0,s.positions-1)||!integer(value.orientation,0,s.orientations-1)||!integer(value.zero,-c.zeroMax,c.zeroMax)||!integer(value.opening,0,c.max)||value.opening!==dimension(value.sample,value.position,value.orientation))return null;var r=reading(value.instrument,value.opening,value.zero);if(value.raw!==r.raw||value.corrected!==r.corrected||value.main!==r.main||value.division!==r.division)return null;return {instrument:value.instrument,sample:value.sample,position:value.position,orientation:value.orientation,zero:r.zero,opening:r.opening,raw:r.raw,main:r.main,division:r.division,corrected:r.corrected};}
  function validateNotebook(value){if(!value||value.v!==1||!Array.isArray(value.trials))return {v:1,trials:[]};return {v:1,trials:value.trials.slice(-120).map(trial).filter(Boolean)};}
  function summary(rows,sample){var s=samples[sample];if(!s)return null;var values=rows.filter(function(r){return r.sample===sample;}).map(function(r){return mm(s.instrument,r.corrected);});if(!values.length)return null;var mean=values.reduce(function(a,b){return a+b;},0)/values.length;var unique=new Set(rows.filter(function(r){return r.sample===sample;}).map(function(r){return r.position+':'+r.orientation;}));return {n:values.length,unique:unique.size,required:s.positions*s.orientations,mean:mean,min:Math.min.apply(null,values),max:Math.max.apply(null,values),range:Math.max.apply(null,values)-Math.min.apply(null,values),resolution:mm(s.instrument,1),resolutionHalf:mm(s.instrument,1)/2};}
  function beakerVolume(rows){var d=summary(rows,'beakerDiameter'),h=summary(rows,'beakerDepth');if(!d||!h)return null;return {ml:Math.PI*d.mean*d.mean*h.mean/4000,complete:d.unique===d.required&&h.unique===h.required};}
  return {instruments:instruments,samples:samples,config:config,reading:reading,dimension:dimension,move:move,mm:mm,format:format,trial:trial,validateNotebook:validateNotebook,summary:summary,beakerVolume:beakerVolume,own:own};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MeasurementModel;
