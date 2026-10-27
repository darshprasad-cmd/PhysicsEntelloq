# V2 first-slice verification

Local verification on 27 October 2026 in the isolated `codex/physics-visualization-v2-20261027` branch. Work began at `aca2bb6`; the subsequently released lamina practical (`4e8a9b1`) was merged and the combined application rechecked. This document reports local evidence; it does not establish production deployment or remote-engine availability.

## Results

| Check | Observed result |
| --- | --- |
| Physics numerical and persistence suite | 28 tests passed: 10 circuit, 11 core/storage, 7 visualization/recording |
| Existing application regression suite and feature tutorial | 221 tests passed after incorporating the lamina release, including historical byte-preservation checks |
| Learning review/notebook concurrency suite | 14 tests passed |
| Sketch data/model suite | 6 tests passed |
| Robotics geometry tests | 8 tests passed |
| Scientific companion boundary tests | 15 tests passed |
| Physics source browser and quality suites | Both passed unchanged; no page errors |
| Existing learning host, visual-tools host, host-quality browser suites | All passed; navigation, stored work, theme, responsive and loading/error behavior preserved |
| New actual-host V2 journey | All 8 grouped journeys passed; no page errors |
| Scoped axe WCAG A/AA checks | Zero violations in projectile desktop dark and circuit desktop/mobile dark/light; 20–23 rules passed per scan |
| Source/runtime and scientific asset parity | Passed |
| Generated experience and inline parsing | Passed; 5 inline scripts parsed |
| Whitespace/diff check | Passed |

The new browser journey exercises SI projectile positions, slider scrubbing, keyboard frame stepping, plot clicks, zoom/pan, probes, bookmarks and parameter reset; validates 241-row finite CSV against the analytical endpoint; operates both canvas and shared playback controls under reduced motion; checks RC voltage at one time constant, discharge current sign and disconnected-source current, keyboard component selection, and ground-reference semantics; verifies all five topologies and local offline operation; checks 320/390/820/1440px widths in both themes; and leaves a playing iframe to verify disposal and repeated mounting.

The numerical projectile grid spans 5 horizontal velocities × 3 upward velocities × 4 gravities × 241 time samples (14,460 states), with analytical endpoints, acceleration and conserved specific energy. Circuit tests verify Kirchhoff current/voltage laws, power balance, analytical charging/discharging, `I=C dV/dt`, stored-energy balance, bounded extremes and explicit hosted-export initial conditions. Recording tests cover byte/count bounds, immutable nested snapshots, monotonic timestamps and no fabricated interpolation.

## Performance observation

Repeated headless Chromium 151.0.7922.34 runs at 1440×1050, using DevTools 4× CPU throttling during projectile playback, each measured 120 consecutive animation-frame intervals. The latest pre-merge and combined-application runs observed:

| Metric | Result |
| --- | ---: |
| Median interval | 16.7–33.3 ms |
| 95th percentile | 33.4–50.0 ms |
| Maximum interval | 33.4–66.7 ms |
| SVG elements | 3 |

These are a bounded desktop lab observation under artificial throttling, not a promise of 60 fps, a real-phone benchmark or field Core Web Vitals. Timing varies by machine. The shared plot caches 241 model samples for each parameter revision; recording is bounded by count and serialized bytes. Native legacy Theory/Sandbox performance is unchanged and is not covered by this result.

## Review corrections

Source/browser review caught and fixed a timeline event that read its value after a pause-render had overwritten it; stale hover values after model changes; keyboard focus loss when changing signal checkboxes; small-screen SVG label scaling and coordinate mapping; irrelevant circuit probes for absent components; invalid-draft CSV gating; imperceptibly fast RC playback; and the need for playback controls beside the visible apparatus. The final actual-host journey includes the scrub and shared-control regressions.

The new lamina release's fingerprint initially detected V2's three changed host-description lines. The integration now restores an immutable pre-V2 adapter fixture before that comparison and adds a full lamina-release fingerprint check. Every historical expected hash is unchanged; the rest of the application, including all lamina slots, must remain byte-identical to the published release.

## Evidence and limits

`qa/visualization-v2.cjs` writes `qa/results/visualization-v2/report.json`, screenshots and exported model CSV. Existing suites' latest reports were copied there under `legacy-*.json`/`source-*.json` to avoid replacing historical evidence files. Generated screenshots were visually inspected. The audit and architecture documents distinguish implemented, inherited, partial and deferred features.

No hardware webcam/gesture, WebXR, Safari/Firefox, real mobile hardware, screen reader, prolonged memory soak or live AI-provider test is claimed. The optional hosted CircuitJS URL/source format is tested; its remote circuit execution was not exercised. Snapshot recording is a tested shared API awaiting a measured-data adapter. General 3D/field rendering and the later milestones are deferred. The public site is unchanged by this local verification.
