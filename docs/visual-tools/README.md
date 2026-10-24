# Visual tools inside Physics

The existing learning-tools adapter opens Excalidraw as **Visual notebook** from Solve, Lab and Research (`#learning:sketches`). Authored Manim explanations open as **Motion explained** from Learn (`#learning:animations`). Both use the current Physics palette and existing navigation. They do not change marks, mastery, experiments or scientific calculation engines.

Sketches are editable annotations, not computed forces or a validated physical model. They remain in this browser until exported. The host flushes pending changes through the module's synchronous destroy API before leaving or reloading the frame.

The short, silent films are rendered explanations of stated idealized models. They are not live simulation results. Playback begins only after an explicit action. Captions, chapter seeking, a complete transcript and still frames accompany each film; reduced-motion users retain control of playback. The host destroys the player before removing its frame, cancelling outstanding loads and releasing media URLs.

## Rebuild and checks

Pinned module source and licences live under `learning-tools-source/sketches` and `learning-tools-source/animations`. Their runtime manifests define the files copied to `assets/learning-tools/`; the host manifest records exact bytes and SHA-256 hashes. Rebuild with `python scripts/sync-learning-tools.py` and `node .github/build-experience.js`. Both support `--check`.

Run `node scripts/check-visual-tools-browser.cjs` for genuine engine/host interaction checks. Set `ENTELLOQ_LIVE_URL=https://physics.entelloq.com/` to check the deployment. Screenshots and JSON evidence are written here. The required CI workflow runs these checks alongside the existing learning workspaces.

## Existing route regression

While a learning or scientific workspace was open, a same-document link to an older practical guide could be replaced by the previous parent section. The tools' `popstate` fallback ran before the practical guide's own hash handler and erased its destination. Each fallback now returns to the parent only for an empty hash; a nonempty destination is handled by its owning router, with normal `go()` cleanup.

`routing-before-fix.png` records the reproduced failure. The existing host browser suite now exercises practical notes → notebook → review → practical notes, native browser Back, and Proof Studio → practical notes. It verifies that the requested hash and saved observations survive and the previous engine frame is removed. Existing immutable application-preservation hashes remain unchanged.

## Local verification

On 24 October 2026, all 156 existing static tests, 23 scientific Python checks, 9 Physics model/storage checks, 14 shared review/notebook/search checks, and 6 sketch validation checks passed. The Python HTTP suite was checked with bundled Python 3.12.14, matching CI; a preceding run under system Python 3.14 hit a Windows connection-abort error. No server or test contract was weakened.

Ten visual integration checks and twelve existing learning-workspace checks passed with no uncaught page errors. These exercise genuine pointer drawing and editable export, reload persistence, theme propagation, tablet/mobile layout, application entry points, Manim video decode and chapter seeking, explicit playback, keyboard return, missing-asset recovery and the practical-navigation regression. Desktop and mobile evidence was visually inspected. These are local checks; required remote CI and deployment verification remain separate release gates.

The same release includes independently reviewed persistence repairs: graph/circuit/equation state writes no longer overwrite unrelated fields from another open tab, and concurrent review ratings preserve existing history. Their regression tests ship with the corresponding pinned modules and run in required CI.
