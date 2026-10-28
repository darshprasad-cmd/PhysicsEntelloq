# Shared Physics Visualization Engine

## Purpose and integration

### Lab Graphs placement correction (28 October 2026)

Lab → Graphs now opens the shared 3D surface/parametric workspace directly, not a modal behind the original 2D graph. An adjacent keyboard-accessible **2D curves** tab retains the original parser, sliders and canvas. Both editors retain their entries during tab switches; this does not add cross-session saving. Equations/domain controls collapse on narrow hosts. The graph and observers are disposed on navigation, including navigation during import. A failed module download has a working retry with a fresh import URL.

| Before | After | Why |
| --- | --- | --- |
| Lab Graphs opened only the 2D editor with a secondary 3D launch button | Embedded 3D graphs selected on entry, with an adjacent 2D curves tab | Put 3D graphing in the requested section without hiding the original tools. |
| Equation controls consumed most of a phone viewport | Collapsible equations and a compact mobile canvas | Keep the actual graph visible and the page scrollable. |

Changed: `experience/visualization-labs.js`, `experience/visualization-labs.css`, generated `index.html`, `qa/physics-visualization.cjs`, `.github/test-cbse-preservation.js`, and immutable adapter/style fixtures under `.github/fixtures/visualization-baseline-fd8794c/`. No scientific equations, engine bundle, saved-work keys, hand tracking, or deployment configuration changed.

Validation: 301 Node checks passed. The complete visualization browser suite passed with zero page errors, including the real Lab → Graphs navigation, numerical surface/curve checks, both themes at 320/390/768/1440 pixels, retained edits, keyboard switching, download retry, navigation during load, WebGL fallback and disposal. Local browser coverage is headless Chromium, not physical-device testing.

A locally bundled Three.js engine adds spatial inspection to existing experiments. It is not a new app, a replacement solver, or a wholesale conversion of plots into 3D. Ordinary function/time-series/error plots, the original Sandbox apparatus, learning lenses, launch page, founder material, accounts, and saved-work keys remain intact.

The implementation follows the approved audit in ARCHITECTURE-REVIEW.md. The main app is vanilla JavaScript, the motion workspace uses ES modules/JSXGraph, and Reality Lab uses React. All three use the same lazy ES-module renderer without adding a frontend framework.

| Existing entry | Added view | Scientific boundary |
| --- | --- | --- |
| Lab → Theory → Lorenz | Actual RK4 XYZ trail, current state and ρ | Normalized state/time; the repeatedly renormalized Lyapunov perturbation is not plotted as an independent orbit. |
| Lab → Theory → Phase space | Pendulum Hamiltonian surface with existing energy orbits | Height is normalized energy, not spatial height. |
| Lab → Theory → Vector calculus | Instanced arrows, integral streamlines and local values | Planar normalized fields at z = 0; arrow length indicates direction, not magnitude. |
| Lab → Playground → Wave interference | Resolved, adjustable central window of the original two-source scalar field | Pixel coordinates, normalized amplitude, phase in radians; no invented SI wave speed or attenuation. Mesh sampling tracks wavelength. |
| Lab → Playground → Electric field lines | Softened potential landscape and original E vectors | Existing 9000q/(r²+60) kernel; pixel/model units, not metres/volts. |
| Lab → Playground → Bloch sphere | Unit-sphere great circles, state vector and precession | Dimensionless state space, not a particle moving in real space. |
| Advanced Studio → Fields & electrodynamics | Orthogonal E/H view of the existing Yee grid | Integer E cells, half-cell/half-time H staggering; transverse axes are normalized amplitudes. |
| Sandbox | Live body coordinates and bounded recorded trails | Read-only inspection; planar original dynamics and existing constraints. Cat's Cradle reports cm; other scenes retain model units and downward y. |
| Learn → Vectors & graphs / Lab → Graphs | Projectile inspection and authored surfaces/parametric curves | Projectile shares the existing analytic model. Authored mathematics is explicitly in arbitrary units. |
| Research → Reality Lab | Spatial inspection of existing numerical samples | No reconstruction of video depth; observation and time-series comparisons remain unchanged. |

Each eligible lab has an **Open 3D view** action; returning restores the existing experiment. Static thumbnail previews do not create graph contexts. Lab parameter changes are delegated to their existing owners. The wave view additionally has a display-only window-span control. Reality Lab retains its existing surrounding transport and experiment controls.

## Architecture and public interface

`assets/physics-visualization/engine.mjs` exports `mount`, `mountExplorer`, `cartesian`, `coordinates`, `streamline`, `surfaceGrid`, and `sampleCurve`.

