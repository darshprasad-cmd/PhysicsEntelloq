# Concise Learn and light-mode repair — 2026-09-20

**Historical release note:** The user subsequently requested restoration of visual-first Learn. The guided-card/checkpoint layer described below has been removed. The original lesson renderer, visible six lenses, multiple representations, experiments and companion are restored; light-mode fixes and the clearer background are retained. Current restoration checks are `.github/test-visual-learn.js`, `qa/visual-learn.js` and the updated `qa/light-mode.js`.

## Scope

- 66 Foundation/Intermediate Learn lessons: one core idea at a time, 197 authored two-choice recall checks, immediate feedback, retry/review/skip and a visit-only summary. Checks do not write scores, award XP or assert mastery.
- Existing extra notes are available as expandable “Did you know?” cards. Equations, six lenses, practical experiments and connections remain available on demand. Visual tools mount only when visible; closing a live representation stops it.
- The 23 Advanced lessons, Advanced Studio and separate 12-section Deep Dives do not receive this lesson flow. Shared curriculum, full-course content and founder launch source were compared against main and preserved.
- Light mode repairs runtime lens labels/readouts, graph relationships, journey captions, Sandbox telemetry/transport and lab readouts. Scientific canvas stages retain their dark instrument backgrounds; no trace colours or scientific solvers are filtered or changed.
- The exact observatory artwork remains shared with launch. Light overlay opacity changes from .96 to .82, with darker text tokens verified at >=4.5:1 even over its darkest photograph pixels. No additional image payload or background render loop.

## Scientific limits

These are introductory recall checks, not a validated assessment or an advanced competency gate. Compact statements include model limits, including constant-mass/inertial mechanics, no-drag/equal-height projectile range, ideal-flow Bernoulli, ideal-gas pressure–volume work and far-field dipoles. Nuclear binding, finite signal propagation and calibrated carbon dating wording avoid oversimplified claims. Shared simulation calculations and the existing AI provider boundary are unchanged.

References used to check introductory assumptions: [OpenStax projectile motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion), [Bernoulli](https://openstax.org/books/university-physics-volume-1/pages/14-6-bernoullis-equation), [nuclear binding energy](https://openstax.org/books/university-physics-volume-3/pages/10-2-nuclear-binding-energy).

## Verification

- 58 Node tests passed, plus inline-script parsing, deterministic assembly and feature tutorial contracts.
- `qa/learn-checkpoints.js`: all 89 lesson routes checked for eligibility; correct/wrong/retry/review/skip, keyboard focus, disclosure, readouts and no score mutation at 1440/850/390/320px. No AI submitted.
- `qa/light-mode.js`: 286 scans at 1440/390px, all six lenses for nine representative lessons, every available extra panel, answer feedback, primary destinations, tutor/search/Explore and full-screen lab. Zero detected WCAG A/AA or page overflow findings. Explicit light and system-theme changes persist through reload.
- `qa/quality-sweep.js full-light-recheck --staged --light`: 81 page scans plus runtime/shortcut records. Zero detected accessibility, duplicate-ID or page overflow findings. Existing horizontally scrollable Sandbox transport extends beyond the narrow viewport within its own scroll region.
- `qa/app-design-check.js light-final --staged`: 50 main-surface dark/light scans passed.
- `qa/advanced-studio.js`: six treatments, controls, voluntary gate and responsive navigation, dark/light at four widths; 108 scans passed before the final scoped legacy-tool repairs.
- `qa/continuity-check.js`: unchanged artwork, founder area, cold entry, explicit light preference, launch colour continuity and cradle in both themes at four widths passed.
- `qa/sandbox-render.js`: solar preset star produces non-empty coloured canvas pixels at desktop and mobile widths in light mode.

Browser runs use isolated guest profiles at the real HTTPS origin with staged HTML, or the deployed page with `--live`. Screenshots and raw reports are local in the ignored `qa/results/` directory. Real sign-in, live AI inference, camera hardware, physical iOS/Android and non-Chromium browsers were not exercised. Existing provider/security tests passed with mocked transport.

## Authored sources

`experience/learn-flow.js` and `.css` own the lesson flow. `experience/light-mode.css` owns targeted legacy-tool fixes. The theme file owns shared light tokens and the photograph veil. The builder embeds these in the single-file distribution. Small inline hooks defer existing lesson tools and reapply accessibility labels after lens changes. No new dependencies or external services.
