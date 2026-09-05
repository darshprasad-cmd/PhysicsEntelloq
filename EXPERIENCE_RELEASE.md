# Cinematic launch and Cat’s Cradle instrument

## Audit and implementation boundary

The starting app was a single-file vanilla JavaScript platform with 89 concepts, authored lessons, a tutor, research tools, hand tracking and a multi-physics sandbox. No project AGENTS, ARCHITECTURE, CONTRIBUTING or CRITICAL_AREAS documents were present. The existing README and protected Static site checks pipeline were inspected. Authentication, AI providers, camera permissions, content, URLs and hosting remain in place.

The old landing page prioritised account entry, pushed its small experiment below the first mobile screen, and had ten active canvas elements. The old cradle was a small 52-node oval buried among many controls. It used fixed distance projections with post-projection residual strain presented as force, and advanced a fixed number of steps per rendered frame.

The scoped sequence was: original responsive launch and live orbit preview; one flagship cradle model and instrument; an experiment-first command centre; regression and live HTTPS verification. This deliberately does not rebuild every world or claim physical knot simulation.

| Before | After | Why |
| --- | --- | --- |
| Account-oriented introduction | Guest entry with a manipulable orbit immediately visible | Demonstrate the product before setup |
| Many equally weighted home cards | One primary next action, three worlds, connected map | Reduce the initial navigation burden |
| Tiny rope and general controls | Large cyan cord, amber supports, dedicated instrument | Make the phenomenon and measurements legible |
| Rendering rate determines elapsed physics | Fixed 1/120 s integration driven by elapsed time | Separate numerical time from screen refresh |
| Residual constraint strain called tension | Compliant elastic constraints and SI measurements | Tie force readings to a defined model |

## Files and architecture

- `index.html`: still the complete distributable application; small core sandbox integration hooks, optional onboarding, semantic no-script fallback.
- `experience/launch.js`: responsive guest launch, procedural two-body orbital preview, static SVG fallback, reduced-motion and visibility cleanup.
- `experience/home.js`: command centre and direct routes to existing content; completion is labelled exploration, not proof of mastery.
- `experience/cradle-model.js`: pure scientific model separated from rendering and teaching controls.
- `experience/cradle-studio.js`: direct manipulation, instrument panel, predictions, contextual tutor handoff, local persistence, keyboard controls.
- `experience/experience.css`: scoped materials, colour semantics, responsive layout, focus, reduced motion and restrained interaction feedback. The design-engineering skill influenced these details.
- `.github/build-experience.js`: deterministic assembly into the existing single HTML; `--check` prevents source/artifact drift.
- `.github/test-cradle.js`: scientific regression suite using Node's built-in test runner.
- `.github/workflows/static-site-checks.yml`: retains the required check and adds model/artifact verification. No deployment topology changes.
- `qa/live-check.js`: isolated real-site Playwright journeys, screenshots and performance observations; generated outputs are ignored by Git.

No new production dependencies. Canvas 2D, native controls, CSS and the existing tutor/hand tracker suffice. Automated browser checks use the already-bundled Playwright, not a new site dependency. The repository has no TypeScript, formatter or linter configuration; inline parsing, assembly validation, whitespace checks and targeted tests are the applicable local checks.

## Scientific model

Cradle coordinates and velocities cross the existing sandbox boundary in cm and cm/s. Internal constraints and measurements use metres, kilograms and seconds. Default moving particles have mass 0.002 kg; gravity is 9.81 m/s². Axial stiffness EA is in N; damping is in s⁻¹. At positive strain, T = EA × (length − rest length) / rest length; compression produces no tension. Elastic energy is ½ EA L strain²; kinetic energy is ½ mv².

The solver uses tension-only XPBD distance constraints with compliance L/EA, 32 alternating passes and a fixed 1/120 s step. Reference: [Macklin, Müller and Chentanez, XPBD (2016)](https://mmacklin.com/xpbd.pdf). Damping is exponential in elapsed time. Moving anchors perform external work. Integration is approximate and adds numerical damping; energy is not claimed to be exactly conserved.

There is no self-contact, physical over/under knot topology, rope friction, failure or realistic bending. Force arrows are support reactions estimated from elastic strain. The orbit preview uses an analytic Newtonian conic at a 6971 km starting radius, Earth μ = 398600.4418 km³/s²; display inclination and body sizes are illustrative. It does not model atmosphere, relativity or perturbations.

The prediction exercise independently settles a 4.5 m cord with 23 moving 4 g particles for 12 simulated seconds at support spans of 2.6 and 3.8 m. Only span changes; solver, mass, length, damping and stiffness are held constant. At EA = 80 N, support forces are 0.4729 and 0.5894 N respectively. Work is yielded in batches so the UI remains responsive.

## Local validation

Nine scientific tests pass: hanging load mg and extension mgL/EA; fixed supports; no compression; linear momentum without external forces; SI energy conversion; exponential damping; consistent static solutions at 60/120/240 Hz; equal-cord span comparison and vertical weight balance; finite results across stiffness extremes; invalid timestep rejection. Hanging-load force tolerance is 0.00001 N; momentum tolerance 1e-8 in boundary units; comparison support balance tolerance 0.025 N. The test runner groups related checks into nine named cases.

Three inline scripts parse. Generated artifact matches authored modules. `git diff --check` passes. Real-site results and screenshots are recorded under `qa/results` and summarised below after deployment.

## Measured baseline

One isolated Chromium run per size, real HTTPS, desktop hardware, no CPU/network throttling; observations collected 1.8 s after load. These are lab observations, not field Core Web Vitals or real-phone measurements. LCP is provisional until the page is hidden. Cross-run network/font-cache effects are significant.

| Baseline | Desktop 1440×900 | Mobile viewport 390×844 | Tablet 820×1180 |
| --- | ---: | ---: | ---: |
| Observed LCP | 5952 ms | 1828 ms | 2708 ms |
| Load event | 5857 ms | 1695 ms | 1926 ms |
| CLS | 0.00031 | 0 | 0.00586 |
| Long tasks | 15 | 5 | 17 |
| DOM elements | 990 | 978 | 990 |
| Canvas elements | 10 | 10 | 10 |

Baseline HTML response: 2,513,066 decoded bytes; 863,682 encoded bytes. No horizontal document overflow or JavaScript page errors were observed in the baseline runs.

## Release verification

Pending real-site verification after the protected checks and deployment complete. Physical-device touch/camera validation is outside the automated viewport tests; the existing hand tracking remains opt-in and unchanged.

Recommended next flagship: Newton’s second law, connecting a draggable force vector, mass, acceleration, prediction, and a measured trajectory to the existing concept graph.
