# Physics Entelloq Visualization Engine V2: audit and implementation roadmap

Audit date: 27 October 2026. This document records the source audit performed before the first V2 implementation. Existing capabilities below are inherited, not features newly delivered by V2. Reading source or a previous verification report is not a current test run. Implementation and validation results must be recorded separately after execution.

## Scope and integration decision

The first vertical slice extends the existing **Motion & vectors** experiment at `#learning:graphs` and improves the existing **Circuit bench** at `#learning:circuits`. Both already belong to the current Physics shell. The goal is a reusable, unit-aware state/timeline/measurement contract demonstrated by a complete existing experiment, while preserving the other labs, routes, stored work, themes, AI and camera infrastructure.

The SI projectile model in `learning-tools-source/physics/core.mjs` is the initial physics authority. Its existing JSXGraph workspace is in `learning-tools-source/physics/tools.mjs`; the host adapter is `experience/learning-tools.js`. The native small projectile animation in `index.html` advances in canvas pixels per render frame with canvas-size-derived gravity. It remains an inherited illustration and must not silently become the source of SI measurements or deterministic replay.

The circuit improvement should provide a clear local, bounded teaching bench with physically consistent quantities and explicit assumptions, while preserving the existing CircuitJS launch/export pathway for a more general circuit editor. A limited analytical circuit family must not be presented as a general network solver.

## Repository architecture

| Source or boundary | Current responsibility | Integration rule |
| --- | --- | --- |
| `index.html` | Legacy application, routing, lessons, native simulations, numerical labs, AI and Sandbox. Also the published single-file artifact. | Preserve unrelated legacy code. This file is not entirely regenerated from separate source files. |
| `.github/build-experience.js` | Embeds authored `experience/*.js`, CSS and selected assets into exact marker slots in `index.html`. | Edit authored modules first; rebuild and check source/artifact parity. |
| `experience/learning-tools.js` and `.css` | Lazy same-origin iframe host, tool routes, theme transfer, resizing, loading/retry, return focus and navigation cleanup. | Reuse existing tool IDs and lifecycle. |
| `learning-tools-source/physics/` | Editable MathLive, JSXGraph and circuit learning workspace, model helpers, field-scoped storage and tests. | Preferred V2 seam for the first slice. Preserve existing fields and independent-tab storage behavior. |
| `assets/learning-tools/physics/` | Published copy of physics learning workspace. | Synchronize from maintained sources using the repository workflow; do not create a divergent implementation. |
| `experience/scientific-labs.js` and `.css` | Lazy host for Reality, Discovery, Reason, Robotics and Proof. | Reuse these tools for later phases instead of reimplementing their engines. |
| `scientific-labs/` | Maintained scientific modules, calculation tests, native companion services and licence notices. | Generated counterparts live under `assets/scientific-labs/`; use `.github/build-scientific-lab-assets.mjs`. |
| `experience/measurement-*.js`, `spherometer-*.js`, `practical-*.js` | School instruments, models, observations and practical preparation. | Preserve routes, validated storage and model-specific uncertainty boundaries. |
| `.github/test-*.js`, `qa/`, component `tests/` | Calculation, preservation, host, browser and integration checks. | Existing preservation assertions are acceptance constraints, not checks to weaken. |

No `AGENTS.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` or `CRITICAL_AREAS.md` was found at the audited repository root. The actual sources, build scripts and relevant module documentation establish the boundaries above.

## Existing experiment inventory

### Native live simulation factories

`SIMS` in `index.html` defines **25 factories**. The README's older count of 21 is not a complete current inventory. IDs are:

`superpose`, `entangle`, `photonslit`, `sterngerlach`, `orbit`, `blackhole`, `orbit3d`, `fields3d`, `wave`, `fields`, `pendulum`, `fourier`, `sandbox`, `projectile`, `refraction`, `gas`, `magnetic`, `spring`, `standing`, `tunneling`, `doubleslit`, `bloch`, `rlc`, `carnot`, `lens`.

These span quantum measurement/interference, orbit illustrations, electric fields, chaotic pendulum, waves, optics, thermal particles and circuit resonance. A factory's presence does not establish scientific validation, SI instrumentation or replay support.

### Theory Lab

The `Theory` closure in `index.html` contains these 21 named modules:

- Numerical Methods Lab; Reaction-Diffusion Lab; Chladni Plates; Soft Bodies; Stable Fluids; Boids; Particle Life.
- Phase Space and the Hamiltonian; Least Action; Lorenz Attractor; Bifurcation; Chaotic Double Pendulum; Euler versus RK4 versus Verlet.
- Special Relativity; Schrodinger Equation; Maxwell-Boltzmann; GR Precession; Vector Calculus; Standard Model; Stellar Evolution; Optical Bench.

