/* Cradle scientific model. Boundary: sandbox coordinates in cm, velocities in cm/s;
   masses in kg. All constraint calculations use metres, seconds and kg.
   XPBD distance constraints, tension only; alpha = rest length / EA.
   Reference: Macklin, Muller & Chentanez (2016), https://mmacklin.com/xpbd.pdf
   Planar string, lumped mass, linear axial elasticity, viscous damping.
   Crossings are projections, not knots; no self-contact or material failure. */
var CradlePhysics=(function(){
  'use strict';
  var SCALE=0.01;
  function advance(bodies,links,params,dt,accelerations){
    if(!Number.isFinite(dt)||dt<=0||dt>1/30) throw new Error('Cradle time step out of range');
    var EA=Math.max(5,Math.min(500,Number(params.EA)||80));
    var damping=Math.max(0,Math.min(8,Number(params.damping)||0));
    var iterations=Math.max(8,Math.min(64,params.iterations||32));
    var state=bodies.map(function(b,i){
      var a=accelerations?accelerations[i]:[0,(params.gravity==null?9.81:params.gravity)/SCALE];
      var x=b.x*SCALE,y=b.y*SCALE,decay=Math.exp(-damping*dt);
      var vx=b.fixed?0:b.vx*SCALE*decay+a[0]*SCALE*dt;
      var vy=b.fixed?0:b.vy*SCALE*decay+a[1]*SCALE*dt;
      return {x:x+vx*dt,y:y+vy*dt,ox:x,oy:y,w:b.fixed?0:1/Math.max(0.0001,b.m)};
    });
    links.forEach(function(c){c.lambda=0;});
    for(var it=0;it<iterations;it++){
      for(var jj=0;jj<links.length;jj++){
        var c=links[it%2?links.length-1-jj:jj],a=state[c.a],b=state[c.b];
        if(!a||!b)continue;
        var dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),rest=c.L*SCALE;
        if(len<1e-10||rest<=0)continue;
        var alpha=rest/EA/(dt*dt),C=len-rest;
        var dl=(-C-alpha*c.lambda)/(a.w+b.w+alpha);
        var next=Math.min(0,c.lambda+dl); dl=next-c.lambda;c.lambda=next;
        a.x-=a.w*dl*dx/len;a.y-=a.w*dl*dy/len;
        b.x+=b.w*dl*dx/len;b.y+=b.w*dl*dy/len;
      }
    }
    bodies.forEach(function(b,i){var s=state[i];
      if(!b.fixed){b.vx=(s.x-s.ox)/dt/SCALE;b.vy=(s.y-s.oy)/dt/SCALE;b.x=s.x/SCALE;b.y=s.y/SCALE;}
      else b.vx=b.vy=0;
    });
    links.forEach(function(c){c.tension=Math.max(0,-c.lambda/(dt*dt));});
  }
  function measure(bodies,links,EA){
    var elastic=0,kinetic=0,max=0,sum=0,maxStrain=0,mass=0,forces=bodies.map(function(){return {x:0,y:0};});
    links.forEach(function(c){var a=bodies[c.a],b=bodies[c.b];if(!a||!b)return;
      var dx=(b.x-a.x)*SCALE,dy=(b.y-a.y)*SCALE,L=Math.hypot(dx,dy)||1e-10,rest=c.L*SCALE;
      var strain=Math.max(0,(L-rest)/rest),T=EA*strain;
      elastic+=0.5*EA*rest*strain*strain;max=Math.max(max,T);sum+=T;maxStrain=Math.max(maxStrain,strain);
      forces[c.a].x+=T*dx/L;forces[c.a].y+=T*dy/L;forces[c.b].x-=T*dx/L;forces[c.b].y-=T*dy/L;
    });
    bodies.forEach(function(b){if(!b.fixed){mass+=b.m;kinetic+=0.5*b.m*SCALE*SCALE*(b.vx*b.vx+b.vy*b.vy);}});
    return {peakN:max,meanN:links.length?sum/links.length:0,elasticJ:elastic,kineticJ:kinetic,strain:maxStrain,movingMassKg:mass,forces:forces};
  }
  return {advance:advance,measure:measure,scale:SCALE};
})();
