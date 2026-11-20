# Physics UX audit — 29 October 2026

Audited fetched main `63a86b4` before major application changes. Work is isolated on `codex/product-excellence-20261029`. Existing dirty checkouts and unmerged engine work were not incorporated. This report records the Physics evidence behind the cross-subject [ranked priorities](ENTELLOQ_PRIORITIES.md).

## Actual baseline

`qa/product-excellence-before.cjs` captured independent Chromium guest profiles at 1440×1000 and 390×844, with reduced motion and external services blocked. Original captures and machine-readable observations are in [product-excellence/before](product-excellence/before). The script now explicitly serves `git show 63a86b4:index.html` so later runs cannot accidentally capture the redesign as the baseline. Existing unchanged local tool assets supply embedded documents.

| Finding | Actual experience / source evidence | Priority |
|---|---|---:|
| Navigation varies by device | Desktop exposes roughly ten main destinations; mobile exposes Home, Universe, Learn, Lab, Me. `experience/app-design.js` supplies secondary navigation. | 1 |
| Search omits experiments | Typing `pendulum` returned six lesson matches, including Temperature & Heat and Semiconductors; no Double Pendulum experiment. Baseline `experience/search.js` indexes lessons/domains/courses/views. | 2 |
| Workspaces have inconsistent entry and save | `openLabFull` builds the actual live experiment, but has no common observation save. Nine Lab modes and multiple tool promotions compete above the apparatus. | 3 |
| Cold guest must dismiss questions | `experience/cbse-entry.html` shows a skippable four-question dialog. The original landing orbit is interactive after dismissing it. | 4 |
| Persistence differs by engine | Existing learning, graph and practical notebooks have their own contracts. Some legacy progress storage catches write errors. A successful general experiment save could not be demonstrated because that feature did not exist. | 5 |
| Excess host chrome reduces mobile science | Reality Lab iframe begins at y330.4 desktop and y346.6 mobile. The mobile Labs screenshot initially shows discovery/promotional content rather than a running experiment. | 6 |
| Scientific model semantics differ | Legacy projectile uses screen-scaled/frame progression; legacy orbit advances ellipse angle uniformly. These previews cannot substantiate SI trajectories or Kepler timing. New labels classify them as illustrative. | 7 |
| Full-screen action crowding and floating overlap | Before/after inspection identified title compression and the app switcher covering Index n in the new mobile flow. Final refinement uses two header rows and hides nonessential floats during scientific workspaces. | 8 |
| No classroom review backend | There is no school identity/roster/inbox service in this repository. A local file pilot is feasible; cloud classroom permissions require additional architecture. | 9 |
| Optional modules have external requirements | Hosted AI, external engines, camera permissions and native origins differ. Existing failure states and opt-in boundaries must survive shell changes. | 10 |

## Inventory and protected boundaries

The generated [Physics catalog](../assets/entelloq-physics-catalog.json) now contains 343 actual items after the 20 November integration of the released lever bench: 25 experiments, 89 lessons, 10 concept collections, 21 numerical workspaces, eight measurement benches, eight investigations, 22 courses, six advanced treatments, five learning journeys, 20 Sandbox scenes, five scientific tools, eight learning tools, 98 practical preparation guides, six interactive practicals and 12 destinations. Preparation guides are not presented as 98 new working practical engines. The original baseline audit above remains dated 29 October.

The live modal invokes existing `SIMS` factories. Scientific/learning hosts retain iframe lifecycles. Sandbox, hand interaction, camera physics, scientific numerical models and existing notebook namespaces remain owned by their original engines. No engine, camera model or virtual-dissection code was rewritten. Biology dissection validation is recorded separately in the Biology repository.

External Clarity session replay is disabled independently of the UI flag, including stored project overrides and identity calls. See [the verified analytics finding](STUDENT_ANALYTICS_PRIVACY_FINDING.md). Local study state remains available.

## Evidence limits

The automated fresh guest reaches and changes the featured refraction control within 30 seconds locally. This establishes a reachable interaction path, not real-student comprehension or a public-network performance result. No real-student sessions, physical camera calibration, iOS/WKWebView run, hosted CI, production merge or deployment is claimed. Remaining gates and exact checks are in [the test report](ENTELLOQ_TEST_REPORT.md).