The numerical-methods kernel already includes explicit Euler, symplectic Euler, velocity Verlet, RK4 and adaptive Dormand-Prince, with harmonic, damped-oscillator and Kepler reference models. The Advanced Studio additionally contains Lagrangian, Hamiltonian, relativity, Maxwell, Schrodinger and statistical/nonlinear treatments with numerical demonstrations. Its authored presentation wrapper is `experience/advanced-studio.js`; legacy treatment data and computation remain in `index.html`.

### Research and investigations

`Research` in `index.html` contains eight benches: specific heat of water, wire resistivity, Newton's second-law mass, pendulum gravity, Hooke's-law spring constant, Ohm's-law resistance, wave speed and refractive index. They already collect samples, fit selected relations and export CSV.

`Investigate` contains eight investigations: pendulum amplitude, projectile angle, projectile speed, pendulum mass, damping decay, RC charging, Kepler's third law and resonance curve. These already compare proposed models and observations. `CompareDeck` and `DesignLab` are further existing Lab surfaces, not a universal synchronized scenario engine.

### Practical catalogue and instruments

`Expt` in `index.html` lists **58 named experiments**. They are a mixture of real simulation links, written protocols and illustrative apparatus previews, not 58 independently measured interactive models:

| Domain | Catalogue entries |
| --- | --- |
| Mechanics | Simple pendulum; compound pendulum; Hooke's law; Young's modulus; rotational inertia; momentum conservation; elastic/inelastic collisions; circular motion; friction; inclined plane; Atwood machine; torsion pendulum; rolling motion. |
| Oscillations and waves | Simple harmonic motion; damping; driven resonance; standing waves; string wave speed; beats; Doppler effect. |
| Optics | Thin lenses; spherical mirrors; refraction; single-slit diffraction; double-slit interference; Michelson interferometer; polarization; optical fibre. |
| Electricity and magnetism | Ohm's law; Wheatstone bridge; potentiometer; RC; RL; RLC resonance; magnetic-field mapping; Hall effect; induction; transformer; cyclotron motion. |
| Thermal | Boyle's law; Charles' law; ideal gas; calorimetry; Newton cooling; thermal conductivity; Carnot cycle. |
| Modern and quantum | Photoelectric effect; Compton scattering; decay; Rutherford scattering; Franck-Hertz; electron diffraction; tunnelling; superposition; entanglement; single photons; Stern-Gerlach; Bloch sphere. |

`PeqBench` provides reusable animated apparatus archetypes for parts of this catalogue. Its visual previews should not be mistaken for independently validated measurements. `experience/practical-guides.js` and `practical-library.js` add school-specific protocols and notes. The interactive vernier, screw-gauge and spherometer models are separate authored instruments with deterministic readings, calibration, contact gates, observation validation and CSV. Their existing scientific boundaries are documented in `docs/cbse/MEASUREMENT-BENCHES.md` and `SPHEROMETER-RELEASE.md`.

### Sandbox and camera systems

The native `Sandbox` closure provides gravity/Coulomb interactions, springs, rods, ropes, collisions, selected-body probes, distance/angle tools, vectors, energy, trails, playback speed and a bounded rolling recording. `experience/cradle-model.js` adds a compliant planar rope model with force and energy quantities; `cradle-studio.js` binds its apparatus controls and comparisons. `sandbox-studio.js` composes Hands, Build and Camera Physics with lifecycle management.

The existing hand controller uses pinned MediaPipe Hands, including explicit pointer/keyboard fallbacks and a gesture state machine. `experience/camera-physics/{vision,physics,rendering,ui}.js` uses MediaPipe and COCO-SSD locally, with bounded detector classes and force hypotheses. It explicitly does not measure depth, mass, orientation or actual contact force. Camera permission remains explicit. These are useful input and explanation systems, not general calibrated video tracking.

## Reusable visualization and analysis infrastructure

