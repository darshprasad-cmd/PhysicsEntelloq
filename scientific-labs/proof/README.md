# Entelloq Proof Studio

A working introduction to formal mathematical proof. Six guided puzzles turn meaningful choices into Lean 4 source. A local Python service invokes the actual Lean executable to check each complete proof. The interface never marks a draft as verified based on a client-side answer key.

## Start on Windows

From this directory:

```powershell
.\start.ps1
```

This installs the pinned official Lean runtime when needed, installs npm dependencies, builds the UI, and starts the local server. Open **http://127.0.0.1:8773/**. The Lean archive is approximately 594 MiB and expands to several GiB; it is downloaded into ignored `work/runtime/`. Internet is required for setup, not for checking proofs after installation. A checksum from the official GitHub release is verified before extraction.

If Lean is already installed, set `LEAN_BIN` to its executable. `PROOF_PYTHON` can specify Python 3.10+; the launcher uses the bundled Codex Python runtime if present, then falls back to `python`. `start.ps1 -SkipSetup` skips runtime setup. The checker also discovers `lean` on PATH.

Manual start:

```sh
npm ci
npm run build
python server/app.py
```

For development, run the backend on port 8773 and `npm run dev` on port 5193. Vite proxies `api/` requests. The production output is `dist/`. A static-only deployment remains useful for building arguments but explicitly reports an unavailable checker and never verifies a proof.

## Included learning journey

1. Identity: `P → P`.
2. Composition: a proof of `P → Q` and a proof of `Q → R` establish `P → R`.
3. Conjunction introduction: combine proofs of `P` and `Q`.
4. Conjunction commutation: unpack and reverse `P ∧ Q`.
5. Disjunction introduction: evidence of `P` establishes `P ∨ Q`.
6. Natural arithmetic: prove `n + 0 = n` by definitional equality.

Each puzzle includes an ordinary-language statement, givens, a goal, curated choices, optional hints, a generated formal proof, raw Lean diagnostics on failure, and proof/draft download. The number of choices is **not** a proof-state indicator. Only the complete formal proof is submitted for verification. Previously checked puzzles are saved locally, but opening one or editing any choice resets the current draft to unverified until checked again.

## Real checker and input boundaries

`server/checker.py` accepts only `{ "puzzle": "known-id", "choices": ["known-option-id", ...] }`. Puzzle statements and tactic snippets come exclusively from the versioned `src/puzzles.json` allowlist. Unknown IDs, extra request fields, invalid shapes, and arbitrary source are rejected. User strings are never interpolated into Lean code. No `sorry`, added axioms, arbitrary imports, custom tactic programs, or IO commands are exposed.

The fixed source sets a heartbeat and recursion limit. A single local Lean process is allowed at a time; every invocation has an twenty-second wall-clock timeout. Python's `subprocess.run` kills and waits for the process on timeout. `shell=True` is never used. A zero exit status with no unproved-declaration/error diagnostic is required. Successful responses include the engine version and SHA-256 hash of the exact source.

The HTTP service binds to `127.0.0.1`, accepts only expected local Host headers, requires JSON POSTs capped at 4 KiB, and allows browser Origins only from localhost/127.0.0.1 on ports 8773, 5193, 5194, and the suite port 4173. It serves only `dist/`, not source/runtime directories. This is a local learning service, not an authenticated public multi-user deployment.

## Suite integration

- UI paths and fetches are relative (`api/health`, `api/check`), so the built app can be mounted beneath `/proof/`.
- Proxy `/proof/api/*` to `http://127.0.0.1:8773/api/*` and send `Host: 127.0.0.1:8773`.
- Suite Origin `http://127.0.0.1:4173` is explicitly allowed.
- Launch `server/app.py --port 8773` with `LEAN_BIN` set if the runtime is stored outside this app's own ignored `work/runtime/` folder.
- Navigation to `../` returns to the suite root when mounted.

## Verification

```sh
npm test
npm run build
npm audit
python -m unittest discover -s tests -p "test_*.py"
# With the backend and production interface served at port 8773:
npm run test:browser
```

Python tests execute six valid and four invalid/incomplete proofs through real Lean, test strict input rejection, and force a real subprocess timeout followed by recovery. Unit tests also cover the source builder and corrupt saved progress. Browser checks exercise actual verification, incorrect proof feedback, editing/reload status reset, download, mobile layout, keyboard selection, and offline behavior. `PROOF_URL` can point browser checks to a mounted suite URL. Microsoft Edge is used by the provided browser runner. Results and screenshots are written to ignored `test-results/`.

## Limits and privacy

Verification applies only to the displayed formal statement and generated proof within Lean's foundational system. It does not validate a translation of a separate informal claim, prove unrelated scientific claims, or certify the interface itself. This first release deliberately covers a small foundation curriculum and has no arbitrary Lean editor or Mathlib dependency.

Choices and source travel only to the local checker. Progress is unencrypted browser local storage and can be lost when site data is cleared. Google Fonts is used for optional interface typography; system fonts remain available. No analytics or remote AI requests are used.

## Primary sources

- [Official Lean 4.35.0 release](https://github.com/leanprover/lean4/releases/tag/v4.35.0), checked 24 October 2026.
- [Theorem Proving in Lean 4: tactics](https://lean-lang.org/theorem_proving_in_lean4/Tactics/).
- [Propositions and proofs](https://lean-lang.org/theorem_proving_in_lean4/Propositions-and-Proofs/).
- [Lean reference manual](https://lean-lang.org/doc/reference/latest/).

See `THIRD_PARTY_NOTICES.md`. Entelloq application source has no additional open-source license grant in this package.
