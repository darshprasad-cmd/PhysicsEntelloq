# Physics Visualization Engine — audit and architecture review

Date: 27 October 2026  
Status: Historical proposal, subsequently approved by the user. See IMPLEMENTATION.md for delivered scope and validation.  
Audited committed baseline: `aca2bb61f2526f1609fcda0c2900d7816c2d288f`.

This is the Phase 1 deliverable and the proposed implementation contract for Phases 2–5. No engine has been implemented or deployed by this review. The checkout also contains concurrent lamina-lab work, which is not part of this audit's changes.

## Recommendation

Build one lazily loaded Three.js rendering library, used by adapters inside existing labs. Keep physics calculations, parameter state and simulation time owned by those labs. Preserve useful 2D views. Do not migrate the entire application to React, replace its shell, or add a disconnected visualization destination.

The host is primarily vanilla JavaScript with source-owned modules embedded into `index.html`. The newer learning workspaces use ES modules and JSXGraph; Reality Lab separately uses React/Vite. A framework-neutral ES-module core, DOM workspace and thin React wrapper fit all three without adding another frontend framework.

Three.js is justified here because the existing Canvas2D, JSXGraph boards and raw shader views do not provide a common geometric scene, camera, mesh/instance management and picking system. Pin and locally bundle a reviewed Three.js version and required addons, retain its licence, and record build hashes. No floating CDN dependency or launch-page download.

## 1. Existing implementation inventory

Paths below are repository-relative. Symbols are more stable than line numbers because `index.html` is assembled and concurrent work is in progress.

| Component / source | Current behavior and data | Recommended treatment |
| --- | --- | --- |
| `index.html`: `Grapher`, `viewLab` | Canvas2D function plots; bounded expression parser; multiple curves, coefficients, pan/zoom and hover | Keep ordinary `y=f(x)` plots 2D. Add safe surface/parametric modes using the shared engine, not another expression evaluator based on executable JavaScript. |
| `learning-tools-source/physics/{core,tools}.mjs` | JSXGraph velocity vector and exact ideal-projectile model; numerical controls, persistence, CSV, board cleanup | Preserve current model and field-scoped saved state. Add optional planar spatial inspection and meaningful surface/parametric modes in this existing workspace. |
| `experience/learning-tools.js` | Same-origin iframe host; theme-token bridge; route/back/focus and frame lifecycle; camera explicitly denied in child | Reuse host navigation and theme bridge. Add explicit graph disposal and a narrowly scoped gesture-command bridge, not iframe camera permission. |
| `index.html`: `SIMS`, `glShaderSim` | Canvas simulations plus fragment-shader `orbit3d` and `fields3d` views | The shader names do not establish computed 3D geometry. Do not reuse their visual phase as an orbit solver or measured field. |
| `SIMS.wave`, `SIMS.fields` | Two-source scalar interference and softened electrostatic field; screen-coordinate/normalized models | Good surface/field candidates with explicit model units. Retain formulas and disclose scale; do not silently relabel pixel-based quantities as metres, volts or newtons. |
| `Theory`: Lorenz, numerical methods, integrators, GR precession, double pendulum | Numerical state/trajectories; many displays project onto 2D | Lorenz already computes all three coordinates: expose that state. Keep planar mechanics planar and retain error/conservation plots in 2D. |
| `Theory`: phase space, least action, vector calculus | Hamiltonian state, paths and source/vortex/saddle/dipole fields | Add energy surfaces and field streamlines where useful, with axes explicitly marked as phase-space or normalized quantities. |
| `Theory`: reaction diffusion, Chladni, fluids, soft body, boids, particle life | Scalar grids or planar particle/constraint systems | Scalar-height views can be useful; height means concentration/amplitude, not a newly simulated spatial dimension. No automatic conversion of 2D dynamics into 3D dynamics. |
| `Theory`: bifurcation, relativity, Schrödinger, Maxwell–Boltzmann, standard model, stellar evolution, optics | Mixed mathematical plots, diagrams and specialized simulations | Keep existing representations unless an additional independent coordinate has a clear physical interpretation. |
| `ADV_SIM` | Schrödinger, Lagrangian, Lorentz, Maxwell FDTD, chaos and partition-function labs | Maxwell field orientation and Lorenz trajectories benefit from 3D. Keep probability, convergence, thermodynamic and time plots 2D. |
| `SIMS.bloch` | Polar/azimuthal state and projected sphere | True geometric Bloch sphere is meaningful; state-space coordinates are dimensionless, not physical position. |
| `Sandbox`; `experience/cradle-model.js`, `cradle-studio.js`, `sandbox-studio.js` | Existing bodies, forces, constraints, trajectories and presets; cradle has an explicit cm/SI boundary | Expose read-only trajectories/field data through an adapter. Preserve all presets, constraints, object creation and Undo; no replacement solver. |
| `UniHands`; Sandbox `HPIE`/`PIE`; `experience/camera-physics/*` | Separate gesture/camera lifecycles and interaction semantics | Add opt-in camera-navigation commands with exclusive ownership. Do not let a camera gesture also add/grab a Sandbox object. |
| `MultiRep`, `Research`, `Investigate`, `CompareDeck`, `DesignLab`, `Expt` | Lesson representations, fits, comparisons and lab routing | Keep scalar/measurement plots 2D. Reuse graph launch/selection controls only where supported by the actual data. |
| `scientific-labs/reality/src/{types.ts,lib/physics.ts,components/MotionChart.tsx,components/World.tsx}` | React; calibrated 2D video samples and separately computed pendulum/projectile/bounce models | Optional shared renderer wrapper for model trajectories. No inferred video depth. Preserve measured/model distinction and 2D time charts. |
| `scientific-labs/discovery/notebook.py`; `scientific-labs/robotics/web/app.js` | Fit/residual SVG plots and robot sample/joint-error charts | No forced 3D. Simulation results must retain their original provenance. |
| Measurement/spherometer practicals; authored animation and drawing workspaces | Measurements, educational films and learner sketches | No synthetic depth; authored animations and sketches are not real-time numerical data sources. |
| `experience/{app-design,observatory-theme,light-mode,reality-workspace,learning-tools}.css` | Established dark/light palette, planet backdrop and embedded-workspace layout | Inherit tokens and preserve backdrop outside the scientific plotting surface. Do not introduce a separate visual theme. |

