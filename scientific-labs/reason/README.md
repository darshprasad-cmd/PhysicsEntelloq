# Entelloq Reason

A working symbolic mathematics studio with a local notebook. Enter expressions, choose assumptions, and explore exact results through SymPy running in a browser Web Worker. There is no model-generated mathematics or backend service.

## Run

Use Node.js 22.12+ (Node 24 tested):

```sh
npm ci
npm run dev -- --port 5191
```

Open the printed local address. Build with `npm run build`, then serve `dist/` with `npm run preview` or any static web server. Use HTTP(S), not a file URL. The relative base supports deployment beneath a suite path; the brand and suite links go to `../`.

## What works

- Symbolic simplification, first derivatives, indefinite integration, single-variable solution sets, and expression-equivalence checks.
- Real, positive-real, or complex assumptions applied consistently to all variable symbols. Other variables are held constant during differentiation/integration. Equation solving requires one variable.
- Natural logarithms, trigonometry in radians, exact rational interpretation of decimal literals, elementary functions, and mathematical constants.
- Rendered mathematics through KaTeX with MathML for assistive technology; plaintext result copying.
- A notebook of the most recent 50 successful calculations, browser-local persistence, individual deletion, recall, and JSON export.
- Five interactive examples, keyboard submission (Ctrl/Cmd+Enter), loading/error/retry/cancel states, reduced-motion handling, and mobile notebook access.

## Mathematical boundaries

This is a symbolic exploration tool, not a proof checker or a step-by-step tutor. Simplification is heuristic. Equivalence means the difference simplifies exactly to zero on the expressions' **common domain**, not that their original domains are equal. A symbolic result that cannot establish equality is labelled inconclusive unless an exact finite counterexample can refute identity.

The solver uses `solveset` in the chosen domain and preserves denominator exclusions from the original unevaluated expression. For real domains it additionally intersects the solution set with continuous domains where SymPy can determine them. Unsupported domain analysis is disclosed. Inputs with functions such as inverse trigonometry and complex logarithms retain SymPy's branch conventions; inspect the original domain restrictions. `ConditionSet`, `ImageSet`, or an unevaluated integral can remain in output. An indefinite integral includes `+ C`; branches, disconnected intervals, and points of nondifferentiability still matter.

## Input boundary and resource limits

`src/engine.py` is a fixed Python program. Input is transferred as JSON data. The program parses only expression syntax with Python `ast` and manually constructs allowlisted SymPy nodes; it never passes user strings to Python `eval`, `exec`, SymPy `sympify`, or `parse_expr`.

Allowed: finite decimal/scientific numeric literals, single lowercase variables (except reserved `e`/`i`), `pi`, `e`, `i`, `+ - * / ^ **`, parentheses, and one-argument `sin cos tan asin acos atan exp log ln sqrt abs`. Attribute access, imports, comprehensions, subscripts, assignments, arbitrary calls, function keywords, strings, and Python statements are rejected. Numeric literals are capped at absolute magnitude 1e9; numeric exponents at magnitude 100. Each expression is capped at 240 characters, 110 AST nodes, and 18 construction levels. Output is capped at 16,000 characters. The main thread terminates the worker after 15 seconds of computation, on cancellation, or after a 120-second runtime-load deadline.

These bounds protect responsiveness, but symbolic algebra can still consume considerable CPU/memory before the deadline. A Web Worker is an isolation mechanism for UI responsiveness, not a general-purpose security sandbox. The app deliberately exposes no Python console.

## Dependencies and network use

The production interface is a React/Vite application. KaTeX is loaded separately when a result is displayed. The first calculation downloads the pinned official Pyodide **314.0.7** distribution from jsDelivr and its **SymPy 1.14.0** package. The pinned version and module-worker integration were checked against official documentation on 24 October 2026. No expression or notebook content is intentionally transmitted to a server. Google Fonts supplies optional interface fonts; system fallbacks work without it. Runtime and font requests expose normal network metadata to those providers.

Internet access is needed for the initial runtime download. Browser caching may help later visits, but offline operation is not guaranteed. A failed initial load can be retried. Notebook data is unencrypted local storage in the current browser origin; clearing site data removes it. Export before moving browsers or changing origins.

## Verification

```sh
npm test
npm run build
npm audit
# Start the app on port 5191 in another terminal first:
npm run test:browser
```

`REASON_URL` can point the browser suite at a preview/build server. The browser runner uses installed Microsoft Edge through Playwright; install Edge or change the launch channel for another environment. Browser output goes into ignored `test-results/` and includes desktop/mobile screenshots and a JSON report. Mathematical checks execute the actual downloaded runtime and SymPy; they are not mocked. See `VERIFICATION.md` for the performed checks and boundaries.

## Primary references

- [Pyodide quick start and pinned stable runtime](https://pyodide.org/en/stable/usage/quickstart.html)
- [Pyodide module Web Workers](https://pyodide.org/en/stable/usage/webworker.html)
- [SymPy assumptions](https://docs.sympy.org/latest/guides/assumptions.html)
- [SymPy solveset](https://docs.sympy.org/latest/modules/solvers/solveset.html)
- [SymPy calculus](https://docs.sympy.org/latest/tutorials/intro-tutorial/calculus.html)
- [KaTeX options and trust boundary](https://katex.org/docs/options)

See `THIRD_PARTY_NOTICES.md` for upstream licenses. Entelloq application source has no additional open-source license grant in this package.
