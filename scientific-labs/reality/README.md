# Entelloq Reality Lab

A local-first experimental workspace: nonlinear pendulum, Rapier bouncing ball, analytical projectile, real OpenCV video tracking, calibrated motion graphs, and a persistent investigation notebook.

## Run

Node.js 22.12+ (verified on Node 24):

```sh
npm ci
npm run dev
```

Open the address Vite prints. `npm run build` creates `dist/`, which can be served on any static host under any path. `npm run preview` serves that build locally. No account, API key, or server upload is required.

## Verify

```sh
npm test
npm run build
# With the dev server running and Chrome installed:
npm run test:browser
node tests/video-browser.mjs
```

The browser tests accept `BASE_URL`; `tests/browser.mjs` also accepts `BROWSER_CHANNEL`. The video test uses a documented synthetic WebM fixture. See `public/fixtures/README.md`.

## Video workflow

1. Choose a model and match its initial conditions.
2. Open Video analysis; choose an MP4/WebM up to 100 MB and 30 seconds.
3. Mark two endpoints of a known reference in the motion plane; enter its length in metres.
4. Mark the coordinate origin, then a distinctive moving-object patch at release time.
5. Track up to 12 seconds at 15 analysis samples per second, or mark frames manually.
6. Review the trajectory, export CSV, and add it to comparison. Measurement time is shifted to begin at the first tracked sample; y increases upward.

Matching confidence is image similarity, not an accuracy probability. A ±2 pixel position estimate excludes perspective, scale, timing, and tracking bias. Numerical velocity amplifies noise. Keep the camera fixed and motion approximately planar.

## Features and boundaries

- Three deterministic educational models with explicit units and assumptions; see [SCIENCE.md](docs/SCIENCE.md).
- OpenCV executes in a worker. Video files remain in local browser memory, never uploaded. The UI font is fetched from Google Fonts; fallbacks work without it.
- Pendulum uses a numerical nonlinear equation. Bouncing ball uses actual Rapier WASM. Projectile motion ends at first impact.
- The notebook uses localStorage (up to 40 investigations); exported JSON reports are portable copies. Original videos are not stored in reports.
- CSV exports contain either imported observations (when present) or model samples. The JSON report contains both with provenance.
- No generative AI, camera access, accounts, analytics, or external scientific inference is used.

## Verification evidence

Physical invariants and tracking transforms are covered by 23 unit tests. Browser checks cover model control/playback, local notebook persistence, CSV export, guide navigation, desktop/tablet/mobile layouts, and paused initial state under reduced motion. The OpenCV fixture verifies pixel tracking and end-to-end import/calibrate/track/compare. These checks do not establish accuracy across real cameras and arbitrary experiments.

## Engines

- [Rapier](https://github.com/dimforge/rapier): Apache-2.0.
- [OpenCV](https://github.com/opencv/opencv), via [opencv-js](https://github.com/TechStark/opencv-js): Apache-2.0 (wrapper package notices included).
- React: MIT. Lucide: ISC. Build/test tools retain their upstream licenses.

See `THIRD_PARTY_NOTICES.txt` for bundled dependency notices.
