# Interface precision and high-DPI pass

Scope: polish the existing Physics Entelloq interface, not replace its visual identity.
The observatory background, founder information, routes, stored progress, lessons,
physics equations, simulation clocks, and camera/hand-input logic are preserved.

## Visual review

| Before | After | Why |
| --- | --- | --- |
| A 54 px progress SVG inside a 43 px ring; the number was offset from the drawn ring by 5.5 px in both directions | SVG and percentage share one 43 px box; the compact instrument-number font, explicit line height, and checks for 0%, 9%, 42%, 100% | Correct geometry, including three-digit percentages and cross-platform fallback fonts |
| Product switcher covered the lower progress card | A reserved desktop footer band leaves 20 px between the map card and launcher | Both controls remain visible and usable; navigation scrolls in shorter windows |
| Progress counts were split into flex items with gaps around the slash | Natural inline count flow and a separated leading icon | A readable `0/89 concepts explored` line |
| Near-invisible ring track and dark launcher in light mode | Theme-aware track, progress stroke and launcher material | Legible controls in both themes |
| Tiny font-dependent search symbol | Native SVG matching the navigation stroke weight | Crisp at any display scale; no extra asset or dependency |
| Learning-style controls touched when wrapping | 8 px row/column gaps and 44 px touch targets | Consistent spacing on narrow screens |
| Mobile notifications covered navigation; XP could wrap awkwardly | Toast clears bottom controls and keeps its suffix together | Readable feedback without hiding navigation |
| Sandbox capped at 1.5x, graphs at 1.75x, graph fallback at 1.5x | Up to native 2x raster resolution with bounded framebuffers | Sharper curves, trails and instrument lines without unbounded supersampling |

## Rendering limits

- Default: up to 2x device pixels and 4 million framebuffer pixels.
- Devices reporting <=4 GB memory or <=4 logical processors: up to 1.5x and
  2 million framebuffer pixels. Unknown capability reports use bounded defaults.
- Window size and device scale are evaluated on resize. Sandbox uses its existing
  draw-size check. No new render loop, mesh sampling change, or solver step.
- WebGL and its 2D fallback use the same resolution policy. Context recovery and
  cleanup remain covered by the integrated visualization test.
- Headless SwiftShader results are browser regression evidence, not a claim about
  physical device frame rates or real webcam tracking accuracy.

## Implementation map

- `experience/precision-ui.css`: scoped chrome, progress, spacing, light theme,
  notification, focus and reduced-motion adjustments.
- `.github/precision-hooks.cjs`: exact reversible search-icon and Sandbox raster hooks.
- `.github/build-experience.js`: source assembly; generated `index.html` is committed.
- `visualization-source/resolution.mjs`, `renderer.mjs`: bounded high-DPI policy and
  graph/fallback integration; generated engine and manifest are rebuilt.
- `.github/precision-preservation.cjs`, `test-precision-ui.js`,
  `test-cbse-preservation.js`: recover the exact prior `ab76e15` application hash,
  retaining every existing historical preservation check.
- `visualization-source/tests/resolution.test.mjs`: 1x/2x/3x, 4K, 8K and modest-device cases.
- `qa/interface-quality.cjs`: desktop/tablet/mobile, both themes, short windows,
  glyph centring, overlap, keyboard focus, setting rows and toast clearance.
- `.github/workflows/static-site-checks.yml`: add the interface browser suite to
  the existing required check; no deployment configuration change.

## Verification

The initial 88 route/theme/width snapshots cover Home, Universe, Learn, Solve,
Practice, Lab, Sandbox, Research, Progress, Settings and Lab Graphs at
1440, 768, 390 and 320 px. The extended pass also checks 600/720 px window heights,
keyboard activation of the progress card, both live theme buttons and mobile toasts.
Local screenshots and measurements are generated under
`qa/results/interface-quality/{before,after}` (ignored test output).

Run:

```sh
node .github/build-experience.js --check
node visualization-source/build.mjs --check
node .github/validate-inline-scripts.js
node --test .github/test-*.js visualization-source/tests/*.test.mjs learning-tools-source/physics/tests/core.test.mjs learning-tools-source/sketches/tests/core.test.mjs
node qa/interface-quality.cjs
node qa/physics-visualization.cjs
```

External sign-in and AI requests are blocked in the interface audit so fallback
fonts are tested reproducibly; those services are not claimed as validated here.
