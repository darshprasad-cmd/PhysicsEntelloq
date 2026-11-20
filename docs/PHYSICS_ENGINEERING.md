# Physics product integration

## Ownership and build

This is an additive vanilla-JavaScript integration. `experience/product-excellence.js` owns the shell adapters, `experience/product-excellence.css` owns scoped presentation, and `.github/build-experience.js` embeds them into `index.html`. Shared deterministic search, persistence and exports live in `assets/entelloq-science.js`; the optional local classroom workflow lives in `assets/entelloq-classroom.js`. No runtime dependency or UI framework was added.

Run `node .github/build-experience.js` after editing authored integration/shared assets, then `node .github/build-experience.js --check` and `node .github/validate-inline-scripts.js`. Do not hand-edit generated `index.html`. Existing engine source/build ownership is unchanged: visualization under `visualization-source`; learning tools under `learning-tools-source` synchronized with `python scripts/sync-learning-tools.py`; scientific assets through `.github/build-scientific-lab-assets.mjs`.

## Flags and routes

`?excellence=1` enables the new shell; explicit `?excellence=0` restores the prior shell and questionnaire. Loopback development enables it by default. Public canonical origins keep it off without the flag. `?classroom=1` additionally exposes Classroom pilot in More. Turning the product flag off does not erase saved data or re-enable external analytics.

New direct links use `#science:<type>:<id>`. Types map to existing adapters: sim → `openLabFull`, scene → Sandbox preset, lesson/domain → existing concept routes, theory/research/investigate/deep/adv/journey → original view functions, scientific/learning → their existing host routes, practical-guide/bench → existing practical routers, view → main navigation. The JSON catalog records exact URLs and ids. Existing `#learning:`, `#scientific:`, `#practical:` and `#practical-guide:` routes remain supported.

The product adapter owns history for `#science:` destinations. User navigation records the destination before creating embedded frames, suppresses legacy alias writes only during synchronous delegation, and restores the original browser methods in `finally`. Back/Forward replay uses `hashchange` once after legacy cleanup and does not push entries. Empty-URL traversal restores the originating main view, and saved-observation replay preserves its URL while restoring controls. `qa/product-history.cjs` exercises these contracts and is included in the existing full product browser suite. The [history repair record](product-excellence/history-20261120/README.md) documents the reproduced defect and evidence.

The app indexes its runtime registries and fetches the local Biology catalog. Command-K rebuilds from the current catalog, so foreign records arriving after boot become searchable. Search is deterministic with shared aliases; it makes no AI request. `EntelloqScience.resolveSubjectURL` validates the canonical subject origin. For local two-subject staging only, `eqPhysics` and `eqBiology` may specify same-host loopback origins; arbitrary redirect targets are rejected.

## Notebook contracts

The new namespace is `entelloq.science.notebook.physics.v1`. Existing engine notebooks and local progress remain intact. Records retain catalog id, route, model classification/assumptions/limitations, explicit student observations, optional entered measurement with unit, named visible controls and a readable raster canvas capture. A screenshot is labelled as a raster observation, not numerical graph data. CSV avoids embedding large image payloads; JSON preserves available record data; print/PDF includes the actual capture.

Save success requires validated, round-trip verified storage. Failed or denied storage retains the draft and offers an unsaved JSON download. Conflict timestamps, corrupt-store handling and bounded storage are covered by shared tests. Cloud sync is explicitly unconnected; local browser-origin data does not imply native/cloud synchronization.

Resume restores compatible named range/number/select controls and starts a fresh engine run. It does not restore elapsed time, hidden simulation state, uploaded files or camera input. Embedded restoration has a bounded readiness retry. Controls with changed name/type/range are skipped. Dedicated tool exports remain available for richer engine-owned snapshots.

## Preservation proof

`.github/product-preservation.cjs` reverses only explicit source-verified integration slots. It removes the newly embedded core/classroom/product modules and added CSS, then restores immutable baseline SEARCH, LAUNCH, CBSE-ENTRY and TRACK fixtures. Each fixture has a frozen SHA-256. After the 20 November upstream merge, stripping product changes must recover released lever commit `c8e50cdb` exactly (LF-normalized SHA-256 `1276a4b8ebd9418f72eb4c44981446178ba1dd3338158683052d9ce5861cc7ce`). Stripping only the separately verified additive lever slots then recovers original `63a86b4` hash `3e5795faa1012571abcd9ce073d55990de4d7cb19630fcf29f7ea14dcba77ded`.

This proves all other baseline artifact bytes, including original simulation factories/camera engines, are preserved. It is not a claim that all source is unchanged: search routing, guest entry, landing handoff, analytics and generated build composition intentionally changed. Additive wrappers call existing navigation, lab open/close, host decoration and lifecycle functions. Existing historical preservation hashes remain unchanged and still pass.

Lever model, UI, stylesheet and model/UI test files remain byte-identical to released `c8e50cdb`. The builder embeds lever modules before the product adapter, which routes `#science:bench:lever` into the existing `go('lever')` path. Only product metadata and flag-scoped floating-control visibility adapt that workspace. Current artifact and catalog pins are in `product-excellence/lever-integration-20261120/README.md`.

## Local preview and rollback

From this worktree run `python -m http.server 8791 --bind 127.0.0.1`. Preview `http://127.0.0.1:8791/?excellence=1`. With Biology staged on port8792, use `?excellence=1&eqPhysics=http%3A%2F%2F127.0.0.1%3A8791&eqBiology=http%3A%2F%2F127.0.0.1%3A8792`.

Immediate shell rollback is `?excellence=0`; classroom remains off unless separately enabled. Keep exported notebooks before clearing browser storage. A release rollback should revert the eventual integration commit, regenerate and revalidate the artifact, and retain the disabled external analytics patch. Do not revert arbitrary local user work or reset other worktrees. No production push/merge/deployment has been performed; approval remains required, especially where the production branch automatically publishes.
