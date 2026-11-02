# Physics product validation — 29 October 2026

Local review candidate on `codex/product-excellence-20261029`, based on `63a86b4`. All evidence below is local unless explicitly stated. No hosted CI or production deployment occurred.

## Before and after

The same Chromium viewport sizes and reduced-motion setting were used for [before](product-excellence/before/report.json) and [after](product-excellence/after/report.json). External services were blocked in product tests. Screenshots were visually inspected, including mobile experiment controls and scientific viewport placement.

| Experience | Baseline | Final local result |
|---|---|---|
| Cold guest | Skippable four-question gate precedes landing | Featured refraction launches without registration/questionnaire; actual range control changed by keyboard |
| First science interaction | Original orbit changed after dismissing gate, ~1.2s by automation | Featured experiment manipulated in about 1–2s on desktop/mobile by automation; not a student usability or public-network benchmark |
| Navigation | Desktop/mobile destination sets differ | Five consistent primary groups; secondary routes retained in More |
| `pendulum` search | Six fuzzy lesson matches; no live experiment | Double Pendulum experiment first, followed by actual model, measurement, investigation, scene and practical resources |
| Reality Lab iframe top | y 330.4 desktop /y 346.6 mobile | y 188.4 desktop /y 170 mobile (142/177px earlier) |
| Save/resume | No common live-experiment observation record | Save → reload → resume named settings; model labels and explicit local-only status |
| Exports | Tool-specific | Downloaded CSV/JSON checked; printable report rendered as PDF with actual canvas image |
| Storage denied | No general notebook flow | “Not saved” displayed; no false stored record; unsaved JSON recovery offered |
| Mobile controls | New save action initially crowded title and floats overlapped a slider | Refined two-row title/actions; >=44px actions; actual center hit tests and no horizontal overflow at 320/768 |

Screens: `first-run`, `home`, `labs`, `search`, `workspace` at 1440 and 390 in both evidence folders; after also includes experiment/save/notebook, storage failure, classroom review and 320/768 experiment captures. Corresponding final PDFs are in `product-excellence/after/notebook-1440.pdf` and `notebook-390.pdf`. Before/after measure the same application tasks; the featured experiment intentionally changes from a promotional orbit to the actual refraction lab.

## Passed automated checks

| Command | Result / coverage |
|---|---|
| `node --test .github/test-*.js` | 351 passed, 0 failed. Includes immutable historical preservation, explicit product-slot reversal, current search/model/lifecycle tests and 21 shared search/notebook/classroom/resolver tests. Log: `product-excellence/node-tests.txt`. |
| `node .github/build-experience.js --check` | Generated artifact matches authored sources. |
| `node .github/validate-inline-scripts.js` | Five inline scripts parse. |
| `node .github/build-scientific-lab-assets.mjs --check` | Scientific source/published asset parity passes. |
| `python scripts/sync-learning-tools.py --check` | Learning source/published asset parity passes. |
| `npm test --prefix visualization-source` | 16 mathematical/render contract tests pass; `node visualization-source/build.mjs --check` passes. |
| `node --test learning-tools-source/physics/tests/core.test.mjs learning-tools-source/sketches/tests/core.test.mjs` | 15 tests pass. |
| `npm test --prefix learning-tools-source/learning` | 14 learning/review/concurrency tests pass. |
| `python -m unittest discover -s scientific-labs/robotics/tests -p 'test_*.py'` | Eight geometry/robot tests pass. |
| `python -m unittest discover -s scientific-labs/tests -p 'test_*.py'` | 15 companion HTTP-boundary tests pass. |
| `node qa/product-excellence.cjs` | Desktop/mobile complete guest-control-save-reload-resume-export journey; 342 unique runtime catalog entries; all empty-query filters return matching resources and a natural-language discovery query finds Biology Osmosis Lab; Biology metadata available; denied storage; explicit flag-off baseline; no uncaught errors or Clarity requests. 320/768 action/slider hit tests pass. Repeated open/resume leaves exactly one save action/context section. |
| `node qa/camera-lifecycle.cjs` | 12 browser scenarios: six each with excellence 0 and 1. Denied access, late permission, model failure, hand stop, hand→build and late hand permission preserve stopped tracks and usable controls. Fake camera streams/model stubs, not hardware validation. |
| `node scripts/check-learning-tools-browser.cjs` | Actual MathLive draft handoff, graph controls, review persistence, Yjs notes, same-document navigation, mobile fit and missing-tool recovery; no runtime errors. |
| `node scripts/check-visual-tools-browser.cjs` | Legacy flag-off editable Excalidraw drawing/reload, authored Manim decode, keyboard return and missing-asset recovery pass. |
| `node qa/learning-host-quality.cjs` | Legacy flag-off sketch/media 320–1440 dark/light, focus, teardown preservation and load recovery pass. |
| `node qa/interface-quality.cjs` | Explicit flag-off legacy route/layout/progress checks pass. |
| `node qa/physics-visualization.cjs` | Current flag-on real numerical/WebGL rendering, analytical comparison, 320–1440 layout, denied camera fallback, context loss/recovery, mount/disposal and Canvas2D fallback pass. SwiftShader timing is not hardware FPS proof. |