| Capability | Existing source and boundary |
| --- | --- |
| 2D expression graphing | Native `Grapher` in `index.html`: allowlisted recursive-descent parser, multiple curves, parameters `a/b/c`, adaptive grid steps, pan/zoom and coordinate inspection. Reuse the parser; do not introduce arbitrary code execution. |
| Interactive scientific board | JSXGraph 1.14.1 under `learning-tools-source/physics/vendor/`, driven by `tools.mjs` and `core.mjs`. Existing trajectory is analytical SI; pan and zoom are currently disabled by workspace options. |
| Plotting elsewhere | Custom canvas plots in Theory/Research; SVG `scientific-labs/reality/src/components/MotionChart.tsx`; notebook SVG plots in Discovery. No common unit/signal contract currently spans them. |
| 3D | Native `orbit3d` and `fields3d` are full-screen fragment shaders with parameter sliders, not inspectable mesh scenes and camera controls. Bloch is a canvas projection. No established Three.js scene infrastructure was identified. |
| Timeline | Sandbox retains a 300-frame rolling tape and rewind/resume; Reality uses precomputed samples, playback rate and timeline; Robotics replays recorded Genesis runs. Each implementation is private to its workspace. |
| SI motion models | `scientific-labs/reality/src/lib/physics.ts`: analytical projectile, nonlinear RK4 pendulum, Rapier 2D bouncing body. `components/World.tsx` consumes samples. Model assumptions are explicit. |
| Video-to-data | Reality `components/VideoLab.tsx`, `lib/tracking.ts`, `workers/tracking.worker.ts`: import, scale and origin, bounded OpenCV template tracking, confidence threshold, manual marks, calibrated 2D data and CSV. Position uncertainty excludes scale, timing and perspective errors. |
| Fits and uncertainty | Discovery `notebook.py`: CSV, pendulum/projectile fits, residuals, residual-based standard errors, uncertainty propagation and report export. It distinguishes synthetic from imported samples and does not claim total uncertainty. |
| Symbolic mathematics | Reason `src/engine.py`, `worker.ts`, `model.ts`: restricted expression processing with SymPy in Pyodide Worker, assumptions and result limits. MathLive already transfers a draft explicitly. |
| AI | Native `Tutor` uses the existing Groq proxy and formatted authored context. `experience/answer-format.js` handles explanations and diagrams. Current topic strings and individual measurement prompts are not a universal state/action interface. |

## Phase matrix and roadmap

The statuses below describe the audited baseline. They do not claim newly completed work.

| Phase | Inherited foundation | Required extension and order |
| --- | --- | --- |
| 1: graphing and data binding | Grapher, JSXGraph, custom plots and tested model helpers. | **First slice:** validated common state/sample contract and unit-aware plots attached to the existing projectile. General surfaces, parametric 3D, coordinate systems, contours, scalar/vector rendering and log axes remain deferred. |
| 2: Time Machine | Private Sandbox, Reality and Robotics playback. | **First slice:** shared pause/play/seek/step/rate/bookmarks and deterministic model sampling; bounded exact-snapshot recorder for future measured adapters. It is not automatically integrated into every lab. |
| 3: measurements | Sandbox probes/rulers; independent school instruments. | **First slice:** relevant projectile/circuit signals, synchronized selection and CSV. Instrument placement and other domains require explicit adapters later. |
| 4: Field Vision | Electric-field demos, Sandbox sources and vector-calculus lab. | Milestone 2: SI field sampler, potential, density, probes, wire/loop models and meaningful 3D/cross-sections. |
| 5: X-Ray | Sandbox vectors, energy and rope tension; camera force hypotheses. | Milestone 2: independent layers consuming authoritative model quantities. Unsupported internal stress/pressure must stay absent. |
| 6: Multi-View | Existing model/chart/control layouts. | Milestone 2: common object/time selection, responsive views and panel arrangements after state contracts stabilize. |
| 7: comparison | CompareDeck, Investigation, solver comparisons and cradle comparisons. | Milestone 2: scenario snapshots, variable-difference indicators, aligned traces and linked playback/cameras. |
| 8: video analysis | Substantial Reality video workflow already exists. | Milestone 3: bridge calibrated samples into common data contracts, preserve manual corrections, and separately validate acceleration/fits/live-camera extensions. |
| 9: equations | Safe Grapher parser, symbolic Reason and numerical kernels. | Milestone 3: supported ODE definitions, units and initial conditions; model-to-simulation adapters and AI explanations. |
| 10: waves | Interference, standing waves, Fourier, Chladni, Maxwell and quantum modules. | Milestone 3: shared wave parameters, inspection and synchronized timeline. Distinguish quantum amplitude, phase and probability. |
| 11: uncertainty | Discovery and Research fits, residuals, reports and imports. | Milestone 3: shared uncertainty/data schema, error bars, explicit model comparison and broader validated fitting. |
| 12: fluids/thermal | Stable Fluids and Reaction-Diffusion exist. | Milestone 4: validate current discretization and boundaries, expose suitable quantities, investigate workers and heat-transfer models. No new CFD claim. |
| 13: AR | No WebXR implementation found. | Milestone 4: optional capability-detected AR after real 3D exists; retain normal controls. |
| 14: AI actions | Tutor and authored state-bearing prompts. | Milestone 4: bounded context snapshots and allowlisted visualization actions. No unrestricted generated state mutation. |
| 15: gestures | Existing MediaPipe, discovery cues and fallback controls. | Milestone 4: adapters for new cameras/selections after input/state contracts; real-device validation remains separate. |

