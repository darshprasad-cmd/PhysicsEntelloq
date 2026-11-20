# Product history repair — 20 November 2026

The native same-interface review reproduced Home → Lever → Refraction → Back increasing history length from 4 to 5. The next Back reached a legacy lever alias instead of Home. The focused browser regression reproduced that exact `5 !== 4` failure on the previous source before the adapter changed.

The shared adapter previously delegated to legacy renderers, which replace or push their own legacy aliases, and then pushed the product URL. Restoring an existing route used the same path, and both `popstate` and `hashchange` rendered it. The correction gives the product adapter ownership of `#science:` history: synchronous legacy rendering cannot write history, original history methods are restored in `finally`, a user open pushes at most one canonical entry, and route replay never pushes. Replay runs once on `hashchange`, after legacy cleanup, to avoid resetting or stopping a newly rendered instrument.

The previous product URL survives legacy fallback callbacks when the browser has already changed destination. This lets Back restore the originating Home or Labs interface at an empty root URL. Explicit legacy navigation releases product ownership. Saved-observation route replay propagates the same replay mode into settings restoration.

A broader regression also exposed browser joint-history behavior: creating a scientific iframe before pushing its parent destination could asynchronously collapse the earlier entry, despite exactly one parent push. The final adapter records a user destination before rendering its child frames. The same strict history assertions then pass for the embedded scientific and learning hosts. No iframe or scientific-host implementation needed modification.

Only `experience/product-excellence.js` changes runtime behavior; the builder regenerates its existing slot in `index.html`. Authored lever/pulse/measurement engines, scientific and learning hosts, notebook implementations, camera code, scientific equations, CSS and dependency/workflow configuration are unchanged. Both historical artifact preservation checks remain intact.

The focused regression is `qa/product-history.cjs`, also invoked by the existing full product browser suite, so existing CI runs it without a new workflow. Browser evidence covers real session history and rendered destinations at desktop, tablet and mobile widths. It is not iOS/WKWebView or physical-device certification. The coordinated native owner must repin and validate its own package before handoff. No production merge or store submission is part of this repair.

Validation passed against the same final working artifact:

- 39 focused history cases at 1440, 768 and 390px, plus legacy routes and cold reload; desktop/mobile screenshots were visually inspected. See `history-report.json` and `INDEPENDENT_REVIEW.md`.
- Full product browser suite passed, including the new history suite, guest launch/manipulate/save/resume, cross-subject search, lever notebook, exports, classroom pilot, blocked persistence, rollback flag and responsive controls. First meaningful interaction measured 771ms desktop and 630ms mobile in this local Chromium run; these are automated observations, not student usability findings. See `full-product-report.json`.
- 398 static tests, 16 visualization tests, 14 learning tests, 15 tool-core tests, 8 robotics tests and 15 companion-boundary tests passed. Generated/source parity and inline-script parsing passed.
- All seven remaining required browser suites passed, including 12 camera-lifecycle scenarios. See `required-checks.json` and the accompanying logs. Its recorded HEAD is the pre-repair parent; the before/after file hashes identify the actual dirty candidate tested.
- Both historical preservation checks pass. Removing the additive product slot recovers released lever artifact SHA-256 `1276a4b8ebd9418f72eb4c44981446178ba1dd3338158683052d9ce5861cc7ce`; removing the released lever slot as well recovers the original audited artifact SHA-256 `3e5795faa1012571abcd9ce073d55990de4d7cb19630fcf29f7ea14dcba77ded`.

`artifact-and-preservation.json` records local and normalized artifact hashes, catalog hashes and unchanged authored-engine files. The new commit containing this record is the source pin; hosted CI must validate that commit separately. Previous head `090d4e97` passed hosted run `44714470785`, which does not certify this subsequent repair.
