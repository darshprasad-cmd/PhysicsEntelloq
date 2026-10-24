# Physics Entelloq: equation, graph and circuit tools

This additive module belongs inside the existing Physics shell. It does not replace navigation, learning state, the tutor or scientific workspaces.

## Placement and loading

Copy this whole folder, excluding `node_modules`, into `assets/learning-tools/physics/`. Serve it over HTTP(S). No build is needed at runtime; pinned MathLive and JSXGraph distributions are included under `vendor/`.

| Existing home | Entry | Purpose |
| --- | --- | --- |
| Solve | `index.html?panel=equations` | Structured equation entry, accessible virtual keyboard, LaTeX/ASCII export and host transfer |
| Learn and Lab | `index.html?panel=graphs` | Linked velocity vector and projectile trajectory with keyboard inputs and CSV model samples |
| Lab / electricity | `index.html?panel=circuits` | DC resistor and RC experiment parameters, prediction, genuine CircuitJS engine and circuit source export |

Each module is lazy loaded after selecting its panel. CircuitJS makes no remote request until the learner opens the simulation or the external link. MathLive and JSXGraph work from local assets without a CDN.

### Host API

The default entry page is suitable for a same-origin iframe. Give it a descriptive title and remove it when leaving the workspace. It accepts same-origin messages only from its parent:

```js
frame.contentWindow.postMessage({type:'entelloq:theme',theme:'light'}, location.origin);
```

Alternatively set `frame.contentDocument.documentElement.dataset.physicsTheme` to `light` or `dark` after load. Changing theme preserves state. It follows Physics `--bg`, `--bg2`, `--text`, `--muted`, `--border` and `--accent` tokens where provided, with local light/dark defaults. A live hosted CircuitJS canvas retains the theme chosen at launch; opening it again picks up the current theme.

The Equation editor emits a bubbling `entelloq:equation` CustomEvent and a same-origin parent message:

```js
{ type:'entelloq:equation', source:'mathlive', version:1,
  latex:'F=ma', asciiMath:'F=ma' }
```

The parent should verify `event.origin === location.origin` and `event.source === frame.contentWindow`, then open the existing Symbolic Workbench and insert the expression. This is **input transfer**, not symbolic validation. Do not evaluate the received expression as JavaScript. ASCII export can require normalizing notation before SymPy accepts it; show any conversion error rather than guessing.

For an inline host, load `style.css` and use the exported lifecycle:

```js
import {mount} from './tools.mjs';
const instance = await mount(element, { initialTab:'trajectory', onEquation: detail => openSymbolic(detail) });
instance.setPanel('graphs');
instance.getState();
instance.unmount();
```

`storage` can be overridden with a Storage-like adapter or set to `null`. Existing values in localStorage `entelloq.physics.tools.v1` remain readable and unchanged. New edits use separate `entelloq.physics.tools.v2.<field>` records; saving an equation, graph control or circuit setting writes only the field edited. This prevents pre-opened tabs from replacing unrelated saved work. Changing panels reloads saved values while retaining any unsaved edits in the current session. Opening a tool does not resave its defaults.

This is local persistence, not live collaborative editing: if two tabs edit the exact same field, the last successful write wins. A vector drag updates its two components separately. Older app versions only understand the original v1 snapshot. A denied or full store leaves export usable, retains edits in the current session, and reports the limitation. CircuitJS editing state is external and not captured in this store; its own File → Export as Text command preserves edits.

## Model boundaries

Motion is a point projectile from y=0, constant downward g, no air resistance. Controls clamp vₓ to −20…20 m/s, vᵧ to 0.1…20 m/s and g to 0.1…25 m/s². The trajectory uses the full positive flight interval, including leftward and vertical launches. It is a prediction, not measured evidence. Keyboard inputs provide equivalent access to the draggable vector.

DC uses I=V/R. RC uses an initially uncharged ideal capacitor, τ=RC, and Vc(τ)=V(1−e⁻¹). The generated circuit is loaded into the separate actual CircuitJS numerical engine. Component tolerances, leakage, heating and current limits are not represented. Presets use 0.1…24 V, 10…1,000,000 Ω and 1 nF…10 mF. CircuitJS runs on falstad.com and requires a connection; its live deployment version is controlled upstream.

## Why these dependencies

- MathLive 0.111.1 supplies structured mathematical editing and mobile keyboard behavior that native text inputs cannot provide. Existing SymPy remains responsible for mathematical operations.
- JSXGraph 1.14.1 supplies accessible-by-controls interactive geometry, coordinated curves and draggable points. A static SVG alone would not supply the graph interaction engine.
- CircuitJS1 supplies an actual circuit solver and editable component canvas. It is loaded as the upstream documented hosted iframe, not copied into Entelloq's proprietary source. Its source and GPL notice remain linked. A later redistributed build requires a separate corresponding-source/licence review; an iframe is not asserted to waive licence duties.

## Reproduce and verify

```sh
npm ci --ignore-scripts
npm run vendor
npm test
npm run qa
```

Browser QA uses Playwright from `CODEX_NODE_MODULES` or the installed Codex bundled runtime. Set `CHECK_HOSTED=1` to also open the real hosted CircuitJS and require its actual canvas. Browser tests create their own ephemeral local server. Evidence is under `qa/`. Unit tests cover flight endpoints, parameter constraints, circuit serialization and denied storage. Browser checks cover real dependency loading, editing/export event, persistence, linked graph controls, mobile/light theme, explicit remote launch, offline state and cleanup.

Hosted availability is a separate evidence boundary from local-module checks. Neither these checks nor exported examples constitute scientific validation of every possible CircuitJS component.
