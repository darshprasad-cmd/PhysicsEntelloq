/* Original ideal first-class lever rehearsal; not a calibrated apparatus.
 * Positions and perpendicular moment arms are cm; forces are N; moments are N m.
 * The horizontal beam has a frictionless pivot at 50 cm. Its weight is ignored
 * (equivalently centred at the pivot). Load and effort act vertically downward
 * on opposite sides. There is no motion, energy-loss or real-meter simulation.
 * A force meter has a chosen additive zero offset and 0.01 N display increments.
 * The nearest representable effort is accepted as a resolution-limited balance;
 * the residual torque is retained rather than falsely asserting exact equality.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PeqLeverModel=api;
})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const constants=Object.freeze({
    PIVOT_CM:50,LOADS_N:Object.freeze([2,4,6]),LOAD_POSITIONS_CM:Object.freeze([20,30,40]),
    EFFORT_POSITIONS_CM:Object.freeze([60,70,80,90]),ZERO_OFFSETS_N:Object.freeze([-.2,0,.2]),
    EFFORT_STEP_N:.01,MAX_EFFORT_N:20,MAX_TRIALS:40,MAX_INSPECTED_TRIALS:200,
    PROVENANCE:'ideal_lever_rehearsal'
  });
  const limits=Object.freeze([
    'Horizontal ideal first-class lever: frictionless pivot, vertical forces, a weightless beam or beam weight acting through its pivot, and no dynamic motion.',
    'Moment arms are perpendicular distances from the pivot to each vertical line of action, not the distance between load and effort. Convert centimetres to metres for moments in N m.',
    'Force settings and indications use 0.01 N increments. Balance means the nearest representable ideal effort; a small residual moment can remain. This is a teaching acceptance band, not physical stability or measured precision.',
    'Zero offset is a selected additive teaching error. Tare represents an unloaded zero check and subtraction; it is not a calibrated real spring balance, a measured random error or proof of handling skill.',
    'Mechanical advantage from readings is load divided by the applied balanced effort. It can differ slightly from the ideal arm ratio because the effort is rounded to the available increment.',
    'One checked configuration is one model trial. Repeating the same load and positions replaces it; no additional independent experiment, uncertainty estimate, mastery or supervised-practical completion is inferred.'
  ]);
  const settingsKeys=['loadN','loadCm','effortCm','effortN','zeroN','tared','attached'];
  function dataProperties(value,allowed,required=allowed){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    try{
      const keys=Reflect.ownKeys(value);
      if(keys.some(key=>typeof key!=='string'||!allowed.includes(key))||required.some(key=>!keys.includes(key)))return null;
      const copy={};for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.prototype.hasOwnProperty.call(d,'value'))return null;copy[key]=d.value;}return copy;
    }catch(_){return null;}
  }
  const finite=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
  const round2=value=>{const result=Math.round((value+Number.EPSILON)*100)/100;return result===0?0:result;};
  const hundredth=value=>Math.abs(value*100-Math.round(value*100))<1e-8;
  function defaults(){return {loadN:4,loadCm:30,effortCm:80,effortN:0,zeroN:.2,tared:false,attached:false};}
  function validSettings(input){
    const s=dataProperties(input,settingsKeys);
    if(!s||!constants.LOADS_N.includes(s.loadN)||!constants.LOAD_POSITIONS_CM.includes(s.loadCm)||!constants.EFFORT_POSITIONS_CM.includes(s.effortCm)||!constants.ZERO_OFFSETS_N.includes(s.zeroN)||!finite(s.effortN,0,20)||!hundredth(s.effortN)||typeof s.tared!=='boolean'||typeof s.attached!=='boolean')return null;
    return {...s,effortN:round2(s.effortN),zeroN:s.zeroN===0?0:s.zeroN};
  }
  function experiment(input){
    const s=validSettings(input);if(!s)return null;
    const loadArmCm=50-s.loadCm,effortArmCm=s.effortCm-50,idealEffortN=s.loadN*loadArmCm/effortArmCm;
    const roundedEffortN=round2(idealEffortN),physicalEffortN=s.attached?s.effortN:0,zeroErrorN=s.tared?0:s.zeroN;
    const loadMomentNm=s.loadN*loadArmCm/100,effortMomentNm=physicalEffortN*effortArmCm/100,residualMomentNm=effortMomentNm-loadMomentNm;
    const balanced=s.attached&&Math.abs(s.effortN-roundedEffortN)<.005;
    return {loadArmCm,effortArmCm,idealEffortN,roundedEffortN,idealMA:effortArmCm/loadArmCm,
      actualMA:balanced?s.loadN/s.effortN:null,readingN:round2(physicalEffortN+zeroErrorN),zeroErrorN,correctedReadingN:physicalEffortN,
      loadMomentNm,effortMomentNm,residualMomentNm,balanced,direction:balanced?0:residualMomentNm>0?1:-1,correctable:true};
  }
  function identity(s){return [s.loadN,s.loadCm,s.effortCm].join(':');}
  function check(input,answers){
    const s=validSettings(input);
    if(!s)return {ok:false,errors:['Choose valid load, positions, zero error and a force setting on the 0.01 N grid.'],record:null};
    const exp=experiment(s),values=dataProperties(answers,['loadN','effortN','ma']),errors=[];
    if(!s.tared)errors.push('Detach the meter, check its unloaded zero and tare before taking a reading. A chosen zero offset must not be treated as useful force.');
    if(!s.attached)errors.push('Attach the tared force meter to apply the selected effort. A detached meter reads only its zero offset and exerts no effort on the beam.');
    if(!exp.balanced)errors.push('Adjust the applied effort to the nearest 0.01 N balance setting before recording. Compare load × load arm with effort × effort arm.');
    const usable=values&&finite(values.loadN,0,20)&&finite(values.effortN,0,20)&&finite(values.ma,0,100)&&hundredth(values.loadN)&&hundredth(values.effortN)&&hundredth(values.ma);
    if(!usable)errors.push('Enter all three answers as finite numbers: load and effort in N, and mechanical advantage without units. Use the displayed force and round mechanical advantage to two decimal places; blanks and numeric strings are not accepted.');
    else{
      if(Math.abs(values.loadN-s.loadN)>1e-8)errors.push('Record the selected load in newtons, not its mass or the load-arm distance.');
      if(Math.abs(values.effortN-exp.readingN)>1e-8)errors.push('Read the indicated, tared force meter in newtons to 0.01 N; do not enter the unrounded theoretical effort.');
      if(exp.balanced&&Math.abs(values.ma-round2(s.loadN/s.effortN))>1e-8)errors.push('Mechanical advantage from these readings is load ÷ measured effort. Use the actual 0.01 N effort setting and round the ratio to two decimals; the ideal arm ratio may differ slightly.');
    }
    if(errors.length)return {ok:false,errors,record:null};
    return {ok:true,errors:[],record:{id:identity(s),settings:s,readings:{loadN:s.loadN,effortN:round2(values.effortN),ma:round2(values.ma)},provenance:constants.PROVENANCE}};
  }
  function validateRecord(input){
    const value=dataProperties(input,['id','settings','readings','provenance'],['settings','readings']);
    if(!value)return null;
    // Identity and provenance are reconstructed from validated numerical state,
    // never accepted from stored text. No computed answer object is trusted.
    return check(value.settings,value.readings).record;
  }
  function validateNotebook(input){
    const value=dataProperties(input,['v','trials']);
    if(!value||value.v!==1||!Array.isArray(value.trials))return {v:1,trials:[]};
    const seen=new Set(),trials=[];
    for(let i=value.trials.length-1;i>=Math.max(0,value.trials.length-constants.MAX_INSPECTED_TRIALS)&&trials.length<constants.MAX_TRIALS;i--){
      const descriptor=Object.getOwnPropertyDescriptor(value.trials,String(i));
      if(!descriptor||!Object.prototype.hasOwnProperty.call(descriptor,'value'))continue;
      const row=validateRecord(descriptor.value);if(!row||seen.has(row.id))continue;seen.add(row.id);trials.unshift(row);
    }
    return {v:1,trials};
  }
  function upsert(notebook,input){
    const book=validateNotebook(notebook),record=validateRecord(input);
    if(!record)return book;
    return {v:1,trials:[...book.trials.filter(row=>row.id!==record.id),record].slice(-constants.MAX_TRIALS)};
  }
  function summary(notebook){
    const groups=new Map();
    for(const row of validateNotebook(notebook).trials){
      const s=row.settings,key=s.loadN+':'+s.loadCm;
      if(!groups.has(key))groups.set(key,{loadN:s.loadN,loadCm:s.loadCm,loadArmCm:50-s.loadCm,points:[]});
      groups.get(key).points.push({effortCm:s.effortCm,effortArmCm:s.effortCm-50,effortN:row.readings.effortN,ma:row.readings.ma});
    }
    return [...groups.values()].map(group=>({...group,points:group.points.sort((a,b)=>a.effortCm-b.effortCm),count:group.points.length,comparisonReady:group.points.length>=3,
      limitation:'Compare different effort arms while holding this load and load arm fixed. These deterministic configurations are not independent repeats; no average across changed configurations or experimental uncertainty is calculated.'}));
  }
  function csv(notebook){
    const lines=['load_N,load_position_cm,effort_position_cm,load_arm_cm,effort_arm_cm,applied_effort_N,indicated_effort_N,selected_zero_error_N,tared,mechanical_advantage_from_readings,load_moment_Nm,effort_moment_Nm,residual_moment_Nm,provenance'];
    for(const row of validateNotebook(notebook).trials){
      const s=row.settings,e=experiment(s);
      lines.push([s.loadN,s.loadCm,s.effortCm,e.loadArmCm,e.effortArmCm,s.effortN.toFixed(2),row.readings.effortN.toFixed(2),s.zeroN.toFixed(2),1,row.readings.ma.toFixed(2),e.loadMomentNm.toFixed(4),e.effortMomentNm.toFixed(4),e.residualMomentNm.toFixed(4),constants.PROVENANCE].join(','));
    }
    return lines.join('\r\n')+'\r\n';
  }
  return Object.freeze({constants,limits,defaults,validSettings,experiment,check,validateRecord,validateNotebook,upsert,summary,csv});
});
