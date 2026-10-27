# Visualization Engine V2 — first working slice

This release implements the master prompt's first vertical slice in two existing Physics Entelloq destinations: `#learning:graphs` and `#learning:circuits`. It preserves the existing app shell, native simulations, practicals, accounts, tutor and saved learning records. [AUDIT.md](AUDIT.md) inventories the existing engines and maps all fifteen phases to actual source files.

## Delivered behavior

- **Projectile laboratory:** the existing SI analytical model drives the trajectory, moving particle, direction arrows, position/velocity/acceleration probes, and energy per unit mass. The original draggable launch vector, numerical controls and Earth/Moon presets remain. Negative horizontal velocity works. All views follow one selected time.
- **Shared measurement studio:** pause/resume, replay, previous/next frame, speed, scrubbing, two timestamp bookmarks and comparison, graph click-to-seek, keyboard stepping, time-axis zoom/pan, coordinate inspection, same-unit overlays and CSV export. Initial playback is paused, including under reduced motion. Parameter edits reset time and bookmarks.
- **Circuit workbench:** an immediate local schematic replaces the remote-only starting experience. It offers Ohm's law, series/parallel resistor networks, an unloaded divider, and separately initialized RC charge/discharge experiments. Select a component using the drawing or keyboard-accessible selector to inspect its voltage/current/power and capacitor energy. Play/pause/reset are also beside the schematic. Only relevant signal probes appear for the selected topology.
- **Existing CircuitJS access:** an explicit optional launch opens the external free-form circuit editor. Source export includes the topology and RC initial conditions. No CircuitJS request occurs before launch. An iframe load is described only as a frame load, not proof that the remote simulation initialized.
- **Reusable recording API:** a bounded immutable snapshot buffer supports later measured/nondeterministic adapters, with count and UTF-8 byte limits, monotonic times and previous-snapshot lookup. It is numerically tested but is not connected to the existing video tracker or sandbox in this slice.

## Architecture and extension contract

All authored runtime files live in `learning-tools-source/physics/`; `scripts/sync-learning-tools.py` generates their byte-identical copies under `assets/learning-tools/physics/` and updates the asset manifest. Do not edit generated copies independently.

| Source | Responsibility |
| --- | --- |
| `core.mjs` | Existing saved-state compatibility, authoritative SI projectile state, CircuitJS export facade |
| `visualization-core.mjs` | Immutable parameters/snapshots, one deterministic clock, bounded recording, unit grouping and reproducible CSV |
| `visualization-studio.mjs` / `.css` | Shared playback, probes, cached SVG time plots, bookmarks and lifecycle |
| `projectile-studio.mjs` | Existing JSXGraph integration; no independent equations in renderers |
| `circuit-model.mjs` | SI analytical topology models, component probe values and source serialization |
| `circuit-bench.mjs` / `.css` | Local schematic, component selection, bounded inputs and optional hosted editor |
| `tools.mjs` | Existing lazy panel lifecycle and field-specific persistence |
| `experience/learning-tools.js` | Existing host routes and updated descriptions; unchanged navigation and provider boundaries |

An adapter provides `model.duration(parameters)` and `model.sample(parameters, time)`, returning finite scalar quantities. Each signal supplies a unique `key`, a `label` and an explicit `unit`. `mountExperimentStudio(element, {model, parameters, signals, onState, title})` returns `getState`, `updateParameters`, `selectSignals`, `play`, `pause`, `seek` and `destroy`. `onState` receives the exact snapshot used by the plots and measurements. A model can declare `playbackTimeScale(parameters)`; the UI explicitly states how model seconds relate to playback seconds. Never put another clock or numerical integrator in a renderer.

The shared plot caches 241 samples per parameter revision. Only the cursor/readings change during playback; trajectories remain the model's continuous analytical curve. The full-run CSV includes parameters, units, 241 uniformly spaced samples and both endpoints. A sampled CSV is not a recorded measurement. Bookmarks and playback state last for the current open session; parameter values use the existing per-field local-storage scheme. Independent equation/graph/circuit tabs do not overwrite unrelated saved fields.

## Scientific definitions and limits

Projectile coordinates are metres, time seconds, velocity m/s and acceleration m/s². `x=vx*t`, `y=vy*t−g*t²/2`. The final state is immediately before landing at the initial height; collision/ground contact is not simulated. Gravity is constant, drag is absent and the particle has no extent. Energies are specific energies in J/kg, with the launch plane as the zero potential reference. Fixed-length arrows show direction only; the UI states that their screen lengths do not encode magnitudes. Both trajectory axes retain metre units; changing the plotting aspect ratio does not change the model.

Circuit voltages are measured relative to the marked ground, with conventional-current references shown in the schematic. Resistive circuits are ideal instantaneous DC steady states. The divider has infinite output load resistance. RC charging uses `Vc=Vs(1−exp(−t/RC))`; discharge uses `Vc=Vs*exp(−t/RC)`, negative R1 reference current, zero source current and capacitor power negative while energy leaves it. Charge/discharge buttons initialize separate experiments and do not preserve a previous switch-event state. Their finite timeline ends after six time constants, close to equilibrium rather than exactly at it. One playback second advances one time constant at 1×, explicitly disclosed. Component tolerances, source resistance, heating, leakage and inductance are omitted. Arbitrary wiring remains in CircuitJS.

The frame controls step by 1/120 of the current experiment duration. This is a navigation interval, not an integration timestep or a claim about camera frame rate. Snapshot playback does not interpolate missing observations. Mixed physical dimensions are separated into different plot groups; matching units alone do not establish that arbitrary quantities are physically interchangeable.

No new production dependency was added. Existing JSXGraph is reused. The native bench and shared plots need no remote engine once their local assets are loaded; this is not a new service worker or an offline-installation guarantee. CircuitJS serialization was checked against its upstream [CapacitorElm parser](https://github.com/sharpie7/circuitjs1/blob/master/src/com/lushprojects/circuitjs1/client/CapacitorElm.java), including the explicit reset-voltage field. No upstream implementation was copied.

## Verification

Run from the repository root:

```text
python scripts/sync-learning-tools.py
node .github/build-experience.js
python scripts/sync-learning-tools.py --check
node .github/build-experience.js --check
node .github/build-scientific-lab-assets.mjs --check
node .github/validate-inline-scripts.js
node --test learning-tools-source/physics/tests/*.test.mjs
node --test .github/test-*.js tests/check-feature-tutorials.cjs
npm ci --prefix qa --ignore-scripts
node qa/visualization-v2.cjs
```

`CODEX_NODE_MODULES` supplies a directory containing Playwright. Browser evidence is written under ignored `qa/results/visualization-v2/`. The existing source browser/quality checks and host learning/visual/quality suites also exercise preserved behavior. Required CI adds all physics numerical tests and the new host journey, including scoped axe checks. See [VERIFICATION.md](VERIFICATION.md) for this release's observed results and limits.

## Remaining scope

This is a functioning Milestone 1 slice, not completion of every requested engine feature. True Three.js surfaces, cylindrical/spherical coordinates, general scalar/vector/contour plots, log axes, arbitrary instrument placement and adapters for every existing lab remain pending. A general ODE input system, video/common-recording bridge, scenario comparison, rearrangeable multi-view workspace, Field Vision, full X-Ray layers, consolidated wave/data studios, validated fluid extensions, WebXR, new AI actions and new gesture adapters are deferred to the audit roadmap. Existing implementations of some of these concepts remain available unchanged; their existence is not counted as new V2 delivery.
