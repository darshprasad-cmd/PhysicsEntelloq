# Observatory workspace — 14 September 2026

The app previously kept the launch palette but painted a solid background over the observatory. The same approved image now remains behind app pages, including returning-user entry without visiting launch.

- `observatory-markup.js` exposes one embedded artwork value, reused by the existing hero and the new workspace layer. No new image or duplicate base64 payload.
- `app-design.js` mounts one decorative, pointer-transparent backdrop at startup, outside route content. No scroll listeners or new animation loop.
- `observatory-theme.css` keeps the scene stationary behind scrolling pages and lightly translucent dark Home/navigation surfaces. It is hidden during launch to avoid double painting and hidden for print. The original launch composition and motion are unchanged.
- Plot canvases, instrument stages, dialogs and reading controls retain their contrast surfaces. Explicit light mode uses a much lighter photographic wash; shared text tokens maintain at least 4.5:1 contrast over worst-case white/black image pixels.
- `test-observatory-theme.js` checks shared payload, decorative mounting and worst-case contrast. `qa/continuity-check.js` verifies the exact image, fixed bounds across scrolling, launch handoff, light mode, cold entry, pointer transparency and reduced-motion preferences at four sizes.

Verification: 41 regression tests, four inline script parses, artifact parity, tutorial asset/control contracts, and HTTPS browser suites for app accessibility/layout, broader routes, launch motion, founder information and synthetic signup-tour handoff. Screenshots and detailed reports are in ignored `qa/results/`.

No scientific units, approximations, models, authentication, AI providers, camera logic, dependencies or deployment configuration change. This is a visual release; scientific peer review, live identity-provider responses, external AI responses and physical mobile GPU/battery testing are outside its validation scope. The founder image and story, tutorial, app switcher and voluntary Advanced Studio entry remain intact.
