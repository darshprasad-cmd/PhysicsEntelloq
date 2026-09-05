/* One search surface for keyboard, sidebar and top navigation. */
var Cmdk=(function(){
  var el=null,inp=null,list=null,ix=null,sel=0,res=[],trigger=null,RKEY='peq_recent_cmdk';
  function recents(){
    try{var items=JSON.parse(localStorage.getItem(RKEY)||'[]');return Array.isArray(items)?items.filter(function(x){return x&&typeof x.k==='string'&&typeof x.id==='string';}).slice(0,6):[];}catch(e){return [];}
  }
  function pushRecent(it){try{var r=recents().filter(function(x){return !(x.k===it.k&&x.id===it.id);});r.unshift({k:it.k,id:it.id});localStorage.setItem(RKEY,JSON.stringify(r.slice(0,6)));}catch(e){}}
  function build(){ix=[];
    DB.forEach(function(t){var dm=DMAP[t.domain]||{};ix.push({k:'lesson',id:t.id,n:t.name,sub:'Lesson · '+(dm.n||''),c:dm.c||'#7dd3fc',x:(t.summary||'').toLowerCase()});});
    DOMAINS.forEach(function(d){ix.push({k:'domain',id:d.k,n:d.n,sub:'Field · '+topicsOf(d.k).length+' lessons',c:d.c,x:''});});
    [['home','Home'],['universe','Universe'],['learn','Learn'],['solve','Solve'],['practice','Practice'],['lab','Lab'],['sandbox','Sandbox'],['research','Research'],['progress','Progress'],['review','Review'],['journeys','Journeys'],['deeps','Deep Dives'],['adv','Advanced Physics'],['settings','Settings']].forEach(function(v){ix.push({k:'view',id:v[0],n:v[1],sub:'Space',c:'#a3b1cc',x:''});});
    try{Deep.list().forEach(function(d){if(d&&d.id)ix.push({k:'deep',id:d.id,n:d.title||d.id,sub:'Full course',c:'#fbbf24',x:''});});}catch(e){}
    try{Adv.list().forEach(function(d){if(d&&d.id)ix.push({k:'adv',id:d.id,n:String(d.title).replace(/<[^>]+>/g,''),sub:'Advanced',c:'#a78bfa',x:''});});}catch(e){}
    try{Object.keys(JOURNEYS).forEach(function(j){ix.push({k:'journey',id:j,n:JOURNEYS[j].title,sub:'Journey',c:JOURNEYS[j].c,x:''});});}catch(e){}
  }
  function scoreOne(q,s){var i=s.indexOf(q);if(i===0)return 100;if(i>0)return(s.charAt(i-1)===' '?80:55)-Math.min(i,25);var qi=0,si=0;while(si<s.length&&qi<q.length){if(s.charAt(si)===q.charAt(qi))qi++;si++;}return qi===q.length?30:-1;}
  function match(q,it){var hay=(it.n+' '+it.sub).toLowerCase(),score=0,toks=q.split(/\s+/);for(var i=0;i<toks.length;i++){if(!toks[i])continue;var sc=scoreOne(toks[i],hay);if(sc<0){var sx=it.x?scoreOne(toks[i],it.x):-1;if(sx<0)return -1;sc=sx*.3;}score+=sc;}if(it.k==='view'||it.k==='domain')score+=8;return score;}
  function select(i,scroll){sel=i;$$('.cp-row',list).forEach(function(r){var active=+r.dataset.i===sel;r.classList.toggle('on',active);r.setAttribute('aria-selected',String(active));if(active&&scroll)r.scrollIntoView({block:'nearest',behavior:'instant'});});if(res[sel])inp.setAttribute('aria-activedescendant','cp-option-'+sel);else inp.removeAttribute('aria-activedescendant');}
  function paint(){
    list.innerHTML=res.map(function(it,i){return '<div class="cp-row" id="cp-option-'+i+'" role="option" aria-selected="false" data-i="'+i+'"><span class="cp-d" aria-hidden="true" style="background:'+it.c+'"></span><span class="nm">'+esc(it.n)+'</span><span class="sub">'+esc(it.sub)+'</span><span class="ret" aria-hidden="true">↵</span></div>';}).join('');
    $('#cp-none').hidden=!!res.length;$('#cp-status').textContent=res.length?res.length+' results. Use arrow keys to choose.':'No matching concepts. Try another search or ask Entelloq.';$('#cp-ask').disabled=!inp.value.trim();
    $$('.cp-row',list).forEach(function(r){r.addEventListener('click',function(){select(+r.dataset.i,false);exec();});r.addEventListener('pointermove',function(){if(sel!==+r.dataset.i)select(+r.dataset.i,false);});});select(sel,false);
  }
  function refresh(){var q=inp.value.trim().toLowerCase();sel=0;if(!q){var out=[];recents().forEach(function(r){var found=ix.find(function(it){return it.k===r.k&&it.id===r.id;});if(found)out.push(found);});if(Me.d.lastTopic){var t=ix.find(function(it){return it.k==='lesson'&&it.id===Me.d.lastTopic;});if(t&&!out.some(function(it){return it.k===t.k&&it.id===t.id;}))out.unshift(t);}res=out.slice(0,7);if(!res.length)res=ix.filter(function(it){return it.k==='view';}).slice(0,7);}else res=ix.map(function(it){return{it:it,sc:match(q,it)};}).filter(function(r){return r.sc>=0;}).sort(function(a,b){return b.sc-a.sc;}).slice(0,9).map(function(r){return r.it;});paint();}
  function exec(){var it=res[sel];if(!it)return;pushRecent(it);close();if(it.k==='view')go(it.id);else go(it.k,it.id);var h=main.querySelector('h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}}
  function mountEl(){el=ce('dialog');el.id='cmdk';el.setAttribute('aria-label','Search Physics Entelloq');
    el.innerHTML='<div class="cp-panel"><div class="cp-inwrap"><span class="cp-ic" aria-hidden="true">⌕</span><input id="cp-in" role="combobox" aria-autocomplete="list" aria-controls="cp-list" aria-expanded="false" aria-label="Search concepts, fields, courses and spaces" placeholder="Find a concept, field or space…" autocomplete="off" spellcheck="false"><button id="cp-close" type="button" aria-label="Close search">×</button></div><div class="cp-list" id="cp-list" role="listbox" aria-label="Search results"></div><div class="cp-none" id="cp-none" hidden>Nothing matches. Try another concept, field or space.</div><div class="pe-sr-only" id="cp-status" role="status"></div><div class="cp-foot"><span>↑↓ choose · Enter opens</span><button id="cp-ask" type="button" disabled>Ask Entelloq ↗</button></div></div>';
    document.body.appendChild(el);inp=$('#cp-in');list=$('#cp-list');inp.addEventListener('input',refresh);$('#cp-close').addEventListener('click',close);$('#cp-ask').addEventListener('click',function(){var q=inp.value.trim();if(q){close();Tutor.ask(q);}});
    el.addEventListener('click',function(e){if(e.target===el)close();});el.addEventListener('cancel',function(e){e.preventDefault();close();});
    inp.addEventListener('keydown',function(e){if(e.isComposing)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(res.length)select((sel+(e.key==='ArrowDown'?1:-1)+res.length)%res.length,true);}else if(e.key==='Enter'){e.preventDefault();exec();}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
    el.addEventListener('close',function(){el.classList.remove('on');inp.setAttribute('aria-expanded','false');if(trigger&&trigger.isConnected)trigger.focus({preventScroll:true});});
  }
  function blocked(){return !!document.querySelector('dialog[open]:not(#cmdk),#feature-guide:popover-open,#lab-full.on,#tutor.on,#lnd');}
  function open(){if(blocked())return;if(isOpen()){inp.focus();return;}trigger=document.activeElement;if(!ix)build();if(!el)mountEl();el.classList.add('on');inp.value='';refresh();el.showModal();inp.setAttribute('aria-expanded','true');inp.focus();}
  function close(){if(el&&el.open)el.close();}
  function isOpen(){return !!(el&&el.open);}
  document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(e.repeat||e.isComposing)return;if(isOpen())close();else open();}});
  document.addEventListener('click',function(e){if(e.target.closest('#nav-cmdk'))open();});
  return{open:open,close:close,isOpen:isOpen};
})();