```js
const {mount} = await import('/assets/physics-visualization/engine.mjs');
const view = mount(element, {
  title: 'Experiment name',
  description: 'Units, assumptions and approximation limits.',
  getSnapshot: () => modelSnapshot,
  subscribe: notify => model.subscribe(notify), // returns unsubscribe
  parameters: [{label:'Mass', unit:'kg', min:0.1, max:10, step:0.1,
    get: () => model.mass, set: value => model.setMass(value)}],
  isPlaying: () => model.playing,
  setPlaying: value => model.setPlaying(value),
  setSpeed: multiplier => model.setSpeed(multiplier),
  reset: () => model.reset()
});
// React cleanup / route leave:
view.dispose();
```

Optional controls only appear when their adapter supports them. A static field does not pretend to have a physical playback clock. `invalidate(true)` forces a redraw after external React props change.

A snapshot contains:

- `revision`: stable string/number changed when model geometry changes.
- Three `axes`: `{label, unit, dimension?}` and three finite increasing `bounds`.
- Optional `time` and `timeUnit` (seconds only for real SI model time).
- `lines`: labelled arrays of Cartesian triples. Invalid samples break a line; they are not connected across a gap.
- `particles`: `{point:[x,y,z], label}`; `vectors`: `{origin, value}`.
- `surface`: `{domain:[[x0,x1],[y0,y1]], sample(x,y), range?, minResolution?, label}`.
- `field(x,y,z)` and `seeds` for bounded adaptive RK4 direction streamlines.
- `coordinateCompatible:false` for mixed physical dimensions such as position/potential or angle/angular velocity/energy.
- Optional `displayScale`, used only to compress nonspatial wave amplitude visually. Readouts remain model values.

Convert cylindrical `[ρ,φ,z]` or spherical `[r,θ,φ]` inputs with `cartesian(point, system)` before publishing. The inspector provides inverse readouts. θ is polar angle from +z, φ is azimuth in radians. Undefined origin/pole angles are reported as undefined. Equal spatial units use uniform scaling; mixed dimensions are independently scaled and cannot yield a bogus Euclidean distance. Measurement reports coordinate deltas instead.

The renderer does not mutate the model arrays. GPU Float32 geometry is a display representation; inspection/export uses the CPU numerical data. Surface clicking evaluates the surface at the selected coordinates, rather than presenting a triangle interpolation as exact physics. The sample slider and numerical table provide non-pointer inspection.

## Model timing and ownership

The legacy integration publishes reversible, scoped hooks into the original closures. These expose computed values without moving equations into the renderer. Lorenz/phase-space retain their fixed numerical step sizes. Existing wave/Bloch/Maxwell updates are scheduled at their original nominal 60-Hz step rate instead of advancing as a side effect of drawing. Wall-time accumulation is capped; slow rendering never enlarges a solver's dt.

Playback, speed and reset are model commands. Rendering has no independent animation timeline. Hidden-page playback pauses; graph-owned animation frames and gesture navigation stop. Reopening or resuming does not silently restart a webcam. Sandbox body creation, double pendulum, Atwood machine and other scene controls are untouched.

Optional hand navigation in Lorenz reuses the existing UniHands/MediaPipe pipeline, on explicit request only. It temporarily owns that navigation adapter, restores the prior binding on exit and stops camera tracks on cancellation/denial/leave. Opening the Sandbox inspector stops hand manipulation of its now-hidden apparatus; it never starts a competing camera pipeline. The original hand builder remains the place to add/manipulate objects.

## Rendering, resilience and performance

- Pinned Three.js 0.186.1, bundled locally with esbuild 0.28.2; no new graph CDN request. Three.js licence is retained. Load occurs only on opening a graph.
- One WebGL context per mounted graph; instanced particles and vector shafts/heads; reusable position/color/index buffers; bounded trails and field sampling.
- Surface detail 24/48/80 with adaptive reduction after repeated slow updates. Wavelength-aware wave sampling has a correctness floor (bounded at 256 segments). The underlying solver accuracy is never reduced by this setting.
- Capped device pixel ratio, no decorative render loop, revision-based updates, coalesced invalidation, ResizeObserver, explicit disposal of controls/geometries/materials/instance resources/context/listeners.
- WebGL unavailability or context loss preserves a Canvas2D projection, field arrows/streamlines, particle positions, numerical inspection and export. Context loss pauses playback; restoring graphics does not silently resume it.
- Fullscreen scientific workspace, collapsible controls, stable light/dark palettes, labels/units, explicit camera-navigation mode so ordinary scrolling remains available. Mouse/trackpad/touch camera controls have button and keyboard alternatives.
- Expressions use a bounded recursive-descent grammar, not `eval`. Inputs have finite range checks; non-finite samples are masked. Finite sampling can still miss poles or narrow features: expression plots are numerical visualizations, not symbolic proofs.

