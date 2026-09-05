/* Cat's Cradle instrument. This module is embedded inside the existing Sandbox closure. */
  var cradleAnimate=false,cradleComparison=0;
  var cradleLab={EA:80,damping:1.4,span:360,shape:'cross',prediction:null,result:null,history:[],lastSample:-1,events:[],saved:null};
  function cradleConfig(){return {EA:cradleLab.EA,damping:cradleLab.damping,span:cradleLab.span,shape:cradleLab.shape};}
  function cradleApplyConfig(s){s=s||{};cradleLab.EA=Math.max(10,Math.min(240,Number(s.EA)||80));cradleLab.damping=Number.isFinite(s.damping)?Math.max(0,Math.min(6,s.damping)):1.4;cradleLab.span=Math.max(240,Math.min(520,Number(s.span)||360));cradleLab.shape=['cross','diamond','bridge'].indexOf(s.shape)>=0?s.shape:'cross';cradleLab.history=[];cradleLab.lastSample=-1;cradleLab.prediction=null;cradleLab.result=null;}
  function cradleEvent(action){cradleLab.events.push({at:Number(simT.toFixed(2)),action:action});if(cradleLab.events.length>8)cradleLab.events.shift();}
  function cradleCreate(shape){
    reset();cradleComparison++;tool='select';$$('.sbx-tool',host).forEach(function(b){b.classList.toggle('on',b.dataset.tool==='select');});cradleLab.shape=shape||cradleLab.shape;cradleLab.history=[];cradleLab.lastSample=-1;cradleLab.prediction=null;cradleLab.result=null;
    P.useG=false;P.useC=false;P.g=981;P.walls=false;P.xray=false;showTrails=false;P.ropeStiff=0;
    var span=cradleLab.span,half=span/2,pins=[[-half,-90],[half,-90],[half,90],[-half,90]];
    var order=cradleLab.shape==='cross'?[0,2,1,3]:cradleLab.shape==='diamond'?[0,1,2,3]:[0,1,3,2];
    var ids=[],N=16;
    for(var edge=0;edge<4;edge++){
      var a=pins[order[edge]],b=pins[order[(edge+1)%4]];
      for(var j=0;j<N;j++){
        var t=j/N,id=addBody(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t+18*Math.sin(Math.PI*t),{m:0.002,r:j?2:8,fixed:j===0,c:j?'#8cd7df':'#edc28e'});
        ids.push(id);if(j===0)cradleNodes.push({id:id,hx:B[id].x,hy:B[id].y,side:a[0]<0?'Left':'Right'});
      }
    }
    for(var k=0;k<ids.length;k++){var a=ids[k],b=ids[(k+1)%ids.length];chains.push({a:a,b:b,L:Math.hypot(B[b].x-B[a].x,B[b].y-B[a].y),tension:0});}
    cradleOn=true;cradleLive=false;sel=cradleNodes[0].id;cradleFit();
    for(var settle=0;settle<180;settle++)CradlePhysics.advance(B,chains,{EA:cradleLab.EA,damping:cradleLab.damping,iterations:32},1/120);
    cradleEvent('Opened '+cradleLab.shape+' weave');cradleSync();
  }
  function cradleFit(){if(!canvas)return;fitc();cam.s=Math.max(.3,Math.min(1.45,(W()-80)/(cradleLab.span+100),(H()-145)/330));cam.x=W()/2;cam.y=H()/2+10;}
  function cradleRead(){return CradlePhysics.measure(B,chains,cradleLab.EA);}
  function cradlePluck(){
    if(!cradleOn)return;var index=(sel!=null&&B[sel]&&!B[sel].fixed)?sel:8;
    if(!B[index]||B[index].fixed)return;
    B[index].vy-=180;B[index].vx+=55;cradleEvent('Plucked node '+(index+1));
    if(STILL){for(var k=0;k<8;k++)step(1/120);simT+=8/120;draw();}
  }
  function cradleSpread(value){
    if(!cradleOn)return;cradleLab.span=Math.max(240,Math.min(520,+value));
    cradleNodes.forEach(function(a){a.hx=(a.hx<0?-1:1)*cradleLab.span/2;var b=B[a.id];if(b){b.x=a.hx;b.vx=b.vy=0;}});
    if(STILL){for(var k=0;k<120;k++)step(1/120);draw();}
  }
  function cradlePredict(choice){
    cradleLab.prediction=choice;cradleLab.result=null;
    var output=$('#cr-feedback');if(output)output.textContent='Prediction saved: '+choice+'. Run the comparison to test it.';
    $$('#cr-predictions button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.predict===choice));});
    var run=$('#cr-compare');if(run)run.disabled=false;
  }
  async function cradleCompare(){
    if(!cradleOn||!cradleLab.prediction)return;
    var ticket=++cradleComparison,EA=cradleLab.EA,prediction=cradleLab.prediction;
    $('#cr-compare').disabled=true;$('#cr-feedback').textContent='Settling two equal cords… measuring both support forces.';
    // A clean two-support control experiment, independent of the free-form live weave.
    // The same discretisation, mass and solver are used at both spans.
    async function sample(width){var bs=[],ls=[],n=24,L=4.5;
      for(var i=0;i<=n;i++){var t=i/n;bs.push({x:-width/2+width*t,y:Math.sin(Math.PI*t)*95,vx:0,vy:0,m:.004,fixed:i===0||i===n});if(i)ls.push({a:i-1,b:i,L:L*100/n});}
      for(var it=0;it<1440;it++){if(ticket!==cradleComparison||!cradleOn)return null;CradlePhysics.advance(bs,ls,{EA:EA,damping:4,iterations:32},1/120);if(it%80===79)await new Promise(function(resolve){setTimeout(resolve,0);});}
      var m=CradlePhysics.measure(bs,ls,EA);return {supportN:Math.hypot(m.forces[0].x,m.forces[0].y),kineticJ:m.kineticJ};
    }
    var a=await sample(260),b=await sample(380);if(!a||!b||ticket!==cradleComparison||!cradleOn)return;
    var direction=b.supportN>a.supportN?'higher':'lower';
    cradleLab.result={narrowN:+a.supportN.toFixed(3),wideN:+b.supportN.toFixed(3),prediction:prediction,correct:prediction===direction};
    var text=(cradleLab.result.correct?'Your prediction matches. ':'The measurement suggests a different result. ')+'Support force: '+a.supportN.toFixed(3)+' N at 2.6 m → '+b.supportN.toFixed(3)+' N at 3.8 m. A shallower rope needs more tension to support the same weight. Try a stiffer cord: does the direction change?';
    $('#cr-feedback').textContent=text;$('#cr-compare').disabled=false;cradleEvent('Compared equal-length cords at 2.6 m and 3.8 m with EA '+EA+' N');
    try{localStorage.setItem('peq_cradle_prediction',JSON.stringify(cradleLab.result));}catch(e){}
  }
  function cradleTutor(){
    if(!cradleOn)return;var m=cradleRead();
    var context={simulation:'Cats Cradle',model:'Planar tension-only elastic string using XPBD',units:{length:'m',mass:'kg',force:'N',energy:'J'},parameters:{spanM:cradleLab.span*.01,axialStiffnessN:cradleLab.EA,dampingPerSecond:cradleLab.damping,gravityMPerS2:P.g*.01},measurement:{peakTensionN:+m.peakN.toFixed(3),elasticJ:+m.elasticJ.toFixed(5),kineticJ:+m.kineticJ.toFixed(5)},prediction:cradleLab.result||cradleLab.prediction,recentEvents:cradleLab.events.slice(-5),limits:['2D projection; crossing strands do not form real knots','Linear axial elasticity; no rope failure','Damping removes energy; moving anchors can do work']};
    Tutor.ask('Help me explain the measured behaviour of this rope. Ask one guiding question first. Use only the supplied observations; do not invent experiments or results. Distinguish measured values from inferences.',JSON.stringify(context));
  }
  function cradleSave(){
    if(!cradleOn)return;
    try{localStorage.setItem('peq_cradle_studio_v1',JSON.stringify({v:1,shape:cradleLab.shape,span:cradleLab.span,EA:cradleLab.EA,damping:cradleLab.damping,B:B,chains:chains,anchors:cradleNodes}));toast('Cradle saved on this device');}catch(e){toast('Could not save this experiment');}
  }
  function cradleRestore(){
    var s;try{s=JSON.parse(localStorage.getItem('peq_cradle_studio_v1')||'null');}catch(e){}
    if(!s||s.v!==1||!Array.isArray(s.B)||s.B.length!==64||!Array.isArray(s.chains)||s.chains.length!==64||!Array.isArray(s.anchors)||s.anchors.length!==4){toast('No valid saved cradle yet');return;}
    var valid=s.B.every(function(b){return ['x','y','vx','vy','m'].every(function(k){return Number.isFinite(b[k]);})&&Math.abs(b.x)<2000&&Math.abs(b.y)<2000&&b.m>0&&b.m<=1;})&&s.chains.every(function(c){return Number.isInteger(c.a)&&Number.isInteger(c.b)&&c.a>=0&&c.a<64&&c.b>=0&&c.b<64&&Number.isFinite(c.L)&&c.L>0&&c.L<1000;})&&s.anchors.every(function(a){return Number.isInteger(a.id)&&a.id>=0&&a.id<64&&Number.isFinite(a.hx)&&Number.isFinite(a.hy);});
    if(!valid){toast('Saved cradle has invalid measurements');return;}
    reset();B=s.B;chains=s.chains;cradleNodes=s.anchors;nextId=65;cradleOn=true;P.useG=false;P.useC=false;P.g=981;P.walls=false;
    cradleApplyConfig(s);P.xray=false;P.ropeStiff=0;showTrails=false;
    cradleLab.history=[];cradleLab.lastSample=-1;cradleLab.prediction=null;cradleLab.result=null;cradleFit();cradleSync();syncForceUI();refreshInspect();draw();cradleEvent('Restored saved experiment');if(window.PeqSbxUX)PeqSbxUX.push('restore cradle');
  }
  function cradleSync(){
    if(!host)return;var root=host.querySelector('.sbx');if(root)root.classList.toggle('cradle-mode',cradleOn);
    var panel=$('#cr-lab');if(panel){panel.style.display=cradleOn?'block':'none';if(cradleOn){
      [['span',cradleLab.span],['elasticity',cradleLab.EA],['damping',cradleLab.damping]].forEach(function(p){var e=$('#cr-'+p[0]);if(e)e.value=p[1];});
      $$('#cr-shapes button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.weave===cradleLab.shape));});
      var f=$('#cr-feedback');if(f&&!cradleLab.prediction)f.textContent='Choose a prediction. The comparison changes only the distance between two supports.';
    }}
    ['cr-stage-note','cr-stage-actions'].forEach(function(id){var e=$('#'+id);if(e)e.style.display=cradleOn?'':'none';});
    if(cradleOn&&root){var side=root.querySelector('.sbx-side'),library=root.querySelector('[data-rg="lib"]');if(side)side.classList.add('clp-lib');if(library)library.classList.add('clp');}
    var compare=$('#cr-compare');if(compare)compare.disabled=!cradleLab.prediction;
    $$('#cr-predictions button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.predict===cradleLab.prediction));});
    var force=$('#cr-tension');if(force)force.setAttribute('aria-pressed',String(!!P.xray));
    if(panel&&cradleOn)cradleUpdate();
  }
  function cradleMount(){
    var side=host.querySelector('.sbx-side'),stage=host.querySelector('.sbx-stage');if(!side||!stage)return;
    var panel=document.createElement('section');panel.id='cr-lab';panel.className='cr-lab';panel.setAttribute('aria-label','Cats Cradle instrument');
    panel.innerHTML=`<span class="cr-overline">THE STRING INSTRUMENT / 01</span><h2>Cat’s Cradle</h2><p>Move the amber anchors. Pull a strand.<br>Watch the force travel through the weave.</p><div class="cr-row" id="cr-shapes"><button data-weave="cross" aria-pressed="true">Cross weave</button><button data-weave="diamond" aria-pressed="false">Open loop</button><button data-weave="bridge" aria-pressed="false">Bridge</button></div><label for="cr-span">Anchor span <output id="cr-span-v">3.60 m</output></label><input id="cr-span" type="range" min="240" max="520" step="5" value="360"><label for="cr-elasticity">Axial stiffness · EA <output id="cr-elasticity-v">80 N</output></label><input id="cr-elasticity" type="range" min="10" max="240" step="5" value="80"><label for="cr-damping">Damping <output id="cr-damping-v">1.4 s⁻¹</output></label><input id="cr-damping" type="range" min="0" max="6" step="0.2" value="1.4"><div class="cr-stats"><div><span>PEAK TENSION</span><strong id="cr-peak">—</strong></div><div><span>ELASTIC ENERGY</span><strong id="cr-elastic">—</strong></div><div><span>KINETIC ENERGY</span><strong id="cr-kinetic">—</strong></div><div><span>MAX EXTENSION</span><strong id="cr-strain">—</strong></div></div><canvas class="cr-scope" id="cr-scope" role="img" aria-label="Recent peak tension history; current numerical values are above"></canvas><div class="cr-row"><button id="cr-pluck">Pluck · P</button><button id="cr-tension" aria-pressed="false">Force view</button><button id="cr-reset">Reset weave</button></div><div class="cr-question"><span class="cr-overline">PREDICT → TEST → EXPLAIN</span><h3>Same rope, same weight.<br>Move the supports further apart.<br>Does support force become…</h3><div class="cr-row" id="cr-predictions"><button data-predict="higher" aria-pressed="false">Higher</button><button data-predict="lower" aria-pressed="false">Lower</button><button data-predict="unchanged" aria-pressed="false">Unchanged</button></div><button class="cr-action" id="cr-compare" disabled>Run controlled comparison ↗</button><p class="cr-feedback" id="cr-feedback" aria-live="polite">Choose a prediction. The comparison changes only the distance between two supports.</p></div><button class="cr-action cr-ask" id="cr-ask">✦ Explain this experiment</button><div class="cr-row"><button id="cr-save">Save weave</button><button id="cr-restore">Restore saved</button></div><details><summary>Model, units & limitations</summary><p>Positions use centimetres at the canvas boundary; the solver uses metres, kilograms and seconds. T = EA × extension / rest length. The default cord has 64 nodes of 2 g each. Free nodes feel g = 9.81 m/s².</p><p>Fixed 1/120 s steps; 32 constraint passes. A planar, tension-only elastic string with viscous damping. Crossings are projected paths, not physical knots; no rope self-contact, breaking or realistic bending. Forces are estimates of this model. Energy falls with damping and changes when you move a support.</p><p>The comparison uses a separate 4.5 m cord with 23 moving nodes of 4 g, settled for 12 simulated seconds at each support span.</p><a href="https://mmacklin.com/xpbd.pdf" target="_blank" rel="noopener noreferrer">XPBD method · Macklin et al. ↗</a><p>Keyboard: focus the canvas; ← → ↑ ↓ move the selected anchor, P plucks, Space pauses. Clicking an amber anchor selects it. Every key control also has a visible button or slider.</p></details>`;
    side.prepend(panel);
    var note=document.createElement('div');note.id='cr-stage-note';note.className='cr-note';note.innerHTML='EXPERIMENT / TENSION & ELASTICITY<b>A thread of possibility.</b>AMBER = SUPPORT · CYAN = CORD';stage.appendChild(note);
    var actions=document.createElement('div');actions.id='cr-stage-actions';actions.className='cr-stage-actions';actions.innerHTML='<button id="cr-stage-pluck">Pluck the weave</button><button id="cr-stage-pause" aria-label="Pause cradle">Pause</button><button id="cr-stage-fit">Fit weave</button>';stage.appendChild(actions);
    $$('#cr-shapes button').forEach(function(b){b.addEventListener('click',function(){cradleCreate(b.dataset.weave);if(window.PeqSbxUX)PeqSbxUX.push('weave shape');draw();});});
    $('#cr-span').addEventListener('input',function(){cradleSpread(this.value);cradleUpdate();});
    $('#cr-elasticity').addEventListener('input',function(){cradleLab.EA=+this.value;cradleUpdate();if(STILL){step(1/120);draw();}});
    $('#cr-damping').addEventListener('input',function(){cradleLab.damping=+this.value;cradleUpdate();});
    ['span','elasticity','damping'].forEach(function(id){$('#cr-'+id).addEventListener('change',function(){cradleEvent('Changed '+id+' to '+this.value);if(window.PeqSbxUX)PeqSbxUX.push('cradle control');});});
    $('#cr-pluck').addEventListener('click',cradlePluck);$('#cr-stage-pluck').addEventListener('click',cradlePluck);
    $('#cr-stage-pause').addEventListener('click',function(){running=!running;cradleAnimate=running;$('#sbx-play').textContent=running?'‖':'▸';this.textContent=running?'Pause':'Play';this.setAttribute('aria-label',running?'Pause cradle':'Play cradle');if(running)loop();else draw();});
    $('#cr-stage-fit').addEventListener('click',function(){cradleFit();draw();});
    $('#cr-tension').addEventListener('click',function(){P.xray=!P.xray;this.setAttribute('aria-pressed',String(P.xray));draw();});
    $('#cr-reset').addEventListener('click',function(){cradleCreate(cradleLab.shape);if(window.PeqSbxUX)PeqSbxUX.push('reset weave');draw();});
    $$('#cr-predictions button').forEach(function(b){b.addEventListener('click',function(){cradlePredict(b.dataset.predict);});});
    $('#cr-compare').addEventListener('click',cradleCompare);$('#cr-ask').addEventListener('click',cradleTutor);$('#cr-save').addEventListener('click',cradleSave);$('#cr-restore').addEventListener('click',cradleRestore);
    canvas.tabIndex=0;canvas.setAttribute('aria-label','Physics sandbox. In Cats Cradle select a support and use arrow keys to move it. P plucks, Space pauses.');
    canvas.addEventListener('keydown',function(e){if(!cradleOn)return;
      if(e.key==='p'||e.key==='P'){e.preventDefault();e.stopPropagation();cradlePluck();}
      else if(e.key===' '){e.preventDefault();e.stopPropagation();$('#cr-stage-pause').click();}
      else if(/^Arrow/.test(e.key)){e.preventDefault();e.stopPropagation();var a=cradleNodes.filter(function(n){return n.id===sel;})[0]||cradleNodes[0],b=B[a.id],d=e.shiftKey?15:5;sel=a.id;
        if(e.key==='ArrowLeft')a.hx-=d;if(e.key==='ArrowRight')a.hx+=d;if(e.key==='ArrowUp')a.hy-=d;if(e.key==='ArrowDown')a.hy+=d;b.x=a.hx;b.y=a.hy;b.vx=b.vy=0;cradleEvent('Moved selected support with keyboard');if(STILL)step(1/120);draw();}
    });
    cradleSync();
  }
  function cradleUpdate(){
    if(!cradleOn||!$('#cr-peak'))return;var m=cradleRead();
    var transport=$('#cr-stage-pause');if(transport){transport.textContent=running?'Pause':'Play';transport.setAttribute('aria-label',running?'Pause cradle':'Play cradle');}
    $('#cr-peak').innerHTML=m.peakN.toFixed(2)+' <small>N</small>';$('#cr-elastic').innerHTML=m.elasticJ.toFixed(3)+' <small>J</small>';$('#cr-kinetic').innerHTML=m.kineticJ.toFixed(3)+' <small>J</small>';$('#cr-strain').innerHTML=(m.strain*100).toFixed(1)+' <small>%</small>';
    $('#cr-span-v').textContent=(cradleLab.span*.01).toFixed(2)+' m';$('#cr-elasticity-v').textContent=cradleLab.EA+' N';$('#cr-damping-v').textContent=cradleLab.damping.toFixed(1)+' s⁻¹';
    if(simT!==cradleLab.lastSample){cradleLab.history.push(m.peakN);if(cradleLab.history.length>100)cradleLab.history.shift();cradleLab.lastSample=simT;}
    var cv=$('#cr-scope'),g=cv.getContext('2d');if(!g)return;var r=cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5);if(cv.width!==Math.round(r.width*d)||cv.height!==Math.round(r.height*d)){cv.width=Math.max(1,Math.round(r.width*d));cv.height=Math.max(1,Math.round(r.height*d));g.setTransform(d,0,0,d,0,0);}g.clearRect(0,0,r.width,r.height);g.strokeStyle='#263f4a';g.lineWidth=1;g.beginPath();g.moveTo(0,r.height-8);g.lineTo(r.width,r.height-8);g.stroke();var h=cradleLab.history,max=Math.max(.1,...h);g.strokeStyle='#7aceD9';g.beginPath();h.forEach(function(v,i){var x=i/99*r.width,y=r.height-8-(v/max)*(r.height-22);i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();g.fillStyle='#799eac';g.font='8px monospace';g.fillText('TENSION / RECENT HISTORY · N',2,9);
  }
