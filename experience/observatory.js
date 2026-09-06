/* Launch-only Newtonian preview. km, seconds, kg; no changes to application solvers.
   Earth reference GM rounded from JPL DE440; fixed radius 6371 + 600 km.
   Central mass can vary while radius stays fixed: an idealised thought experiment. */
var LaunchOrbitModel=(function(){
  var GM=398600.435507,R=6971,EARTH=6371;
  function describe(mass,speed){
    if(!Number.isFinite(mass)||mass<=0||!Number.isFinite(speed)||speed<=0)throw Error('Positive finite mass and speed required');
    var mu=GM*mass,vc=Math.sqrt(mu/R),q=speed/vc,e=q*q-1,energy=speed*speed/2-mu/R;
    var escape=energy>=-1e-9,perigee=q>=1?R:R*q*q/(2-q*q),hit=perigee<EARTH;
    return {mu:mu,circular:vc,escapeSpeed:Math.SQRT2*vc,ratio:q,signedEccentricity:e,eccentricity:Math.abs(e),energy:energy,perigee:perigee,
      kind:escape?'ESCAPE TRAJECTORY':hit?'EARTH-INTERSECTING PATH':Math.abs(e)<.005?'NEAR-CIRCULAR ORBIT':'ELLIPTICAL ORBIT',
      explanation:escape?'Enough energy to escape: the predicted path no longer closes.':hit?'The path meets the surface. More sideways speed is needed to keep falling around this planet.':Math.abs(e)<.005?'Gravity bends the path into an almost circular orbit.':'An elliptical orbit: speed changes around the path while total orbital energy stays constant.'};
  }
  return {describe:describe,radius:R,earthRadius:EARTH};
})();

