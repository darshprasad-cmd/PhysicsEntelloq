# Restore the observatory; retain the workspace

User correction on 2026-10-16: restore all three earlier launch pages, improve their realism, and retain current app interiors. This work starts from main 619a3bfa8b14a6ff602f260482ef07fa6042c0cf, including the Sandbox library and hand-object creation fixes in PRs 29 and 30. The reference launch is 0430503c086e0cddc19037d4c212b798ca8c17a7, immediately before PR 27.

The original warm observatory room and Earth, “See Physics. Do Physics. Understand It.” headline, navigation, floating gravity card, compact statistics and four illustrated feature cards return. The original learning sequence, three-world cards, Advanced Studio, tutor, model boundaries, tutorial, FAQ, founder, final entry and footer retain their order. Current Entelloq/Biology and press destinations remain in the footer/founder section.

Realism is deliberately material detail within that composition: the original sunrise and physical desk objects, directional shading and restrained craters on the live moon, dim far/bright near orbital arcs, subtle cool panel edges, warm highlights, contact shadows and shaded material on the lower orbit/rope illustrations. The hero uses its original artwork. The old card sheet appears only in the four existing crops, never as baked page UI. No new image or dependency is needed.

The pinned full-screen camera sequence, cinematic hero layout, oversized editorial type and embedded demonstration video are no longer part of the launch. Motion returns to small pointer parallax, a drifting observatory and the analytical satellite. Paint is capped around 30 fps with DPR at most 1 on mobile/1.5 desktop and cached canvas geometry. Pause, reduced motion, offscreen/hidden-tab stopping and entry cleanup remain.

Current app HTML/JavaScript, all app source modules/styles, latest Hands/Build fixes, progress/auth behavior, scientific models and the current in-app planet artwork must remain byte-for-byte unchanged. The founder JPEG remains unchanged and displays in its original color. Publication waits for review of the restored desktop/mobile screenshots.
