# Contributing to Physics Entelloq

## Workflow
1. Read `AGENTS.md`, `ARCHITECTURE.md`, and `CRITICAL_AREAS.md`.
2. Use one focused branch: `feat/<topic>`, `fix/<topic>`, `refactor/<topic>`, `docs/<topic>`, or `chore/<topic>`.
3. Locate and explain the existing single-file flow before editing `index.html`.
4. State units, assumptions, approximations, and numerical limits for scientific changes.
5. Run the checks below and inspect the diff for unrelated or global side effects.
6. Open a PR; do not push directly to `main`.

Use Conventional Commit subjects, for example `fix(simulation): clamp zero-mass input`.

## Checks
```bash
python -m unittest discover -s tests
python -m http.server 8000
```

There is currently no package install, lint, typecheck, automated browser-test, or build command. CI enforces the available static contract tests. Browser-test affected interactions manually and report that separately.

## Pull requests and done
PRs must include the problem, root cause or scientific intent, files/sections changed, equations or units affected, checks run, screenshots for UI work, accessibility/responsive review, unexpected side effects, and remaining risks.

Work is done when acceptance criteria and CI pass, affected interactions work over HTTP, console errors are resolved, desktop/mobile and reduced-motion behavior are checked where relevant, scientific behavior is justified, and high-risk changes have explicit review.