## Planned first vertical slice

The proposed modules are `visualization-core.mjs`, `visualization-studio.mjs`, `projectile-studio.mjs`, `circuit-model.mjs` and `circuit-bench.mjs` beside the existing `core.mjs` and `tools.mjs`, with scoped studio/bench stylesheets. Names are implementation seams, not completion claims.

1. Keep the existing projectile model authoritative; derive trajectory, vectors, time graphs, energy, state tables and CSV from its finite SI samples.
2. Give one shared experiment session ownership of parameters, selected time, play state, playback speed and bookmarks. Parameter changes reset incompatible timeline/bookmark state visibly.
3. Build unit-aware reusable plot/signal rendering with aligned timestamps, inspection, responsive controls and bounded sample counts. Do not overlay unlike units on an unlabeled common axis.
4. Provide pause/resume, step, scrubbing, speeds and bookmark comparison in the existing experiment. Deterministic replay means reproducing samples from the same parameters and time; future external-data playback uses retained snapshots rather than invented interpolation.
5. Add meaningful local circuit examples with component values, a readable schematic, coherent currents/voltages/power and transient signals where supported. Preserve official CircuitJS for broader editing, with its external/network boundary made clear.
6. Export correctly labeled model data. Calculated teaching values must remain distinct from real measured observations, and model assumptions must remain visible.
7. Reuse the existing host routes and source/published-asset synchronization. Keep the surrounding product shell and independent saved work intact.

## Known risks and performance findings

- Native illustration clocks often advance by render frame. Replay cannot safely wrap these without defining physical time and complete state.
- Sandbox rewind restores body positions and velocities but is not a universal checkpoint of parameters, topology, constraints and all solver state. A universal recorder must not promise deterministic resumption from these partial frames.
- Native WebGL helpers cancel animation when stopped but do not consistently delete programs, shaders and buffers; no general context-loss recovery layer was identified.
- Stable Fluids creates an offscreen canvas inside its draw routine. Reusing the allocation is a future performance improvement; scientific stability and units need their own validation.
- Dense Theory computations generally run on the main thread. Existing iteration guards are useful but are not low-powered-device benchmarks.
- Existing JSXGraph disposal frees boards and disconnects its resize observer. New sessions, animation callbacks, subscriptions, tooltips and observers need the same cleanup discipline on tool switches and host navigation.
- Axis units and model provenance vary across legacy surfaces. Canvas-scale or illustrative values must never be relabeled SI merely to fit a new interface.
- Frame-derived derivatives amplify tracking noise. An acceleration graph requires a defined differentiation/filtering method and uncertainty limitations.
- Cross-origin CircuitJS cannot automatically supply trustworthy host measurements without a defined supported bridge. Local analytical circuit output must not masquerade as data read from its iframe.
- Current iframe hosts intentionally constrain camera/microphone permissions. New passive visualizations should not require relaxing that boundary.
- Storage is field-scoped to avoid unrelated writes overwriting another open tool. New persistence must preserve this behavior and report failed storage without discarding session state.

## Validation plan; no execution claim

Core tests should check analytical projectile position/velocity/acceleration, energy and landing boundaries; negative/zero horizontal velocity; parameter reset; deterministic replay; immutable snapshots; bounded recorder behavior; timestamps; signal units; CSV; and the selected circuit families against circuit laws and analytical transients.

Browser checks should cover the actual integrated routes, controls and plot inspection; play/seek/step synchronization; parameter changes; data export; bookmarks; circuit activation; keyboard/focus; both themes; desktop/tablet/mobile; reduced motion; loading/error paths; and cleanup after repeated navigation. Performance records should name workload, browser, sample count, device/runtime, elapsed metrics and limitations. Synthetic browser checks do not establish actual webcam accuracy or low-powered hardware behavior.

Repository checks are defined in `.github/workflows/static-site-checks.yml`. Relevant existing commands include:

```sh
node .github/build-experience.js --check
node .github/build-scientific-lab-assets.mjs --check
node .github/validate-inline-scripts.js
node --test .github/test-*.js
node scripts/check-learning-tools-browser.cjs
node scripts/check-visual-tools-browser.cjs
```

Component tests and source/copy checks also need to run through the existing physics learning-tool workflow. The source audit establishes where to integrate; only recorded current test and browser results can establish what this V2 slice actually delivers. Later phases remain deferred even when they have useful inherited foundations.
