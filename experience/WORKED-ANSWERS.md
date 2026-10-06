# Worked answers

`answer-format.js` is the shared safe rendering layer for Solve, Practice (including timed-question text), the tutor and AI lesson enrichment. It handles paragraphs, headings, lists, simple tables, emphasis and delimited mathematics. Provider HTML is always escaped. TeX parsing uses the pinned bundled KaTeX distribution because browsers do not parse TeX themselves. Native MathML is the final output, preserving semantic maths without remote fonts or scripts and keeping the standalone HTML usable offline.

Unknown equations are labelled as unavailable with an escaped original available for inspection; they are not silently rewritten. Legacy arithmetic typography is converted conservatively (multiplication, scientific notation, subscripts, powers, balanced sqrt/abs). The formatter also handles observed provider delimiter mistakes. It is not a general computer algebra system.

Solve and generated Practice responses request a stated physical model, justified steps, units, a final answer and a dimensional or physical check. Tutor streaming preserves completion/error handling and private-reasoning exclusion. Its unfinished paragraph is buffered; completed answers are formatted rather than displayed as raw Markdown/TeX. The AI endpoint, model, authorization, billing and camera/simulation code are unchanged.

## Diagrams and validation limits

Only authored diagram templates can render. The supported types are `projectile-level` (uniform gravity, no drag, equal launch/landing heights) and `charges` (finite nonzero q1/q2 values used for charge signs). Captions state these are schematics, not measured or quantitative plots. No generated SVG or HTML is inserted. Other geometries need future reviewed templates and must be described in words in the meantime.

`practice-answers.js` validates generated question shape and evaluates numerical substitutions with a bounded arithmetic grammar, never `eval`. It checks that exactly one option, with consistent units and final rounding, matches that expression. An invalid generated question is replaced with a reviewed offline question. This catches arithmetic/option errors, including the reported Coulomb-force error. It does **not** independently prove the selected law, the model's interpretation of the question, or every statement in its explanation. Solve and tutor are still AI-generated explanations, not certified symbolic proofs.

## Checks

- `node .github/build-experience.js` rebuilds the portable distribution; `--check` detects drift.
- `node --test .github/test-*.js` includes rendering, hostile input, streaming failures, arithmetic precedence/limits, ambiguous questions, fallback explanations and preservation regressions.
- `node qa/worked-answers.cjs` exercises the real UI with deterministic provider fixtures, at four widths in both themes. `--live` uses the deployed HTML; `--smoke` limits this to desktop and phone. Playwright is supplied by the workstation runtime through `NODE_PATH`.
- `node qa/sample-model-answers.cjs` optionally makes three real-provider requests from an isolated browser. Its samples are a limited integration check, not an accuracy benchmark. Results/screenshots stay in ignored `qa/results/`.

Before publication: all required CI must pass. Afterwards check deployment completion, live artifact parity and the live browser smoke test. Preserve the founder, launch artwork, six-lens Learn interface and Sandbox scroll behavior.
