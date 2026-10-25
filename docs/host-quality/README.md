# Physics host quality pass

The learning adapter keeps the existing Physics routes, theme tokens, saved-work
keys and scientific model boundaries. It now uses a compact toolbar, contextual
entry headings, an optional About disclosure and a tool viewport calculated from
the actual scrolling container. Loading and failure states remain visible; a
successful load is announced without taking up working space.

Directly switching between learning bookmarks now selects the new tool's default
parent. Opening a tool from an application card still returns to that specific
section. Teardown flushes sketch edits and stops media. Alt+Escape and the existing
Alt+Shift+Left return to the section; plain Escape is left to the editor.

## Evidence

Run `node qa/learning-host-quality.cjs` for the six new behavior groups. It checks
320, 390, 768 and 1440px widths in both themes, title/return focus, keyboard About,
actual pointer drawing followed immediately by a bookmark switch, parent routes,
delayed loading, and keyboard retry after a missing module. Screenshots and exact
measurements are in `after/`; `before/` records the published host baseline.

At 390×844, the tool starts at y155 (previously y338 for sketches and y365 for
animations) and has a 604px viewport. At 1440×1000 it starts at y176 and has an
812px viewport. A minimum 360px height keeps tools usable on shorter screens,
where the surrounding page can scroll.

Validation at this host handoff: 182 static tests, 13 established learning host
checks, 10 established visual host checks and all six new quality groups passed.
No page errors were reported. Current source-to-inline parity and inline script
parsing passed. Screenshots were inspected for narrow-screen and light-theme
readability. The old host suite also covers practical notes and spherometer
destinations.

The final sketch module handoff arrived after these browser runs. Its source and
runtime are owned by the coordinating integration; these results describe the
host against the earlier sketch runtime and the newly synchronized Physics,
learning and animation runtimes. The coordinator will rebuild and repeat affected
checks against all final module bytes before release. This is local evidence,
not deployment verification.

The exact previous host source fixtures in
`.github/fixtures/host-baseline-9d027d5/` let preservation checks reconstruct the
immutable published artifact. Every older full-artifact hash remains unchanged;
the checks also require exact current source-to-inline slots before reconstruction.
