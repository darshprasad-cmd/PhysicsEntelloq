# Independent history review — 20 November 2026

The focused browser regression passed against the final rebuilt application at 1440, 768 and 390 CSS pixels. This is local Chromium evidence, not WKWebView, an installed native package, a physical device or production verification. No remaining blocking defect was found within this review's history and restoration scope.

`qa/product-history.cjs` produced `history-report.json` with 39 passing cases. At each width it checks five resource families (lever, Vernier calipers, pulse, scientific reality and learning graphs) from both canonical and empty Home URLs, with exact history lengths through two Back and two Forward traversals. Lever DOM observation confirms one render per replay. Three further cases per width verify real Labs navigation and discovery returning to the original blank Labs URL, saved refraction settings returning through their saved-observation route, and recovery after a forced iframe creation error. Separate assertions also pass for legacy lever routes with the product flag on and off, and cold-load/reload without extra entries.

Pulse verification uses the real Step control and observes increased model time in the scrubber after Back and Forward. It also changes the reduced-motion preference and checks that replay controls respond in both directions. This verifies that legacy cleanup has not removed the new workspace's motion listener. The engine remains private; no global engine export or test-only runtime API was introduced.

Saved-route tests verify the restored control value while preserving the saved URL, without pushing the underlying experiment URL. Raw scientific notebook and existing study-note storage remain byte-for-byte unchanged across navigation. These checks concern named control restoration; they do not claim restoration of elapsed engine time, camera input or hidden state.

Source inspection confirms that the canonical user destination is recorded before synchronous legacy delegation creates child frames. Replay does not write a new destination. The exact prior `history.pushState` and `history.replaceState` references are restored in `finally`, along with the routing guard. The forced-error test independently verifies both reference identities and a subsequent successful lever launch. A failed user launch may already have advanced its URL; this repair promises restored routing and recoverability, not transactional rollback of a failed render.

Replay occurs once on `hashchange`, after legacy cleanup. Saved resume propagates replay mode. The empty-return view is captured before a new user launch from a blank URL, preserving Labs as well as Home. At inspection, `git diff --name-only -- experience` listed only `experience/product-excellence.js`; authored engines and host implementations were unchanged by this repair.

The desktop and mobile lever screenshots were visually inspected after Forward navigation: the authored workspace, visible controls, focus indicator and navigation are retained. All three screenshots are available beside this note. They show the resulting replayed interface; the measured before/after distinction is the original history growth failure versus the strict passing history assertions, not a decorative redesign.

Working-file SHA-256 pins captured after the passing run (2026-11-20 15:56 IST; Git may normalize checkout line endings):

| File | SHA-256 |
| --- | --- |
| `experience/product-excellence.js` | `5dfe9ef6b3045b64870c7a1520a05e80351e42aabb583c962dac8d9cfde07330` |
| `index.html` (3,888,371 bytes) | `8fc818045eafe835fe454d76f3068fcbc635444e4e1d9b309acaea7d091fab32` |
| `qa/product-history.cjs` | `ce76200230180473084cbfbebc405e3b33214227e67fd5346a2a330bba1fef92` |

The parent engineering owner runs the broader product and preservation suites separately. No commit, remote mutation, production deployment or native repackaging was performed by this review.