var Observatory=(function(){
  function mount(root){
    var mast=root.querySelector('.obs-mast'),canvas=root.querySelector('#pe-orbit-canvas'),g=null;
    try{g=canvas.getContext('2d');}catch(e){}
    var mass=root.querySelector('#pe-mass'),speed=root.querySelector('#pe-velocity'),preset=root.querySelector('#pe-trajectory'),pause=root.querySelector('#pe-pause'),state=root.querySelector('#pe-orbit-state');
    var media=matchMedia('(prefers-reduced-motion: reduce)'),paused=media.matches||/still/.test(location.search),visible=true,stopped=false,raf=0,time=0,last=0,phase=.75;
    var picture=root.querySelector('.obs-backdrop img'),tiltX=0,tiltY=0,targetX=0,targetY=0,model;
    function read(){
      model=LaunchOrbitModel.describe(+mass.value,+speed.value);
      root.querySelector('#pe-mass-value').textContent=(5.9722*+mass.value).toFixed(2)+' × 10²⁴ kg';
      root.querySelector('#pe-velocity-value').textContent=(+speed.value).toFixed(2)+' km/s';
      mass.setAttribute('aria-valuetext',(+mass.value).toFixed(2)+' Earth masses');speed.setAttribute('aria-valuetext',(+speed.value).toFixed(2)+' kilometres per second');
      [mass,speed].forEach(function(input){input.style.backgroundSize=((+input.value- +input.min)/(+input.max- +input.min)*100).toFixed(2)+'% 2px,100% 2px';});
      state.textContent=model.kind;root.querySelector('#pe-orbit-insight').textContent=model.explanation;
      root.querySelector('#pe-model-speeds').textContent='Circular '+model.circular.toFixed(2)+' km/s · Escape '+model.escapeSpeed.toFixed(2)+' km/s';
    }
    function isRunning(){return !paused&&visible&&!document.hidden&&!stopped;}
    function sync(){
      var running=isRunning();root.dataset.scenePaused=String(!running);pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Play scene animation':'Pause scene animation');pause.innerHTML=(paused?'▷':'Ⅱ')+' <span>'+(paused?'Play scene':'Pause scene')+'</span>';
      if(!running){cancelAnimationFrame(raf);raf=0;last=0;}else if(!raf)raf=requestAnimationFrame(tick);
    }
    function draw(){
      if(stopped||!g)return;
      var bounds=canvas.getBoundingClientRect(),w=bounds.width,h=bounds.height,dpr=Math.min(devicePixelRatio||1,1.5);if(w<2||h<2)return;
      if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);g.setTransform(dpr,0,0,dpr,0,0);}
      g.clearRect(0,0,w,h);g.save();
      var narrow=w<700,cx=w*(narrow?.56:.666),cy=narrow?h*.35:h*.32,R=narrow?w*.42:w*.25,flatten=.49,angle=-.23;
      // The wide scene is illustrative; only the analytic trajectory responds to inputs.
      if(!narrow){g.beginPath();g.rect(w*.39,0,w*.61,h);g.clip();}
      function project(a){var den=1+model.signedEccentricity*Math.cos(a),r=model.ratio*model.ratio/den;return {x:cx+R*r*(Math.cos(a)*Math.cos(angle)-Math.sin(a)*flatten*Math.sin(angle)),y:cy+R*r*(Math.cos(a)*Math.sin(angle)+Math.sin(a)*flatten*Math.cos(angle)),r:r};}
      var e=model.signedEccentricity,limit=e>=1?Math.acos(-1/e)-.025:Math.PI;
      g.lineWidth=1;g.strokeStyle='rgba(144,189,253,.48)';g.beginPath();var started=false;
      for(var i=0;i<=260;i++){var a=-limit+2*limit*i/260,p=project(a);if(p.r<=0||p.r>5){started=false;continue;}if(!started){g.moveTo(p.x,p.y);started=true;}else g.lineTo(p.x,p.y);}g.stroke();
      var theta=e>=1?Math.min(phase,limit-.035):phase,p=project(theta);
      if(p.r>0&&p.r<5){g.beginPath();g.strokeStyle='rgba(162,204,255,.82)';g.lineWidth=1.7;for(var k=0;k<=26;k++){var trail=project(theta-.25+k*.25/26);k?g.lineTo(trail.x,trail.y):g.moveTo(trail.x,trail.y);}g.stroke();
        // A shaded, cratered marker echoes the supplied moon; its size is decorative.
        var mr=narrow?10:22,light=g.createRadialGradient(p.x-mr*.65,p.y-mr*.5,0,p.x-mr*.35,p.y-mr*.25,mr*1.5);light.addColorStop(0,'#c4d0db');light.addColorStop(.3,'#788897');light.addColorStop(.63,'#273540');light.addColorStop(1,'#01060b');
        g.shadowColor='#80b6ff';g.shadowBlur=12;g.fillStyle=light;g.beginPath();g.arc(p.x,p.y,mr,0,Math.PI*2);g.fill();g.shadowBlur=0;g.save();g.clip();
        for(var c=0;c<17;c++){var ca=c*2.399,cr=mr*Math.sqrt((c+.5)/17)*.9;g.fillStyle=c%3?'rgba(0,5,12,.16)':'rgba(208,225,239,.1)';g.beginPath();g.ellipse(p.x+Math.cos(ca)*cr,p.y+Math.sin(ca)*cr,mr*(.07+(c%4)*.03),mr*(.06+(c%3)*.025),ca,0,Math.PI*2);g.fill();}g.restore();
      }
      for(var j=0;j<22;j++){var x=w*(.46+(j*137.51%541)/1000),y=h*(.04+(j*j*31.1%361)/1000);g.fillStyle='rgba(187,211,245,'+(.14+.32*(1+Math.sin(time*.65+j))*.5)+')';g.fillRect(x,y,j%5?1:2,j%5?1:2);}
      g.restore();
    }
    function tick(now){raf=0;if(!isRunning())return;var dt=last?Math.min(.04,(now-last)/1000):0;last=now;time+=dt;
      var r=model.ratio*model.ratio/(1+model.signedEccentricity*Math.cos(phase));phase+=dt*.32*model.ratio/Math.max(.1,r*r);if(model.signedEccentricity<1&&phase>Math.PI*2)phase-=Math.PI*2;
      if(model.signedEccentricity>=1)phase=Math.min(phase,Math.acos(-1/model.signedEccentricity)-.06);
      tiltX+=(targetX-tiltX)*.035;tiltY+=(targetY-tiltY)*.035;picture.style.transform='translate3d('+tiltX.toFixed(2)+'px,'+tiltY.toFixed(2)+'px,0) scale(1.025)';
      draw();raf=requestAnimationFrame(tick);
    }
    function update(){phase=.4;preset.value='custom';read();draw();}
    mass.addEventListener('input',update);speed.addEventListener('input',update);
    preset.addEventListener('change',function(){if(preset.value==='custom')return;var vc=LaunchOrbitModel.describe(+mass.value,+speed.value).circular;speed.value=(vc*(preset.value==='circular'?1:preset.value==='elliptical'?1.15:1.45)).toFixed(2);phase=.4;read();draw();});
    pause.addEventListener('click',function(){paused=!paused;sync();});
    function motionPreference(){if(media.matches){paused=true;targetX=targetY=tiltX=tiltY=0;picture.style.transform='none';sync();draw();}}
    function pointer(e){if(media.matches||paused)return;var b=mast.getBoundingClientRect();targetX=((e.clientX-b.left)/b.width-.5)*-10;targetY=((e.clientY-b.top)/b.height-.5)*-6;}
    function leave(){targetX=targetY=0;}
    mast.addEventListener('pointermove',pointer);mast.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',sync);media.addEventListener('change',motionPreference);
    var resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(draw):null;if(resize)resize.observe(canvas);
    var observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(function(entries){visible=entries[0].isIntersecting;sync();},{threshold:0}):null;if(observer)observer.observe(mast);
    if(!g){canvas.hidden=true;root.querySelector('#pe-orbit-insight').setAttribute('data-static','true');}
    read();draw();sync();
    return function(){stopped=true;cancelAnimationFrame(raf);if(resize)resize.disconnect();if(observer)observer.disconnect();document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',motionPreference);mast.removeEventListener('pointermove',pointer);mast.removeEventListener('pointerleave',leave);};
  }
  return {mount:mount};
})();
