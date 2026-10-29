# Physics product excellence — local review candidate

Date: 29 October 2026. Baseline: `63a86b4`. Branch: `codex/product-excellence-20261029`. Status: implemented and locally validated; not committed, merged or deployed by this workstream.

Visitors can launch Refraction & TIR immediately without registering or completing personalization. Explore, Learn, Labs, Sandbox and Advanced now use the same main navigation conventions on desktop and mobile; More retains secondary workspaces. Search includes actual experiments and tools from both subject catalogs, plus local saved observations. Existing deep links remain available.

Scientific workspaces use a compact header with source details behind About. Live experiments have contextual guidance, model limitations and Save observation. The local notebook stores named controls, observations, optional measurements and readable canvas captures; it supports reload/resume, CSV, JSON and print/PDF. Save failures are visible and provide a recoverable unsaved export. Cloud sync is not connected.

Mobile actions have a deliberate two-row header, 44px targets, and no floating app/tutor button over scientific controls. Feedback occupies inline space. Keyboard launch/control/save flows, focus restoration, reduced motion and 320–1440px layouts are checked.

An optional `classroom=1` pilot creates assignments and structured worksheets, exports/imports local submissions and saves teacher review notes. It does not provide school accounts, a roster, uploads, automatic grading or a private online inbox. Student codes are optional and should be anonymous.

External Clarity tracking and identity calls are disabled. This privacy correction applies even when the redesign is off. Numerical engines, existing camera interaction systems and dedicated tool notebooks were not rewritten. Legacy screen/frame previews are labelled illustrative instead of implying validated SI output.

See [the test report](ENTELLOQ_TEST_REPORT.md) for before/after evidence, failures resolved during development, and outstanding real-student, hardware, native and release gates. See [engineering notes](PHYSICS_ENGINEERING.md) for flags, preview commands and rollback. Production deployment requires explicit approval after final review and required hosted checks.
