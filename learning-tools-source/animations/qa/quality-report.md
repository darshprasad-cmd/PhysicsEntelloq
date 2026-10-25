# Animation quality pass — 24 October 2026

The existing films, captions, scientific assumptions, local assets and teardown contract are preserved. The upgrade improves how a learner reads, controls and checks the explanation.

| Before | After | Why |
| --- | --- | --- |
| Finished overview poster highlighted chapter one and displayed its caption. | Overview prompt with no active chapter until the movie is loaded. | The text now describes the image and actual playback state. |
| Native pause/end could leave “Playing” in the status. | Native and custom controls update pause, replay, end, chapter and progress state. | Visible feedback matches what is happening. |
| Mobile caption reserved 142px even for one short sentence; controls could be 36–42px high. | Content-sized caption with a clear chapter label and controls at least 44px high. | Less dead space and more usable touch targets. |
| Reading alternative required finding a disclosure below the player. | Keyboard-accessible “Read without playback” opens and focuses the transcript, without fetching video. | Reading is a first-class path, including reduced motion. |
| No active recall after watching. | One optional subject-specific question with explanatory retry feedback. | Learners can check the key idea without adding a grade or changing their review record. |

## Verification

- `PLAYWRIGHT_CHANNEL=chrome node tests/browser.cjs`: **23 passed**, no page errors, no external requests.
- Both subjects: explicit playback, native captions, speed, paused chapter seeking, full transcript and stills, failure retry, pending-load cancellation and Blob cleanup retained.
- New checks: keyboard transcript focus without media fetch; wrong-answer retry then correct explanation; zero localStorage writes; native end/replay status and exact 22-second progress.
- 320px phone, 768px tablet and 1280px desktop, light/dark, reduced motion: no horizontal overflow; all primary controls at least 44px high.
- Inspected `quality-light-320.png` and `quality-dark-768.png`, plus existing subject screenshots. Screenshot filenames beginning `quality-` record the new responsive pass.
- `node build.mjs`: 18 runtime assets, 2,058,873 bytes after LF normalization. No new dependency or media render.
- `node --check main.js`, `git diff --check`: passed.

The checkpoint is held only in this document and resets on reload. It does not certify mastery, modify FSRS, or write a student record. Existing media remains authored explanation, not live simulation.

Content checked against [OpenStax vectors](https://openstax.org/books/university-physics-volume-1/pages/2-1-scalars-and-vectors) and [OpenStax enzymes](https://openstax.org/books/biology-2e/pages/6-5-enzymes). Original wording; no figures copied.
