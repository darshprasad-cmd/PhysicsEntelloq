# Verification — 24 October 2026

- Production TypeScript/Vite build: passed. Main interface about 244 KB (77 KB gzip); mathematics renderer is a separate lazy chunk. Pyodide runtime is fetched only when calculating.
- Vitest: 4 tests passed for input-boundary validation and safe notebook recovery.
- npm dependency audit: 0 known vulnerabilities at verification time.
- Production build served by Vite preview on localhost and tested with Microsoft Edge through Playwright: 22 checks passed, with no page JavaScript errors.
- Actual downloaded Pyodide 314.0.7 / SymPy 1.14.0 computations: trigonometric simplification, derivative, antiderivative, quadratic solutions, no real root vs complex roots, excluded cancelled denominator in real and complex domains, and precise decimal rational conversion.
- Equivalence: `sqrt(x^2)` vs `x` refuted over reals with an exact counterexample and accepted over positive reals on the common domain.
- Rejections: attribute access, arbitrary function calls, multiple function arguments, excessive exponent, and division by zero.
- Notebook persistence across reload, Ctrl+Enter computation, responsive layout at 390 × 844, no horizontal document overflow, and mobile notebook opening/closing: passed.
- Simulated runtime request failure produced an honest error; subsequent retry recovered. Cancellation terminated the active worker, and a new calculation succeeded after restart.
- Desktop (1440px) and mobile screenshots were inspected. Mobile hero artwork was removed to preserve text legibility; supporting text was darkened and enlarged.

Browser screenshots and raw reports are regenerated in ignored `test-results/`. `verification-browser.json` preserves the final result summary. No deployment, Safari/iOS hardware check, formal accessibility audit, or exhaustive theorem/domain correctness claim is made. Domain caveats are visible in the application and README.
