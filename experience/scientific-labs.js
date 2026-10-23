/* Additive scientific workspaces. The existing router owns lifecycle, learning
   state and navigation; each tool is loaded only after an explicit selection. */
var ScientificLabs=(function(){
  'use strict';
  var tools={
    reality:{name:'Reality Lab',section:'research',label:'Video & models',symbol:'↗',copy:'Measure a moving object in your own video, calibrate its scale, and compare it with a physical model.',note:'Video stays in this browser. Tracking is approximate; calibration and model assumptions matter.',file:'index.html'},
    discovery:{name:'Discovery Notebook',section:'research',label:'Reactive investigations',symbol:'∴',copy:'Fit a pendulum or projectile model, inspect uncertainty, and explore what sampling can hide.',note:'Python runs in this browser. First launch downloads its runtime and may take 10–120 seconds or longer. Synthetic examples are labelled.',file:'notebook.html'},
    robotics:{name:'Robotics Workbench',section:'lab',label:'Advanced · control & motion',symbol:'⌁',copy:'Place a two-link arm, explore inverse kinematics, and inspect a recorded Genesis dynamics run.',note:'Geometry and the recorded run work here. New Genesis dynamics require the local companion service.',file:'index.html'},
    reason:{name:'Symbolic Workbench',section:'solve',label:'Exact mathematics',symbol:'∂',copy:'Simplify, differentiate, integrate, solve equations, and compare expressions with explicit assumptions.',note:'SymPy runs in your browser after a runtime download. An expression comparison does not prove an entire argument.',file:'index.html'},
    proof:{name:'Proof Studio',section:'adv',label:'Formal reasoning',symbol:'⊢',copy:'Build an argument, inspect its Lean source, and learn which steps establish the conclusion.',note:'Drafting works here. Verified results require the local Lean checker; an offline draft is never marked verified.',file:'index.html'}
  };
  var active=null,frame=null,loadTimer=null,returnTo=null,restore=null,initial=true,popping=false,themeObserver=null;
  var sectionNames={research:'Research',lab:'Lab',solve:'Solve',adv:'Advanced Studio'};
  function get(id){return typeof id==='string'&&Object.prototype.hasOwnProperty.call(tools,id)?tools[id]:null;}
  function hashId(hash){var match=/^#scientific:([a-z]+)$/.exec(hash||'');return match&&get(match[1])?match[1]:null;}
  function url(id){var tool=get(id);return tool?'assets/scientific-labs/'+id+'/'+tool.file+'?embed=physics':null;}
  function titleFocus(){var title=main.querySelector('#scientific-title');if(title)title.focus({preventScroll:true});}
  function clear(){clearTimeout(loadTimer);loadTimer=null;if(themeObserver){themeObserver.disconnect();themeObserver=null;}if(frame){frame.remove();frame=null;}}
  function cards(ids,label){var section=document.createElement('section');section.className='sci-entry';section.setAttribute('aria-label',label);section.innerHTML='<div class="sci-entry-heading"><span>'+esc(label)+'</span><small>SCIENTIFIC WORKSPACES</small></div><div class="sci-cards">'+ids.map(function(id){var t=get(id);return '<button type="button" class="sci-card" data-scientific-open="'+id+'"><span class="sci-symbol" aria-hidden="true">'+t.symbol+'</span><span><small>'+esc(t.label)+'</small><strong>'+esc(t.name)+'</strong><span>'+esc(t.copy)+'</span></span><span class="sci-arrow" aria-hidden="true">↗</span></button>';}).join('')+'</div>';section.querySelectorAll('[data-scientific-open]').forEach(function(button){button.addEventListener('click',function(){open(button.dataset.scientificOpen);});});return section;}
  function decorate(){
    if(main.querySelector('.sci-entry')||curView==='scientific')return;
    var node,anchor;
    if(curView==='research'){node=cards(['reality','discovery'],'Measure, model & investigate');anchor=main.querySelector('.rs-grid');}
    else if(curView==='solve'){node=cards(['reason'],'Symbolic mathematics');anchor=main.querySelector('.pr-diff');}
    else if(curView==='adv'&&main.querySelector('.as-index')){node=cards(['proof'],'Formal reasoning');anchor=main.querySelector('.as-catalog-head');}
    else if(curView==='lab'){
      var bar=main.querySelector('.lm-bar');if(!bar)return;
      node=document.createElement('div');node.className='sci-lab-tools';
      if(labMode==='labs'||labMode==='research'||labMode==='investigate'||labMode==='design')node.appendChild(cards(['reality','discovery'],'Research tools'));
      node.appendChild(cards(['robotics'],'Advanced lab'));
      bar.after(node);return;
    }
    if(node&&anchor)anchor.before(node);
  }
  function embeddedCSS(id){
    var base='html{scroll-behavior:auto!important}body{margin:0!important}a[href="../"],a[href="index.html"]:not([download]){display:none!important}';
    var css={
      reality:'.app-shell,.app-shell.wide-view{display:block!important}.sidebar{position:static!important;width:auto!important;min-height:0!important;padding:12px 18px!important;border:0!important}.sidebar .brand,.sidebar .nav-section,.sidebar .sidebar-note,.sidebar .sidebar-bottom,.main-shell>.topbar,.page-intro,.footer{display:none!important}.sidebar nav{display:flex!important;gap:6px;flex-wrap:wrap}.nav-item{width:auto!important;min-height:40px}.main-shell{margin:0!important;width:100%!important}#main-content{padding:18px!important;max-width:none!important}.lab-grid{grid-template-columns:minmax(0,1.6fr) minmax(240px,1fr)}@media(max-width:860px){.lab-grid{grid-template-columns:1fr}.sidebar nav{justify-content:flex-start}}',
      reason:'.hero,.brand,.edition,.suite-link,body>footer,#root>footer{display:none!important}.topbar{height:auto!important;min-height:48px!important;padding:10px 20px!important;justify-content:flex-end!important;position:static!important}.top-actions{margin-left:auto}main{max-width:none!important;padding:18px!important}.studio-layout{margin-top:0!important}.notebook-toggle{display:flex!important}@media(max-width:650px){main{padding:12px!important}}',
      robotics:'body>header,.intro,main>footer{display:none!important}main{max-width:none!important;padding:18px!important}.workbench{margin-top:0!important}@media(max-width:650px){main{padding:12px!important}}',
      proof:'#root>header,.intro,#root>footer{display:none!important}main{max-width:none!important;padding:18px!important}.studio{margin-top:0!important}@media(max-width:650px){main{padding:12px!important}}',
      discovery:'.discovery-header{display:none!important}.marimo{padding-top:8px!important}'
    };
    return base+(css[id]||'');
  }
  function adapt(child,id){
    var doc=child.contentDocument;if(!doc||!doc.head)throw Error('The embedded document is unavailable.');
    if(/error response|404|not found/i.test(doc.title)||!doc.querySelector('script')||doc.body&&/^404\b/.test(doc.body.textContent.trim()))throw Error('The workspace file was not found.');
    var style=doc.createElement('style');style.id='physics-embedded-style';style.textContent=embeddedCSS(id);doc.head.appendChild(style);
    var palette=doc.createElement('link');palette.rel='stylesheet';palette.href=new URL('experience/scientific-labs-embed.css',document.baseURI).href;doc.head.appendChild(palette);doc.documentElement.dataset.physicsEngine=id;
    function syncTheme(){doc.documentElement.dataset.physicsTheme=document.documentElement.dataset.theme==='light'?'light':'dark';}
    syncTheme();if(themeObserver)themeObserver.disconnect();themeObserver=new MutationObserver(syncTheme);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    // A keyboard route out also works while focus is inside the tool.
    doc.addEventListener('keydown',function(e){if(e.altKey&&e.shiftKey&&e.key==='ArrowLeft'){e.preventDefault();back();}});
    doc.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a&&['../','index.html'].indexOf(a.getAttribute('href'))>=0&&!a.hasAttribute('download')){e.preventDefault();back();}});
  }
  function view(id){
    var t=get(id);if(!t)return;
    clear();setCrumb([{t:sectionNames[t.section],go:t.section},{t:t.name}]);nav(t.section);
    main.innerHTML='<section class="sci-workspace"><header class="sci-workspace-head"><div><button type="button" class="sci-back" id="scientific-back">← Back to '+esc(sectionNames[returnTo&&returnTo.view]||sectionNames[t.section])+'</button><p class="eyebrow">PHYSICS ENTELLOQ / '+esc(t.label.toUpperCase())+'</p><h1 id="scientific-title" tabindex="-1">'+esc(t.name)+'</h1></div><a class="sci-source" href="experience/scientific-labs-guide.html" target="_blank" rel="noopener">Sources & local setup ↗</a></header><p class="sci-boundary">'+esc(t.note)+'</p><div class="sci-frame-status" role="status" id="scientific-status">Opening '+esc(t.name)+'…</div><div id="scientific-frame-host"></div><footer class="sci-workspace-foot"><span>Download anything you want to keep before leaving this workspace. Unsaved work resets when you leave.</span><button type="button" id="scientific-reload">Reload workspace</button><small>Keyboard return: Alt + Shift + ←</small></footer></section>';
    main.querySelector('#scientific-back').addEventListener('click',back);main.querySelector('#scientific-reload').addEventListener('click',function(){view(id);});
    var child=document.createElement('iframe');frame=child;child.className='sci-frame';child.title=t.name+' scientific workspace';child.setAttribute('allow',"camera 'none'; microphone 'none'; geolocation 'none'");child.referrerPolicy='same-origin';
    function status(text,error){var s=main.querySelector('#scientific-status');if(s&&frame===child){s.textContent=text;s.classList.toggle('sci-load-error',!!error);s.hidden=false;}}
    child.addEventListener('load',function(){if(frame!==child)return;clearTimeout(loadTimer);try{adapt(child,id);status('Workspace opened. '+(id==='discovery'||id==='reason'?'The Python engine shows its own loading progress below.':'Runtime status is shown inside the tool.'));}catch(e){status('This workspace could not open. Use Reload workspace to retry, or return to '+sectionNames[t.section]+'.',true);}});
    child.addEventListener('error',function(){status('This workspace could not load. Check your connection and use Reload workspace.',true);});
    child.src=url(id);main.querySelector('#scientific-frame-host').appendChild(child);
    loadTimer=setTimeout(function(){status('This workspace is taking longer to open. Runtime downloads can take a few minutes; you can reload or return at any time.');},15000);
    titleFocus();
  }
  function open(id){if(!get(id))return;returnTo={view:curView==='scientific'?get(id).section:curView,mode:labMode,hash:location.hash,tool:id};go('scientific',id);}
  function back(){var t=returnTo||{view:get(active).section,hash:'',tool:active};restore=t.tool;labMode=t.mode||labMode;popping=true;try{history.replaceState(null,'',location.pathname+location.search+(hashId(t.hash)?'':t.hash||''));}catch(e){}go(t.view);popping=false;}
  var originalGo=go;
  // A scientific bookmark is an explicit destination; preserve study preferences.
  if(hashId(location.hash)){var earlyGate=document.getElementById('cbse-entry');if(earlyGate){if(earlyGate.open)earlyGate.close();earlyGate.remove();}}
  var originalLandingPending=Landing.pending;Landing.pending=function(){return hashId(location.hash)?false:originalLandingPending();};
  go=function(v,id){
    var deep=initial&&hashId(location.hash);initial=false;if(deep){v='scientific';id=deep;}
    if(v==='scientific'){
      if(!get(id))return;
      if(!returnTo)returnTo={view:get(id).section,mode:'labs',hash:'',tool:id};
      clear();active=id;
      if(!popping&&location.hash!=='#scientific:'+id){try{history.pushState(null,'','#scientific:'+id);}catch(e){}}
    }else{
      if(active){clear();active=null;returnTo=null;if(!popping&&hashId(location.hash)){try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}}}
    }
    originalGo(v,id);
  };
  var originalAfter=AppDesign.afterView;
  AppDesign.afterView=function(){originalAfter();if(curView==='scientific'&&active&&!frame)view(active);else{decorate();if(restore){var button=main.querySelector('[data-scientific-open="'+restore+'"]');restore=null;if(button)button.focus({preventScroll:true});}}};
  // Lab mode buttons render directly instead of going through go().
  var originalLab=viewLab;viewLab=function(){originalLab();decorate();};
  window.addEventListener('popstate',function(){var id=hashId(location.hash);if(id){popping=true;go('scientific',id);popping=false;}else if(active){popping=true;var target=returnTo||{view:get(active).section};restore=target.tool;labMode=target.mode||labMode;go(target.view);popping=false;}});
  window.addEventListener('hashchange',function(){var id=hashId(location.hash);if(id&&id!==active){popping=true;go('scientific',id);popping=false;}});
  return {get:get,url:url,hashId:hashId,open:open,back:back,view:view,decorate:decorate,embeddedCSS:embeddedCSS};
})();
