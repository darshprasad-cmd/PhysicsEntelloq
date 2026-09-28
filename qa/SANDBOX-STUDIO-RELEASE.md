# Hand-first Sandbox / Camera Physics

## Scope

Three workspaces: Hands, experimental Camera Physics, and Build. The existing simulation, Cat's Cradle engine, scene library and history remain in place. Build's rail separates Scenes, Inspect and Controls. The feature guide matches the new navigation. Founder, welcome tour, planet artwork, restored visual Learn and AI/backend integrations are unchanged.

Camera Physics is a modular, on-device 2D instrument. It uses actual MediaPipe hand landmarks and COCO-SSD object boxes; it does not claim segmentation, depth, orientation, measured mass, physical contact or measured forces. Scenario, equilibrium, mass and incline angle are explicit learner assumptions/inputs. It never records or uploads video. Old results are hidden rather than shown as fresh overlays.

## Local verification (2026-09-28)

- 75 Node tests passed, including analytical cradle checks, camera model/evidence boundaries, delayed permission/model/inference cleanup, and existing app preservation contracts.
- All four inline scripts parsed; generated distribution matches authored modules; whitespace check passed.
- 24 layout/accessibility combinations: 1440/850/390/320 pixels, dark/light, all three workspaces. No horizontal overflow or axe WCAG violations. Camera heading colors also have explicit regression assertions because canvas backgrounds can make automated contrast checks incomplete.
- Browser sensor fixtures checked selection, object loss, mass reset, equilibrium/incline equations, delayed-result suppression, workspace/route cleanup and keyboard tabs. Fixtures are test-only, not evidence of detector accuracy.
- Browser lifecycle checks passed for denied permission, late permission, failed models, explicit hand stop, switching to Build, and late hand-camera permission.
- Real CDN libraries initialized and performed inference over Chromium's synthetic camera source. This validates library/model compatibility and stream cleanup, not real handheld recognition accuracy or universal frame rates.
- Cat's Cradle controlled comparison, advanced controls, gesture-mode preservation and More controls passed at 1440/390 pixels. Scene bodies survive workspace switching.
- Existing visual Learn and solar rendering browser checks passed. Dark/light desktop/mobile screenshots were inspected; a camera-panel heading contrast defect was corrected.

## Remaining manual coverage

Physical hands and supported objects in varied lighting, occlusion/rotation, multiple real objects, front/rear camera hardware, Safari/iOS and low-powered devices still need hardware validation. Camera Physics is visibly marked Experimental. Model downloads require an internet connection; inference speed depends on the device. No auth/provider/billing end-to-end claim is made by these Sandbox checks.

## Reproduction

Run `node --test .github/test-*.js`, `node .github/validate-inline-scripts.js`, and `node .github/build-experience.js --check` from the repository root. Browser checks are `qa/sandbox-studio.cjs`, `qa/sandbox-controls.cjs`, `qa/camera-lifecycle.cjs` and `qa/camera-real-model.cjs`; Playwright comes from the workspace runtime and axe-core from `qa/package-lock.json`. The studio, controls and real-model checks accept `--live` for post-deployment verification. Generated screenshots/reports stay in ignored `qa/results/`.