This inventory covers graph-owning systems and their integration boundaries, not numerical certification of every existing experiment.

## 2. Findings that determine the design

1. **There is no single graph owner today.** Legacy Canvas, raw shaders, JSXGraph and React/SVG are separate. Replacing one component would not connect the entire product.
2. **Some existing visualizations have screen-dependent units.** For example, `SIMS.wave` samples distances in pixels; the softened field uses pixel distances and an arbitrary strength factor. The first integration must preserve and label those conventions. A future SI model is a scientific-model change, not a cosmetic renderer change.
3. **Lorenz already has real XYZ data but drops Y when storing display trails.** Publish all three coordinates at the model boundary. Its second trajectory is repeatedly renormalized for a Lyapunov estimate: it must not be presented as an independently diverging physical trajectory.
4. **Maxwell uses a staggered Yee grid.** Electric and magnetic samples have different spatial/time locations. Preserve those offsets, or explicitly describe any collocation interpolation. Never make a visually neat but falsely in-phase wave.
5. **Many legacy simulations advance a fixed number of steps per animation frame.** Rendering must not introduce another simulation clock. Adding playback control requires owner-level timing work with deterministic equivalence tests, not changing step sizes to chase frame rate.
6. **Lifecycle is distributed.** `stopSim`, `stopLabViews`, `closeLabFull`, module cleanup and iframe teardown all matter. The current raw shader helper visibly cancels its frame loop but does not explicitly dispose shader/buffer/program resources; that is a source-level risk, not a measured leak claim.
7. **Hand controls are not a generic shared camera service.** The current learning iframe explicitly denies camera access. Existing palm-to-fist object creation must remain armed through transitional poses; graph controls must not steal that action.
8. **Release preservation is unusually strict.** `.github/test-cbse-preservation.js` reconstructs immutable historical artifacts. Integration needs exact, bounded adapter/extraction allowances while retaining historical digests, not replacing expected hashes or disabling the tests.

## 3. Shared engine contract

