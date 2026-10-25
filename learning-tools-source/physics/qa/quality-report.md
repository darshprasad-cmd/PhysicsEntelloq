# Physics quality pass — 26 October 2026

| Before | After | Why |
| --- | --- | --- |
| Out-of-range numeric input was silently clamped, and bounds were not visible. | Units and ranges accompany every motion/circuit field; invalid drafts remain editable with associated error text. | Learners can see and correct the entered value instead of unknowingly testing another value. |
| An invalid visible draft could coexist with a usable export or circuit launch. | Validation runs on input, exports/launches disable immediately, and the external simulator link loses its destination until valid. | Every enabled action refers to the displayed valid settings. Another valid edit cannot hide an outstanding error. |
| Motion labels used terse symbols and the landing label clipped on narrow graphs. | Descriptive velocity/gravity labels, axis-unit caption, and inward landing labels. | The graph is readable on a phone and easier to interpret. |
| Numeric controls were crowded in a three-column sidebar. | Two velocity columns plus a full-width gravity field, tabular numbers, readable hints, and responsive actions. | More space for precise input without changing the existing blue palette or model. |
| Button interaction feedback was inconsistent. | Short press feedback, persistent keyboard focus and a reduced-motion override. | Actions feel responsive while keyboard and motion preferences remain respected. |

Changed implementation: `tools.mjs` and `style.css`. No changes to `core.mjs`, the mathematical models, stored key names, vendor versions, optional remote-launch boundary, or host APIs. The README documents the validation behavior. The existing browser runner now accepts `CHECK_BROWSER` so installed Chrome can be used without changing CI's default browser.

Verification completed:

- `npm test`: 9 passing model/storage tests.
- `CHECK_BROWSER=chrome CHECK_HOSTED=1 npm run qa`: 11 passing browser groups, including real MathLive, JSXGraph, actual hosted CircuitJS canvas, persistence, offline state, local-only loading before opt-in and unmount.
- `node tests/quality.mjs`: 8 passing quality groups. Checks include actual sequential decimal typing and caret insertion, capacitance precision, invalid input before blur, cross-field error persistence, corrected inputs, external-link gating, keyboard panel focus, reduced motion, and no horizontal overflow at 390, 820 and 1280 px.
- No browser page errors. `git diff --check` passed.
- Visually inspected the desktop baseline and updated desktop/mobile layouts, both palettes, and the repaired landing label. Screenshots and JSON checks are in `quality/`; the full browser suite evidence remains alongside this file.

These are isolated Chrome checks, not physical-device touch or Safari testing. Production shell integration, required repository CI and deployment verification belong to the host release. The hosted CircuitJS evidence proves current canvas availability, not scientific validation of every upstream component.
