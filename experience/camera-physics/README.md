# Sandbox Camera Physics — first release

## Boundary

This is an experimental on-device, 2D explanatory instrument, not a force meter or a general scene-understanding system. It has no authentication, AI-provider, analytics, recording, upload or backend integration. The surrounding existing app is unchanged. Camera permission is requested only after a user presses Start; Stop, changing workspace, leaving Sandbox, or hiding the tab releases the stream.

The first start downloads external libraries/model assets. Browser CPU/GPU capability and lighting affect accuracy and frame rate. Capture timestamps, not inference completion times, determine overlay freshness. Results older than 700 ms are hidden with a slow-analysis warning. There is no synthetic detection fallback in production. Automated fixtures below are explicitly test-only.

## Replaceable boundaries

| Module | Contract |
| --- | --- |
| `vision.js` | `createSession(video, {state, frame}, adapters?)`; `start`, `stop`, `isActive`. Emits normalized object boxes/class scores and normalized hand landmarks from the same captured frame. One inference in flight. At most 640-pixel input width. |
| `physics.js` | Pure `createTracker`, `interpret(track, options)`, `project` and extensible `profiles`. No DOM/network. Stable IDs, temporal smoothing and explicit 700 ms expiry. |
| `rendering.js` | `paint(canvas, tracks, hands, selected, analysis)`. Mirrored coordinates match the video; symbolic forces derive only from the model output. |
| `ui.js` | `mount(root, adapters?)` returns `stop`, `dispose`, `state`. Object selection, model assumptions, user-entered SI mass and incline angle, equations and evidence inspector. |
| `../sandbox-studio.js` | Composes Hands / Camera Physics / Build with the existing Sandbox engine. Pauses hidden simulation work and preserves scenes/history between workspaces. |

`ObjectPhysicsProfile` includes object class, class-based geometry hypothesis, nullable dimensions/mass/orientation/support surface, inferred contact points, possible forces, detector score and explicit assumptions. Unknown measurements remain `null`; no object-class mass table is used.

Future segmentation, depth, orientation and semantic adapters must supply provenance and their own uncertainty. They are **not implemented or advertised as active**. The current capability flags explicitly report them as false. Bounding rectangles are not masks and do not establish object rotation.

## Scientific rules

- Image proximity between hand landmarks and a detected box is only a possible interaction. It is not physical contact or a calibrated contact confidence. The object score is the detector's score, not a calibrated probability.
- The automatic mode proposes hand support after repeated object/hand association. Table, push, string and incline are user-selected hypotheses; they are not camera detections.
- Still image position never establishes physical equilibrium. The learner must explicitly select the equilibrium assumption.
- The vertical screen axis approximates gravity only for an upright camera viewing a vertical plane. Gravity does not rotate when the object box changes. Surface angle is entered by the learner; it is not inferred from a bounding box.
- Arrow lengths are symbolic. Gravity uses the assumed near-Earth value 9.81 m/s² only with user-entered mass in kg; results are labeled model-derived in N. No pixel scale is treated as metres.
- A hand is represented by an upward resultant in the suggested support model; this direction is explicitly assumed. No claim of measured normal/friction decomposition is made.
- Incline vectors use a screen-right-rising plane. Normal is perpendicular to the plane; hypothetical friction opposes a down-slope tendency. Static equilibrium additionally requires μs ≥ tan θ. The coefficient remains unknown.
- Torque, rotational equilibrium, mass distribution, out-of-plane motion, drag and depth are outside this point-mass model.

## Dependencies

Pinned, lazy-loaded MediaPipe Hands `0.4.1675469240` (matching the existing sensor interface), TensorFlow.js and its WASM backend `4.22.0`, COCO-SSD `2.2.3` with `lite_mobilenet_v2`. They are needed because the existing sensor only tracks hands and browser APIs do not recognize object classes. WASM avoids reliance on a fast GPU for object detection; WebGL/CPU remain fallback backends if WASM cannot initialize. MediaPipe uses its own runtime. No backend or paid provider is added.

Primary references: [TensorFlow object detection API and supported outputs](https://github.com/tensorflow/tfjs-models/blob/master/coco-ssd/README.md), [MediaPipe Hands interface](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/hands.md). All class recognition is limited to the detector and the supported profile list; arbitrary boxes or unseen object types are not promised.

## Verification

- `node --test .github/test-camera-physics.js`: evidence validation, identity/staleness, contact honesty, SI quantities, scenario forces, incline orthogonality and mirrored projection.
- `node qa/sandbox-studio.cjs`: both themes at 1440/850/390/320px, WCAG/overflow checks, keyboard tabs, deterministic mocked object selection/loss/equations and camera cleanup. `--live` repeats against deployed HTML.
- `node qa/camera-lifecycle.cjs`: denied permission, delayed permission, failed model load, hand stop, hand-to-Build and stale hand permission resolution.
- `node qa/camera-real-model.cjs`: real CDN/model initialization and inference on Chromium's synthetic camera stream. This is not evidence of real-world handheld recognition accuracy.

Manual device validation remains necessary: a real book/phone/bottle in varied lighting, rapid rotation/occlusion, multiple objects, actual front/rear cameras, Safari/iOS and low-powered devices. The UI labels this release Experimental.
