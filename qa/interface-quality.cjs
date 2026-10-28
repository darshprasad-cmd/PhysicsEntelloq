const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.CODEX_NODE_MODULES||'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));
const root=path.resolve(__dirname,'..'),baseline=process.argv.includes('--baseline');
const output=path.join(root,'qa/results/interface-quality',baseline?'before':'after');fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).on('error',()=>res.writeHead(404).end()).pipe(res);});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:2,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],measurements=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
  // Test native fallback-font layouts too; external sign-in/AI are not part of UI QA.
  await context.route(/^https?:\/\/(?!127\.0\.0\.1(?::|\/))/,r=>r.abort());
  async function go(route){
    if(await page.locator('.side').isVisible())await page.locator('.side .nav-i[data-go="'+route+'"]').first().click();
    else if(['home','universe','learn','lab','progress'].includes(route))await page.locator('.mtab [data-go="'+route+'"]').click();
    else {await page.locator('#pe-explore').click();await page.locator('[data-explore-go="'+route+'"]').click();}
    await page.waitForTimeout(70);
  }
  async function measure(route,theme,width){
    const m=await page.evaluate(()=>{
      const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
      const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};};
      const ring=document.querySelector('.lv-ring'),number=document.querySelector('#lv-n'),svg=ring.querySelector('svg');
      const ringBoxes=visible(ring)?{ring:box(ring),number:box(number),svg:box(svg),card:box(document.querySelector('.lv-card')),launcher:box(document.querySelector('#eqx-fab'))}:null;
      const elements=Array.from(document.querySelectorAll('#main button,#main h1,#main h2,#main h3,#main p,#main input,.side-card,.topbar'));
      return {ring:ringBoxes,pageOverflow:document.querySelector('#main-scroll').scrollWidth-innerWidth+(innerWidth>850?224:0),
        clipped:elements.filter(visible).filter(el=>el.scrollWidth>el.clientWidth+3&&getComputedStyle(el).overflowX==='visible').slice(0,18).map(el=>({selector:el.tagName+'.'+el.className,text:el.textContent.slice(0,75),width:el.clientWidth,scroll:el.scrollWidth})),
        canvases:Array.from(document.querySelectorAll('#main canvas')).filter(visible).map(el=>({class:el.className,backing:[el.width,el.height],display:[el.clientWidth,el.clientHeight]}))};
    });
    measurements.push({route,theme,width,...m});
    if(!baseline){assert.ok(m.pageOverflow<=2,route+' page overflow '+width);if(m.ring){assert.ok(Math.abs(m.ring.number.cx-m.ring.svg.cx)<.6,'Progress horizontal center');assert.ok(Math.abs(m.ring.number.cy-m.ring.svg.cy)<.6,'Progress vertical center');assert.ok(m.ring.card.y+m.ring.card.height+8<=m.ring.launcher.y,'Launcher does not cover progress');}}
    if(width===1440&&theme==='dark'||width===390&&theme==='light')await page.screenshot({path:path.join(output,route+'-'+theme+'-'+width+'.png')});
  }
  try{
    await page.goto('http://127.0.0.1:'+server.address().port+'/#learning:graphs',{waitUntil:'domcontentloaded'});
    for(const theme of ['dark','light']){
      await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
      for(const width of [1440,768,390,320]){
        await page.setViewportSize({width,height:1000});
        for(const route of ['home','universe','learn','solve','practice','lab','sandbox','research','progress','settings']){
          await go(route);await measure(route,theme,width);
        }
        await go('lab');await page.locator('[data-lm="graphs"]').click();await page.locator('.pv-workspace').waitFor();await measure('graphs',theme,width);
      }
    }
    if(!baseline){
      // Actual glyph bounds as well as the enclosing grid: narrow and full values.
      for(const height of [600,720])for(const theme of ['dark','light']){
        await page.setViewportSize({width:1120,height});await go('home');
        await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
        const original=await page.locator('#lv-n').textContent();
        for(const value of ['0%','9%','42%','100%']){
          const geometry=await page.evaluate(value=>{
            const n=document.querySelector('#lv-n');n.textContent=value;
            const range=document.createRange();range.selectNodeContents(n);
            const text=range.getBoundingClientRect(),ring=n.parentElement.getBoundingClientRect();
            return {dx:Math.abs(text.x+text.width/2-ring.x-ring.width/2),dy:Math.abs(text.y+text.height/2-ring.y-ring.height/2),textWidth:text.width};
          },value);
          assert.ok(geometry.dx<.6&&geometry.dy<2.1&&geometry.textWidth<36,'Centred glyphs: '+JSON.stringify({value,...geometry}));
        }
        await page.locator('#lv-n').evaluate((n,t)=>n.textContent=t,original);
        await measure('short-window-'+height,theme,1120);
        await page.locator('.lv-card').focus();await page.keyboard.press('Enter');
        await page.waitForFunction(()=>document.body.dataset.view==='progress');
        const focus=await page.locator('.lv-card').evaluate(el=>{el.focus();return getComputedStyle(el).outlineStyle;});
        assert.equal(focus,'solid','Map card retains a visible keyboard focus indicator');
      }
      await page.setViewportSize({width:390,height:844});await go('settings');
      for(const theme of ['light','dark']){
        await page.locator('.st-th[data-th="'+theme+'"]').click();
        await page.waitForFunction(()=>document.querySelector('#toast').classList.contains('on'));
        const layout=await page.evaluate(()=>{
          const toast=document.querySelector('#toast'),r=toast.getBoundingClientRect();
          const controls=['#eqx-fab','#tutor-fab','.mtab'].map(s=>document.querySelector(s).getBoundingClientRect().top);
          const group=document.querySelector('.st-sty').parentElement;
          return {theme:document.documentElement.dataset.theme,toastBottom:r.bottom,controlTop:Math.min(...controls),x:r.x,right:r.right,gap:parseFloat(getComputedStyle(group).rowGap),xpWrap:getComputedStyle(toast.querySelector('.xp')).whiteSpace};
        });
        assert.equal(layout.theme,theme);assert.ok(layout.toastBottom+8<=layout.controlTop,'Toast clears mobile controls');
        assert.ok(layout.x>=15&&layout.right<=375,'Toast stays within mobile viewport');
        assert.ok(layout.gap>=8,'Wrapped settings rows keep their spacing');assert.equal(layout.xpWrap,'nowrap');
        await page.screenshot({path:path.join(output,'settings-toast-'+theme+'.png')});
      }
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({baseline,at:new Date().toISOString(),measurements,errors},null,2));
    console.log(JSON.stringify({baseline,pages:measurements.length,issues:measurements.filter(m=>m.pageOverflow>2||m.clipped.length).map(({route,theme,width,pageOverflow,clipped})=>({route,theme,width,pageOverflow,clipped})),ring:measurements[0].ring,errors},null,2));
  }finally{await context.close();await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
