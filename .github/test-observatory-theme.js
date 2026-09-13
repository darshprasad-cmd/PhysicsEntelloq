const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),css=fs.readFileSync(path.join(root,'experience/observatory-theme.css'),'utf8');
function colour(name){return css.match(new RegExp('--obs-'+name+':(#[a-f0-9]{6})'))[1];}
function luminance(h){const rgb=h.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('Observatory text and accents remain readable on the darkest and raised surfaces',()=>{for(const ink of['ink','muted','dim','blue','gold'])for(const surface of['night','panel','raised'])assert.ok(contrast(colour(ink),colour(surface))>=4.5,ink+' on '+surface);assert.ok(contrast('#305f96','#edf2f8')>=4.5);});
test('Shared palette does not flatten scientific categories, statuses or SVG gradients',()=>{assert.doesNotMatch(css,/--(?:red|emerald|magenta|cyan|violet):/);assert.doesNotMatch(css,/\.cc-art circle\s*\{/);assert.match(css,/html\.pe-refined\[data-theme=light\]/);assert.match(css,/--pe-force:var\(--blue\)/);});
test('Persistent launch reuses the original image and stays behind content without animation',()=>{const js=fs.readFileSync(path.join(root,'experience/observatory.js'),'utf8'),markup=fs.readFileSync(path.join(root,'experience/observatory-markup.js'),'utf8');assert.match(js,/querySelector\('\.obs-continuum'\).*picture.src/);assert.match(markup,/class="obs-continuum" aria-hidden="true"/);assert.match(css,/\.obs-continuum\{position:fixed;inset:0;z-index:-1;pointer-events:none/);assert.doesNotMatch(css,/@keyframes|animation:|hue-rotate|saturate\(/);const build=fs.readFileSync(path.join(root,'.github/build-experience.js'),'utf8');assert.match(build,/'observatory.css','observatory-theme.css'/);});
test('Launch and returning-user workspace share one embedded artwork payload',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),image=fs.readFileSync(path.join(root,'assets/observatory-background.webp')).toString('base64');
  const app=fs.readFileSync(path.join(root,'experience/app-design.js'),'utf8'),markup=fs.readFileSync(path.join(root,'experience/observatory-markup.js'),'utf8');
  assert.equal(html.split(image).length-1,1,'Do not duplicate the embedded artwork');
  assert.match(markup,/src="\$\{OBSERVATORY_ARTWORK\}"/);assert.match(app,/backdrop.style.backgroundImage=.*OBSERVATORY_ARTWORK/);
  assert.match(app,/if\(!\$\('#obs-workspace'\)\)/);assert.match(app,/backdrop.setAttribute\('aria-hidden','true'\)/);
  assert.match(css,/#obs-workspace\{position:fixed;inset:0;z-index:-1;pointer-events:none/);
});
test('Workspace scrims protect shared text over even white or black image pixels',()=>{
  function composite(art,veil,alpha){const channels=h=>h.slice(1).match(/../g).map(v=>parseInt(v,16));const a=channels(art),b=channels(veil);return '#'+a.map((v,i)=>Math.round(v*(1-alpha)+b[i]*alpha).toString(16).padStart(2,'0')).join('');}
  const dark=css.match(/#obs-workspace::after\{[^}]*background:rgba\(2,5,9,([.\d]+)\)/)[1];
  const light=css.match(/\[data-theme=light\] #obs-workspace::after\{background:rgba\(237,242,248,([.\d]+)\)/)[1];
  for(const ink of['ink','muted','dim','blue','gold'])assert.ok(contrast(colour(ink),composite('#ffffff','#020509',+dark))>=4.5,ink+' over brightest photograph pixel');
  for(const ink of['#152536','#435a72','#516982','#305f96','#835d33'])assert.ok(contrast(ink,composite('#000000','#edf2f8',+light))>=4.5,ink+' over darkest light-mode pixel');
});
