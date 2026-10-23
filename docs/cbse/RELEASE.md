# CBSE entry release — Physics

Status: locally verified; PR checks, merge and live deployment verification are separate gates. Consult the pull request for the final release SHA and live evidence.

Local artifact source is index.html. SHA-256 at verification: 30c14fa17756f51cdf5f533134f1569e3a19ec82ac3480accaa5c12c2fecb8b2.

Full Node test command passed (123 executions, including tests imported by the existing design suite and also selected by the wildcard). Source parity, all five inline scripts and immutable original-byte preservation passed. Responsive browser checks passed at 320/390/768/1440, dark/light scope with zero automated axe violations, streamed first-question handoff, preferences, goal-specific actions, skip/edit/reset and offline 390×568. Camera request count was zero; this is not camera validation.

## Reproduction

```
node .github/build-experience.js --check
node .github/validate-inline-scripts.js
node --test .github/test-*.js
node qa/cbse-study.cjs
```

## Boundaries

This release implements first-visit setup and supporting class pathways, not complete CBSE lessons or practicals. It does not add tracking, request a camera, change authentication or infer mastery from preferences. Curriculum assessment ambiguities remain visible. Automated/browser checks are not qualified educator review or physical-device certification.

Physics and Biology are separate origins; preferences are local per site. Existing notes and progress retain their storage keys. The Biology release was isolated from another active dissection task; none of that task's lab changes are included.