Legacy layout tests explicitly opt out because their assertions exercise the prior navigation and floating-control contract. They retain their assertions; the new product suite separately covers the changed shell. The existing CI workflow now also invokes the product and camera lifecycle browser suites after its existing Playwright install. No dependency version or deployment job was added.

The optional classroom UI was actually used to create a refraction assignment, export assignment/worksheet/submission files, import the assignment then submission, save local teacher notes and restore focus to the visible More button. The shared tests additionally cover malformed/cross-experiment submissions, storage conflicts/limits and serialized round trips. No feedback was sent to a person or remote service.

## Independent browser review

Final tutor accessibility refinement: the closed tutor was visually offscreen but still exposed one `AI tutor` dialog and one `Close` button in the accessibility tree. A product-flag-scoped CSS rule now hides the inactive panel from accessibility and pointer interaction. `node qa/product-tutor-accessibility.cjs` passes at 1440 and 390 pixels: the closed dialog is absent, the notebook has one unambiguous Close action, keyboard opening/Shift-Tab closing/reopening works, the unsent draft survives, and subsequent Tab navigation excludes hidden controls. No AI requests or page errors occurred. Evidence: `product-excellence/tutor-accessibility.json`. The source build, generated parity, inline parse, explicit baseline-byte preservation and all 24 focused product/shared tests passed again; unrelated engine suites were not rerun for this CSS-only refinement.

The coordinating agent separately used the visible app browser to launch the actual guest refraction lab and change Angle with ArrowRight. It then searched `why do cells swell`, followed the result into the staged packaged Biology Osmosis app, searched `refraction` there and returned by Enter to the staged Physics experiment deep link. Both artifacts were served locally using the validated peer-origin mapping; this was not a text-only catalog check or navigation to old production code. This is manual integration evidence, not a real-student session.

## Failures resolved and open gates

During development, browser tests caught missing global adapter exposure, initial deep-link clearing, mobile save visibility, empty-query filter results, cross-subject experiment-kind matching and crowded title/floating-control overlap; these were fixed and final tests rerun. Classroom selection initially used an over-exact accessible-label locator; the final test selects its real form control. Old camera harness setup lacked the existing questionnaire skip; the harness now supplies that valid preference and tests both flags. Legacy layout harnesses originally assumed old navigation while loopback defaulted to the new shell; explicit flag-off runs restore their intended contract.

The first Windows Python 3.14 companion run had `ConnectionAbortedError [WinError 10053]` in `test_exact_local_host_and_origin` while receiving a local socket response. An unchanged-source rerun passed all 15 tests. This transient is recorded rather than presented as a server code fix.

Unresolved external gates:

- **Real-student validation:** no recruited/consenting students or teacher observer available. Follow `REAL_STUDENT_USABILITY_PROTOCOL.md`; no findings are fabricated. The 30-second target is not student-validated.
- **Physical webcam/gesture accuracy:** fake-device and permission/error/lifecycle tests passed, but no real camera, lighting/calibration or gesture accuracy session occurred.
- **Native iOS/WKWebView/offline package:** owned by the separate mobile workstream; Xcode/device permission, native file bridge and package integrity checks cannot be established by Chromium. See `NATIVE_COMPATIBILITY_NOTES.md`.
- **Full snapshot/cloud classroom support:** current engines lack a universal snapshot API and this repository has no authenticated cloud classroom backend. Resume named settings/local exchange is delivered and explicitly labelled; hidden engine time, uploads, cloud sync, rosters and inbox remain unavailable.
- **All-model scientific certification:** existing numerical/units/boundary suites pass; conservative catalog labels do not constitute a new full scientific review of every model. See `SCIENTIFIC_VALIDATION.md` and the model registry.
- **Production and hosted staging:** local staging is functioning. No hosted preview credential/provisioning or production approval was supplied. Required remote CI, review and explicit production approval remain release gates.

The application remains working with either shell flag. These external gates prevent declaring every requested product-quality criterion independently validated.
