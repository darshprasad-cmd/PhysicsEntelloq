# Physics / Reality, opened — implementation and release evidence

Local preview: http://127.0.0.1:8773/?landing
Public destination: https://physics.entelloq.com/?landing
Branch: feat/reality-opened-launch
Distribution: index.html, with embedded images, screenshots and silent product recording.

## Experience

Graphite orbital observatory, original landscape/portrait art, live orbital aperture and satellite, a short desktop camera push from 1 to 2.65 scale, and a dissolve into the existing analytical orbit model. Speed and trajectory controls, a travelling-wave explanation, authentic Sandbox footage, current application captures, Learn/Map/Solve/Advanced entry, journey, scientific limits, founder, press, family, FAQ and footer complete the launch.

The matching learning workspace uses static shared artwork, ivory headings, ice-blue controls, thin borders and quiet readable panels. Both dark and light themes, the established layout, navigation, controls, progress, lesson content, models and account/provider behavior remain intact. No extra interior image, animation, dependency, blur or render loop was introduced. The 73 KB hero image is embedded once and reused by the app; two retired image payloads were removed.

Guest entry, sign-in, search, feature tutorial and every product destination remain available. Visible pause, reduced motion, offscreen/hidden-tab suspension, keyboard navigation and static no-canvas fallbacks are implemented. Mobile uses a distinct portrait image and stacked sections with native scrolling.

## Local validation

- 91 required repository tests pass. Generated artifact parity, all 4 inline script parses, whitespace and immutable preservation check pass.
- All internal application HTML/JavaScript and LaunchOrbitModel are unchanged against main commit 0430503c086e0cddc19037d4c212b798ca8c17a7. Only the public launch modules and user-authorized stylesheet treatment are excluded from preservation comparison.
- Launch checked at 360, 390, 768, 1440 and 1920 px, with all 14 sections captured. Zero page errors or horizontal overflow.
- Eight launch journey groups cover controls, menus, focus, account/guest paths, 11 app destinations, tutorial, actual canvas movement, pixel-stable pause, five scroll stages, reverse scroll, resize, video playback/muting/offscreen stop, reduced-motion changes and unavailable-canvas fallback.
- Interior checked at 1440 and 390 px: 28 screen/theme combinations across Home, Universe, Learn, lesson, Solve, Lab and Progress. Keyboard route focus, Explore dismissal, lab stage controls, saved guest return and no retained launch scenes pass.
- Automated launch scan found zero structural WCAG A/AA violations across five widths. Full-page scanner color contrast was disabled after excessive runtime; existing mathematical palette/contrast regression checks pass. This is a bounded check, not a full accessibility audit.

## Performance observations

The matching workspace update reduces the standalone HTML by about 326 KB decoded and 252 KB at gzip level 9 relative to the initial cinematic launch. The final artifact is approximately 4.0 MB decoded / 1.74 MB gzip. Embedded video keeps standalone operation complete and remains part of transfer cost despite deferred decoding and playback. The 12-second silent recording is 513 KB; hero images total 110 KB.

In an unthrottled, quiet local Chromium sample, observed click/key event durations had median 24 ms and p95 72 ms on both 1440 px and emulated 390 px. Maximum was 136 ms desktop and 80 ms mobile. Existing app activity included a few long tasks (up to 106 ms). Over 133 launch browser frames, median and p95 interval were 16.7 ms and maximum 33.4 ms; illustration painting is separately capped at about 30 fps. The launch owns one pending animation frame while visible and zero after app entry. Interior styling has no animation scheduler.

Earlier warm-local launch observations: LCP 408–556 ms, CLS 0.0039–0.0743. A concurrently loaded earlier run reached 6.7 s LCP. These are synthetic local observations, not field INP/Core Web Vitals, low-end hardware performance or a promise of no lag.

## Evidence locations and boundaries

- Provenance: assets/reality-media-provenance.json.
- Local launch report and 5-width/14-section screenshots: qa/results/reality-opened/report.json and physics-*.png.
- Local interior report/screenshots: qa/results/reality-opened/workspace-report.json and workspace-*.png.
- Release verification writes live-workspace-report.json and release-parity.json after CI, merge and Pages publication. These local reports are separate from repository source.
- Preview recording: C:\Users\darsh\entelloq-cinematic-assets\previews\final-physics-preview.mp4.

No real camera activation, provider request, authenticated account flow, screen-reader speech, Safari/Firefox or physical-device testing is claimed. The preserved scientific application passes its existing automated regressions. A successful Pages workflow alone does not establish live parity; the release process separately checks the deployed bytes and bounded browser behavior.
