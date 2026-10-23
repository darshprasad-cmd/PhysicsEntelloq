# Verification record

Validated on 24 October 2026 in Windows Chrome, with the product served over loopback HTTP. Native validation used Python 3.12.14 and marimo 0.25.2 in a work-only virtual environment.

## Passed checks

- Six unit tests cover exact pendulum gravity recovery and square-root period scaling, residual uncertainty, exact projectile coefficient recovery, singular/duplicate timestamp rejection, cosine alias equivalence, and bounded/finite CSV validation.
- `marimo check notebook.py` reports no issues; `python notebook.py` executes the complete notebook successfully with its default controls.
- `scripts/export_browser.py` generates the committed `notebook.html` from the same scientific Python source. No app dependencies beyond marimo and Python's standard library are imported.
- Actual browser WebAssembly execution was tested, not just static exported text. Changing model gravity recomputed the synthetic estimate from **9.814** to **1.601 m/s²**.
- The 7 Hz / 10 samples-per-second example displays a 3 Hz folded frequency. Increasing sampling to 60 changes the folded frequency to 7 Hz and updates the Nyquist explanation.
- Importing `examples/synthetic-projectile.csv` recovered **9.810000000000004 m/s²** from eight ideal synthetic rows. The displayed source changed to the uploaded filename. A malformed CSV containing `NaN` produced a readable validation error and removed stale results.
- The report download was opened and parsed: it included the imported rows, fitted coefficients, source, assumptions and the user's entered reflection.
- Desktop 1440 px and mobile 390 px layouts were checked. Both landing layouts stay within the viewport. Mobile notebook sliders and their thumbs remain visible and usable after wrapping controls. Keyboard-driven slider changes work. Reduced-motion mode was exercised.
- Final amber/papyrus screenshots were visually inspected. An earlier SVG implicit-fill artifact and an earlier mobile control clipping problem were corrected before the recorded final run.

`verification/qa.json` contains the latest machine-readable browser result, including startup time, measured fit values, error list and failed-request list. Two complete runs initialized in approximately 9 and 21 seconds with no browser exceptions or failed requests. The final cold run took approximately 103 seconds and logged one upstream startup RPC timeout, then passed every interactive check; it reported no failed requests. The screenshots in `verification/` show the desktop/mobile landing and notebook views.

## Boundaries

The browser tests use exact/generated mathematical examples, not real camera recordings or independently collected physical measurements. They establish implementation behavior, not scientific measurement accuracy.

Browser initialization depends on CDNs and internet access. Cold runs sometimes logged an upstream `RPC request timed out` while loading, then successfully became interactive; the final cold run demonstrated this behavior, while two other complete runs succeeded without that exception. This application is not verified offline or in every browser/device. Initialization time will vary. The test runner reports any upstream timeout explicitly in its result instead of silently treating it as absent.

The standard marimo export CLI attempted to launch its native Ruff import-analysis helper; Windows Application Control blocked that executable. The security policy was left unchanged. The committed builder invokes the pinned marimo Python exporter after verifying the notebook has no local module dependencies; it requires no native helper and no package patch.

These are local source/export/browser checks. Public hosting, live-deployment parity, third-party CDN availability, and independent review of real experimental datasets are separate evidence and are not claimed here.
