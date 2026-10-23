# Scientific tools inside Physics Entelloq

Five scientific capabilities are added to the existing Physics application. Its sidebar, learning journeys, lessons, simulations, notebooks and advanced-workspace entry remain in place. The tools load only when opened.

| Existing destination | New capability | Calculation engine |
| --- | --- | --- |
| Lab / Research | Calibrated video measurement and model comparison | OpenCV; Rapier; analytical and numerical models |
| Lab / Research | Reactive data analysis, fits, uncertainty and sampling | marimo browser Python |
| Solve | Symbolic calculation and equivalence with domain assumptions | SymPy through Pyodide |
| Lab / Advanced Studio | Two-link robot geometry and recorded/live controller dynamics | Genesis World local CPU |
| Advanced Studio | Six guided formal-proof puzzles | Local Lean 4 |

The authored integration is in `experience/scientific-labs.js` and `.css`. Existing application routes lead to lazily loaded, same-origin tool panels under `assets/scientific-labs/`. The surrounding Physics navigation stays available. The editable computation sources, tests, setup instructions and licence notices are in this directory, one folder per tool.

## Build and check

Node 24 and Python 3.12 were used for the integration. From the Physics repository root:

```sh
node .github/build-scientific-lab-assets.mjs
node .github/build-experience.js
node .github/build-scientific-lab-assets.mjs --check
node .github/build-experience.js --check
node .github/validate-inline-scripts.js
node --test .github/test-*.js
python -m unittest discover -s scientific-labs/robotics/tests -p 'test_*.py'
```

The first command installs locked frontend dependencies, runs their calculation tests, builds the three frontend bundles, copies the two static modules, and records SHA-256 hashes. The check mode verifies source and asset drift against that recorded build; it is not a substitute for running the underlying tests. `--record-existing` is reserved for recording locally built, independently verified assets. Discovery's committed browser export is generated from `discovery/notebook.py` with its pinned exporter; see that module's README before changing it.

The core models are tested separately from integration. Host browser checks verify launch, return, native navigation, loading/error states, mobile layout and theme behaviour. Real engine browser verification and native-check records are documented in each module. Synthetic video demonstrates the software path, not real camera tracking accuracy.

## Local native computation

Hosted Physics can compute symbolic expressions and browser notebook calculations, track video locally, run browser physics and replay the included real Genesis recording. **New Genesis simulations and Lean proof checks need the local companion services.** Their interfaces remain unverified when no service is available; they never infer verification from a stored answer.

See [COMPANION.md](COMPANION.md) to run the full Physics application locally with both native engines connected. The native tools accept bounded numeric input or curated proof choices only. There is no arbitrary code endpoint and no public compute server in this release.

SymPy/Pyodide and the marimo runtime download browser dependencies on first use. Startup needs an internet connection and can take longer on a cold cache. The video tracker and browser physics libraries are served as local application assets. Files selected for video analysis stay in the browser; these tools add no analytics or uploads.

## Scientific scope

Motion models state units and assumptions next to results. Recorded and calculated quantities remain distinguishable. Symbolic answers include domain restrictions and are not universal statements outside those assumptions. Notebook uncertainties depend on the stated fitting model and supplied data. Robotics concerns one fixed-base horizontal arm, with no physical hardware validation. Lean verifies only the formal statement generated from the selected puzzle, not a general claim written in prose.

## Attribution

Upstream licences and provenance are kept in each module. No runtime binary, Python environment or private credential is committed. Large native dependencies are downloaded locally by their documented installers. Source remains editable in the same repository as Physics.