```text
Existing experiment controls ──> existing model + simulation clock
                                         │
                          versioned snapshot / model sampling
                                         │
                                 experiment adapter
                                         │
                        shared visualization workspace
                        ├─ Three.js geometry + camera
                        ├─ 2D projection / fallback
                        └─ numeric inspector + sample table

Play / pause / reset / speed ──> adapter ──> model owner
Mouse / touch / keyboard / opt-in hand commands ──> camera or probe
```

### Data and ownership

Each adapter exposes `getSnapshot`, `subscribe`, `setParameters`, supported playback commands, and an idempotent `dispose`. Unsupported commands are absent rather than simulated by decorative motion.

A snapshot contains:

- Schema version, experiment ID, revision, simulation time and parameter revision.
- Domain kind: spatial, phase space, scalar graph or quantum state.
- Axis names, units/dimensions, orientation, bounds and display scale.
- Provenance: analytical model, numerical model or observation; solver, assumptions and approximations.
- Typed sample buffers for points, curves, grids and vectors; validity masks, explicit topology and sample IDs.
- Optional inspection/sampling functions owned by the model, plus measurement capabilities.

Publish bounded, revision-stable buffers; never let the renderer mutate a solver array. Begin with bounded copies or explicit buffer ownership, then pool buffers without changing that contract. Workers must never detach the solver's live state. High-precision computation remains on the CPU/model side; Float32 GPU coordinates are a display representation, with local-origin transforms where needed.

Parameter changes invalidate dependent samples immediately. Cheap updates are synchronous; expensive resampling uses a cancellable worker with revision IDs and latest-result-wins behavior. Show that resampling is pending, and never display an old probe value under new parameter labels. Camera pose, active inspection and display quality must not alter computed physics.

### Coordinates and meaning

Use a documented right-handed mathematical basis and an explicit camera/display transform. Preserve existing horizontal X / vertical Y conventions where present; do not silently swap axes to match a renderer default.

- Cartesian: `(x, y, z)`.
- Cylindrical: radius `rho`, azimuth `phi` around mathematical Z, and axial `z`; `x=rho*cos(phi)`, `y=rho*sin(phi)`.
- Spherical: radius `r`, colatitude `theta` from +Z and azimuth `phi`; `x=r*sin(theta)*cos(phi)`, `y=r*sin(theta)*sin(phi)`, `z=r*cos(theta)`.
- Model angles use radians. Optional degree readouts are explicitly converted.
- At the origin or poles, undefined angles are shown as undefined, not invented measurements.

Coordinate conversion applies to positions in a compatible spatial/state domain, not arbitrary mixed-unit graph axes. A graph `(x,y,U)` uses energy as height; it is not a physical third coordinate. A 2D projectile displayed in 3D remains on `z=0` and says so. Measurement tools permit distance only on dimensionally compatible axes; other plots expose per-axis differences, energy differences or time intervals instead.

### Primitives

- Indexed surface meshes with shared vertices, finite-value masks, discontinuity handling, contour/section views and a visible color scale.
- Parametric curves with a parameter domain, bounded adaptive sampling and breaks at singularities. Extend the existing bounded expression grammar; no `eval`, `Function`, arbitrary imports or unbounded input.
- Instanced vector arrows and particles; configurable density and explicit magnitude/direction encoding. Normalized arrows must be labelled as direction-only.
- Streamlines integrated from the same vector function, with error/step limits, source exclusion, null-field termination and domain/iteration caps. Streamlines are not generally particle trajectories in a time-dependent field.
- Trajectory buffers and bounded motion trails keyed to simulation time, never wall-clock animation phase.
- Potential/energy surfaces evaluated from the same kernel used by the experiment. Electrostatic potential is not potential energy unless multiplied by a stated test charge.
- Wave height/color views evaluated from the existing field arrays or functions; amplitude scaling is displayed and does not change the model.

### Inspection and measurement

Raycasting locates the relevant primitive/sample; the inspector reports model coordinates and units. Distinguish exact analytical evaluation, stored numerical samples and interpolation. Show numerical precision honestly instead of adding unsupported decimal places. Mask singularities and invalid values.

