# Observatory continuity — 6 September 2026

## Intent

Keep the approved observatory composition and motion. Continue its photographic atmosphere through the entire launch page, following Biology's continuity principle without importing its green palette. Carry Physics's black, ice-blue and warm-metal interface colours into the workspace.

## Implementation

- `observatory-theme.css` is the final, scoped theme layer: shared interface tokens, readable surfaces and controls, and corresponding light-mode hues. Scientific category, trace and status colours remain independent.
- A decorative fixed backdrop reuses the hero's existing embedded WebP. Transparent lower sections and one consistent dark veil preserve the image's colours and text readability. There is no new image, download, framework or animation.
- Sandbox retains its existing dark-instrument contract even in light mode; its Cradle notebook now shares that contrast field. A regression check preserves the home illustration's radial gradient.
- The ecosystem switcher now clears the bottom navigation through the app's 850px breakpoint, fixing a tablet overlap discovered by real pointer-click testing. Its destinations and founder information are unchanged.
- Browser chrome follows the selected palette. Saved light/system preferences still work; launch remains photographic and dark regardless of workspace preference.

The founder portrait and biography, signup tutorial, eight-step tour, Advanced Studio warning and voluntary entry, scientific calculations, camera controls and tutor providers are preserved. The original founder JPEG remains SHA-256 `f30b43e4e3f72223f4ae9d043e22c0cc8218ea2c014451c9bd0c1022a44f4e90`.

## Verification

Local checks: generated artifact parity, four inline script parses, 39 regression tests and tutorial asset/control contracts. HTTPS browser checks cover desktop, tablet, 390px mobile and 320px screens; seven fixed-background section positions; computed app colours; returning-user entry; saved light mode; switcher clearance/open/close; Cradle contrast in both themes; and runtime errors.

The existing main-app suite passes 50 accessibility/layout scans, the quality sweep passes 81, and Advanced Studio passes 108. The observatory suite checks five sizes plus actual motion, pause/resume, reduced motion, offscreen suspension, exit cleanup and no-canvas fallback. Founder/tutorial checks pass three sizes, with synthetic identity callbacks rather than external Google login. Screenshots are inspected and stored with detailed results under ignored `qa/results/`.

Intentional horizontal Sandbox toolbars remain horizontally scrollable on small screens; page overflow is checked separately. External AI responses, real authentication, camera hardware and physical-device GPU/battery behaviour are not newly validated by this palette-only release.

Release through protected main with required checks, then verify Pages and the published artifact against reviewed HTML. Synchronize the Downloads master only if its pre-change hash and retained backup still match.
