# Guided Physics practicals, Classes XI and XII

## Purpose and scope

The existing practical library exposed written preparation. This change adds a visual apparatus procedure to every standard Class XI and XII experiment and activity. Students perform operations on the diagram, change apparatus settings, inspect predicted readings, and complete the setup before recording a simulated trial. A user-started demonstration can show the sequence automatically; it stops on manual interaction, navigation or tab hiding.

The independently audited CBSE 2026–27 inventory contains 34 XI rows and 28 XII rows: 35 numbered experiments and 27 activities. Both series/parallel and voltmeter/ammeter alternatives are selectable, making 64 standard procedure variants. The 18 accessible-alternative guides and 8 optional project briefs across the existing senior catalogue retain their preparation content; they are not claimed as additional completed virtual benches. Dedicated caliper, screw-gauge and spherometer instrument benches remain available.

## Implementation

- `experience/procedure-xi.js` and `procedure-xii.js`: apparatus-specific SVG scenes, sequential actions, controls, model equations and observations. Each maps to the original syllabus ID.
- `experience/guided-practicals.js`: the `#conduct:<id>` route, accessible apparatus action, demonstration lifecycle, control synchronization, observation tables, duplicate-trial guard and CSV export. Uses an independent versioned storage key, `peq_guided_practicals_v1`; existing notes and measurements are untouched.
- `experience/guided-practicals.css`: responsive bench, procedure panel and notebook in the existing theme. Native inputs support keyboard operation; a text instruction and observation accompany each diagram.
- `experience/practical-library.js`: adds a Conduct practical action to standard senior catalogue cards while retaining guide links, search, class navigation and existing notes.
- `.github/build-experience.js`: embeds authored modules and CSS in the existing portable HTML. No runtime dependency, provider, hosting or camera change.

## Scientific boundaries

The diagrams are original schematic illustrations, not photographs or recorded laboratory footage. Numerical observations are deterministic model outputs. They are labelled simulated in the interface and every CSV row; they do not constitute measured school observations, an uncertainty experiment or practical certification. Settings, equations and limits accompany each bench. School apparatus may have different scales, signs or calibration conventions.

The procedures preserve current limiting and low-voltage isolation for circuits; AC sonometer instructions distinguish electromagnetic double-frequency forcing; optics distinguishes real screen images from virtual/no-parallax measurements. Thermal, fluid and mechanical models state their idealizations. The written method, precautions and viva remain linked for supervised physical work.

## Sources

- [CBSE Physics 2026–27](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Physics_SecP2_2026-27.pdf): XI pp. 7–9; XII pp. 17–19. The document has some retained old cover-year text; the official curriculum location and internal class headings identify the 2026–27 edition.
- [NCERT laboratory manuals](https://ncert.nic.in/science-laboratory-manual.php): apparatus conventions and school procedure references.
- [CIET Grade XI practical resources](https://ciet.ncert.gov.in/activity/grade11) and [Grade XII](https://ciet.ncert.gov.in/activity/grade12): external learning resources, not a claim of verified video playback.

## Verification

Run `node --test .github/test-guided-practicals.js` for exact inventory coverage, valid procedure/model contracts, parameter boundaries and analytical checks. Run `node qa/guided-practicals.cjs` with the existing Playwright/axe packages available through `NODE_PATH` for all workflows, rendered SVG, interactions, persistence, routes, keyboard, reduced motion, layouts and accessibility checks. Browser evidence is saved under `qa/results/guided-practicals` and is local generated material. `--live` targets the deployed site only after a release.

Final results are recorded after implementation validation. Local checks and a local browser preview do not establish production deployment.