Provide click/tap to pin a probe, numeric-coordinate entry, keyboard sample traversal, two-point measurement, clear selection, reset camera and an accessible sample table/export. Pinning avoids a hover-only interface on touch devices.

## 4. Native integrations for the first release

These are integrations in existing routes, not a separate demonstration page.

| Existing experience | Added representation | Scientific boundary |
| --- | --- | --- |
| Lab Grapher and Learn → Vectors & graphs | Shared surface/parametric tools; existing 2D curves and projectile remain available | Same parser/model inputs, saved state and analytical projectile endpoints; a camera does not create extra projectile physics. |
| Theory → Lorenz | Full XYZ trail, selectable planar projections, time/probe inspection | Publish existing RK4 states before projection; identify renormalized perturbation data correctly. |
| Theory → Phase space | Hamiltonian surface and trajectory/probe overlay; potential section | `H=omega²/2-cos(theta)` and `U=-cos(theta)` in the existing normalized model. Energy and state axes are not all distances. |
| Theory → Vector calculus / existing field lab | Instanced vectors, streamlines and compatible potential surfaces | Preserve source/vortex/saddle/dipole formulas. Do not invent a scalar potential for a nonconservative vortex. A genuine 3D field extension is a separately labelled model mode, with the original planar slice tested for parity. |
| Wave interference lab | Synchronized height surface, color plane and section plot | Use the same scalar superposition and explicit normalized/screen-coordinate conventions; preserve source/phase relationships. |
| Advanced → Maxwell; Bloch lab | Orthogonal field view / geometric state sphere | Preserve Yee staggering and normalized field scales; Bloch coordinates represent state, not position. |
| Sandbox | Optional read-only trajectory/field inspector, connected to active state | Preserve 2D dynamics and all presets. Object-add/grab and camera-navigation modes are mutually exclusive. |
| Reality Lab | Thin React wrapper available for planar model inspection | Calibrated video remains 2D observed data; do not invent measured Z. Existing residual/time charts stay intact. |

New model extensions, if needed, must be explicit in the UI and independently validated. The first vertical slice is Lorenz because it already has genuine three-coordinate state and requires no new physical model.

## 5. Interface and interaction review

The After column is proposed, not an assertion of completed changes. The design-engineering review favors a large, quiet scientific workspace over decorative motion.

| Before | After | Why |
| --- | --- | --- |
| The embedded graph repeats a large introduction above its plots | Compact contextual title; canvas dominates; assumptions in a labelled disclosure | Preserve useful working height without removing scientific context. |
| Different graph families have separate controls and legends | Shared 2D/3D selector, coordinates, inspect/measure tools and playback strip where supported | Transferable interactions without pretending every plot is spatial. |
| Vector and model controls compete with the plot at narrow widths | Collapsible parameter region, accessible numeric inputs, mobile canvas-focus mode | Keep controls reachable and page scrolling usable. |
| Raw shader “3D” effects have no shared coordinate/probe interface | Computed geometry, subtle grids, exact unit labels and pinned numeric probes | Visual depth must communicate data rather than decoration. |
| Gesture meanings vary by workspace | Explicit opt-in “Navigate graph” mode with ownership/status and normal controls | Prevent camera motion from consuming object-add or manipulation gestures. |

Inherit `--blue`, `--bg-panel`, `--ink`, `--ink-dim` and `--pe-border`, including live theme changes. Retain the accepted planet/observatory background outside a sufficiently opaque plotting surface. Distinguish traces with labels/line styles as well as color. Verify dark/light contrast at actual grid and label sizes.

Orbit, pan, zoom and reset have mouse, trackpad, touch, keyboard and button paths. Ordinary page scrolling must remain available: capture wheel/touch gestures only when the graph interaction mode is active, with a clear exit/focus affordance. Avoid scroll traps and double interpretation of a drag as camera orbit plus point selection. Camera transitions may be brief and interruptible; numerical parameter updates are immediate. Reduced motion disables automatic camera movement and starts new animated views paused. Explicit playback remains available.

### Gesture boundary

Use a parent-owned, explicit user-initiated camera session. Pass only bounded navigation/probe commands to the currently active graph; never transmit video frames to an external service. For an iframe, validate message origin, source window, active session and payload. Leave the iframe's camera denial intact.

