# Immutable host sources

These files are exact LF-normalized Git blobs from published commit
`9d027d5bf6b1b0cec8687882dd2a7995f77655fc`, captured before the host quality pass.
They are test fixtures, not runtime sources. Do not regenerate them from current
working files.

The preservation test verifies each fixture's frozen SHA-256, requires each
current source to occur exactly once in `index.html`, then restores only the
owned learning adapter JavaScript/CSS and scientific adapter JavaScript slots.
The resulting entire document must match the published baseline SHA-256:
`a47854f495c56b6cb5a889b8d374eba46a284b610e06f70ce68a619f94c3a979`.

The earlier pre-spherometer `5719a0c` full-artifact hash remains unchanged and
is checked after this reconstruction and the original exact spherometer strips.
All older practical, questionnaire and CBSE preservation checks remain intact.
Current generated/source parity is also checked independently by
`node .github/build-experience.js --check`.