Primary library references: [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html).

## Design review

| Before | After | Why |
| --- | --- | --- |
| Independent lab canvases and isolated controls | One restrained scientific workspace with shared inspect, measure, camera and transport controls | Transferable interactions without replacing accepted apparatus. |
| Potential, phase and spatial coordinates easy to conflate | Named units, dimension-aware measurement and model assumptions | Make the physical meaning explicit. |
| 3D button initially overlapped the legacy full-stage canvas | Entry action lives in the experiment control bar | Remains visible and clickable without blocking manipulation. |
| Coarse full-field wave mesh aliased fine ripples | Adjustable central window with wavelength-aware sampling | Avoid a visually impressive but incorrect surface. |
| Mobile labels/controls crowded and app launcher overlaid graph controls | Responsive controls, bounded labels, scoped overlay isolation | Keep controls usable at 320 px and in light mode. |
| Canvas failure could leave no graphical feedback | 2D projection plus accessible numerical samples | Preserve useful scientific information on weaker devices. |

## Modified components and generated outputs

New engine: `visualization-source/{core,expression,renderer,workspace,build}.mjs`, `workspace.css`, pinned package/lock files, and `tests/core.test.mjs`.

Native integration: `experience/visualization-labs.js`, `experience/visualization-labs.css`; `.github/visualization-hooks.cjs` and `.github/visualization-preservation.cjs`; `.github/build-experience.js`; generated `index.html`.

Learning integration: `learning-tools-source/physics/{tools,visualization}.mjs`, `style.css`; `scripts/sync-learning-tools.py`; corresponding published `assets/learning-tools/physics/` files and manifest.

React integration: `scientific-labs/reality/src/components/{World,ModelGraph}.tsx`; published Reality index/bundle and `scientific-labs/asset-manifest.json`. No change to Reality physics, tracking or storage modules.

Quality/release: `.github/test-cbse-preservation.js`, `.github/workflows/static-site-checks.yml`, `qa/physics-visualization.cjs`, and this documentation directory. Engine output is `assets/physics-visualization/{engine.mjs,engine.css,manifest.json,THREE-LICENSE.txt}`. Old hashed Reality assets are retained for cached clients.

## Verification and limits

Final combined local run: 248 passing core, application, learning-physics and sketch-model checks after incorporating the parallel lamina release. This includes 13 new numerical tests and the unchanged historical preservation digests, plus a complete released-lamina artifact comparison. The learning review/notebook suite passed 14 tests; Python scientific/robotics suites passed 23 tests. Reality Lab: 23 passing tests and TypeScript/Vite production build. Existing Reason and Proof build/tests also passed (4 and 3 tests). All three existing learning/visual/host browser suites passed with no page errors.

`qa/physics-visualization.cjs` serves the actual app and covers: all listed integrations; analytical projectile, wave, potential-symmetry and Bloch checks; actual Yee staggered buffers; delegated inputs; pause; 2D switching; 320/390/768/1440 px in both themes; repeated mount/unmount; simulated context loss/restoration; WebGL-disabled fallback; opt-in camera denial and no leftover camera element; no uncaught page errors. Results/screenshots are written under ignored `qa/results/physics-visualization/`.

A bounded local timing sample of 30 Lorenz updates under headless Chromium/SwiftShader measured 0.5 ms median and 1.1 ms p95 CPU submission/update time. This is not GPU completion time, end-to-end FPS, a mobile GPU benchmark or a real-webcam accuracy test. Hardware touch gestures, Safari/WebKit, prolonged real-camera tracking and low-end physical devices still require human/device testing. Synthetic denial/lifecycle tests must not be reported as actual webcam accuracy.

The engine is integrated into the appropriate labs listed above, not every existing graph. Ordinary 2D signal/error/conservation plots intentionally remain 2D. Three-dimensional inspection does not upgrade the scientific assumptions of a legacy model.

### Reproduce

```sh
npm ci --prefix visualization-source
npm run build --prefix visualization-source
node .github/build-experience.js
python scripts/sync-learning-tools.py
node --test visualization-source/tests/*.test.mjs .github/test-*.js
node visualization-source/build.mjs --check
node .github/build-experience.js --check
python scripts/sync-learning-tools.py --check
node .github/build-scientific-lab-assets.mjs --check
node qa/physics-visualization.cjs
```

Set `CODEX_NODE_MODULES` to a directory containing Playwright for browser QA; CI installs its pinned browser tooling. Rebuilding React sources uses the existing scientific asset build process. Never hand-edit generated bundles or refresh preservation digests to hide an unintended change.