One camera owner at a time. Switching to graph navigation releases Sandbox/Universe control; losing tracking cancels an in-progress camera command. Stop streams and release ownership on route exit, disposal, permission failure and hidden-page suspension. The existing Sandbox palm-to-fist grace period and Undo must remain covered by regression tests. Synthetic landmarks establish state-machine behavior, not webcam accuracy on real hardware.

## 6. Performance, recovery and lifecycle

- Lazy-load only when an applicable view opens. Do not create live WebGL contexts for lab thumbnails.
- Start with one active graph renderer per workspace; dispose or suspend competing views instead of accumulating contexts.
- Reuse geometry/materials, update buffer ranges, instance arrows/particles, bound trail history and cap pixel ratio.
- Initial quality tiers: roughly 32/64/128 grid intervals per axis, capped vector counts and bounded trail samples. These are starting budgets to benchmark, not proven performance claims.
- Adapt display density from measured frame cost with hysteresis. Never reduce solver accuracy or change integration steps to improve rendering speed.
- Render static scenes on demand; request frames only for active simulation, interaction or camera settling. Pause work when hidden; do not catch up an unbounded hidden-tab interval.
- Each owner registers RAFs, workers, observers, subscriptions, event listeners, geometries, textures, materials, render targets and controls with an idempotent disposal path. Shared resources use explicit ownership/reference counts.
- On WebGL context loss, stop GPU work, retain model state and offer the existing 2D/numeric view. On restoration rebuild GPU resources from the latest snapshot without resetting the experiment or duplicating listeners.
- WebGL unavailable or initialization failure produces a usable 2D projection/section plus data table, not a blank canvas. No WebGL1 compatibility is assumed for modern Three.js.

## 7. Validation and acceptance

Required before calling the implementation production-ready:

| Area | Evidence required |
| --- | --- |
| Coordinate transforms | Cartesian/cylindrical/spherical round trips, origin/pole cases, axis conventions and units. Target relative/absolute error around `1e-10` for well-conditioned double-precision test inputs. |
| Curves and surfaces | Plane/paraboloid/helix reference samples; singularities and discontinuities; bounded parser inputs; non-finite values never uploaded as valid vertices. |
| Existing projectile | Flight time, peak, range, negative launch and landing against closed forms; 2D and 3D inspections return the same underlying values. |
| Fields and streamlines | Constant/source/vortex analytical fields; known divergence/curl; dipole symmetry; softened-potential gradient consistency; convergence under smaller integration steps. No universal tolerance across singularities. |
| Energy landscapes | Shared `H`/`U` evaluations, force/gradient consistency and time-trace conservation within an explicitly stated solver tolerance. |
| Waves | Constructive/destructive superposition and node locations; current model parity. Maxwell compares incident/scattered quantities and grid-refinement behavior; preserve staggering. |
| Chaotic trajectories | Fixed-step reference states and short-time convergence, not long-horizon exact equality. Renormalized Lyapunov data must be correctly labelled. |
| Synchronization | Every relevant parameter changes geometry, inspector, legend, export and 2D counterpart in the same revision; stale worker results cannot overwrite newer state. |
| Playback | Pause causes no time advance; reset reproducible; speed changes time progression without changing timestep accuracy; 2D/3D switches do not restart physics. |
| Lifecycle | Repeat mount/unmount and route/fullscreen cycles; hidden/visible transitions; worker cancellation; zero orphan loops/listeners; renderer resource counts stabilize after disposal. |
| Failure recovery | Forced context loss/restoration, no WebGL, failed module/worker load, camera denied/lost, offline cached assets and invalid parameters. |
| UI | Desktop/tablet/mobile at 1440/768/390/320px, dark/light, reduced motion, keyboard focus/escape, touch page scrolling, tooltips/probes and horizontal overflow. |
| Performance | Record hardware/browser, frame-time percentiles, draw calls, memory and input-to-visible latency. Initial targets: responsive static updates under 100ms, ~60fps on representative desktop and at least 30fps low-detail on a representative weaker device. Targets require measurement, not assertions from headless software rendering. |
| Preservation | Existing tests, generated-source parity, immutable historical tests, saved state, navigation, founder/launch, Advanced gate and hand-builder/preset regression suites. |

