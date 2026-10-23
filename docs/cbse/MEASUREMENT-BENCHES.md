# Measurement benches — bounded implementation

## Implemented

Two independent, self-contained interactive benches sit inside the existing Lab:

- `#practical:vernier-calipers`: external sphere/cylinder diameter, internal beaker diameter, depth and a cylindrical-capacity estimate from recorded mean internal dimensions.
- `#practical:screw-gauge`: wire diameter at four positions in two perpendicular orientations; sheet thickness at four positions.

Class 11's CBSE section links to them. Original Expt catalogue indices, PeqBench previews, route behavior, student notes, onboarding, authentication, camera modules and lab resume storage remain unchanged. Native controls, a magnified SVG scale and a text equivalent support pointer, touch and keyboard operation. Browser tests are not a physical-device usability study.

## Scientific model

`experience/measurement-model.js` uses integer ticks: 0.1 mm per vernier tick, 0.01 mm per screw-gauge tick. Vernier geometry uses 10 VSD = 9 MSD (1 MSD = 1 mm). The selected micrometer has pitch 0.5 mm and 50 circular divisions. These are instrument configurations, not universal properties of every real instrument.

Observed = physical aperture + signed zero error. Corrected = observed − signed zero error. The zero setting shifts the scale indication, never the sample geometry. Negative closed gauge zero wraps: division 47 of 50 represents −0.03 mm, not +0.47 mm. Division 7 on the closed 10-division vernier represents −0.3 mm. The scale's negative extension is an explicit reading aid, not a claim that the physical sleeve carries negative markings.

External jaws/spindle cannot pass through the simulated specimen. Internal jaws and the depth rod approach contact from below the target separation. Recording requires checked calibration, a placed specimen, contact, and correct main/division/corrected learner inputs. Showing a worked answer is allowed and is not a mastery test. The direct-contact control represents gentle placement/ratchet operation; force and backlash are not simulated.

Specimen dimensions vary deterministically between specified positions. Repeating a position does not satisfy another position's observation requirement. No artificial random data or real measurement claim is made. The notebook reports the range and a separately labelled half-LC resolution-only estimate. This is not total uncertainty and must not be interpreted as instrument accuracy. Calibration, alignment, force, temperature, wear and backlash remain limitations.

Beaker capacity uses V = πD²h/4 with independently recorded mean corrected internal dimensions. Conversion: 1000 mm³ = 1 mL. Until every configured diameter and depth position is recorded, the result is labelled provisional. A perfectly cylindrical interior is assumed.

## Storage and packaging

Only `peq_measurements_v1` is written. Its versioned notebook contains bounded validated numeric trial rows, with at most 120 observations total. Malformed or forged rows are rejected; failed writes retain the session's latest notebook and show an export warning. Clear removes only the current instrument's trials. Existing keys and notes are untouched. CSV downloads are local and require an explicit action. No dependencies, camera requests or network services are introduced. Both benches are embedded into `index.html` by the existing narrow builder.

## Not complete

These are practical preparation simulations, not a complete CBSE practical programme or a substitute for a supervised school record. Irregular-lamina area/volume, spherometer, beam-balance work and other missing syllabus experiments are not implemented by these two benches. A representative setup is not an official practical certificate. Qualified educator review and real-device usability review remain outstanding.

## Primary references

- [CBSE Physics 2026–27](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Physics_SecP2_2026-27.pdf), XI Section A experiments 1–3.
- [NCERT Physics XI laboratory manual](https://www.ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classXI/physics/kelm102.pdf), Experiments 1–2, printed pp24–37: vernier conventions, zero correction, micrometer pitch/divisions, measurement positions and precautions. Original interface, text and drawings; no textbook images copied.

## Verification

- Dependency-free unit checks in `.github/test-measurement.js`, loaded by the existing required app-design CI test: every supported aperture with every configured signed zero, unit conversion, negative wrapping, contact constraints, bounded validated storage, unique observation coverage and volume conversion.
- `.github/test-cbse-preservation.js`: original f845ae7 byte fingerprint retained, plus exact post-questionnaire 1243d7e fingerprint after removing only source-identical approved additive slots.
- `qa/measurement-lab.cjs`: responsive 320/390/768/1440, native keyboard controls, both instruments, every sample, positive/negative/no zero, feedback/contact gating, persistence and blocked/corrupt storage, CSV, scoped clearing, prior Lab protocol, Class 11 entry, scoped axe and single-file offline use. `--live` supports deployed-artifact behavior checks; `MEASUREMENT_URL` overrides the base URL.
