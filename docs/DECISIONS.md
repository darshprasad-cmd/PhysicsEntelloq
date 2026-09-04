# Architecture decisions

Use this file for durable choices. Each new entry should include status, context, decision, alternatives, consequences, and date.

## Accepted: single-file static application
`index.html` is both source and deployable artifact. The zero-install model is intentional. Framework, bundler, or module-system adoption requires an explicit migration decision.

## Accepted: browser-only runtime
Learning flows and simulations execute locally in the browser. New remote dependencies must justify offline/privacy impact and graceful failure behavior.

## Accepted: scientific behavior is reviewable
Equations, units, coordinate conventions, approximations, and numerical limits must remain discoverable near their implementations and in PR descriptions.

## Proposed decisions
Record decisions before adopting analytics, authentication, payments, remote AI calls, a build system, or persistent-data schema changes.