### Checks performed during this audit

- Tracked application test files: **182 passed, 0 failed**. Concurrent untracked lamina tests were intentionally not included.
- Physics learning-tool model tests: **9 passed, 0 failed**.
- Experience build/source parity passed; **5 inline scripts parsed**.
- Scientific-module and learning-tool source/runtime parity passed.
- Local Chromium: changed horizontal projectile velocity to `-8 m/s` using the numerical input; computed landing readout became `-16.31 m`, matching `-160/9.81` to displayed precision.
- Local Chromium: graph host and iframe had no horizontal overflow at requested outer viewport widths 1440, 768, 390 and 320px in both themes; host theme reached the iframe.
- Returning to Learn removed/detached the graph iframe; no page errors were captured in that bounded check.
- Desktop screenshot inspected at `qa/results/3d-audit/graphs-desktop.png` (local ignored QA artifact).

These are baseline checks, not tests of the proposed 3D engine. They ran before subsequent concurrent lamina integration edits. No new-engine GPU benchmarks, context-loss checks, physical webcam tests, complete cross-browser certification or deployment verification have been performed.

## 8. Planned files and release boundaries

| Proposed source/component | Responsibility |
| --- | --- |
| `visualization-source/core/` | Contracts, coordinates, sampling, measurement rules, quality/resource ownership |
| `visualization-source/renderers/` | Three.js primitives, camera/picking, labels, 2D fallback |
| `visualization-source/workspace/` | DOM controls, themes, disclosure, playback, inspector and accessibility |
| `visualization-source/adapters/` | Lab-specific snapshot and command adapters; optional React wrapper |
| `visualization-source/workers/` | Bounded field/surface/streamline sampling with cancellation |
| `experience/visualization-labs.js` and scoped styles | Host integration and opt-in hand navigation boundary |
| Selected legacy model closures in `index.html` / extracted source-owned lab modules | Minimal state-publication and playback/disposal hooks; no solver substitutions |
| `learning-tools-source/physics/{tools,core}.mjs` and styles | Existing graph workspace integration; preserve storage and projectile contracts |
| `experience/learning-tools.js` | Graph lifecycle and bounded parent-to-child commands |
| `scientific-labs/reality/src/components/` | Thin optional model-view wrapper; preserve observations and time charts |
| Build scripts, asset manifests, licence records and `assets/physics-visualization/` | Deterministic locally bundled runtime and lazy loading |
| Focused unit/model/browser tests and preservation fixtures | Numerical parity, UI, lifecycle, security and performance evidence |
| `docs/physics-visualization/` | Architecture, adapter guide, units/assumptions, test results and final modified-component list |

Paths are proposed boundaries, not files claimed to exist yet. Legacy closure access requires explicit, small publication hooks or source-owned extraction; wrapping a canvas cannot recover discarded model data. Any extraction must preserve solver behavior and provide exact historical reconstruction allowances instead of weakening preservation tests.

Implementation sequence after approval:

1. Reconcile the latest baseline and concurrent changes; use an isolated feature checkout for engine work.
2. Establish contracts and analytical tests; implement core primitives and fallback; integrate the first genuine Lorenz vertical slice.
3. Connect the agreed graph, potential/field and wave views using shared model snapshots; add inspection/playback and React compatibility.
4. Add exclusive opt-in gesture navigation and full lifecycle/failure coverage; verify existing object creation still works.
5. Run numerical, browser, performance and preservation checks; review generated output and modified-component list; use the protected PR/required-check release path. Verify deployment/artifact parity separately before claiming live availability.

The critical review boundaries are model ownership/timing, legacy source extraction, camera ownership, and preservation-test allowances. Auth, AI providers, unrelated navigation, founder content and deployment permissions are outside the implementation scope.

## 9. Official dependency references

- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html): modern renderer requires WebGL2 and exposes renderer statistics.
- [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html): native orbit/pan/zoom inputs and explicit control lifecycle.
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html): repeated geometry with per-instance transforms and bounds/resource considerations.

Approval requested: adopt this shared-renderer/model-adapter architecture and the native integration scope above, preserving useful 2D views and the existing physics/hand interactions.
