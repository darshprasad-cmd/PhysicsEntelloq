# Advanced Studio release

## Scope

Adds a visible upper-undergraduate area to Home, desktop navigation, Explore and search. Preview is public. The first treatment asks for an explicit, voluntary choice with subject-specific prerequisites; the choice is remembered for the current tab. No examination, account restriction, earned unlock or claim of assessed mastery.

The six existing treatments are analytical mechanics, special relativity, electrodynamics, quantum mechanics, statistical mechanics and nonlinear dynamics. Counts are derived from the content: 70 derivation steps and 20 problems. The interface explicitly distinguishes the undergraduate core from optional deeper extensions.

## Implementation

- `experience/advanced-studio.js` owns the portal, native warning dialog, tab-scoped acknowledgement, last-opened treatment and reading enhancements.
- `experience/advanced-studio.css` supplies responsive editorial styling, light/dark materials, keyboard focus and readable scrollable scientific plots.
- Home, navigation and search gain visible entry points; five primary mobile destinations remain unchanged.
- The existing treatment renderer retains its contents and solvers. Its section jumps respect keyboard and reduced-motion preferences. The old duplicate catalog/gate are replaced by the Studio.
- Leaving or switching treatments disposes of the solver and scroll listener. Light-mode plot colours and annotations are corrected; scientific equations are not altered.
- The single-file builder embeds the new sources. CI adds four Advanced Studio contract tests.

## Evidence before publication

- 31 unit tests passed; four inline scripts parsed; generated artifact check passed.
- Feature tutorial and three-app launcher checks passed; original founder image and automatic welcome-tour tests passed.
- Staged browser run: 108 accessibility/layout scans across 1440, 768, 390 and 320 pixel widths, both themes, all six treatments and their numerical controls. No reported WCAG A/AA findings, page overflow or runtime errors. Plots intentionally scroll inside their own regions.
- Actual screenshots inspected: portal, subject cards, warning, treatment reading and numerical plots, desktop and mobile, both themes.
- Entry regressions passed with normal and blocked storage: public deep-link preview, gated search entry, contained keyboard focus, Escape back to preview, Learn exit, acknowledgement on reload within a tab, renewed warning in a fresh tab, cleanup on index and Home navigation.
- Compared to pre-release main: `ADV_BANK`, `ADV_WAYS` and all six numerical solver bodies are unchanged. Only shared plot palette colours changed.

## Earlier quality sweep in the same task

Published PRs #14 and #15 fixed duplicate search, keyboard focus, corrupted search history, missing control labels, mouse-only Playground cards, a narrow journey footer, sticky-header concept placement, numeric scientific-notation parsing, hidden simulation loops and graph observer cleanup. Live verification: 81 deep-screen scans and 50 core-screen scans; no reported accessibility violations or page overflow. Four-size interaction regressions and Lab lifecycle tests passed.

## Limits

These checks are not a complete scientific peer review or proof that every possible defect is absent. Existing scientific prose, numerical approximations and source citations were retained. Real Google sign-in, AI-provider responses, camera hardware and assistive-technology hardware were not exercised. No auth, billing, camera, provider or deployment infrastructure changes were made.

Level framing was checked against the advanced undergraduate topics and prerequisite expectations in [MIT Classical Mechanics III](https://ocw.mit.edu/courses/8-09-classical-mechanics-iii-fall-2014/pages/syllabus/) and [MIT Quantum Physics II](https://ocw.mit.edu/courses/8-05-quantum-physics-ii-fall-2013/pages/syllabus/). This is product-level guidance, not a claim of course equivalence or affiliation.
