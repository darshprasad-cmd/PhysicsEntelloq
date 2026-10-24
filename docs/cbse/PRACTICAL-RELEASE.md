# Physics practical preparation and measurement benches

Status: **released and live-verified**, reconciled 24 October 2026 against the [PR #33 production evidence](https://github.com/darshprasad-cmd/PhysicsEntelloq/pull/33#issuecomment-6373640411). Merge `cf62ad68f9c6899527f17c41fa4d87a05e4ab0b1`; required PR/push checks and Pages succeeded. The live 3,578,273-byte artifact matched SHA256 `9dc46003631d939464764fdc7d854f17259789c2465606d8272d4b4bba8cf562`. Both instrument and catalogue live browser suites passed. These are historical release bytes, not a claim that later releases retain the same hash.

Later apparatus work is recorded separately in `SPHEROMETER-RELEASE.md` and `CHECKPOINTS.json`; the scope counts below describe PR #33 only. Biology's sibling guide release is independently verified in [PR #41](https://github.com/darshprasad-cmd/biology-entelloq/pull/41#issuecomment-6374201740): 44 standard guides, 15 accessible alternatives and 103 explained viva questions, not 59 new interactive simulations.

## Delivered scope

- 72 standard source-numbered Physics experiment/activity guides: Class 9 = 5, Class 10 = 5, Class 11 = 34, Class 12 = 28.
- 18 separately listed accessible alternatives and 8 suggested project options. These overlap with standard tasks or are choices; 98 is a guide count, not 98 mandatory experiments.
- Two interactive benches: Vernier calipers and screw gauge. Both include signed-zero calibration, operable scales, contact-gated reading feedback, repeated observations, local notebooks and CSV export. Vernier modes cover external diameter, internal diameter, depth and an ideal cylindrical capacity estimate. Gauge modes cover wire positions/orientations and sheet thickness.
- Class-filtered/searchable catalogue, worked reasoning, safe apparatus preparation, measurement/model limitations, explanatory viva prompts, local preparation notes and download. All original application bytes before this release are retained after stripping exact approved additions.

The guides contain original preparation content, not photographed apparatus, new physical models for every experiment, teacher certification, or proof that a student performed a practical. The unchanged Research lab already contains selected synthetic-data benches; the new guides do not replace those or count decorative previews as instrument simulations. Physics and Biology are the scoped strands of integrated Class 9–10 Science; Chemistry is separately marked deferred in the audit. Apparatus-familiarity collections are inventoried but not claimed as a completed accessible physical assessment.

## Evidence

- Exact inventory/ID/page tests cover all 98 Physics rows; authored procedure, observations, analysis, cautions, source links and viva content are checked.
- Numerical model tests cover all measurement ticks, signed positive/negative zero correction, clamped contact, range/invalid input, repeated position coverage and geometry-derived volume.
- Full wildcard Node run: 151 passing executions (including tests also imported by the existing design suite). Required CI files include the new tests through the existing app-design entry point.
- Inline scripts parse; builder source parity passes. Original f845ae7 and post-questionnaire 1243d7e full-application hashes both pass after removing only the new exact source-owned slots.
- Browser catalogue and instrument suites passed at 320, 390, 768 and 1440 px, reduced motion, keyboard controls, scoped WCAG axe scans, light/dark modes, real routes, saved/corrupt/blocked storage, export, old-lab navigation and portable offline use. The first questionnaire and class/deep-link regression suite also passed. No camera requested.
- An independent scientific review checked formula signs, unit handling, exact syllabus IDs and accessible-task distinctions. This is engineering/content review, not qualified educator validation. Physical touch hardware, actual laboratory precision and student competency were not validated.

Local browser evidence: `qa/results/practical-library/`, `qa/results/measurement-lab/`, `qa/results/cbse-study/`. Baseline inventory `practicals.json` records pre-release support; do not interpret its old `missing` statuses as contradicting these newly authored guides or as a claim of new simulations.

## Reproduction

```text
node .github/build-experience.js --check
node .github/validate-inline-scripts.js
node --test .github/test-*.js
node qa/practical-library.cjs
node qa/measurement-lab.cjs
node qa/cbse-study.cjs
```

Use the configured bundled Playwright/axe package directory through NODE_PATH when dependencies are not local. The first two browser runners accept `--live`; compare live bytes with the merged Git blob, not a CRLF working copy.

## Design review

| Before | After | Why |
| --- | --- | --- |
| No usable fine-measurement instrument | Two calibrated interactive benches | Practise reading and correction, not just watching a preview |
| Practical names scattered through old sections | Separate searchable class catalogue with stable routes | Find every prescribed numbered task without changing old lab IDs |
| No practical-specific local preparation record | Bounded notes and downloadable records | Preserve student reasoning separately from existing progress |
| Potential confusion between a guide and a real lab | Explicit preparation/simulation/supervision labels | Keep coverage and completion claims honest |
