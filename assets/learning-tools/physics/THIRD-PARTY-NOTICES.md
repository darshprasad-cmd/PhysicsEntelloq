# Third-party sources and notices

Verified 2026-10-24. Installed versions are pinned in package-lock.json. Reproduction uses `npm ci --ignore-scripts` and `npm run vendor`; original licence text is retained unchanged.

| Component | Version / source | Licence | Distribution |
| --- | --- | --- | --- |
| MathLive | 0.111.1 — https://github.com/arnog/mathlive | MIT | Unmodified browser module, styles, fonts and sounds from npm; `vendor/mathlive/LICENSE.txt` |
| JSXGraph | 1.14.1 — https://github.com/jsxgraph/jsxgraph | MIT option of dual MIT/LGPL | Unmodified browser module and styles from npm; `vendor/jsxgraph/LICENSE.MIT` |
| CircuitJS1 | https://github.com/sharpie7/circuitjs1 — inspected source commit `dd47cf43a1baa91e2d6ae0f5884ccf0f589989bf` | GPL-2.0-or-later | No CircuitJS executable/source is copied into this package. Uses the upstream documented hosted embed at https://www.falstad.com/circuit/circuitjs.html. Hosted build is not version pinned. |

MathLive copyright Arno Gourdol; JSXGraph copyright its project authors (see retained licences). CircuitJS was originally written by Paul Falstad and adapted to the browser by Iain Sharp, with contributors listed upstream. The open-source project provides no warranty. CircuitJS source and build instructions: https://github.com/sharpie7/circuitjs1/tree/dd47cf43a1baa91e2d6ae0f5884ccf0f589989bf . GPL text: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html .

`vendor/manifest.json` records SHA-256 hashes for bundled main modules, styles and licences. Fonts and sounds are copied as the original MathLive package directories. Package-lock integrity pins cover each npm tarball. All authored circuit presets and UI are new Entelloq integration code, not copied from CircuitJS. This notice does not claim that a future copied, modified or redistributed CircuitJS build is exempt from GPL obligations.
