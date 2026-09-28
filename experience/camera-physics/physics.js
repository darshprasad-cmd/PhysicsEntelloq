/* Camera Physics: pure, independently testable scene/model boundary. Coordinates are
   normalised image coordinates (y down). Force values use SI. Pixels are never metres. */
var CameraPhysicsCore=(function(){
  'use strict';
  var profiles={book:'slab', 'cell phone':'slab', bottle:'cylinder', cup:'vessel', 'sports ball':'sphere', remote:'slab', laptop:'slab', bowl:'vessel', mouse:'rigid body', keyboard:'slab', scissors:'rigid body', apple:'rigid body', orange:'sphere', banana:'rigid body', backpack:'deformable body', handbag:'deformable body', suitcase:'rigid body'};
  function finite(x){return typeof x==='number'&&Number.isFinite(x);}
  function clamp(x,a,b){return Math.max(a,Math.min(b,x));}
  function box(b){if(!Array.isArray(b)||b.length!==4||!b.every(finite)||b[2]<=0||b[3]<=0)return null;var x=clamp(b[0],0,1),y=clamp(b[1],0,1),r=clamp(b[0]+b[2],0,1),d=clamp(b[1]+b[3],0,1);return r>x&&d>y?[x,y,r-x,d-y]:null;}
  function center(b){return {x:b[0]+b[2]/2,y:b[1]+b[3]/2};}
  function iou(a,b){var w=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0])),h=Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1])),v=w*h;return v/(a[2]*a[3]+b[2]*b[3]-v);}
  function association(b,hands){var best=null,distance=Infinity;(hands||[]).forEach(function(hand){(hand.landmarks||[]).forEach(function(p){if(!finite(p.x)||!finite(p.y))return;var dx=Math.max(b[0]-p.x,0,p.x-b[0]-b[2]),dy=Math.max(b[1]-p.y,0,p.y-b[1]-b[3]),d=Math.hypot(dx,dy);if(d<distance){distance=d;best={x:p.x,y:p.y};}});});return distance<.035?{point:best,source:'inferred',description:'Hand landmarks overlap or approach the object box in 2D; physical contact is not measured.'}:null;}
  function createTracker(){var tracks=[],next=1,last=-Infinity;return {
    reset:function(){tracks=[];last=-Infinity;},
    update:function(objects,hands,time){if(!finite(time)||time<last)return this.current(last);last=time;var used={};
      (objects||[]).filter(function(o){return o&&Object.prototype.hasOwnProperty.call(profiles,o.class)&&finite(o.score)&&o.score>=.55&&o.score<=1&&box(o.bbox);}).sort(function(a,b){return b.score-a.score;}).slice(0,8).forEach(function(o){var b=box(o.bbox),c=center(b),best=null,value=-1;
        tracks.forEach(function(t){if(used[t.id]||t.object_class!==o.class||time-t.seen>700)return;var tc=center(t.bbox),d=Math.hypot(c.x-tc.x,c.y-tc.y),overlap=iou(b,t.bbox),v=overlap-d;if((overlap>.1||d<.13)&&v>value){best=t;value=v;}});
        if(!best){best={id:next++,object_class:o.class,bbox:b.slice(),seen:time,count:0,nearCount:0};tracks.push(best);}
        var alpha=clamp(1-Math.exp(-Math.max(1,time-best.seen)/110),.15,1);best.bbox=best.bbox.map(function(x,i){return x+(b[i]-x)*alpha;});best.seen=time;best.count++;best.score=o.score;best.contact=association(b,hands);best.nearCount=best.contact?best.nearCount+1:0;used[best.id]=true;
      });tracks=tracks.filter(function(t){return time-t.seen<=700;});return this.current(time);},
    current:function(time){return tracks.filter(function(t){return finite(time)&&time-t.seen<=700;}).map(function(t){return {id:t.id,object_class:t.object_class,bbox:t.bbox.slice(),score:t.score,stable:t.count>=3,contact:t.nearCount>=2?t.contact:null,seen:t.seen,stale:time-t.seen>400};});}
  };}
  function profile(track){return {object_class:track.object_class,estimated_dimensions:null,estimated_mass:null,geometry:{hypothesis:profiles[track.object_class]||'rigid body',source:'class-based assumption'},contact_points:track.contact?[track.contact]:[],support_surface:null,orientation:null,possible_forces:[],confidence:{object_class:track.score,contact:null},assumptions:[]};}
  function interpret(track,options){if(!track)return null;options=options||{};var p=profile(track),mode=options.scenario||'auto',held=!!track.contact&&track.stable;
    if(['auto','held','table','push','string','incline'].indexOf(mode)<0)mode='auto';
    var scenario=mode==='auto'?(held?'held':'unknown'):mode,stationary=options.stationary===true,angle=finite(options.angle)?clamp(options.angle,0,75):25,a=angle*Math.PI/180,m=finite(options.mass)&&options.mass>0&&options.mass<=1000?options.mass:null;
    var assumptions=['Camera is upright and views a vertical plane; screen-down approximates gravity.','Equations use x right and y up; the incline axis is positive down-slope.','2D point-mass model: no depth, torque, segmentation or object orientation is measured.','Arrow lengths are symbolic, not measured force magnitudes.'];
    var facts=['Object detector: '+track.object_class+' ('+Math.round(track.score*100)+'% model score; not a calibrated probability).'];
    var inferences=[];if(track.contact)inferences.push(track.contact.description);
    if(scenario!=='unknown')assumptions.push(mode==='auto'?'Possible hand support inferred from persistent 2D proximity.':'Scenario selected by you, not identified by the camera.');
    if(stationary)assumptions.push('You assume translational equilibrium; still image position alone cannot establish it.');
    if(m!==null){p.estimated_mass={value:m,unit:'kg',source:'user-entered'};assumptions.push('Mass entered by you; g = 9.81 m/s² assumed near Earth.');}
    function force(id,label,x,y,kind,value){return {id:id,label:label,direction:{x:x,y:y},source:kind||'assumed',newtons:finite(value)?value:null};}
    var forces=[force('weight','mg',0,1,'assumed',m===null?null:m*9.81)],equations=[],title='Support not established';
    if(scenario==='held'){title=mode==='auto'?'Possible hand support':'Held object model';forces.push(force('hand','F hand',0,-1,'inferred',stationary&&m!==null?m*9.81:null));assumptions.push('Hand contact is represented by one upward resultant; its actual direction is unmeasured.');equations=[stationary?'F hand − mg = 0':'F hand,y − mg = m aᵧ'];}
    else if(scenario==='table'){title='Level support model';forces.push(force('normal','N',0,-1));assumptions.push('Level table, no other vertical forces.');equations=[stationary?'N − mg = 0':'N − mg = m aᵧ'];p.support_surface={type:'level',source:'user-selected'};}
    else if(scenario==='push'){title='Horizontal push model';forces.push(force('normal','N',0,-1),force('push','F push',1,0),force('friction','f ?',-1,0));assumptions.push('Level surface; push and tendency to slide are screen-right. Friction may be present; coefficient unknown.');equations=['F push − f = m aₓ','N − mg = 0'];if(stationary)equations.push('Assumed equilibrium: F push = f');p.support_surface={type:'level',source:'user-selected'};}
    else if(scenario==='string'){title='Vertical string model';forces.push(force('tension','T',0,-1));assumptions.push('Taut vertical string; its existence and direction are supplied by you.');equations=[stationary?'T − mg = 0':'T − mg = m aᵧ'];}
    else if(scenario==='incline'){title='Incline model · '+angle+'°';forces.push(force('normal','N',-Math.sin(a),-Math.cos(a)),force('friction','f ?',Math.cos(a),-Math.sin(a)));assumptions.push('Plane rises to the right at your chosen angle '+angle+'°.','No other forces. Friction, if present, opposes a down-slope tendency. Coefficient unknown.');equations=['N = mg cos θ',stationary?'mg sin θ − f = 0':'mg sin θ − f = m a∥'];if(stationary)equations.push('Requires μₛ ≥ tan θ; μₛ is unknown.');p.support_surface={type:'incline',angle:angle,source:'user-entered'};}
    else {equations=['ΣF = m a'];assumptions.push('Other contacts are unknown. Showing weight alone does not imply free fall.');}
    p.possible_forces=forces;p.assumptions=assumptions;return {profile:p,scenario:scenario,title:title,facts:facts,inferences:inferences,assumptions:assumptions,forces:forces,equations:equations,stationary:stationary};
  }
  function project(b,width,height,mirror){return {x:(mirror?1-b[0]-b[2]:b[0])*width,y:b[1]*height,w:b[2]*width,h:b[3]*height};}
  return {profiles:profiles,box:box,association:association,createTracker:createTracker,interpret:interpret,project:project};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CameraPhysicsCore;
