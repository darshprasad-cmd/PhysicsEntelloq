# Scientific tools in the existing Physics workspace

The existing Physics shell now opens five optional scientific tools through native cards. Reality and Discovery appear in Research and the relevant Lab modes; Robotics appears in Lab under Advanced lab; Symbolic appears in Solve; Proof appears in the Advanced Studio index. The original nine Lab modes, six Advanced Studio treatments, Solve input, lessons, navigation and study preferences remain available.

## Integration and lifecycle

`experience/scientific-labs.js` is an additive authored module assembled after the existing CBSE module and before application initialization. It wraps the existing router and view hooks so the application's original simulation cleanup runs before a scientific workspace opens. No existing scientific engine, content bank, account or provider code is replaced.

Only the five named `#scientific:reality`, `#scientific:reason`, `#scientific:discovery`, `#scientific:robotics` and `#scientific:proof` routes resolve. A tool creates one same-origin iframe when selected. Leaving removes the frame, its worker context, loading timer and theme observer. Back restores the launching section, Lab mode and entry-button focus. Browser Back/Forward and a keyboard return from inside the frame (`Alt+Shift+Left`) are supported. A fresh scientific bookmark closes only the synchronous early CBSE gate; it does not persist a skipped preference.

The iframe loads the owned `assets/scientific-labs/<tool>/index.html?embed=physics`, except Discovery, which loads `notebook.html`. These are trusted application assets with normal same-origin access, needed by browser Python, downloads and workers. The iframe explicitly denies camera, microphone and geolocation permissions. Video analysis uses a selected local file.

The host distinguishes opening a document from initializing its scientific runtime. Child runtimes display their own progress, availability and errors. A missing document produces a retry/return message. No native-engine check is inferred from the presence of the iframe, a previously saved answer or a recorded run.

`scientific-labs.css` uses the existing Physics theme variables. `scientific-labs-embed.css` harmonizes child interface surfaces with the observatory palette and its light theme while retaining scientific trace colours. Compact adaptations remove duplicate branding and hero sections while retaining Reality's four tool tabs, the Symbolic notebook control, proof navigation, assumptions and runtime status. Discovery remains a light reading surface inside either host theme. The browser-readable `scientific-labs-guide.html` explains capabilities, source locations, runtime setup and limits; its detailed source guides are explicit downloads.

## Verification on 24 October 2026

The following are local checks in Chrome on Windows, with 1440 × 1000 desktop and 390 × 844 mobile viewports and reduced motion. They are not deployed-site, physical-phone or assistive-technology certification.

| Evidence | Result |
| --- | --- |
| Full existing and new Node suite | 126 tests passed |
| Inline scripts, generated source parity, feature tutorials, whitespace | Passed |
| Immutable published-application preservation | Original fixed SHA retained after removing only exact approved additive source/style slots |
| All five tools, desktop and mobile | Open, interact, return and focus checks passed; no initial engine requests on Home |
| Existing destinations | Nine Lab modes, simulation library, Solve input, six Advanced treatments and Learn remain reachable |
| History and entry | Browser Back/Forward, fresh bookmark without onboarding mutation, keyboard return passed |
| Native Lean through Physics iframe | Actual identity proof accepted by the local checker on desktop and mobile; offline draft stayed unverified |
| Video through Physics iframe | Synthetic local WebM calibrated and tracked by OpenCV: 30 positions, final x = 0.54 m, expected y ≈ 0.8 m; CSV and model comparison passed |
| Robotics through Physics iframe | Target controls and included recorded Genesis replay passed; this host check does not compute a new Genesis run |
| Discovery through Physics iframe | Browser Python initialized in 12.8 seconds in the recorded run; gravity change recomputed fitted g from 9.814 to 1.601; sampling change recomputed apparent frequency from 3 to 7 Hz |
| Themes and layout | Desktop/mobile dark and light frames inspected; document-width checks passed. Five repaired model labels measured contrast ratios from 8.90:1 to 10.39:1 |
| Setup guide | Opens in a separate browser tab; source and companion documents resolve; original tool stays open |
| Runtime exceptions | None in the completed host and notebook verification runs |

The video fixture is generated test footage, documented in `scientific-labs/reality/public/fixtures/README.md`. It proves the software path for a controlled clip, not tracking accuracy on an arbitrary recording. Discovery's synthetic datasets and fit assumptions remain labelled. An accepted Lean puzzle proves only its exact generated formal statement.

## Repeatable browser checks

Start the companion as documented in `scientific-labs/COMPANION.md`, plus the native Lean backend for the full host journey. Expose an installed Playwright package using `NODE_PATH`, or point `PLAYWRIGHT_MODULE_PATH` to an installed `playwright` / `@playwright/test` module directory. Then run:

```sh
node qa/scientific-labs.cjs
node qa/scientific-notebook.cjs
```

Both default to `http://127.0.0.1:5411`; set `PHYSICS_TEST_URL` to change it. `BROWSER_CHANNEL` defaults to `chrome`. Set `PHYSICS_LOCAL_ENGINES=0` only for static host smoke; that report will not claim a native proof verification. The host check also simulates an unavailable asset and an offline checker to exercise truthful recovery.

JSON evidence and screenshots are generated under ignored `qa/results/scientific-labs/`: `checks.json`, `notebook.json`, per-tool desktop/mobile captures, light-theme captures and the fully initialized Discovery captures. Runtime CDN downloads can make cold notebook startup much slower than the recorded run. The notebook test records any upstream `RPC request timed out.` startup message and rejects other runtime exceptions; the completed recorded run had none.

Source/model tests, pinned dependencies, native service boundary tests, licences and asset-manifest checks remain in their individual scientific modules and root build pipeline. The host does not claim an offline browser-Python installation, universal scientific validity, hardware robotics validation, public native compute service, or live deployment verification.
