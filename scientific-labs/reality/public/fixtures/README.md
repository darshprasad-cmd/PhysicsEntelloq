# Synthetic tracking fixture

`tracking.webm` is a deliberately synthetic 320 × 240, approximately 2-second video generated for the Reality Lab browser integration test. It is not footage of a physical experiment.

Provenance: on 24 October 2026, an HTML canvas was recorded using Chromium's MediaRecorder (VP8/WebM, 30 requested frames per second). The drawing contains a pale 24-pixel square with an 8-pixel dark center, on a dark background. Its center begins at (80, 100) px, stays still for the first 0.1 second, then moves right at 30 pixels per elapsed second. A 100-pixel reference line runs from (20, 200) to (120, 200). The captured WebM was losslessly remuxed with FFmpeg to include finite duration metadata. Timing reflects browser recording, so this is not a precision timing standard.

The test selects the reference line as 1 metre, sets the origin at (80, 180) px, and selects the object at (80, 100) px. It verifies approximately 0.55 m horizontal displacement and approximately 0.8 m constant height, a usable calibrated CSV, and transfer to the comparison view.

This verifies the video decoding, calibration, OpenCV worker, export, and UI pipeline. It does not establish camera measurement accuracy, robustness to arbitrary footage, or experimental validity. The fixture is original Entelloq test material and may be redistributed under the repository's license.

With the app server running, use `node tests/video-browser.mjs`. Set `VIDEO_TEST_URL` to use another server URL (the default is `http://127.0.0.1:5173/`). Chrome is the default browser channel; `PLAYWRIGHT_CHANNEL` can override it.
