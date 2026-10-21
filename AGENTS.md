# Physics Entelloq agent instructions

## Scope and priorities
- Preserve the product's current visual identity, interaction model, and scientific intent unless explicitly asked to change them.
- This is a single-file static application. Inspect `index.html` before proposing framework or build-system changes.
- Prefer small, local edits and existing patterns over new dependencies or abstractions.
- Do not modify unrelated simulations or content.
- Never add secrets, API keys, analytics credentials, or private endpoints to committed files.
- Read `ARCHITECTURE.md` before changing navigation, persistence, simulations, AI-faculty behavior, or shared styling.

## Setup
No package installation or compilation is currently required.

```bash
python -m http.server 8000
```
Open `http://localhost:8000`. Do not rely only on `file://` testing because browser security behavior differs.

## Verification
There is currently no automated lint, typecheck, test, or build command. Do not claim these checks ran.

After meaningful changes:
- Load the site over a local HTTP server.
- Check the browser console for errors.
- Test the affected feature and its navigation entry.
- Test a narrow/mobile viewport and keyboard interaction where relevant.
- Verify reduced-motion behavior for animation changes.
- Confirm `CNAME`, metadata, `robots.txt`, and `sitemap.xml` remain valid when changing routes or public-page metadata.

## Editing rules
- Treat `index.html` as the application source and deployable artifact.
- Keep CSS and JavaScript organized within the existing sections.
- Avoid global-name collisions and accidental duplicate event listeners.
- Preserve local-storage keys and stored-data formats unless migration is included.
- For physics calculations, document units, coordinate conventions, assumptions, and numerical limits near the implementation.
- Keep simulations deterministic when practical and clamp unsafe numerical inputs.

## Completion
- Fix regressions introduced by the change.
- Report manual checks performed and checks that were unavailable.
- Summarize the exact areas changed, especially any simulation equations or persistence formats.
