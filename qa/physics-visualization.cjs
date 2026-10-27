const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { chromium } = require(
  path.join(
    process.env.CODEX_NODE_MODULES ||
      "C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
    "playwright",
  ),
);
const root = path.resolve(__dirname, ".."),
  output = path.join(root, "qa/results/physics-visualization");
fs.mkdirSync(output, { recursive: true });
const mime = {
  ".html": "text/html",
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost"),
    file = path.resolve(
      root,
      "." +
        decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
    );
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  res.setHeader(
    "Content-Type",
    mime[path.extname(file)] || "application/octet-stream",
  );
  fs.createReadStream(file)
    .on("error", () => res.writeHead(404).end())
    .pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
      headless: true,
      args: ["--enable-unsafe-swiftshader"],
    }),
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    }),
    page = await context.newPage(),
    errors = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(30000);
  try {
    await page.goto(
      "http://127.0.0.1:" + server.address().port + "/#learning:graphs",
    );
    await page.locator(".lt-frame").waitFor();
    async function theory(id) {
      await page.locator('.nav-i[data-go="lab"]').click();
      await page.locator('[data-lm="theory"]').click();
      await page.locator('[data-tid="' + id + '"]').click();
      await page.getByRole("button", { name: "Open 3D view" }).click();
      await page.locator(".pv-workspace").waitFor();
      await page.waitForFunction(
        () =>
          document.querySelector(".pv-workspace")?.__physicsVisualization
            ?.renderer.samples.length > 5,
      );
    }
    await theory("lorenz");
    let stats = await page
      .locator(".pv-workspace")
      .evaluate((e) => e.__physicsVisualization.renderer.stats());
    assert.equal(stats.webgl, true);
    assert.ok(stats.samples > 1000);
    checks.push({ name: "Actual Lorenz state renders through WebGL", stats });
    await page.screenshot({
      path: path.join(output, "lorenz-dark.png"),
      fullPage: true,
    });
    await page.getByRole("slider", { name: "Inspect sample" }).fill("200");
    assert.ok(
      (await page.locator(".pv-readout").innerText()).includes(
        "RK4 trajectory",
      ),
    );
    await page.getByLabel("Rayleigh parameter ρ", { exact: true }).fill("20");
    await page.waitForFunction(() =>
      document
        .querySelector(".pv-workspace")
        .__physicsVisualization.getSnapshot()
        .revision.startsWith("20:"),
    );
    checks.push("Original parameter changes reach the graph");
    await page
      .getByRole("button", { name: "Play simulation", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document
          .querySelector(".pv-workspace")
          .__physicsVisualization.getSnapshot().time > 20,
    );
    await page
      .getByRole("button", { name: "Pause simulation", exact: true })
      .click();
    const t = await page
      .locator(".pv-workspace")
      .evaluate((e) => e.__physicsVisualization.getSnapshot().time);
    await page.waitForTimeout(150);
    assert.equal(
      await page
        .locator(".pv-workspace")
        .evaluate((e) => e.__physicsVisualization.getSnapshot().time),
      t,
    );
    checks.push("Playback pause stops model time");
    await page
      .getByRole("button", { name: "Two-dimensional projection" })
      .click();
    assert.equal(
      await page
        .locator(".pv-workspace")
        .evaluate((e) => e.__physicsVisualization.renderer.mode),
      "2d",
    );
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width < 1000 ? 844 : 1000 });
      for (const theme of ["dark", "light"]) {
        await page.evaluate(
          (t) => (document.documentElement.dataset.theme = t),
          theme,
        );
        await page.waitForFunction(
          (t) => document.querySelector(".pv-workspace").dataset.theme === t,
          theme,
        );
        assert.ok(
          await page
            .locator(".pv-lab-overlay")
            .evaluate((e) => e.scrollWidth <= e.clientWidth + 2),
          "No dialog overflow at " + width,
        );
        await page.screenshot({
          path: path.join(output, "lorenz-" + width + "-" + theme + ".png"),
          fullPage: true,
        });
      }
    }
    checks.push("320/390/768/1440px fit in both themes");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: /Back to experiment/ }).click();
    assert.equal(await page.locator(".pv-workspace").count(), 0);
    for (const id of ["phase-space", "vector-calculus"]) {
      await theory(id);
      await page.screenshot({
        path: path.join(output, id + ".png"),
        fullPage: true,
      });
      checks.push({
        name: id,
        stats: await page
          .locator(".pv-workspace")
          .evaluate((e) => e.__physicsVisualization.renderer.stats()),
      });
      await page.getByRole("button", { name: /Back to experiment/ }).click();
    }
    // Run real UI entry points, not a separate demonstration scene.
    for (const id of ["wave", "fields", "bloch"]) {
      await page.locator('.nav-i[data-go="lab"]').click();
      await page.locator('[data-lm="play"]').click();
      assert.equal(
        await page.locator(".thumb .pv-entry,.xg-thumb .pv-entry").count(),
        0,
      );
      await page.locator('[data-sim="' + id + '"]').click();
      await page
        .locator("#lf-ctl")
        .getByRole("button", { name: "Open 3D view" })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector(".pv-workspace")?.__physicsVisualization
            ?.renderer.samples.length > 10,
      );
      const numerical = await page
        .locator(".pv-workspace")
        .evaluate((el, id) => {
          const s = el.__physicsVisualization.getSnapshot();
          if (id === "wave") {
            const W = s.sourceExtent[0],
              H = s.sourceExtent[1],
              x = W * 0.4,
              y = H * 0.2;
            return Math.abs(
              s.surface.sample(x, y) -
                (Math.sin(
                  Math.hypot(x - W * 0.34, y - H * 0.5) * 0.32 - s.time,
                ) +
                  Math.sin(
                    Math.hypot(x - W * 0.66, y - H * 0.5) * 0.32 - s.time,
                  )),
            );
          }
          if (id === "bloch")
            return Math.abs(Math.hypot(...s.particles[0].point) - 1);
          return Math.abs(
            s.surface.sample(s.bounds[0][1] / 2, s.bounds[1][1] / 2),
          );
        }, id);
      assert.ok(numerical < 1e-8, id + " analytical agreement");
      if (id === "fields") {
        await page
          .getByLabel("Second charge (model)", { exact: true })
          .fill("1");
        await page.waitForFunction(
          () =>
            document
              .querySelector(".pv-workspace")
              .__physicsVisualization.getSnapshot()
              .surface.sample(100, 100) > 0,
        );
      }
      await page.screenshot({
        path: path.join(output, id + ".png"),
        fullPage: true,
      });
      checks.push(id + " original model renders with analytical agreement");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".pv-workspace").count(), 0);
      assert.ok(await page.locator("#lab-full.on").isVisible());
      await page.locator("#lf-close").click();
    }
    await page.locator('.nav-i[data-go="adv"]').click();
    await page.locator('[data-studio-open="maxwell-waves"]').first().click();
    await page.locator("#studio-enter").click();
    await page.getByRole("button", { name: "Open 3D view" }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".pv-workspace")?.__physicsVisualization
          ?.renderer.samples.length > 800,
    );
    await page.getByLabel("Relative permittivity", { exact: true }).fill("2");
    await page
      .getByRole("button", { name: "Play simulation", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document
          .querySelector(".pv-workspace")
          .__physicsVisualization.getSnapshot().time > 20,
    );
    await page
      .getByRole("button", { name: "Pause simulation", exact: true })
      .click();
    const yee = await page.locator(".pv-workspace").evaluate((el) => {
      const s = el.__physicsVisualization.getSnapshot();
      return { e: s.lines[0].points, h: s.lines[1].points };
    });
    assert.equal(yee.e.length, 460);
    assert.equal(yee.h.length, 459);
    assert.equal(yee.h[0][0], 0.5);
    assert.ok(yee.e.some((p) => Math.abs(p[1]) > 1e-5));
    await page.screenshot({
      path: path.join(output, "maxwell.png"),
      fullPage: true,
    });
    checks.push(
      "Actual staggered Yee-grid samples and delegated material parameter",
    );
    await page.getByRole("button", { name: /Back to experiment/ }).click();
    await page.locator('.nav-i[data-go="sandbox"]').click();
    await page.getByRole("button", { name: "Open 3D view" }).click();
    await page.waitForFunction(() =>
      document
        .querySelector(".pv-workspace")
        ?.__physicsVisualization?.getSnapshot(),
    );
    assert.ok(
      await page
        .locator(".pv-workspace")
        .evaluate((el) =>
          el.__physicsVisualization
            .getSnapshot()
            .particles.every((p) => p.point[2] === 0),
        ),
    );
    await page.getByRole("button", { name: /Back to experiment/ }).click();
    checks.push(
      "Sandbox snapshot stays planar and returns to original builder",
    );
    await page.goto(
      "http://127.0.0.1:" + server.address().port + "/#learning:graphs",
    );
    const frame = page.frameLocator(".lt-frame");
    await frame.getByRole("button", { name: "Inspect motion in 3D" }).click();
    await frame.locator(".pv-workspace").waitFor();
    await frame
      .locator(".pv-workspace")
      .getByLabel("Upward velocity (m/s)", { exact: true })
      .fill("10");
    await frame
      .locator(".pv-workspace")
      .getByLabel("Gravity (m/s²)", { exact: true })
      .fill("10");
    await page.waitForTimeout(60);
    assert.ok(
      await frame.locator(".pv-workspace").evaluate((el) => {
        const s = el.__physicsVisualization.getSnapshot(),
          p = s.lines[0].points;
        return (
          Math.abs(p[150][1] - 5) < 1e-8 &&
          Math.abs(p.at(-1)[1]) < 1e-8 &&
          p.every((p) => p[2] === 0)
        );
      }),
    );
    await frame
      .getByRole("button", { name: "Return to motion diagrams", exact: false })
      .click();
    await frame
      .getByRole("button", {
        name: "Surfaces & parametric curves",
        exact: true,
      })
      .click();
    await frame.locator(".pv-workspace").waitFor();
    await frame.getByLabel("Surface expression", { exact: true }).fill("1..2");
    await frame
      .getByRole("button", { name: "Plot expression", exact: true })
      .click();
    assert.match(
      await frame.locator(".pv-expressions").innerText(),
      /explicit operator/,
    );
    await frame
      .getByLabel("Surface expression", { exact: true })
      .fill("x^2+y^2");
    await frame
      .getByRole("button", { name: "Plot expression", exact: true })
      .click();
    await frame.getByLabel("Graph type", { exact: true }).selectOption("curve");
    await frame
      .getByRole("button", { name: "Plot expression", exact: true })
      .click();
    checks.push(
      "Embedded projectile analytical agreement, expression validation, surface and curve modes",
    );
    await page.goto(
      "http://127.0.0.1:" + server.address().port + "/#scientific:reality",
    );
    const reality = page.frameLocator(".sci-frame");
    await reality
      .getByRole("button", { name: "Inspect model in 3D", exact: true })
      .click();
    await reality.locator(".pv-workspace").waitFor();
    assert.ok(
      await reality
        .locator(".pv-workspace")
        .evaluate(
          (el) =>
            el.__physicsVisualization.getSnapshot().lines[0].points.length >
            100,
        ),
    );
    await page.screenshot({
      path: path.join(output, "reality.png"),
      fullPage: true,
    });
    await reality
      .getByRole("button", { name: "Return to apparatus", exact: true })
      .click();
    assert.equal(await reality.locator(".pv-workspace").count(), 0);
    checks.push(
      "React Reality Lab uses existing numerical samples and unmounts",
    );
    await theory("lorenz");
    await page.evaluate(()=>{
      window.graphCameraRequests=0;
      window.Hands=class {setOptions(){}onResults(){}close(){return Promise.resolve();}};
      navigator.mediaDevices.getUserMedia=()=>{window.graphCameraRequests++;return Promise.reject(new DOMException('Synthetic denial','NotAllowedError'));};
    });
    assert.equal(await page.evaluate(()=>window.graphCameraRequests),0);
    await page.getByRole('button',{name:'Enable optional webcam graph navigation'}).click();
    await page.waitForFunction(()=>document.querySelector('.pv-status').textContent.includes('denied'));
    assert.equal(await page.evaluate(()=>window.graphCameraRequests),1);
    assert.equal(await page.locator('#uni-hand-cam').count(),0);
    checks.push('Webcam is opt-in; denied access returns to usable non-gesture controls');
    const perf=await page.locator('.pv-workspace').evaluate(el=>{
      const view=el.__physicsVisualization,s=view.getSnapshot(),times=[];
      for(let i=0;i<30;i++){const start=performance.now();view.renderer.update(s,48);times.push(performance.now()-start);}
      times.sort((a,b)=>a-b);return {medianMs:times[15],p95Ms:times[28],renderer:'headless Chromium SwiftShader',stats:view.renderer.stats()};
    });
    checks.push({name:'Bounded renderer timing sample (not a hardware FPS claim)',...perf});
    // Simulated context loss must retain data and stop time, then recover.
    await page.locator(".pv-workspace").evaluate((el) => {
      window.testGraph = el.__physicsVisualization;
      window.testGraph.renderer.renderer.forceContextLoss();
    });
    await page.waitForFunction(() => window.testGraph.renderer.lost);
    assert.ok(await page.locator(".pv-fallback").isVisible());
    assert.equal(
      await page
        .getByRole("button", { name: "Play simulation", exact: true })
        .count(),
      1,
    );
    await page
      .locator(".pv-workspace")
      .evaluate((el) =>
        el.__physicsVisualization.renderer.renderer.forceContextRestore(),
      );
    await page.waitForFunction(() => !window.testGraph.renderer.lost);
    await page.getByRole("button", { name: /Back to experiment/ }).click();
    assert.ok(
      await page.evaluate(
        () =>
          window.testGraph.renderer.disposed &&
          window.testGraph.renderer.items.size === 0,
      ),
    );
    checks.push("Context loss, 2D fallback, restore and GPU resource disposal");
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Open 3D view" }).click();
      await page.waitForFunction(
        () =>
          document.querySelector(".pv-workspace")?.__physicsVisualization
            ?.renderer.samples.length > 1000,
      );
      await page.getByRole("button", { name: /Back to experiment/ }).click();
    }
    assert.equal(await page.locator(".pv-workspace").count(), 0);
    checks.push("Repeated graph mount/unmount");
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type.startsWith("webgl")
          ? null
          : original.call(this, type, ...args);
      };
    });
    await page.goto(
      "http://127.0.0.1:" + server.address().port + "/#learning:graphs",
    );
    await page.reload();
    await theory("vector-calculus");
    assert.equal(
      await page
        .locator(".pv-workspace")
        .evaluate((el) => el.__physicsVisualization.renderer.stats().webgl),
      false,
    );
    assert.ok(await page.locator(".pv-fallback").isVisible());
    await page.getByRole("slider", { name: "Inspect sample" }).fill("5");
    assert.ok(
      (await page.locator(".pv-readout").innerText()).includes("Streamline"),
    );
    checks.push(
      "WebGL unavailable: field/streamline fallback and numerical inspection",
    );
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ checks, errors }, null, 2));
    fs.writeFileSync(
      path.join(output, "report.json"),
      JSON.stringify({ at: new Date().toISOString(), checks, errors }, null, 2),
    );
  } catch (e) {
    await page
      .screenshot({ path: path.join(output, "failure.png"), fullPage: true })
      .catch(() => {});
    console.error({
      errors,
      body: (await page.locator("body").innerText()).slice(-1800),
    });
    throw e;
  } finally {
    await context.close();
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
