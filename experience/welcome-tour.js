/* Local, per-account tutorial state. Identity/authentication remains with GAuth. */
var WelcomeState=(function(){
  var memory=Object.create(null),prefix='peq_welcome_v1:';
  function key(user){return prefix+encodeURIComponent(user&&user.e?user.e.trim().toLowerCase():user&&user.n?'local:'+user.n:'guest');}
  function read(user){var k=key(user);try{var s=JSON.parse(localStorage.getItem(k)||'null');if(s&&s.v===1&&['active','completed','skipped','existing'].includes(s.status)){s.step=Number.isInteger(s.step)&&s.step>=0&&s.step<=7?s.step:0;return s;}}catch(e){}return memory[k]||null;}
  function write(user,status,step){var s={v:1,status:status,step:Math.max(0,Math.min(7,step||0)),at:Date.now()},k=key(user);memory[k]=s;try{localStorage.setItem(k,JSON.stringify(s));}catch(e){}return s;}
  function shouldStart(user){var s=read(user);return !!user&&(!s||s.status==='active');}
  return {key:key,read:read,write:write,shouldStart:shouldStart};
})();
var AccountEntry=(function(){
  var dialog=null,trigger=null;
  function close(){if(dialog&&dialog.open)dialog.close();}
  function show(){
    if(GAuth.user()){if(Landing.visible())Landing.enter('home');WelcomeTour.start(GAuth.user(),true);return;}
    trigger=document.activeElement;
    if(!dialog){dialog=ce('dialog','pe-account-dialog');dialog.id='pe-account-dialog';dialog.setAttribute('aria-labelledby','pe-account-title');dialog.innerHTML='<button class="welcome-close" id="pe-account-close" aria-label="Close account dialog">'+AppDesign.icon('close')+'</button><div class="eyebrow">YOUR PHYSICS WORKSPACE</div><h2 id="pe-account-title">Make yourself at home.</h2><p>Continue with Google to create your Entelloq identity or sign back in.</p><div id="pe-account-google"></div><p class="pe-account-help">If the Google button does not load, check your connection or try again. You can always explore as a guest.</p><button class="btn" id="pe-account-retry">Retry Google sign-in</button><button class="pe-account-guest" id="pe-account-guest">Continue as guest →</button><div class="pe-account-disclosure">New here? Your welcome tour starts automatically after sign-in. Learning progress stays in this browser; cloud sync is not enabled.</div>';document.body.appendChild(dialog);
      $('#pe-account-close').addEventListener('click',close);$('#pe-account-guest').addEventListener('click',function(){close();if(Landing.visible())Landing.enter('home');});$('#pe-account-retry').addEventListener('click',load);
      dialog.addEventListener('close',function(){if(trigger&&trigger.isConnected)trigger.focus({preventScroll:true});});
    }
    dialog.showModal();load();
  }
  function load(){GAuth.button($('#pe-account-google'),{theme:'outline',size:'large',shape:'pill',text:'continue_with',width:Math.min(320,innerWidth-82)});}
  function init(){document.addEventListener('click',function(e){if(e.target.closest('[data-signup]'))show();});GAuth.onChange(function(user){if(!user)return;close();if(Landing.visible())Landing.enter('home');else if(curView==='settings')go('settings');});}
  return {init:init,show:show};
})();
var WelcomeTour=(function(){
  var dialog=null,user=null,index=0,playing=false,timer=0,pending=0,remaining=11000,last=0,returnFocus=null;
  var steps=[
    {route:'home',target:'#cc-start',title:'Start with a little curiosity.',text:'This is your starting point. Start exploring opens a hands-on experiment. You can begin without knowing a formula.',hint:'HOME / YOUR NEXT DISCOVERY'},
    {route:'universe',target:'.atlas-fields',title:'See how the ideas connect.',text:'Choose a field in the Universe, then a concept. Find its foundations, what it unlocks, and the next idea you are ready to explore.',hint:'UNIVERSE / FOLLOW A CONNECTION'},
    {route:'learn',target:'.pe-reading-next',title:'Understand it in more than one way.',text:'Choose a field or a recommended concept. Inside a lesson, move between experience, prediction, visuals, mathematics, the frontier and the real world.',hint:'LEARN / SIX WAYS INTO ONE IDEA'},
    {route:'lab',target:'.xg-bar',title:'Let the experiment answer.',text:'Live simulations run here in your browser. Practical protocols use real equipment. In an investigation, make a prediction, change a variable and compare the result.',hint:'LAB / PREDICT, MEASURE, EXPLAIN'},
    {route:'home',target:'[data-scene="catcradle"]',title:'Give your curiosity some room.',text:'The Sandbox is open-ended. Start with Cat’s Cradle: move an amber support, pull a strand, and watch the force readings. A camera is optional.',hint:'SANDBOX / BUILD, PULL, PLAY'},
    {route:'research',target:'#pe-explore',title:'There is more when you need it.',text:'Explore opens Solve, Practice, Sandbox, Research and deeper courses. Solve builds a model of a problem; Practice tests fluency; Research follows evidence.',hint:'EXPLORE / FIND THE RIGHT TOOL'},
    {route:'home',target:'#tutor-fab',title:'Ask why—not just what.',text:'This is Entelloq, your physics companion. Ask for intuition, a visual explanation, a derivation or a question that tests your thinking. AI answers need a connection.',hint:'YOUR TUTOR / THINK IT THROUGH'},
    {route:'progress',target:'.pg-ready',title:'Build your own physics map.',text:'Your map tracks the concepts you explore and recommends a next step. Use practice and review to test understanding. Replay this tour any time from Settings.',hint:'YOUR MAP / KEEP THE NEXT STEP CLEAR'}
  ];
  function stopTimer(){if(timer)clearInterval(timer);timer=0;}
  function setPlaying(value){playing=!!value;last=performance.now();if(dialog){$('#welcome-play').textContent=playing?'Pause':'Play walkthrough';$('#welcome-play').setAttribute('aria-pressed',String(playing));$('#welcome-play').setAttribute('aria-label',playing?'Pause walkthrough':'Play walkthrough');$('#welcome-timing').textContent=playing?'Auto-playing · pauses when you interact':'At your pace · use Next or press Play';}stopTimer();if(playing)timer=setInterval(tick,200);position();}
  function tick(){if(!dialog||!dialog.open)return;if(document.hidden){setPlaying(false);return;}var now=performance.now();remaining-=now-last;last=now;$('#welcome-meter').value=Math.max(0,11000-remaining);if(remaining<=0){if(index===steps.length-1)finish('completed');else render(index+1,false);}}
  function moveFocus(){var h=$('#welcome-title');h.tabIndex=-1;h.focus({preventScroll:true});}
  function revealTarget(){var target=document.querySelector(steps[index].target),scroll=$('#main-scroll');if(target&&target.closest&&target.closest('#main')){if(innerWidth<=700)scroll.scrollTop=Math.max(0,scroll.scrollTop+target.getBoundingClientRect().top-scroll.getBoundingClientRect().top-24);else target.scrollIntoView({block:'nearest',behavior:'instant'});}position();}
  function position(){if(!dialog||!dialog.open)return;var target=document.querySelector(steps[index].target),r=target&&target.getBoundingClientRect();if(!r||r.width<1||r.height<1)r={left:20,top:80,width:Math.max(0,innerWidth-40),height:1,right:innerWidth-20,bottom:81};
    var card=$('#welcome-card'),mobile=innerWidth<=700,inside=target&&target.closest&&target.closest('#main'),above=mobile&&!inside&&r.top>innerHeight*.52;card.classList.toggle('welcome-card-top',above);card.classList.toggle('welcome-card-left',!mobile&&r.left>innerWidth*.7&&r.top>innerHeight*.5);
    var cr=card.getBoundingClientRect(),left=Math.max(6,r.left-7),top=Math.max(6,r.top-7),bottom=Math.min(innerHeight-6,r.bottom+7);if(mobile){if(above)top=Math.max(top,cr.bottom+12);else bottom=Math.min(bottom,cr.top-12);}
    var width=Math.max(0,Math.min(innerWidth-6,r.right+7)-left),height=Math.max(0,bottom-top);
    Object.assign($('#welcome-highlight').style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
  }
  function render(next,manual){index=Math.max(0,Math.min(steps.length-1,next));remaining=11000;last=performance.now();var s=steps[index];go(s.route);WelcomeState.write(user,'active',index);
    $('#welcome-count').textContent='STEP '+(index+1)+' OF '+steps.length;$('#welcome-hint').textContent=s.hint;$('#welcome-title').textContent=s.title;$('#welcome-copy').textContent=s.text;$('#welcome-next').textContent=index===steps.length-1?'Explore →':'Next →';$('#welcome-back').disabled=index===0;$('#welcome-meter').value=0;
    $('#welcome-dots').innerHTML=steps.map(function(_,i){return '<span class="'+(i<=index?'on':'')+'"></span>';}).join('');moveFocus();if(manual)setPlaying(false);revealTarget();
  }
  function finish(status){if(!dialog||!dialog.open)return;WelcomeState.write(user,status,index);setPlaying(false);dialog.close();go('home');var h=main.querySelector('h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}else if(returnFocus&&returnFocus.isConnected)returnFocus.focus();}
  function start(account,replay){
    if(dialog&&dialog.open)return;user=account||null;var state=WelcomeState.read(user),at=!replay&&state&&state.status==='active'?state.step:0;returnFocus=document.activeElement;
    if($('#pe-explore-sheet')&&$('#pe-explore-sheet').open)$('#pe-explore-sheet').close();if($('#lab-full.on'))closeLabFull();if($('#tutor').classList.contains('on'))$('#tu-close').click();
    if(!dialog){dialog=ce('dialog','welcome-tour');dialog.id='welcome-tour';dialog.setAttribute('aria-labelledby','welcome-title');dialog.setAttribute('aria-describedby','welcome-copy');dialog.innerHTML='<div id="welcome-highlight" class="welcome-highlight" aria-hidden="true"></div><section id="welcome-card" class="welcome-card"><div class="welcome-top"><span id="welcome-count"></span><button id="welcome-skip" aria-label="Skip walkthrough">Skip tour '+AppDesign.icon('close')+'</button></div><div id="welcome-dots" class="welcome-dots" aria-hidden="true"></div><div aria-live="polite" aria-atomic="true"><div id="welcome-hint" class="eyebrow"></div><h2 id="welcome-title"></h2><p id="welcome-copy"></p></div><progress id="welcome-meter" max="11000" value="0" aria-hidden="true"></progress><div id="welcome-timing" class="welcome-timing"></div><div class="welcome-actions"><button id="welcome-play" aria-pressed="false">Play walkthrough</button><span></span><button id="welcome-back">Back</button><button id="welcome-next">Next →</button></div></section>';document.body.appendChild(dialog);
      $('#welcome-skip').addEventListener('click',function(){finish('skipped');});$('#welcome-play').addEventListener('click',function(){setPlaying(!playing);});$('#welcome-back').addEventListener('click',function(){render(index-1,true);});$('#welcome-next').addEventListener('click',function(){if(index===steps.length-1)finish('completed');else render(index+1,true);});
      dialog.addEventListener('cancel',function(e){e.preventDefault();finish('skipped');});dialog.addEventListener('keydown',function(e){if(e.key==='Tab')setPlaying(false);});$('#welcome-card').addEventListener('pointerenter',function(e){if(e.pointerType==='mouse')setPlaying(false);});
      document.addEventListener('visibilitychange',function(){if(document.hidden&&dialog.open)setPlaying(false);});window.addEventListener('resize',position);$('#main-scroll').addEventListener('scroll',position,{passive:true});
    }
    dialog.showModal();render(at,false);setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.hidden);
  }
  function queue(account){if(pending)clearTimeout(pending);pending=setTimeout(function(){pending=0;if(GAuth.user()&&WelcomeState.key(GAuth.user())===WelcomeState.key(account)&&!Landing.visible()&&WelcomeState.shouldStart(account))start(account,false);},0);}
  function init(){
    var current=GAuth.user();if(current){var state=WelcomeState.read(current);if(!state)WelcomeState.write(current,'existing',0);else if(state.status==='active'&&!Landing.pending())queue(current);}
    GAuth.onChange(function(account){if(!account){if(pending)clearTimeout(pending);pending=0;stopTimer();if(dialog&&dialog.open)dialog.close();return;}if(dialog&&dialog.open){if(WelcomeState.key(user)===WelcomeState.key(account))return;stopTimer();dialog.close();}if(WelcomeState.shouldStart(account))queue(account);});
    document.addEventListener('click',function(e){if(e.target.closest('[data-welcome-replay]'))start(GAuth.user(),true);});
  }
  return {init:init,start:start};
})();
