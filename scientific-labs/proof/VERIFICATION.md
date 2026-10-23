# Verification — 24 October 2026

- Lean 4.35.0 Windows official release downloaded and SHA-256 matched: `893fde3f52b48c647e3edcf33844cbb61f8ef70fcd88e0536bfc83f29844081e`.
- Engine reports `Lean (version 4.35.0, x86_64-w64-windows-gnu, commit eb6cafb7290e8bd5f2937522d8d804f58f02bafc, Release)`.
- Actual Lean: all six correct proofs accepted. Four incorrect/incomplete proofs rejected. An actual subprocess deadline forced termination; a following correct proof passed.
- Python unittest: 6 test methods passed, including input rejection, missing-runtime behavior, controlled timeout, actual proof cases, and recovery.
- Vitest: 3 tests passed for source allowlisting and saved-progress validation.
- TypeScript/Vite production build passed; interface is approximately 244 KB / 77 KB gzip plus CSS. npm audit reported 0 known vulnerabilities.
- Production browser checks with Microsoft Edge: six proofs verified by the real local service, unsolved-goal feedback displayed, changing choices cleared current verification, reloading preserved previous progress while keeping the current draft unverified, `.lean` download, mobile navigation, keyboard radio interaction, and offline-checker honesty passed.
- Desktop 1440px and mobile 390px screenshots inspected; no document horizontal overflow at mobile width. The final HTTP checks reject arbitrary extra source fields, untrusted browser Origins, and non-JSON POSTs.
- Runtime is kept outside Git in `work/runtime/`; the server binds exclusively to localhost port 8773. Port 8766 was occupied by an unrelated local server during verification and was preserved.

`verification-browser.json` and `verification-lean.json` preserve machine-readable summaries. Screenshots are regenerated under ignored `test-results/`. No public deployment, hardware mobile/Safari check, exhaustive accessibility audit, or formal verification of the surrounding application is claimed.
