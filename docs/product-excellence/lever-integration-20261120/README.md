# Released lever integration — 20 November 2026

Runtime commit: `176b1c35a3b6a48852867777642c607ddd81d339`. This is a normal merge of product branch `3587eeaddf84f8a240a71c845bbba7533ab708da` and released main `c8e50cdb45728f96c42385afb8e5b4235f9d987a`. Draft PR #48 remains the review vehicle; no production merge or deployment is claimed. Hosted checks for this refreshed commit must run after push.

The released first-class lever engine is preserved. Its product catalog entry has scientific terminology, an explicit analytical model classification and the direct route `#science:bench:lever`. The existing bench still owns tare, force readings, checked observations, CSV and its notebook. Product-only CSS removes floating launchers over its controls while excellence is enabled; the legacy shell remains unchanged.

## Artifact and preservation pins

| Item | SHA-256 / count |
|---|---|
| Working `index.html` exact bytes used for local final product tests/native handoff | `50506b95debb9fbb531d42687d2d1fd3243f5960a30a536cf500bc6bc0061bc4` |
| LF-normalized / committed `index.html` | `efadbc9ad5c8399dab88b03aec81709f960331866f01410b8826dde399612a28` (3,886,068 bytes) |
| Physics catalog | 343 entries; `bb7f7f89342441e65de2fdfd6a8ea0bd691d7103db74db27274368c566d39bb9` |
| Product slots reversed: exact released `c8e50cdb` artifact | `1276a4b8ebd9418f72eb4c44981446178ba1dd3338158683052d9ce5861cc7ce` |
| Product and lever slots reversed: exact original `63a86b4` artifact | `3e5795faa1012571abcd9ce073d55990de4d7cb19630fcf29f7ea14dcba77ded` |

The different raw and committed hashes reflect line-ending normalization, not distinct source implementations. The released lever model, UI, stylesheet and model/UI tests were compared directly with `c8e50cdb` and are unchanged. Final catalog bytes were copied to the Biology and shared integration catalogs before their final builds. Existing 29 October baseline/after evidence was retained rather than overwritten.

## Validation

All checks below passed locally. Chromium viewport emulation, fake camera streams and software WebGL are explicitly bounded evidence; they do not establish real-student, physical camera, iOS or hardware-performance validation.

| Check | Evidence |
|---|---|
| `node --test .github/test-*.js` | [398 passed, zero failed](static-tests.txt), including both preservation hashes and actual deterministic lever scientific-query checks |
| `node .github/build-experience.js --check` and `node .github/validate-inline-scripts.js` | Source/generated parity; five inline scripts parse |
| `node .github/build-scientific-lab-assets.mjs --check`, `python scripts/sync-learning-tools.py --check`, `node visualization-source/build.mjs --check` | All source/published asset parity checks pass |
| `npm test --prefix visualization-source` | 16 tests pass |
| `npm test --prefix learning-tools-source/learning` | 14 tests pass |
| `node --test learning-tools-source/physics/tests/core.test.mjs learning-tools-source/sketches/tests/core.test.mjs` | 15 tests pass |
| `python -m unittest discover -s scientific-labs/robotics/tests -p 'test_*.py'` and `python -m unittest discover -s scientific-labs/tests -p 'test_*.py'` | Eight robotics and 15 companion-boundary tests pass |
| `PRODUCT_OUTPUT=<fresh directory> node qa/product-excellence.cjs` | [Final full product report](product-report.json): real desktop/mobile guest launch, manipulation, observation save/reload/resume/export; classroom file round trip/review; storage denial; legacy flag off; 320/768 hit testing; no errors or Clarity collection |
| Product lever integration in that full run | Five scientific queries reach the actual bench; tare and attach produce a checked 2.67 N reading for the 4 N load at mechanical advantage 1.50; the dedicated reading survives reload and the common notebook remains unchanged |
| `LEVER_OUTPUT=<fresh directory> node qa/lever-lab.cjs` | [Released lever report](released-lever-report.json): all 36 configurations against an independent moment equation; 1440/768/390/320; eight axe scans with zero violations; legacy questionnaire/deep link; corrupt/injected/blocked storage; CSV; isolation; copied-file offline |
| `node scripts/check-learning-tools-browser.cjs` | [Pass](check-learning-tools-browser.log) |
| `node scripts/check-visual-tools-browser.cjs` | [Pass](check-visual-tools-browser.log) |
| `node qa/learning-host-quality.cjs` | [Pass](learning-host-quality.log) |
| `node qa/physics-visualization.cjs` | [Pass](physics-visualization.log) |
| `node qa/interface-quality.cjs` | [Pass](interface-quality.log) |
| `node qa/product-tutor-accessibility.cjs` | [1440/390 pass](tutor-accessibility.json): actual close-event synchronization, restored trigger focus, explicit launcher focus, keyboard open/close/reopen, hidden controls excluded, draft retained; no AI requests or errors |
| `node qa/camera-lifecycle.cjs` | All 12 cases pass: denied, late permission, model failure, hand stop, hand-to-build and late hand permission, each with excellence 0 and 1 |

The full released-lever run completed at 09:00:33 UTC, before the final catalog terminology and product-only floating-control refinement. Its engine, legacy path and test files are byte-identical in the frozen runtime. The complete product browser run was repeated after those refinements and passed. The other browser checks above and the final tutor/camera checks also used the frozen runtime.

Screenshots of the final integrated bench: [desktop](lever-integration-1440.png), [mobile](lever-integration-390.png). Visual inspection confirmed the mobile controls no longer sit under floating app/tutor launchers. Product tests also check the real launcher visibility and perform real control interactions.

## Failures and their disposition

- A temporary catalog guard checked `window.LeverLab`, but the legacy module is scoped inside the application closure. A complete product repeat exposed the missing entry. The final adapter registers the known bench unconditionally, like the existing bench adapters. Regenerated catalog, actual search queries and full product flow then passed.
- The first remaining tutor accessibility run moved focus immediately after calling native dialog close. The queued close event then correctly restored focus to the notebook trigger, so Enter reopened the notebook. A focused probe captured this at 1440 pixels; the launcher was visible and no lever workspace existed. The test now registers and awaits the actual close event, asserts restored trigger focus, then asserts tutor-launcher focus before Enter. Original accessibility, keyboard, draft and no-AI assertions remain. This was a test sequencing issue, not an application change or environment explanation.
- A separately observed machine suspension caused a roughly 36-minute clock jump in the coordinated workstream. A test process that had already completed successfully was not treated as failing because of that gap. Genuine adapter and test sequencing failures above were investigated independently. No unresolved Physics test failure remains locally.

Runtime remains pinned to `176b1c35`; the following commit only records evidence and synchronizes the focused test. Existing real-student, camera hardware, full engine snapshot/cloud classroom, hosted staging, native device and explicit production approval gates remain documented in [the main test report](../../ENTELLOQ_TEST_REPORT.md).
