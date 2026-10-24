# Spherometer: an interactive paired-reading practical

Status: **locally verified**. PR, required checks, merge and live verification are separate release gates; the PR conversation is the append-only final production evidence referenced by this tracker.

## Scope and source audit

Adds one practical interaction, `p11-a-e04`, to the previously shipped Class 11 preparation guide. It does not claim complete interactive practical coverage. The original `practicals.json` is retained as the pre-release audit; effective capabilities are the released guides plus individually evidenced interaction milestones in `CHECKPOINTS.json`.

- [CBSE Physics 2026–27](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Physics_SecP2_2026-27.pdf#page=7): Class XI, Section A experiment **4**, PDF page **7**.
- [NCERT laboratory manual](https://www.ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classXI/physics/kelm102.pdf#page=20): experiment **3**, printed pages **42–47**, PDF pages **20–25**. NCERT apparatus/method reference and current CBSE scope are distinct sources/numberings.

Original diagrams and exercise data; no downloaded image or commercial reference artwork. No dependency, infrastructure, authentication, analytics or camera change. The user explicitly authorized missing CBSE apparatus models; this new isolated model does not modify the legacy scientific models, other subjects or dissection code.

## Student workflow

1. Find pitch / circular divisions = 1 mm / 100 = 0.01 mm for this configured instrument.
2. Read AB, BC and CA ruler estimates. Their mean is the side length of the nominally equilateral support triangle, **not** its centre-to-foot distance.
3. Turn the screw with keyboard/touch controls, approach gentle contact, and enter the full-millimetre and circular-scale readings. Off-contact/incorrect readings cannot be recorded.
4. Take the plane and spherical readings at the same placement; switching surface retracts the screw. Changing specimen or placement discards an incomplete pair.
5. Calculate positive sagitta `h = |curved - plane|` and `R = l²/(6h) + h/2`, then record a checked trial. Four placements are available for each convex and concave surface. Repeating one does not inflate distinct-placement coverage.
6. The headline result follows the manual: calculate radius from **mean h**. Individual trial radii remain in the observation table and CSV. These averages differ slightly because radius is nonlinear in h.

Raw measurements alone persist under the new `peq_spherometer_v1` key. Loading/summary/export recompute derived values and reject forged, inherited, malformed or off-contact records. The notebook is bounded to 90 trials. Export works without persistence; clearing requires confirmation and affects only this notebook. Existing practical notes, legacy measurement notebooks, CBSE preferences and progress are not changed.

## Scientific boundaries

Readings increase as the screw descends. Convex contact therefore precedes plane contact; concave contact follows it. Magnitude, rather than sign convention, enters the radius formula. A constant additive zero offset cancels in a paired difference; drift, backlash and unequal contact pressure do not automatically cancel.

The support is equilateral, the screw central and the surface a shallow spherical patch. The apparent differences among ruler estimates are teaching measurement scatter, not unequal physical model legs. Fixed small contact differences are deterministic exercise data, not measured noise. The apparatus drawing is an exaggerated projected schematic, not a scaled reconstruction. R = l²/(6h) + h/2 is undefined for h = 0; the UI explanation treats a plane as having no finite curvature radius. No fabricated trial for it is stored.

Examples independently checked: l = 30 mm, h = 0.50 mm gives 300.25 mm; h = 0.25 mm gives 600.125 mm. Four convex heights 0.50/0.49/0.51/0.50 mm give mean h 0.50 mm and radius 300.25 mm; concave 0.75/0.76/0.74/0.75 mm gives 200.375 mm. Mean of individual radii is not substituted for radius from mean h.

Physical glass handling, actual contact accuracy, learner competency and educator review are unverified. Digital preparation does not replace supervised school practicals. Resolution alone is not total uncertainty; use the teacher-approved setup and safety instructions.

## Preservation and regression scope

The builder appends two exact owned JS slots and one stylesheet. Preservation checks remove only these exact slots and compare every byte to published `082b458`, retaining all prior `cf62ad6`, `1243d7e` and original `f845ae7` fingerprint checks. Questionnaire, launcher, legacy models and tool adapters are unchanged.

Existing measurement browser tests exposed a light-theme contrast failure on nested scientific/learning cards. The identical failure was reproduced using the unchanged `082b458:index.html` artifact with the same assertions. A narrowly scoped CSS boundary correction in the new stylesheet restores readable nested cards; it does not change those integrations' sources, models, links or global palette. The old test is rerun without exclusions.

## Verification commands

```text
node .github/build-experience.js --check
node .github/validate-inline-scripts.js
node --test .github/test-*.js
node qa/spherometer-lab.cjs
node qa/measurement-lab.cjs
node qa/practical-library.cjs
node qa/cbse-study.cjs
```

Use existing Playwright and axe installations through NODE_PATH. The new model tests are also imported by the existing required design-check job. Browser reports and inspected screenshots are in `qa/results/spherometer/`; the new runner supports `--live`. File/offline checks block remote requests; they do not imply every unrelated online tool works offline. Emulated viewport/keyboard checks do not validate physical touch hardware.

Local verification on 24 October 2026: all 178 wildcard Node executions passed (including suites imported by the existing design-check entry point). Builder, scientific-asset and learning-tool source parity passed; five inline scripts parsed. New spherometer and unchanged measurement/catalogue/questionnaire browser suites passed at 320/390/768/1440 px, with light/dark scoped accessibility checks, keyboard/reduced-motion controls, valid/corrupt/blocked storage, preserved incoming setup links, export and single-file offline operation. The new runner verified both specimens × four placements, mean-sagitta headline results, wrong-answer/contact gates, duplicate coverage and isolated clearing. No camera request or browser runtime error occurred. Root inspected desktop/mobile, light-mode and notebook screenshots. Numerical/reference review was independent engineering review, not qualified educator review.

## Design review

| Before | After | Why |
| --- | --- | --- |
| Spherometer only has a preparation guide | Operable, contact-limited screw with an enlarged scale | Practise a measurement, not a decorative apparatus animation |
| Curvature could be read as a magic answer | Two raw readings, three side estimates, checked h and R | Preserve the chain from observation to inference |
| A printed notebook has no local simulation record | Validated raw trials, explicit placement coverage and CSV | Keep useful evidence without asserting student completion |
| New tool cards fail contrast inside old light-theme measurement benches | Scoped nested-text correction; no shared palette changes | Retain the previously passing instrument accessibility workflow |
| Motion might obscure scale changes | Instant control response, no decorative animation, reduced-motion support | Measurements remain readable and predictable |

## Next audited interaction

Prefer Biology microscopy or plant-osmosis next to alternate subjects, then Physics irregular-lamina area × screw-gauge thickness. Do not call a listed guide, roadmap heading or unopened instrument a completed practical.
