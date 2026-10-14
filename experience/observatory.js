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
    var mast=root.querySelector('.obs-mast'),canvas=root.querySelector('#pe-orbit-canvas'),hero=root.querySelector('#pe-cinematic-canvas'),wave=root.querySelector('#ro-wave');
    function context(c){try{return c.getContext('2d');}catch(e){return null;}}
    var resolved=root.querySelector('#ro-resolved-orbit'),rg=context(resolved),opening=root.querySelector('.ro-opening'),resolution=root.querySelector('.ro-resolution'),heroCopy=root.querySelector('.obs-copy');
    var g=context(canvas),hg=context(hero),wg=context(wave),mass=root.querySelector('#pe-mass'),speed=root.querySelector('#pe-velocity'),preset=root.querySelector('#pe-trajectory'),pause=root.querySelector('#pe-pause'),state=root.querySelector('#pe-orbit-state');
    var media=matchMedia('(prefers-reduced-motion: reduce)'),paused=media.matches||/still/.test(location.search),visible=true,stopped=false,raf=0,time=0,last=0,painted=0,phase=.65,scrollProgress=0,model;
    var picture=root.querySelector('.obs-backdrop img'),backdrop=root.querySelector('.obs-backdrop'),video=root.querySelector('.ro-film video'),videoVisible=false,videoUserPaused=false,videoLoaded=false,programmaticPause=false;
    var scenes=[{node:mast,type:'hero',visible:true},{node:canvas.parentElement,type:'orbit',visible:false},{node:wave.parentElement,type:'wave',visible:false}];
    root.querySelector('.obs-continuum').style.backgroundImage='url("'+picture.src+'")';
    function read(){
      model=LaunchOrbitModel.describe(+mass.value,+speed.value);
      root.querySelector('#pe-mass-value').textContent=(5.9722*+mass.value).toFixed(2)+' × 10²⁴ kg';
      root.querySelector('#pe-velocity-value').textContent=(+speed.value).toFixed(2)+' km/s';
      mass.setAttribute('aria-valuetext',(+mass.value).toFixed(2)+' Earth masses');speed.setAttribute('aria-valuetext',(+speed.value).toFixed(2)+' kilometres per second');
      [mass,speed].forEach(function(input){input.style.backgroundSize=((+input.value- +input.min)/(+input.max- +input.min)*100).toFixed(2)+'% 2px,100% 2px';});
      state.textContent=model.kind;root.querySelector('#pe-orbit-insight').textContent=model.explanation;
      root.querySelector('#pe-model-speeds').textContent='Circular '+model.circular.toFixed(2)+' km/s · Escape '+model.escapeSpeed.toFixed(2)+' km/s';
    }
    function fit(c,ctx){var b=c.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,b.width<600?1:1.5),w=b.width,h=b.height;if(w<2||h<2)return null;if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}ctx.clearRect(0,0,w,h);return{w:w,h:h};}
    function sphere(ctx,x,y,r){var grad=ctx.createRadialGradient(x-r*.6,y-r*.55,0,x-r*.25,y-r*.12,r*1.3);grad.addColorStop(0,'#7790a0');grad.addColorStop(.35,'#304652');grad.addColorStop(.7,'#0b1820');grad.addColorStop(1,'#03080b');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#91c9ee77';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,r,-2.8,-.5);ctx.stroke();}
    function drawHero(){if(!hg)return;var s=fit(hero,hg);if(!s)return;var w=s.w,h=s.h,mobile=w<541,cx=w*(mobile?.5:.715),cy=h*(mobile?.65:.49),r=mobile?w*.42:Math.min(w*.24,h*.46),scale=1+scrollProgress*.16,angle=-.30+Math.sin(time*.15)*.12,flatten=.45+.075*Math.sin(time*.18);r*=scale;
      function project(a,rad){return{x:cx+rad*(Math.cos(a)*Math.cos(angle)-Math.sin(a)*flatten*Math.sin(angle)),y:cy+rad*(Math.cos(a)*Math.sin(angle)+Math.sin(a)*flatten*Math.cos(angle))};}
      hg.save();hg.lineWidth=1;hg.strokeStyle='#91c9ee42';hg.beginPath();for(var i=0;i<=180;i++){var p=project(i/180*Math.PI*2,r*1.38);i?hg.lineTo(p.x,p.y):hg.moveTo(p.x,p.y);}hg.stroke();
      for(var ring=0;ring<2;ring++){hg.beginPath();hg.strokeStyle=ring?'#91c9ee28':'#c1e3f8a8';hg.lineWidth=ring?1:1.4;var start=time*.22+ring*2.5;for(var j=0;j<=60;j++){var p2=project(start+j/60*1.0,r*(1.38+ring*.035));j?hg.lineTo(p2.x,p2.y):hg.moveTo(p2.x,p2.y);}hg.stroke();}
      var body=project(time*.22+.7,r*1.38);hg.shadowBlur=18;hg.shadowColor='#81bfe8';sphere(hg,body.x,body.y,mobile?7:12);hg.shadowBlur=0;
      // Aperture guide ticks belong to the optical frame, not to physical measurement.
      for(var k=0;k<36;k++){var a=k/36*Math.PI*2,p3=project(a,r*1.45),p4=project(a,r*(k%3?1.46:1.48));hg.strokeStyle=k%3?'#a8cee526':'#a8cee55e';hg.beginPath();hg.moveTo(p3.x,p3.y);hg.lineTo(p4.x,p4.y);hg.stroke();}hg.restore();
    }
    function drawOrbit(target,targetG){var c=target||canvas,ctx=targetG||g;if(!ctx)return;var s=fit(c,ctx);if(!s)return;var w=s.w,h=s.h,cx=w*.5,cy=h*.51,R=Math.min(w*.29,h*.31),flatten=.76,angle=-.2;
      function project(a){var den=1+model.signedEccentricity*Math.cos(a),rr=model.ratio*model.ratio/den;return{x:cx+R*rr*(Math.cos(a)*Math.cos(angle)-Math.sin(a)*flatten*Math.sin(angle)),y:cy+R*rr*(Math.cos(a)*Math.sin(angle)+Math.sin(a)*flatten*Math.cos(angle)),r:rr};}
      var e=model.signedEccentricity,limit=e>=1?Math.acos(-1/e)-.035:Math.PI;ctx.save();ctx.strokeStyle='#91c9ee77';ctx.lineWidth=1.2;ctx.beginPath();var start=false;for(var i=0;i<=300;i++){var p=project(-limit+2*limit*i/300);if(p.r<=0||p.r>8){start=false;continue;}if(!start){ctx.moveTo(p.x,p.y);start=true;}else ctx.lineTo(p.x,p.y);}ctx.stroke();
      sphere(ctx,cx,cy,R*.5);var halo=ctx.createRadialGradient(cx,cy,R*.49,cx,cy,R*.59);halo.addColorStop(0,'#91c9ee18');halo.addColorStop(1,'#91c9ee00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(cx,cy,R*.59,0,Math.PI*2);ctx.fill();
      var theta=e>=1?Math.min(phase,limit-.04):phase,p=project(theta);if(p.r>0&&p.r<8){ctx.beginPath();ctx.lineWidth=2;ctx.strokeStyle='#d3ecfc';for(var k=0;k<=30;k++){var t=project(theta-.35+k*.35/30);k?ctx.lineTo(t.x,t.y):ctx.moveTo(t.x,t.y);}ctx.stroke();sphere(ctx,p.x,p.y,6);
        var next=project(theta+.005),dx=next.x-p.x,dy=next.y-p.y,n=Math.sqrt(dx*dx+dy*dy)||1;dx=dx/n*42;dy=dy/n*42;ctx.beginPath();ctx.strokeStyle='#c5dfef';ctx.lineWidth=1;ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+dx,p.y+dy);ctx.stroke();var an=Math.atan2(dy,dx);ctx.beginPath();ctx.moveTo(p.x+dx,p.y+dy);ctx.lineTo(p.x+dx-7*Math.cos(an-.5),p.y+dy-7*Math.sin(an-.5));ctx.moveTo(p.x+dx,p.y+dy);ctx.lineTo(p.x+dx-7*Math.cos(an+.5),p.y+dy-7*Math.sin(an+.5));ctx.stroke();
      }ctx.restore();
    }
    function drawWave(){if(!wg)return;var s=fit(wave,wg);if(!s)return;var w=s.w,h=s.h,cy=h*.5,amp=h*.27;wg.strokeStyle='#d2e7f329';wg.lineWidth=1;wg.beginPath();wg.moveTo(0,cy);wg.lineTo(w,cy);wg.stroke();function y(x){return cy+amp*Math.sin(x/w*Math.PI*3.7-time*1.4);}wg.beginPath();wg.strokeStyle='#91c9ee';wg.lineWidth=2;for(var x=0;x<=w;x+=2)x?wg.lineTo(x,y(x)):wg.moveTo(x,y(x));wg.stroke();var px=w*.35;wg.setLineDash([3,5]);wg.strokeStyle='#d4eaf344';wg.beginPath();wg.moveTo(px,cy-amp-15);wg.lineTo(px,cy+amp+15);wg.stroke();wg.setLineDash([]);wg.fillStyle='#f4f1e9';wg.beginPath();wg.arc(px,y(px),6,0,Math.PI*2);wg.fill();for(var dot=0;dot<35;dot++){var xx=dot/34*w;wg.fillStyle='#aacde37a';wg.beginPath();wg.arc(xx,y(xx),2,0,Math.PI*2);wg.fill();}}
    function draw(){drawHero();drawOrbit();drawWave();if(rg)drawOrbit(resolved,rg);}
    function isRunning(){return !paused&&visible&&!document.hidden&&!stopped;}
    function syncVideo(){if(!video)return;var should=videoVisible&&!paused&&!document.hidden&&!videoUserPaused;if(should){if(!videoLoaded){var source=video.querySelector('source');source.src=source.dataset.src;videoLoaded=true;video.load();}video.play().catch(function(){videoUserPaused=true;});}else if(!video.paused){programmaticPause=true;video.pause();}}
    function sync(){var running=isRunning();root.dataset.scenePaused=String(!running);root.dataset.manualPause=String(paused);if(paused){heroCopy.inert=false;resolution.setAttribute('aria-hidden','true');resolution.querySelector('a').tabIndex=-1;}pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Play scene animation':'Pause scene animation');pause.innerHTML=(paused?'▷':'Ⅱ')+' <span>'+(paused?'Play motion':'Pause motion')+'</span>';if(!running){cancelAnimationFrame(raf);raf=0;last=0;}else if(!raf)raf=requestAnimationFrame(tick);syncVideo();}
    function tick(now){raf=0;if(!isRunning())return;var dt=last?Math.min(.06,(now-last)/1000):0;last=now;time+=dt;
      if(now-painted>=32){painted=now;var r=model.ratio*model.ratio/(1+model.signedEccentricity*Math.cos(phase));phase+=dt*.45*model.ratio/Math.max(.15,r*r);if(model.signedEccentricity<1&&phase>Math.PI*2)phase-=Math.PI*2;if(model.signedEccentricity>=1)phase=Math.min(phase,Math.acos(-1/model.signedEccentricity)-.06);
        scenes.forEach(function(s){if(!s.visible)return;if(s.type==='hero'){var bob=Math.sin(time*.22)*3;backdrop.style.transform='translate3d('+(-scrollProgress*mast.clientWidth*.20).toFixed(1)+'px,'+(-scrollProgress*60+bob).toFixed(2)+'px,0) scale('+(1+scrollProgress*1.65).toFixed(3)+') rotate('+(-scrollProgress*8).toFixed(2)+'deg)';drawHero();if(scrollProgress>.45&&rg)drawOrbit(resolved,rg);}else if(s.type==='orbit')drawOrbit();else drawWave();});
      }raf=requestAnimationFrame(tick);
    }
    function update(){phase=.4;preset.value='custom';read();drawOrbit();}
    mass.addEventListener('input',update);speed.addEventListener('input',update);
    preset.addEventListener('change',function(){if(preset.value==='custom')return;var vc=LaunchOrbitModel.describe(+mass.value,+speed.value).circular;speed.value=(vc*(preset.value==='circular'?1:preset.value==='elliptical'?1.15:1.45)).toFixed(2);phase=.4;read();drawOrbit();});
    pause.addEventListener('click',function(){paused=!paused;sync();if(paused){backdrop.style.transform='none';draw();}});
    function motionPreference(){if(media.matches){paused=true;backdrop.style.transform='none';sync();draw();}}
    function scroll(){if(media.matches||paused||innerWidth<=800){scrollProgress=0;return;}scrollProgress=Math.max(0,Math.min(1,root.scrollTop/Math.max(1,opening.clientHeight-mast.clientHeight)));var fade=Math.max(0,Math.min(1,(scrollProgress-.20)/.30)),resolve=Math.max(0,Math.min(1,(scrollProgress-.48)/.27));heroCopy.style.opacity=String(1-fade);heroCopy.style.transform='translateY('+(-fade*65)+'px)';heroCopy.inert=fade>.99;backdrop.style.opacity=String(1-resolve);hero.style.opacity=String(1-resolve);root.querySelector('.ro-object-label').style.opacity=String(1-fade);resolution.style.opacity=String(resolve);resolution.style.pointerEvents=resolve>.9?'auto':'none';resolution.setAttribute('aria-hidden',String(resolve<.9));resolution.querySelector('a').tabIndex=resolve>.9?0:-1;}
    function videoPause(){if(programmaticPause){programmaticPause=false;return;}videoUserPaused=true;}
    function videoPlay(){videoUserPaused=false;}
    video.addEventListener('pause',videoPause);video.addEventListener('play',videoPlay);
    // Explicit native play can load the same asset even when automatic motion is disabled.
    video.addEventListener('click',function(){if(!videoLoaded){var source=video.querySelector('source');source.src=source.dataset.src;videoLoaded=true;video.load();video.play().catch(function(){});}});
    root.addEventListener('scroll',scroll,{passive:true});document.addEventListener('visibilitychange',sync);media.addEventListener('change',motionPreference);
    var resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(draw):null;if(resize)[canvas,hero,wave,resolved].forEach(function(c){resize.observe(c);});
    var observer=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.target===video)videoVisible=entry.isIntersecting;else scenes.forEach(function(s){if(s.node===entry.target)s.visible=entry.isIntersecting;});});visible=scenes.some(function(s){return s.visible;});sync();},{root:root,threshold:0}):null;
    if(observer){scenes.forEach(function(s){observer.observe(s.node);});observer.observe(video);}
    if(!g){canvas.hidden=true;root.querySelector('#pe-orbit-insight').setAttribute('data-static','true');}else canvas.parentElement.dataset.canvas='true';
    if(wg)wave.parentElement.dataset.canvas='true';else wave.hidden=true;
    read();draw();sync();
    return function(){stopped=true;cancelAnimationFrame(raf);if(resize)resize.disconnect();if(observer)observer.disconnect();video.pause();document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',motionPreference);root.removeEventListener('scroll',scroll);};
  }
  return {mount:mount};
})();
