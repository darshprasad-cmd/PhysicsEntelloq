# Observatory launch — 6 September 2026

## Intent and scope

Match the user's supplied 1536 × 1024 launch composition: realistic observatory, Earthrise, dark left-hand headline, floating orbit controls, four photographic entry cards, and restrained ice-blue accents. Scroll beyond the opening into the learning loop, three experiments, an advanced undergraduate Studio preview, tutor context, model limitations, practical answers, and the original founder story and photograph.

Real HTML text and native controls sit above the artwork. Search, account entry, guest entry and feature cards use existing app routes. The reference's unsupported audience statistics are replaced with live content counts; its unavailable film becomes a genuine guided introduction. Founder replaces Community in the header because this app has no community destination.

| Before | After | Why |
| --- | --- | --- |
| Flat design reference | Clean scene plus independent text and controls | Responsive, selectable, accessible content |
| Static orbit | Shaded moving moon marker, analytical path, mass and speed controls | Motion explains the interaction |
| Uninterrupted decorative motion | Pause control, reduced-motion default, offscreen/hidden-tab suspension and exit cleanup | Respect attention and processing power |
| White tablet headline crossing the sunrise | Responsive dark scrim behind the copy | Maintain readable contrast over photography |
| Generic lower launch palette | Coordinated black, blue and photographic founder section | Relevant information without losing the visual tone |

## Files and preservation

- `observatory-markup.js`: reference-aligned opening with existing app destinations.
- `observatory.css`: responsive composition and reduced-motion treatments.
- `observatory.js`: isolated launch preview and its animation lifecycle.
- `launch.js`: new opening and Advanced Studio preview; founder biography, contact links, original portrait and account/tutorial handoff retained.
- `.github/build-experience.js`: embeds both optimized images into the single HTML distribution; no runtime image download or new framework/dependency.
- `index.html`: assembled distribution; additionally loads the light Inter weights needed for the reference typography.
- New model/launch regression tests, HTTPS browser checks, and staged support in the existing founder/tutorial checks.

The original founder JPEG is unchanged (SHA-256 `f30b43e4e3f72223f4ae9d043e22c0cc8218ea2c014451c9bd0c1022a44f4e90`). Existing application solvers, Advanced Studio entry gate, camera tracking, authentication implementation, tutor providers, ecosystem switcher and hand-control tutorial are not redesigned in this release.

## Artwork provenance and prompt

Tool mode: built-in image generation, **referenced-image edit / precise-object-edit**. One clean-background candidate was generated and visually inspected. No new media plugin or model was introduced.

- `assets/observatory-reference.png`: the user's original image, unchanged.
- `assets/observatory-background.png`: generated clean background plate.
- `assets/observatory-background.webp`: 90,728-byte encoded background, embedded in HTML.
- `assets/observatory-reference.webp`: 157,900-byte encoded reference, embedded once and cropped by CSS to the four supplied thumbnails. No screenshot text or unsupported statistics are displayed by these crops.

Exact generation prompt:

> Use case: precise-object-edit. Image 1 is the edit target: the user's Physics Entelloq landing-page visual. Produce a clean photographic background plate from THIS EXACT composition, for a real responsive website. Preserve the observatory interior, the huge Earth in the upper centre-right with sunrise on its left limb, stars, dark architectural window frames, telescope, books, galaxy tablet, wooden desk and Newton's cradle, and the black/icy blue/gold cinematic lighting. Do not redesign or move the physical objects. Remove ALL webpage overlays: brand logo and navigation across the top, every heading and paragraph, every button, all statistics, the handwritten quotation, the floating gravitational-controls rectangle, all four bottom feature cards (including their thumbnail pictures), and all footer text. Inpaint the areas beneath those UI overlays naturally to continue the existing observatory/space/desk scenery. Also remove the thin stylized orbit lines and their floating small planet markers since functional orbit visuals will be coded separately. Preserve incidental realistic book spines and the physical tablet screen. Left 40 percent should remain very dark with usable space for our own text. No new text, no interface, no typography, no watermark, no new objects. Maintain original 3:2 landscape framing and high detail. The scene is illustrative artwork, not a scientific scale model.

## Science and motion boundaries

The preview uses km, seconds and mass in Earth-mass multiples. Reference GM is 398600.435507 km³/s² from [JPL's DE440 astronomical parameters](https://ssd.jpl.nasa.gov/astro_par.html). Launch is tangential at radius 6,971 km; the surface radius stays fixed at 6,371 km while central mass varies. Circular speed follows √(GM/r), escape speed √(2GM/r); the classification distinguishes bound, surface-intersecting and escape trajectories. See [NASA's orbit teaching reference](https://pwg.gsfc.nasa.gov/stargaze/Lkepl3rd.htm).

The canvas traces the corresponding ideal two-body conic, with angular rate varying with inverse squared distance for bound paths. It is an illustrative projection, not a calibrated simulation clock. The scene, moon size and camera depth are illustrative, not to scale. No atmosphere, perturbing bodies, finite-size moon gravity or post-impact continuation is physically simulated. The analytical path can show where a surface-intersecting trajectory would go in a point-mass model. Assumptions are available beside the controls. Scientific peer review is outside this visual release.

## Verification

Required static checks: generated artifact parity, four inline script parses, 36 regression tests (including five new orbit/launch tests), and tutorial asset/control contracts. Browser suite covers 1536×1024, 1440×900, 820×1180, 390×844 and 320×740; keyboard skip focus, sliders and presets, app destinations, search, account modal, portrait decoding, horizontal overflow, WCAG rule scans, actual canvas motion, pause/resume, reduced-motion changes, offscreen suspension, frame cleanup and no-canvas fallback.

The founder/tutorial suite uses synthetic local identity callbacks to exercise guest entry, automatic eight-step playback, completion, replay, skip, second account, reduced motion and light theme at desktop and small-screen sizes. It does not submit to Google or validate the external identity service. Real camera hardware, external AI responses and physical mobile GPU/battery performance remain manual checks. Screenshots and detailed results are saved under ignored `qa/results/`.

Release uses a protected-main pull request and required checks, then Pages deployment and the same launch/founder verification on the live HTTPS site. The Downloads master is synchronized only after its original hash is rechecked; a pre-observatory backup is retained.
