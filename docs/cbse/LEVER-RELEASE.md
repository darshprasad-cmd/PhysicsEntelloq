# Class 9 lever observation bench

## Bounded scope

Adds `#practical:lever` for standard Class 9 integrated Science's Physics strand, practical `s9-e11`. Existing preparation guide, questionnaire, routes, notes, other instruments, launcher and scientific engines remain intact. The new route is discoverable in Class 9 practicals and the lever preparation guide.

This is an original **ideal apparatus rehearsal**, not a calibrated instrument, a real-time dynamics simulation, educator review, mastery award or completion of supervised school work. No universal syllabus-completion claim is made. Existing `practicals.json` remains a historical audit; use the release ledger and subsequent PR evidence for effective capability.

## Interaction and scientific contract

- Three loads, three load positions and four effort positions give 36 configurations. The pivot is at 50 cm. Load and effort act downward on opposite sides, perpendicular to a held-horizontal weightless beam; the pivot is frictionless.
- Students inspect a selected signed zero error, zero the **unloaded** meter, attach it, and adjust applied effort. Zero correction is not full calibration. An untared, detached, unbalanced or invalid-draft state cannot record a checked observation.
- Balance follows `E × effort arm = L × load arm`. The nearest 0.01 N effort is accepted; residual moment is disclosed rather than falsely rounded to exact equilibrium. The meter graphic retains negative and above-range zero-offset margins.
- Measured MA uses the rounded displayed effort; ideal arm ratio is separate. Rounding differences are not friction, efficiency or free energy. Changed positions are compared separately, never averaged as repeated measurements.
- Checked load/effort/MA inputs, worked reasoning, misconception feedback, three viva/application explanations, apparatus/procedure, errors, precautions and model limitations accompany the interactive controls.
- `peq_lever_v1` stores only revalidated bounded numerical configurations. Repeating a configuration replaces its row. A local fallback, explicit scoped clear and numeric CSV preserve other notes, progress and preferences. No accounts, services or camera are requested.

## References and provenance

1. [CBSE standard Class 9 Science 2026–27](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/ScienceSt_SecP1_2026-27.pdf#page=19), PDF page 19, practical 11; theory context pp. 16–17. This is the established official mapping in `practicals.json`, not the separate Advanced Science course. Re-fetch attempts on 20 November timed out or failed certificate validation; certificate verification was not bypassed. No claim of a successful fresh official-PDF fetch is made.
2. [OpenStax College Physics 2e §9.5](https://openstax.org/books/college-physics-2e/pages/9-5-simple-machines), rechecked 20 November: output/input force ratio, perpendicular moment arms, equilibrium and the force/distance trade-off. Explanations and SVG artwork are original; no reference illustrations were copied.

## Design review

| Before | After | Why |
| --- | --- | --- |
| Guide only; unfinished unstyled draft | Separate interactive bench with the existing Physics palette | Add genuine manipulation without redesigning the app |
| Decimal force draft rewritten on each key | Native draft retained, invalid draft blocks recording | Reliable keyboard entry and no stale recorded force |
| Strict model received input strings | Native numerical values with blank/NaN rejection | Checked observations actually record |
| Signed display offset clipped in the graphic | Signed margins and exact numeric display | Honest zero-error representation |
| Meter, pivot label and arrow could collide | Separated elements and compact pivot label | Readable at all four effort positions |
| Small screen could shrink scale labels | Focusable pan region plus text equivalent and 44px controls | Accessible phone layout without inventing motion |

## Preservation and verification

The narrow builder adds only model, adapter and scoped CSS slots. Stripping those exact slots must recover **every byte** of released `63a86b49b6c7c94b1ce98bb6dfd2596d2cfce6cd` after LF normalization (SHA256 `3e5795faa1012571abcd9ce073d55990de4d7cb19630fcf29f7ea14dcba77ded`). All earlier immutable fixtures and historical hashes remain exercised. No workflow/deployment settings changed.

Local evidence for 20 November is under `qa/results/lever-20261120-final` and `qa/results/lever-regression-20261120`; earlier draft evidence is preserved separately. Model/UI tests include independent arithmetic over all 36 configurations and defensive persistence. Browser checks use the packaged app, four viewport widths (1440/768/390/320), dark/light themes, keyboard/reduced motion, eight scoped axe scans, isolated storage/CSV, first-visit questionnaire/deep links and an actual copied file with network disabled. These are Chromium emulations, not physical-phone or assistive-technology certification.

Before release: source/build parity, inline parsing, whole-artifact preservation, all `.github/test-*.js` suites, existing questionnaire/catalogue/instrument workflows and copied-file operation must pass. Final browser screenshots must be reviewed. Earlier regression-snapshot tests used the same byte-preserved legacy application before the final arrow/pivot-only adjustment; the full lever suite is rerun on the final artifact.

Required PR CI, review, merge, Pages deployment, public HTTPS artifact parity and unchanged live browser verification are separate gates. **The PR conversation is the production authority**; a local checkpoint is not a deployed release. Guide counts and physical-school completion remain unchanged.

### Completed local checks — 20 November 2026

- 326 passing Node test executions across `.github/test-*.js` (some suites are intentionally included again through the preservation entrypoint); 15 are the new lever model/UI tests. Final source preservation entrypoint: 43 passing tests.
- Experience builder `--check`, five inline scripts parsed, scientific source/runtime parity, learning source/runtime parity and visualization bundle parity passed.
- Additional visualization 16, learning-state 14, physics/sketch-core 15 and Python geometry/companion 23 tests passed.
- Final lever browser suite: 10 report groups, all 36 configurations independently calculated, four widths, eight scoped axe scans with zero violations, no failing assertions or retries. Earlier successful pre-arrow-adjustment evidence is kept separately, not presented as the final build.
- Unchanged legacy browser suites in the isolated snapshot: questionnaire 10, catalogue 8, measurement instruments 9, spherometer 12, lamina 13 and pulse 9 report entries, all passed; each includes copied-file/offline checks. No old QA output was overwritten.
- Final desktop apparatus, all effort positions, phone controls and notebook renders were visually reviewed. Local final LF-normalized artifact: 3,812,059 bytes, SHA256 `1276a4b8ebd9418f72eb4c44981446178ba1dd3338158683052d9ce5861cc7ce`.

This evidence does not replace required hosted checks or a fresh public HTTPS comparison after deployment.
