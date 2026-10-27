/* Original deterministic lamina bench, not a calibrated measurement apparatus.
   Polygon coordinates are cm; screw separations are integer 0.01 mm ticks.
   Each nominally uniform sheet has five fixed reading differences for rehearsal,
   not measured material variation or a statistical noise/uncertainty model.
   Area counting follows the full / more-than-half-square approximation. Counting
   an exactly half-covered square as 1/2 is this bench's explicit tie convention. */
var LaminaModel=(function(){
  'use strict';
  var config=Object.freeze({pitchMm:0.5,divisions:50,tickMm:0.01,maxTicks:500});
  var board=Object.freeze({widthCm:6,heightCm:5}),EPS=1e-10,gridCache=Object.create(null);
  var samples={
    copper:{name:'Irregular copper sheet',polygon:[[0.4,0.8],[2.2,0.3],[4.8,0.7],[5.5,2.1],[4.7,4.4],[2.8,4.1],[1.1,4.6],[0.3,2.7]],thicknessTicks:[51,52,51,50,51],positions:[{x:0.65,y:1.6,label:'Left edge'},{x:2.2,y:0.55,label:'Upper edge'},{x:4.4,y:0.9,label:'Upper-right edge'},{x:5.0,y:2.6,label:'Right edge'},{x:2.9,y:3.85,label:'Lower edge'}]},
    card:{name:'Irregular stiff card',polygon:[[0.6,0.5],[3.9,0.4],[5.4,1.4],[4.6,2.5],[5.1,4.3],[3.0,4.6],[1.9,3.3],[0.4,3.7],[0.9,2.1]],thicknessTicks:[83,84,82,83,83],positions:[{x:0.8,y:1.0,label:'Left edge'},{x:2.5,y:0.65,label:'Upper edge'},{x:4.8,y:1.4,label:'Upper-right edge'},{x:4.8,y:3.8,label:'Right edge'},{x:2.9,y:4.3,label:'Lower edge'}]}
  };
  Object.keys(samples).forEach(function(id){var s=samples[id];s.polygon.forEach(Object.freeze);s.positions.forEach(Object.freeze);Object.freeze(s.polygon);Object.freeze(s.positions);Object.freeze(s.thicknessTicks);Object.freeze(s);});Object.freeze(samples);
  function own(object,key){return object!==null&&typeof object==='object'&&typeof key==='string'&&Object.prototype.hasOwnProperty.call(object,key);}
  function integer(value,min,max){return Number.isInteger(value)&&value>=min&&value<=max;}
  function tick(value){return integer(value,0,config.maxTicks);}
  function zeroValid(value){return integer(value,-5,5);}
  function sample(id){if(!own(samples,id))throw new RangeError('Unknown lamina');return samples[id];}
  function validPolygon(polygon){
    if(!Array.isArray(polygon)||polygon.length<3||polygon.length>100)return false;
    for(var i=0;i<polygon.length;i++){var p=polygon[i];if(!own(polygon,String(i))||!Array.isArray(p)||p.length!==2||!own(p,'0')||!own(p,'1')||!p.every(function(n){return typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1000000;}))return false;}return true;
  }
  function polygonArea(polygon){
    if(!validPolygon(polygon))throw new RangeError('A finite polygon is required');
    var twice=0;for(var i=0;i<polygon.length;i++){var a=polygon[i],b=polygon[(i+1)%polygon.length];twice+=a[0]*b[1]-b[0]*a[1];}return Math.abs(twice)/2;
  }
  /* Sutherland-Hodgman clipping against the four closed cell half-planes. */
  function clippedArea(polygon,x,y,size){
    if(!validPolygon(polygon)||![x,y,size].every(function(n){return typeof n==='number'&&Number.isFinite(n);})||size<=0)throw new RangeError('Invalid clipping cell');
    var vertices=polygon.map(function(p){return p.slice();});
    [[0,x,1],[0,x+size,-1],[1,y,1],[1,y+size,-1]].forEach(function(edge){
      var next=[],axis=edge[0],limit=edge[1],sign=edge[2];
      for(var i=0;i<vertices.length;i++){
        var a=vertices[i],b=vertices[(i+1)%vertices.length],aIn=sign*(a[axis]-limit)>=0,bIn=sign*(b[axis]-limit)>=0;
        if(aIn!==bIn){var t=(limit-a[axis])/(b[axis]-a[axis]),intersection=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];intersection[axis]=limit;next.push(intersection);}
        if(bIn)next.push(b);
      }
      vertices=next;
    });
    return vertices.length<3?0:polygonArea(vertices);
  }
  function grid(id,step){
    var s=sample(id);if(step!==1&&step!==0.5&&step!==0.1)throw new RangeError('Grid spacing must be 1 cm, 0.5 cm or 0.1 cm');
    var cacheKey=id+':'+step;if(gridCache[cacheKey])return gridCache[cacheKey];
    var result={cells:[],step:step,full:0,majority:0,half:0,minority:0,boundary:0,empty:0};
    for(var row=0;row<board.heightCm/step;row++)for(var col=0;col<board.widthCm/step;col++){
      var fraction=Math.max(0,Math.min(1,clippedArea(s.polygon,col*step,row*step,step)/(step*step))),kind=fraction<EPS?'empty':fraction>1-EPS?'full':'boundary',part=null;
      if(kind==='boundary'){part=Math.abs(fraction-0.5)<=EPS?'half':fraction>0.5?'majority':'minority';result[part]++;}
      result[kind]++;result.cells.push({col:col,row:row,x:col*step,y:row*step,size:step,fraction:fraction,kind:kind,part:part});
    }
    result.estimateCm2=(result.full+result.majority+result.half/2)*step*step;
    result.lowerCm2=result.full*step*step;result.upperCm2=(result.full+result.boundary)*step*step;result.exactCm2=polygonArea(s.polygon);
    result.cells.forEach(Object.freeze);Object.freeze(result.cells);Object.freeze(result);gridCache[cacheKey]=result;return result;
  }
  function contact(id,position){var s=sample(id);if(!integer(position,0,s.thicknessTicks.length-1))throw new RangeError('Invalid lamina placement');return s.thicknessTicks[position];}
  function reading(opening,zero){
    if(!tick(opening)||!zeroValid(zero))throw new RangeError('Invalid screw setting');
    var rawTicks=opening+zero,turns=Math.floor(rawTicks/config.divisions);
    return {opening:opening,zero:zero,mainMm:turns*config.pitchMm,division:rawTicks-turns*config.divisions,rawTicks:rawTicks,correctedMm:opening/100,rawMm:rawTicks/100,zeroMm:zero/100};
  }
  function turn(current,requested,target){
    if(!tick(current)||typeof requested!=='number'||!Number.isFinite(requested)||!tick(target))throw new RangeError('Invalid screw movement');
    var rounded=Math.round(requested),next=Math.max(target,Math.min(config.maxTicks,rounded));return {opening:next,contact:next===target,limited:next!==rounded};
  }
  function checkedReading(id,zero,value){
    if(!value||!['position','opening','zero','mainMm','division'].every(function(k){return own(value,k);})||!integer(value.position,0,4)||value.zero!==zero||value.opening!==contact(id,value.position))return null;
    var r=reading(value.opening,zero);if(value.mainMm!==r.mainMm||value.division!==r.division)return null;
    return {position:value.position,opening:r.opening,zero:r.zero,mainMm:r.mainMm,division:r.division};
  }
  function summary(id,zero,readings,step,counts){
    if(!own(samples,id)||!zeroValid(zero)||!Array.isArray(readings)||readings.length!==5||(step!==1&&step!==0.5&&step!==0.1)||!counts)return null;
    var g=grid(id,step);if(!['full','majority','half','boundary'].every(function(k){return own(counts,k)&&integer(counts[k],0,g.cells.length)&&counts[k]===g[k];}))return null;
    var rows=[];for(var i=0;i<readings.length;i++){if(!own(readings,String(i)))return null;var r=checkedReading(id,zero,readings[i]);if(!r||rows.some(function(previous){return previous.position===r.position;}))return null;rows.push(r);}
    var mean=rows.reduce(function(sum,r){return sum+r.opening;},0)/rows.length/100,min=Math.min.apply(null,rows.map(function(r){return r.opening;}))/100,max=Math.max.apply(null,rows.map(function(r){return r.opening;}))/100;
    return {n:5,unique:5,meanMm:mean,resolutionMm:config.tickMm,rangeMm:max-min,areaCm2:g.estimateCm2,lowerCm2:g.lowerCm2,upperCm2:g.upperCm2,volumeCm3:g.estimateCm2*mean/10,volumeLowerCm3:g.lowerCm2*mean/10,volumeUpperCm3:g.upperCm2*mean/10};
  }
  function buildTrial(value){
    if(!value||!['sample','zero','step','counts','readings'].every(function(k){return own(value,k);}))return null;
    var result=summary(value.sample,value.zero,value.readings,value.step,value.counts);if(!result)return null;
    var trial={sample:value.sample,zero:value.zero,step:value.step,counts:{full:value.counts.full,majority:value.counts.majority,half:value.counts.half,boundary:value.counts.boundary},readings:value.readings.map(function(r){return checkedReading(value.sample,value.zero,r);}).sort(function(a,b){return a.position-b.position;})};
    Object.keys(result).forEach(function(k){trial[k]=result[k];});return trial;
  }
  function raw(value){
    var trial=buildTrial(value);if(!trial)return null;
    return {sample:trial.sample,zero:trial.zero,step:trial.step,counts:trial.counts,readings:trial.readings};
  }
  function validateNotebook(value){
    if(!value||!own(value,'v')||value.v!==1||!own(value,'trials')||!Array.isArray(value.trials))return {v:1,trials:[]};
    var trials=[],seen=Object.create(null);
    /* Bound validation work as well as retained rows; duplicates do not inflate coverage. */
    for(var i=value.trials.length-1;i>=Math.max(0,value.trials.length-200)&&trials.length<40;i--){
      if(!own(value.trials,String(i)))continue;var r=raw(value.trials[i]);if(!r)continue;var key=r.sample+':'+r.zero+':'+r.step;if(seen[key])continue;seen[key]=true;trials.unshift(r);
    }
    return {v:1,trials:trials};
  }
  function csv(rows){
    var headings='Specimen,Grid spacing (cm),Full squares,More-than-half squares,Exactly-half squares,Boundary squares,Placement,Main scale (mm),Circular division,Indicated reading (mm),Zero error (mm),Corrected thickness (mm),Mean thickness (mm),Estimated area (cm2),Area lower bound (cm2),Area upper bound (cm2),Estimated volume (cm3),Volume lower bound (cm3),Volume upper bound (cm3),Provenance';
    var lines=[headings];validateNotebook({v:1,trials:rows}).trials.map(buildTrial).forEach(function(t){t.readings.forEach(function(r){var scale=reading(r.opening,r.zero);lines.push([samples[t.sample].name,t.step,t.counts.full,t.counts.majority,t.counts.half,t.counts.boundary,r.position+1,r.mainMm.toFixed(2),r.division,scale.rawMm.toFixed(2),scale.zeroMm.toFixed(2),scale.correctedMm.toFixed(2),t.meanMm.toFixed(3),t.areaCm2.toFixed(3),t.lowerCm2.toFixed(3),t.upperCm2.toFixed(3),t.volumeCm3.toFixed(5),t.volumeLowerCm3.toFixed(5),t.volumeUpperCm3.toFixed(5),'Deterministic virtual rehearsal; bounds exclude thickness error'].join(','));});});return lines.join('\r\n');
  }
  return {config:config,board:board,samples:samples,own:own,polygonArea:polygonArea,clippedArea:clippedArea,grid:grid,contact:contact,reading:reading,turn:turn,summary:summary,buildTrial:buildTrial,raw:raw,validateNotebook:validateNotebook,csv:csv};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=LaminaModel;
