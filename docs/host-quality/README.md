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

Run `node qa/learning-host-quality.cjs` for the seven new behavior groups. It checks
320, 390, 768 and 1440px widths in both themes, title/return focus, keyboard About,
actual pointer drawing followed immediately by a bookmark switch, parent routes,
delayed loading, keyboard retry after a missing module, and measured clearance
above the existing floating app switcher/tutor (including focused drawing).
Animation screenshots wait for a decoded poster, not just an image element.
Screenshots and exact
measurements are in `after/`; `before/` records the published host baseline.

At 390×844, the tool starts at y155 (previously y338 for sketches and y365 for
animations) and has a 545px viewport. Its bottom is y700, leaving 12px before the
tutor and 22px before the app switcher. At 1440×1000 it starts at y176 and has a
740px viewport, with 12.5px clear of the tutor. Height is reserved only for visible
floating controls that horizontally overlap the iframe; shell behavior stays
unchanged. A minimum 360px height keeps tools usable on shorter screens,
where the surrounding page can scroll.

Validation at this host handoff: 182 static tests, 13 established learning host
checks, 10 established visual host checks and all six original quality groups
passed. The final float-clearance followup reran all seven quality groups against
the final sketch runtime and passed, with generated/source and preservation checks.
No page errors were reported. Current source-to-inline parity and inline script
parsing passed. Screenshots were inspected for narrow-screen and light-theme
readability. The old host suite also covers practical notes and spherometer
destinations.

Module sources and runtime are owned by the coordinating integration. The earlier
established browser suites preceded the final sketch copy; the new host quality
suite was repeated after that copy. The coordinator will rebuild and repeat
affected checks for the pending animation image-loading followup before release.
This is local evidence, not deployment verification.

The exact previous host source fixtures in
`.github/fixtures/host-baseline-9d027d5/` let preservation checks reconstruct the
immutable published artifact. Every older full-artifact hash remains unchanged;
the checks also require exact current source-to-inline slots before reconstruction.
