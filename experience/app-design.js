/* Shared application interaction layer. No physics, auth or provider changes. */
var AppDesign=(function(){
  var sheet=null,lastTrigger=null,focusNext=false,labTrigger=null;
  var paths={
    home:'M3 11 12 3l9 8M5 10v11h5v-7h4v7h5V10',
    universe:'M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    learn:'M12 6v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z',
    solve:'M19 4H5l7 8-7 8h14',practice:'M20 7a9 9 0 1 0 1 7M15 4h6v6M8 12l3 3 6-7',
    lab:'M9 3h6M10 3v6L4 19q-1 2 2 2h12q3 0 2-2L14 9V3M8 14h8',
    sandbox:'M4 5h16v14H4ZM8 9l4-2 4 2v6l-4 2-4-2ZM8 9l4 2 4-2m-4 2v6',
    research:'M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8m-8 4h5',
    adv:'M3 12h18M12 3v18M6 6c-5 5 7 16 12 12S11 1 6 6Z',
    progress:'M4 20h16M7 16V9m5 7V4m5 12v-5',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
    search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-2 5 6 6',
    arrow:'M5 12h14m-5-5 5 5-5 5',close:'M6 6l12 12M6 18 18 6',explore:'M4 4h6v6H4Zm10 0h6v6h-6ZM4 14h6v6H4Zm10 0h6v6h-6Z',
    tutor:'M12 3c1 6 3 8 9 9-6 1-8 3-9 9-1-6-3-8-9-9 6-1 8-3 9-9Z',
    expand:'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6'
  };
  function icon(name){return '<svg class="pe-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[name]||paths.explore)+'"/></svg>';}
  function openExplore(trigger){if(!sheet)return;lastTrigger=trigger||document.activeElement;sheet.showModal();}
  function closeExplore(){if(sheet&&sheet.open)sheet.close();}
  function makeNavigation(){
    $$('.side .nav-i[data-go]:not(#nav-acct)').forEach(function(n){var b=ce('button',n.className);for(var a of n.attributes)b.setAttribute(a.name,a.value);var oldIcon=n.querySelector('.ic'),label=n.textContent.trim();if(oldIcon)label=label.replace(oldIcon.textContent,'').trim();b.type='button';b.innerHTML=icon(n.dataset.go)+'<span>'+esc(label)+'</span>';n.replaceWith(b);});
    var search=$('#nav-cmdk');if(search){search.setAttribute('role','button');search.tabIndex=0;search.querySelector('.ic').innerHTML=icon('search');}
    $$('.mtab [data-go]').forEach(function(n){n.innerHTML=icon(n.dataset.go)+'<span>'+esc(n.dataset.go==='progress'?'Me':n.dataset.go.charAt(0).toUpperCase()+n.dataset.go.slice(1))+'</span>';});
    var more=ce('button','pe-explore-trigger');more.id='pe-explore';more.type='button';more.setAttribute('aria-haspopup','dialog');more.innerHTML=icon('explore')+'<span>Explore</span>';$('.topbar').insertBefore(more,$('.t-search'));more.addEventListener('click',function(){openExplore(more);});
    sheet=ce('dialog','pe-explore-sheet');sheet.id='pe-explore-sheet';sheet.setAttribute('aria-labelledby','pe-explore-title');
    var routes=[['solve','Solve','Model a problem, step by step.'],['practice','Practice','Build confidence through retrieval.'],['sandbox','Sandbox','Build a system and change its rules.'],['research','Research','Ask a question. Follow the evidence.'],['journeys','Learning journeys','A guided path through connected ideas.'],['deeps','Deep courses','Take one idea further.'],['adv','Advanced Studio','Upper-undergraduate physics. Preparation expected.'],['settings','Settings','Personalise your learning space.']];
    sheet.innerHTML='<header><div><div class="eyebrow">YOUR PHYSICS WORKSPACE</div><h2 id="pe-explore-title">Follow your curiosity.</h2></div><button id="pe-explore-close" aria-label="Close Explore">'+icon('close')+'</button></header><div class="pe-explore-grid">'+routes.map(function(r){return '<button data-explore-go="'+r[0]+'">'+icon(r[0])+'<span><b>'+r[1]+'</b><small>'+r[2]+'</small></span>'+icon('arrow')+'</button>';}).join('')+'</div><footer><span>One subject. Many ways of thinking.</span><button id="pe-apps">Other Entelloq apps ↗</button></footer>';
    document.body.appendChild(sheet);$('#pe-explore-close').addEventListener('click',closeExplore);
    sheet.addEventListener('click',function(e){if(e.target===sheet){var r=sheet.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeExplore();}var b=e.target.closest('[data-explore-go]');if(b){closeExplore();go(b.dataset.exploreGo);}});
    sheet.addEventListener('close',function(){if(lastTrigger&&lastTrigger.isConnected)lastTrigger.focus({preventScroll:true});});
    $('#pe-apps').addEventListener('click',function(){closeExplore();var b=$('#eqx-fab');if(b)b.click();});
  }
  function enhance(scope){
    if(!scope)return;
    // These navigation cards use the app's delegated router, with no private listeners.
    $$('.rec[data-link],.titem[data-link],.pg-dom[data-link]',scope).forEach(function(n){if(n.tagName==='BUTTON')return;var b=ce('button',n.className);for(var a of n.attributes)b.setAttribute(a.name,a.value);b.type='button';while(n.firstChild)b.appendChild(n.firstChild);n.replaceWith(b);});
    $$('input:not([type=hidden]):not([type=range]):not([type=checkbox]):not([type=radio]),textarea',scope).forEach(function(n){if(n.labels&&n.labels.length||n.hasAttribute('aria-label')||n.hasAttribute('aria-labelledby'))return;var label=n.placeholder||'Your response';n.setAttribute('aria-label',label.replace(/[⌕✦]/g,'').trim());});
    $$('input[type=range]',scope).forEach(function(n){if(n.labels&&n.labels.length||n.hasAttribute('aria-label')||n.hasAttribute('aria-labelledby'))return;var label=n.parentElement.cloneNode(true);$$('input,button,b,output,canvas',label).forEach(function(x){x.remove();});var text=label.textContent.trim().replace(/\s+/g,' ');if(text)n.setAttribute('aria-label',text.slice(0,120));});
  }
  function afterView(){
    document.body.dataset.view=curView;
    $$('.nav-i[data-go],.mtab [data-go]').forEach(function(n){if(n.classList.contains('on'))n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
    enhance(main);
    var prompt=$('#tu-role');if(prompt)prompt.textContent=curView==='lesson'?'Concept companion':curView==='research'?'Research companion':'Your physics companion';
    if(focusNext){focusNext=false;var h=main.querySelector('h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
  }
  function enterLab(){labTrigger=document.activeElement;$('.app').inert=true;$('.mtab').inert=true;$('#lf-back').focus();}
  function exitLab(){$('.app').inert=false;$('.mtab').inert=false;$('#lab-full').classList.remove('pe-stage-focus');if(labTrigger&&labTrigger.isConnected)labTrigger.focus({preventScroll:true});}
  function init(){
    makeNavigation();enhance(document.body);
    var fab=$('#tutor-fab');if(fab){fab.innerHTML=icon('tutor');fab.setAttribute('aria-label','Ask Entelloq');fab.title='Ask Entelloq';}
    document.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target.matches('.nav-i[role=button],.side-card[role=button]')){e.preventDefault();focusNext=true;e.target.click();}var lab=$('#lab-full.on');if(lab&&!$('#tutor.on')){if(e.key==='Escape')closeLabFull();if(e.key==='Tab'){var items=$$('button,input,textarea,select,[tabindex="0"]',lab).filter(function(n){return !n.disabled&&n.getClientRects().length;});var first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}});
    document.addEventListener('click',function(e){if(e.detail===0&&e.target.closest('[data-go],[data-link],[data-explore-go]'))focusNext=true;},true);
    document.addEventListener('click',function(e){if(e.target.closest('.lvl-chip[data-f]'))queueMicrotask(function(){enhance(main);});});
  }
  return {init:init,afterView:afterView,enhance:enhance,icon:icon,enterLab:enterLab,exitLab:exitLab};
})();
