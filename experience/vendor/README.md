# Bundled mathematics

`katex.min.js` is the unmodified browser distribution from **katex 0.19.0** (MIT; see `KATEX-LICENSE.txt`).

Source: https://registry.npmjs.org/katex/-/katex-0.19.0.tgz

NPM tarball integrity: `sha512-v6Tznz3zJ7u3niRCoDTsumM2+HA2XXcCu+WAacCeHD2z3p9A9Ks987o5FzfTGBN0e8A0vjEgIDvLbICrXpdw/Q==`

The builder embeds this distribution in the portable HTML before the answer renderer. We use native MathML output; no fonts, images, external scripts or network request are needed to typeset answers. Modern Chrome, Edge, Firefox and Safari support native MathML. Trust is disabled, macros are isolated for each expression, and input length, expansion and size are bounded. Unsupported expressions retain an escaped original inside a disclosure rather than silently changing the mathematics.

Documentation: https://katex.org/docs/options and https://katex.org/docs/security
