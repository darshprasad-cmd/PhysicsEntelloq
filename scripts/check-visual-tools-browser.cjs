/* Exercise real visual engines through the published Physics adapter. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const modules = process.env.CODEX_NODE_MODULES || 'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium} = require(path.join(modules, 'playwright'));
const live = process.env.ENTELLOQ_LIVE_URL;
const evidence = path.join(root, 'docs/visual-tools');
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.mp4':'video/mp4', '.vtt':'text/vtt', '.woff2':'font/woff2'};
fs.mkdirSync(evidence, {recursive:true});
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end('Not found');
    const size = fs.statSync(file).size;
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
    const start = range ? Number(range[1]) : 0;
    const end = range && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) return res.writeHead(416, {'Content-Range':`bytes */${size}`}).end();
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', end - start + 1);
    if (range) res.writeHead(206, {'Content-Range':`bytes ${start}-${end}/${size}`});
    fs.createReadStream(file, {start, end}).pipe(res);
  } catch (error) { res.writeHead(500).end(error.message); }
});

(async () => {
  if (!live) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = live ? new URL(live).origin : `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:1000}, reducedMotion:'reduce', acceptDownloads:true});
  const page = await context.newPage();
  const checks = [], errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  page.setDefaultTimeout(45000);
  async function currentFrame(panel) {
    await page.locator('.lt-frame').waitFor();
    const child = await (await page.locator('.lt-frame').elementHandle()).contentFrame();
    await child.locator(panel === 'sketches' ? '#sketch-app .excalidraw' : '#animation-app #lesson-video').waitFor({state:panel === 'sketches' ? 'visible' : 'attached'});
    await page.waitForFunction(() => document.querySelector('#learning-status')?.dataset.error === 'false');
    return child;
  }
  async function open(panel) {
    await page.goto(base + '/#learning:' + panel, {waitUntil:'domcontentloaded'});
    return currentFrame(panel);
  }
  async function exportScene(frame) {
    const pending = page.waitForEvent('download');
    await frame.getByRole('button', {name:'Export scene',exact:true}).click();
    const download = await pending;
    return JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  }
  try {
    let sketch = await open('sketches');
    assert.match(await page.locator('.lt-workspace header').innerText(), /not computed forces/);
    page.once('dialog', dialog => dialog.accept());
    await sketch.getByRole('button', {name:'Force diagram',exact:true}).click();
    const starter = await exportScene(sketch);
    await sketch.locator('label').filter({has:sketch.locator('[data-testid="toolbar-rectangle"]')}).click();
    const board = await sketch.locator('canvas.interactive').boundingBox();
    const x = board.x + board.width * 0.72, y = board.y + board.height * 0.3;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+65,y+55,{steps:8});await page.mouse.up();
    const first = await exportScene(sketch);
    assert.ok(Array.isArray(first.elements) && first.elements.length > starter.elements.length);
    assert.ok(first.elements.some(element => element.type === 'arrow'));
    checks.push('A fresh Physics bookmark opens genuine Excalidraw; pointer drawing changes the exported editable force diagram');

    await page.reload({waitUntil:'domcontentloaded'});
    sketch = await currentFrame('sketches');
    const restored = await exportScene(sketch);
    assert.deepEqual(restored.elements.map(element => element.id), first.elements.map(element => element.id));
    checks.push('The visual scene survives an actual host reload');

    await page.evaluate(() => document.documentElement.dataset.theme = 'light');
    await sketch.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    assert.ok(await sketch.evaluate(() => document.documentElement.style.getPropertyValue('--accent')));
    await page.screenshot({path:path.join(evidence, 'physics-sketches-light.png'),fullPage:true});
    checks.push('Host light theme and actual application colour tokens reach the visual notebook');

    for (const width of [768,390]) {
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
      assert.ok(await sketch.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    }
    await page.locator('.main').evaluate(main => main.scrollTop = 0);
    await sketch.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({path:path.join(evidence, 'physics-sketches-mobile.png'),fullPage:true});
    checks.push('The embedded drawing workspace fits tablet and mobile widths');
    await page.setViewportSize({width:1440,height:1000});

    await page.locator('#learning-back').click();
    await page.locator('[data-learning-open="sketches"]').waitFor();
    assert.equal(await page.locator('.lt-frame').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.learningOpen), 'sketches');
    for (const section of ['solve','lab','research']) {
      await page.locator('.nav-i[data-go="'+section+'"]').click();
      assert.equal(await page.locator('[data-learning-open="sketches"]').count(), 1);
    }
    checks.push('Visual notebook is reachable from Solve, Lab and Research; Back restores its section and keyboard focus');

    const mediaStart = requests.length;
    let animation = await open('animations');
    await animation.waitForFunction(() => {const image=document.querySelector('#lesson-poster');return image.complete&&image.naturalWidth===1280&&image.naturalHeight===720;});
    await animation.locator('#still-alternative summary').click();
    for (const image of await animation.locator('#still-grid img').all()) {
      await image.scrollIntoViewIfNeeded();
      await animation.waitForFunction(id => {const image=document.querySelectorAll('#still-grid img')[id];return image.complete&&image.naturalWidth===1280&&image.naturalHeight===720;},await image.evaluate(el => [...el.closest('#still-grid').querySelectorAll('img')].indexOf(el)));
    }
    await animation.locator('#still-alternative summary').click();
    await animation.locator('#lesson-title').scrollIntoViewIfNeeded();
    checks.push('The overview poster and all four authored stills decode at full resolution before any video request');
    assert.equal(await animation.locator('#lesson-video').evaluate(video => video.paused), true);
    assert.equal(requests.slice(mediaStart).some(url => /\.mp4(?:$|\?)/.test(url)), false);
    assert.match(await page.locator('.lt-workspace header').innerText(), /does not run a live simulation/);
    if (!await animation.locator('#transcript').evaluate(details => details.open)) await animation.locator('#transcript summary').click();
    assert.ok((await animation.locator('#transcript').innerText()).length > 100);
    await animation.locator('#play-button').click();
    await animation.waitForFunction(() => {
      const video = document.querySelector('#lesson-video');
      return !video.paused && video.currentTime > 0.15 && video.videoWidth > 0;
    });
    await animation.locator('#play-button').click();
    assert.equal(await animation.locator('#lesson-video').evaluate(video => video.paused), true);
    assert.ok((await animation.locator('#caption-text').innerText()).trim().length > 5);
    checks.push('An authored Manim video stays unloaded until Play, decodes real frames and exposes captions and a transcript');

    const chapters = animation.locator('#chapters button[data-time]');
    assert.ok(await chapters.count() > 1);
    const time = Number(await chapters.nth(1).getAttribute('data-time'));
    await chapters.nth(1).click();
    await animation.waitForFunction(time => Math.abs(document.querySelector('#lesson-video').currentTime - time) < 0.5, time);
    assert.ok(await animation.locator('#still-grid img').count() > 0);
    await page.screenshot({path:path.join(evidence, 'physics-animation.png'),fullPage:true});
    checks.push('Chapter navigation seeks the actual rendered video and still frames provide a reduced-motion alternative');

    for (const width of [768,390]) {
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
      assert.ok(await animation.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    }
    await page.locator('.main').evaluate(main => main.scrollTop = 0);
    await animation.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({path:path.join(evidence, 'physics-animation-mobile.png'),fullPage:true});
    checks.push('Animation workspace and embedded lesson fit tablet and mobile widths with reduced motion');

    await animation.locator('#play-button').click();
    await animation.waitForFunction(() => !document.querySelector('#lesson-video').paused);
    await animation.locator('#play-button').focus();
    await page.keyboard.press('Alt+Shift+ArrowLeft');
    await page.locator('[data-learning-open="animations"]').waitFor();
    assert.equal(await page.locator('.lt-frame').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.learningOpen), 'animations');
    assert.ok(animation.isDetached());
    checks.push('Keyboard return removes the playing media document, returns to Learn and restores focus');

    await page.route('**/assets/learning-tools/animations/index.html*', route => route.fulfill({status:404,contentType:'text/html',body:'<!doctype html><title>Missing lesson</title>'}));
    await page.goto(base + '/#learning:animations', {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('#learning-status')?.dataset.error === 'true');
    assert.equal(await page.locator('#learning-reload').isVisible(), true);
    checks.push('Missing visual assets report a recoverable error with Reload and Back controls');

    assert.deepEqual(errors, []);
    const result = {checkedAt:new Date().toISOString(),live:live || null,checks,errors};
    fs.writeFileSync(path.join(evidence, (live ? 'live' : 'source') + '-checks.json'), JSON.stringify(result,null,2) + '\n');
    console.log(JSON.stringify(result,null,2));
  } catch (error) {
    await page.screenshot({path:path.join(evidence,'integration-failure.png'),fullPage:true}).catch(() => {});
    console.error(JSON.stringify({errors,frames:page.frames().map(frame => frame.url()),body:(await page.locator('body').innerText()).slice(0,1800)},null,2));
    throw error;
  } finally {
    await context.close();
    await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
