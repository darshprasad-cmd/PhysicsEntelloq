# Irregular lamina: area, thickness and volume

Source checkpoint, 27 October 2026. This document records the implementation and local gates. The release PR conversation is the append-only authority for subsequent required checks, merge, Pages deployment and live parity; do not infer release from a source checkpoint alone.

Release conversation: [Physics PR #40](https://github.com/darshprasad-cmd/PhysicsEntelloq/pull/40). Check its production-verification comment for the actual merge/deployment result; this source document intentionally does not predeclare it.

## Bounded gap

`p11-a-e03` already had a practical preparation guide but no combined apparatus workflow. The existing screw gauge measures sheet thickness; it does not trace an irregular area or combine five readings with that area. This release adds one isolated bench at `#practical:lamina`, with discovery from the Class 11 catalogue, its existing guide and the measurement/Lab entry. The 72 standard, 18 accessible and 8 project preparation guides remain separately counted; this is not exhaustive interactive coverage or a school-completion record.

## Method and references

- [CBSE Physics 2026–27, XI Section A experiment 3, PDF page 7](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Physics_SecP2_2026-27.pdf#page=7). Current index/course tables establish the year despite the document's stale opening heading.
- [NCERT Experiment 2(c), printed pp40–41 / PDF pp18–19](https://www.ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classXI/physics/kelm102.pdf#page=18); thickness method/table in Experiment 2(b), printed p39 / PDF p17. These are method references, not a different current syllabus numbering.

Original SVG and deterministic teaching data only. The reference review independently verified the method: trace on millimetre graph paper, count full squares and boundary squares more than half covered, take five thickness readings along different edges, correct signed zero error, and multiply area by mean thickness.

The manual does not specify exactly-half handling. This bench declares half a square for those ties. Its conservative traced-outline bounds are an additional mathematical teaching aid, not a quoted NCERT rule. At square side s, F full cells, G more-than-half cells, H exact-half cells and B all nonempty partial cells:

- Counted area: `(F + G + H/2) s²`.
- Ideal traced-outline bounds: `F s²` to `(F+B) s²`. A mere point/line touch does not add a boundary cell.
- Corrected thickness: `main + circular × LC − signed zero error`.
- Volume in cm³: `area in cm² × mean thickness in mm / 10`.

## Operable workflow

Two prepared polygons, five near-edge locations each, 1/0.5/0.1 cm grids (the last is a millimetre graph), a selected-cell magnifier and equivalent numeric counts. Larger grids intentionally expose counting error. The fine-grid estimate happens to equal polygon area for these selected examples; this is incidental, not a universal exactness guarantee.

The screw has 0.5 mm pitch and 50 divisions: 0.01 mm least count. Three UI instrument scenarios include positive, zero and negative offsets. Empty jaws must touch for calibration; sample contact is limited by the sheet, and withdrawal remains possible. A signed, unwrapped teaching-scale representation explains the negative-zero case without implying a negative physical jaw gap. This is an enlarged schematic, not a geometrically faithful commercial instrument.

Students enter counts, area, each scale contribution, corrected thickness and final volume. Wrong readings, count classifications, units, missing distinct positions or nonfinite input are not accepted. A repeated edge replaces that edge; it cannot stand in for five separate positions. New specimen/instrument settings invalidate the affected pending measurements, not saved trials. Grid changes retain the same specimen's thickness readings but require a new area estimate.

Only checked raw values persist under `peq_lamina_v1`. Derived values are recomputed; untrusted extra fields, inherited IDs and forged records are rejected. Storage is versioned, bounded and deduplicated by specimen/zero/grid. CSV includes all five raw scales, units, correction, area/volume bounds and virtual provenance. Unavailable storage retains session data and offers export. Clearing requires confirmation and touches only this notebook. No course note, previous instrument notebook, progress or questionnaire key is changed.

## Scientific and safety limits

V ≈ A × mean thickness assumes a thin, reasonably uniform sheet. Five edge samples do not establish an area-weighted mean for strongly nonuniform material. Small fixed thickness differences are exercise data, not calibrated physical noise or material properties. Multiplying graph bounds by a fixed mean yields **area-only** volume bounds; they omit thickness uncertainty, tracing width, calibration drift, backlash and compression. They are not confidence intervals.

An independently checked synthetic example uses LC 0.01 mm, observed readings 0.64/0.66/0.65/0.64/0.66 mm and zero error +0.03 mm. Corrected mean = 0.62 mm. On a 1 mm grid, 318 full + 34 more-than-half squares give area 352 mm² and volume 218.24 mm³ = 0.21824 cm³. With 64 partial boundary cells, the area bracket is 318–382 mm² and fixed-thickness volume bracket 197.16–236.84 mm³. This example is not a fabricated physical observation record.

Use teacher-prepared safe-edged specimens, gentle ratchet contact and consistent approach. Actual force, touch, backlash and physical handling are not reproduced. The software does not certify practical competency, educator review or apparatus calibration.

## Preservation and design

New files: `experience/lamina-model.js`, `lamina-lab.js`, `lamina-lab.css`. The existing narrow builder adds only those exact source slots; `index.html` is the generated single-file artifact. Tests remove exactly those slots and compare every remaining byte to published `aca2bb6` (normalized SHA256 `4a99484100c46513d025fed30c1242a8b585420e9ae00642388b273b0774d6f4`). All earlier immutable fixtures and digests still run. The app-design CI entry imports the new tests; deployment configuration is untouched.

| Before | After | Why |
| --- | --- | --- |
| Preparation guide only | Counted graph area plus operable screw gauge | Link observations to a calculated volume |
| Boundary-square counting can imply exact area | Magnified cell inspection and explicit bounds | Separate an approximation from precision |
| Negative zero and mixed units can silently bias results | Separate calibration/read/calculation checks | Give misconception-specific feedback |
| No linked lamina record | Isolated raw notebook and CSV | Retain useful simulated evidence without overwriting student work |
| Small scales and gesture-only controls could exclude users | Enlarged scales, text equivalents, native controls, 44px targets | Readable keyboard/mobile use without decorative motion |

No dependency, authentication, analytics, infrastructure, shared asset, launcher, dissection, camera or legacy scientific model change. Engineering and design guidance kept this additive, keyboard-first and scoped to the practical.

## Verification

Local and production gate results are recorded below and in the release PR. Browser checks are emulation, not physical-device or screen-reader certification. No synthetic check is represented as webcam validation.

### Local release gates — 27 October 2026

- Source assembly check, all five inline scripts, scientific module asset parity and learning-tool source parity passed. All six current/historical artifact-preservation checks passed; original fixtures are unchanged.
- `node --test .github/test-*.js`: 218 passing test executions, including imported suites (not 218 unique cases). New lamina contracts comprise 12 numerical/model tests and five UI/integration tests.
- Existing scientific Python suites: 8 + 15 passed. Existing Physics/sketches module tests: 15 passed. Existing review/notebook tests: 14 passed after installing their already-locked dependencies; no dependency or lockfile change.
- Independent numerical review compared all 6,300 grid cells against a separate scan-line integration, agreeing within 4e-13 in covered fractions. No scientific release blocker was found; this is numerical review, not qualified educator or physical-apparatus validation.
- `qa/lamina-lab.cjs`: 13 browser checkpoints passed at 320/390/768/1440 px, including both specimens, five distinct readings, three graph sizes, positive/negative/zero offsets, invalid-input and duplicate-position gates, actual SVG geometry, all six saved numerical results, 30 raw CSV rows, storage failure/corruption/isolation, entry routes, first-visit skip/complete with deep links, keyboard/reduced motion and offline single-file operation. Ten scoped axe scans reported zero violations; no runtime errors or camera requests.
- Visual review checked dark/light and mobile renders. It caught and repaired inherited SVG letter spacing and light-theme caption contrast; both have browser regression assertions. Evidence is in `qa/results/lamina/` (report, screenshots and CSV).
- Existing measurement, spherometer, practical catalogue and CBSE questionnaire browser suites passed at all four widths, with their offline and data-preservation checks. Integrated learning-tools, visual-tools and host-quality Chromium suites passed. Their generated QA files remain local evidence, not unrelated release changes.
- `git diff --check` passed. Release is still gated on the PR's required checks, tested-head merge, successful deployment, exact live artifact parity and live changed-behavior checks.
