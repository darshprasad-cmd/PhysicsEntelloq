import { GraphRenderer } from "./renderer.mjs";
import {
  coordinates,
  difference,
  format,
  validateSnapshot,
  finitePoint,
  clamp,
  sampleCurve,
  surfaceGrid,
  streamline,
} from "./core.mjs";
import { compile } from "./expression.mjs";
export {cartesian,coordinates,streamline,surfaceGrid,sampleCurve} from './core.mjs';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function button(text, title, action) {
  const b = el("button", "pv-button", text);
  b.type = "button";
  if (title) b.setAttribute("aria-label", title);
  b.onclick = action;
  return b;
}
function select(label, choices, action) {
  const wrap = el("label", "pv-select"),
    s = document.createElement("select");
  wrap.append(el("span", null, label), s);
  s.setAttribute("aria-label", label);
  for (const [value, text] of choices) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = text;
    s.append(o);
  }
  s.onchange = () => action(s.value);
  return { wrap, input: s };
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function stylesheet() {
  const url = new URL("./engine.css", import.meta.url).href;
  if (!document.querySelector("link[data-physics-viz]")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.physicsViz = "";
    document.head.append(link);
  }
}

export function mount(host, adapter, options = {}) {
  stylesheet();
  let disposed = false,
    frame = 0,
    revision = null,
    snapshot,
    pinned = null,
    anchor = null,
    measuring = false,
    quality = 48,
    autoQuality = true,
    slowFrames = 0,
    coordinateMode = "cartesian",
    renderer;
  const root = el("section", "pv-workspace");
  root.setAttribute("aria-label", "Physics visualization");
  host.append(root);
  const head = el("header", "pv-header"),
    identity = el("div"),
    eyebrow = el("span", "pv-eyebrow", "PHYSICS ENTELLOQ / VISUALIZATION"),
    title = el("h3", null, adapter.title || "Explore the model"),
    subtitle = el(
      "p",
      "pv-subtitle",
      adapter.subtitle || "One model. Multiple perspectives.",
    );
  identity.append(eyebrow, title, subtitle);
  head.append(identity);
  root.append(head);
  const modeGroup = el("div", "pv-segments");
  modeGroup.setAttribute("aria-label", "Graph dimensions");
  const mode3 = button("3D", "Three-dimensional view", () => setMode("3d")),
    mode2 = button("2D", "Two-dimensional projection", () => setMode("2d"));
  modeGroup.append(mode3, mode2);
  head.append(modeGroup);
  const body = el("div", "pv-body"),
    main = el("div", "pv-main"),
    aside = el("details", "pv-settings");
  aside.open = host.getBoundingClientRect().width > 820;
  aside.append(el("summary", null, "Parameters & display"));
  body.append(main, aside);
  root.append(body);
  const tools = el("div", "pv-toolbar"),
    interaction = button(
      "Navigate",
      "Enable drag, wheel and touch camera controls",
      () => {
        renderer.setInteractive(!renderer.interactive);
        syncInteraction();
      },
    ),
    home = button("Fit view", "Reset camera", () => renderer.resetCamera());
  interaction.setAttribute("aria-pressed", "false");
  tools.append(interaction, home);
  const projection = select(
    "Projection",
    [
      ["xy", "X–Y"],
      ["xz", "X–Z"],
      ["yz", "Y–Z"],
    ],
    (v) => renderer.setMode(renderer.mode, v),
  );
  tools.append(projection.wrap);
  const measure = button(
    "Measure",
    "Measure between two inspected samples",
    () => {
      measuring = !measuring;
      anchor = null;
      measure.setAttribute("aria-pressed", String(measuring));
      message(
        measuring
          ? "Inspect two samples to compare their coordinates."
          : "Measurement cleared.",
      );
    },
  );
  measure.setAttribute("aria-pressed", "false");
  tools.append(measure);
  const focus = button("Focus", "Expand visualization", () => {
    const enabled = root.classList.toggle("pv-focused");
    focus.textContent = enabled ? "Exit focus" : "Focus";
    focus.setAttribute("aria-pressed", String(enabled));
    renderer.resize();
  });
  tools.append(focus);
  main.append(tools);
  const stage = el("div", "pv-stage");
  main.append(stage);
  const colorKey = el("div", "pv-color-key");
  colorKey.hidden = true;
  main.append(colorKey);
  const hint = el(
    "p",
    "pv-hint",
    "Select Navigate to orbit, pan or zoom. Click a sample to inspect. Scrolling stays available outside Navigate mode.",
  );
  main.append(hint);
  const cameraTools = el("div", "pv-camera-tools");
  for (const [label, name, fn] of [
    ["←", "Orbit left", () => renderer.orbit(-0.15, 0)],
    ["→", "Orbit right", () => renderer.orbit(0.15, 0)],
    ["↑", "Orbit up", () => renderer.orbit(0, 0.15)],
    ["↓", "Orbit down", () => renderer.orbit(0, -0.15)],
    ["+", "Zoom in", () => renderer.zoom(1 / 1.15)],
    ["−", "Zoom out", () => renderer.zoom(1.15)],
    ["⇤", "Pan left", () => renderer.pan(-0.12, 0)],
    ["⇥", "Pan right", () => renderer.pan(0.12, 0)],
  ])
    cameraTools.append(button(label, name, fn));
  main.append(cameraTools);
  const transport = el("div", "pv-transport"),
    play = button("Play", "Play simulation", () => {
      adapter.setPlaying?.(!adapter.isPlaying?.());
      cancelAnimationFrame(frame);
      render(true);
    }),
    reset = button("↺", "Reset simulation", () => {
      adapter.reset?.();
      pinned = null;
      anchor = null;
      invalidate(true);
    }),
    time = el("output", "pv-time", "t = 0");
  transport.append(play, reset, time);
  reset.hidden = !adapter.reset;
  const speed = select(
    "Speed",
    [
      ["0.25", "¼×"],
      ["0.5", "½×"],
      ["1", "1×"],
      ["2", "2×"],
    ],
    (v) => adapter.setSpeed?.(+v),
  );
  speed.input.value = "1";
  transport.append(speed.wrap);
  if (!adapter.setPlaying) {
    play.hidden = true;
    reset.hidden = !adapter.reset;
    speed.wrap.hidden = true;
    time.textContent = "STATIC FIELD";
  }
  main.append(transport);
  const status = el("p", "pv-status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  root.append(status);
  function message(text, error = false) {
    status.textContent = text;
    status.dataset.error = String(error);
  }
  function syncInteraction() {
    if(!renderer)return;
    const available=!!renderer.renderer && !renderer.lost;
    interaction.disabled=!available || renderer.mode==='2d';
    mode3.disabled=!available;
    for(const b of cameraTools.querySelectorAll('button'))if(b.getAttribute('aria-label')?.startsWith('Orbit'))b.disabled=!available || renderer.mode==='2d';
    interaction.setAttribute("aria-pressed", String(renderer.interactive));
    interaction.textContent = renderer.interactive
      ? "Stop navigating"
      : "Navigate";
  }
  renderer = new GraphRenderer(stage, {
    onPick: inspect,
    onChange: syncInteraction,
    onStatus: (text, pause) => {
      if (pause) adapter.setPlaying?.(false);
      message(text, !!pause);
      syncPlayback();
      syncInteraction();
    },
  });
  const parameterBox = el("div", "pv-parameters");
  aside.append(parameterBox);
  const parameterInputs = [];
  for (const p of adapter.parameters || []) {
    const label = el("label", "pv-parameter"),
      name = el("span", null, p.label + (p.unit ? " / " + p.unit : "")),
      input = document.createElement(p.options?'select':'input');
    if(p.options){for(const [value,title] of p.options){const option=document.createElement('option');option.value=value;option.textContent=title;input.append(option);}}
    else input.type = "number";
    input.value = p.get();
    input.setAttribute(
      "aria-label",
      p.label + (p.unit ? " (" + p.unit + ")" : ""),
    );
    if (p.min !== undefined) input.min = p.min;
    if (p.max !== undefined) input.max = p.max;
    input.step = p.step ?? "any";
    label.append(name, input);
    parameterBox.append(label);
    parameterInputs.push({ p, input });
    input.oninput = () => {
      const value = p.options ? input.value : input.valueAsNumber;
      if (
        p.options ? !p.options.some(option=>option[0]===value) : (input.value.trim() === "" ||
        !Number.isFinite(value) ||
        value < (p.min ?? -Infinity) ||
        value > (p.max ?? Infinity) ||
        (p.step === 1 && !Number.isInteger(value)))
      ) {
        input.setAttribute("aria-invalid", "true");
        message(
          "Enter " +
            p.label +
            " between " +
            p.min +
            " and " +
            p.max +
            ". The last valid model is still shown.",
          true,
        );
        return;
      }
      input.setAttribute("aria-invalid", "false");
      p.set(value);
      anchor = null;
      pinned = null;
      message("Model updated.");
      invalidate(true);
    };
  }
  const qualitySelect = select(
    "Detail",
    [
      ["auto", "Adaptive"],
      ["24", "Reduced"],
      ["48", "Balanced"],
      ["80", "Fine"],
    ],
    (value) => {
      autoQuality = value === "auto";
      quality = autoQuality ? 48 : +value;
      invalidate(true);
    },
  );
  aside.append(qualitySelect.wrap);
  const coord = select(
    "Coordinates",
    [
      ["cartesian", "Cartesian"],
      ["cylindrical", "Cylindrical"],
      ["spherical", "Spherical"],
    ],
    (v) => {
      coordinateMode = v;
      if (pinned) renderInspection();
    },
  );
  aside.append(coord.wrap);
  if (adapter.gestures) {
    const hands = button(
      "Use hand navigation",
      "Enable optional webcam graph navigation",
      async () => {
        hands.disabled = true;
        try {
          if (adapter.gestures.active()) {
            adapter.gestures.stop();
            hands.textContent = "Use hand navigation";
            return;
          }
          await adapter.gestures.start({
            orbit: (x, y) => renderer.orbit(x, y),
            zoom: (f) => renderer.zoom(f),
            pan: (x, y) => renderer.pan(x, y),
          });
          if (disposed) {
            adapter.gestures.stop();
            return;
          }
          hands.textContent = "Stop hand navigation";
          message(
            "Camera navigation is active. Pinch and move to orbit; two pinches zoom.",
          );
        } catch (e) {
          message(
            e.message ||
              "Camera navigation is unavailable. Use the controls instead.",
            true,
          );
        } finally {
          hands.disabled = false;
        }
      },
    );
    aside.append(hands);
  }
  const inspector = el("section", "pv-inspector");
  inspector.append(el("h4", null, "Inspect the model"));
  const readout = el(
    "div",
    "pv-readout",
    "Select a point in the graph or choose a sample below.",
  );
  inspector.append(readout);
  const sampleLabel = el("label", "pv-parameter"),
    sampleInput = document.createElement("input");
  sampleInput.type = "range";
  sampleInput.min = 0;
  sampleInput.max = 1;
  sampleInput.step = 1;
  sampleInput.value = 0;
  sampleInput.setAttribute("aria-label", "Inspect sample");
  sampleInput.oninput = () => inspect(renderer.samples[+sampleInput.value]);
  sampleLabel.append(el("span", null, "Sample"), sampleInput);
  inspector.append(sampleLabel);
  aside.append(inspector);
  const measurement = el("p", "pv-measurement");
  aside.append(measurement);
  const notes = el("details", "pv-notes");
  notes.append(
    el("summary", null, "Model & assumptions"),
    el(
      "p",
      null,
      adapter.description ||
        "Computed model data. Display scaling does not change the physics.",
    ),
  );
  if (adapter.equation) notes.append(el("p", "pv-equation", adapter.equation));
  aside.append(notes);
  const tableDetails = el("details", "pv-table-details");
  tableDetails.append(el("summary", null, "Numerical samples & export"));
  const table = el("table"),
    thead = document.createElement("thead"),
    tbody = document.createElement("tbody");
  table.append(thead, tbody);
  tableDetails.append(table);
  tableDetails.append(
    button("Export model samples", "Export model samples as CSV", () => {
      if (!snapshot) return;
      const rows = [
        snapshot.axes
          .map((a) => JSON.stringify(a.label + " (" + a.unit + ")"))
          .join(","),
      ];
      for (const s of renderer.samples.slice(0, 25000))
        rows.push(s.point.map((n) => n.toPrecision(12)).join(","));
      download("physics-model-samples.csv", rows.join("\n"), "text/csv");
      message("Exported computed model coordinates.");
    }),
  );
  root.append(tableDetails);
  tableDetails.ontoggle = () => {
    if (tableDetails.open) renderTable();
  };
  function renderTable() {
    if (!snapshot) return;
    thead.replaceChildren();
    const row = document.createElement("tr");
    for (const a of snapshot.axes)
      row.append(el("th", null, a.label + (a.unit ? " / " + a.unit : "")));
    thead.append(row);
    tbody.replaceChildren();
    const step = Math.max(1, Math.floor(renderer.samples.length / 12));
    for (
      let i = 0;
      i < renderer.samples.length && tbody.children.length < 12;
      i += step
    ) {
      const tr = document.createElement("tr");
      for (const v of renderer.samples[i].point)
        tr.append(el("td", null, format(v)));
      tbody.append(tr);
    }
  }
  function inspect(sample) {
    if (!sample) return;
    pinned = { ...sample, point: sample.point.slice() };
    sampleInput.value = Math.max(0, renderer.samples.indexOf(sample));
    renderInspection();
    if (measuring) {
      if (!anchor) {
        anchor = pinned.point.slice();
        measurement.textContent =
          "First point captured. Choose a second point.";
      } else {
        const d = difference(anchor, pinned.point, snapshot.axes);
        measurement.textContent =
          d.distance !== null
            ? "Distance: " + format(d.distance) + " " + d.unit
            : "Coordinate differences: " +
              d.delta
                .map(
                  (v, i) =>
                    snapshot.axes[i].label +
                    " " +
                    format(v) +
                    " " +
                    snapshot.axes[i].unit,
                )
                .join(" · ");
        anchor = null;
      }
    }
  }
  function renderInspection() {
    if (!pinned || !snapshot) return;
    readout.replaceChildren();
    readout.append(el("small", null, pinned.label));
    const compatible = snapshot.coordinateCompatible !== false;
    const mode = compatible ? coordinateMode : "cartesian",
      values = coordinates(pinned.point, mode);
    const names =
      mode === "spherical"
        ? ["r", "θ", "φ"]
        : mode === "cylindrical"
          ? ["ρ", "φ", "z"]
          : snapshot.axes.map((a) => a.label);
    values.forEach((v, i) => {
      const row = el("div", "pv-reading"),
        angular =
          (mode === "spherical" && i > 0) ||
          (mode === "cylindrical" && i === 1);
      row.append(
        el("span", null, names[i]),
        el("strong", null, format(v)),
        el(
          "small",
          null,
          angular
            ? "rad"
            : mode === "cartesian"
              ? snapshot.axes[i].unit
              : snapshot.axes[0].unit,
        ),
      );
      readout.append(row);
    });
    if (pinned.value)
      readout.append(
        el("p", null, "Vector: " + pinned.value.map(format).join(", ")),
      );
  }
  function syncPlayback() {
    const playing = !!adapter.isPlaying?.();
    play.textContent = playing ? "Pause" : "Play";
    play.setAttribute(
      "aria-label",
      playing ? "Pause simulation" : "Play simulation",
    );
    play.setAttribute("aria-pressed", String(playing));
  }
  function setMode(mode) {
    if(!renderer.renderer)mode='2d';
    renderer.setMode(mode);
    mode3.setAttribute("aria-pressed", String(mode === "3d"));
    mode2.setAttribute("aria-pressed", String(mode === "2d"));
    projection.wrap.hidden = mode !== "2d";
    syncInteraction();
  }
  function render(force = false) {
    frame = 0;
    if (disposed || document.hidden) return;
    try {
      const next = validateSnapshot(adapter.getSnapshot());
      if (force || next.revision !== revision) {
        const start = performance.now();
        snapshot = next;
        renderer.update(next, quality);
        colorKey.hidden = !next.surface;
        if (next.surface) {
          colorKey.replaceChildren(
            el("span", null, format(renderer.range[0])),
            el("i"),
            el(
              "span",
              null,
              format(renderer.range[1]) + " " + next.axes[2].unit,
            ),
          );
        }
        revision = next.revision;
        if (anchor) {
          anchor = null;
          measurement.textContent =
            "The model changed. Select a new first point.";
        }
        sampleInput.max = Math.max(0, renderer.samples.length - 1);
        if (pinned && pinned.index >= 0) {
          const current = renderer.samples.find(
            (s) => s.index === pinned.index && s.label === pinned.label,
          );
          pinned = current || null;
          if (pinned) renderInspection();
        } else if (pinned && pinned.index === -1 && next.surface) {
          const z = next.surface.sample(pinned.point[0], pinned.point[1]);
          if (Number.isFinite(z)) {
            pinned.point[2] = z;
            renderInspection();
          } else pinned = null;
        }
        if (!pinned)
          readout.textContent =
            "Select a point in the graph or choose a sample below.";
        coord.input.disabled = next.coordinateCompatible === false;
        if (coord.input.disabled)
          coord.input.title =
            "These axes have different physical meanings; use their named coordinates.";
        if (tableDetails.open) renderTable();
        if (autoQuality && performance.now() - start > 28) {
          if (++slowFrames > 12 && quality > 24) {
            quality = 24;
            revision = null;
            message(
              "Reduced display detail to keep interaction responsive. Physics accuracy is unchanged.",
            );
          }
        } else slowFrames = Math.max(0, slowFrames - 1);
      }
      if (next.time !== undefined)
        time.textContent =
          "t = " + format(next.time ?? 0) + " " + (next.timeUnit || "s");
      syncPlayback();
      for (const { p, input } of parameterInputs)
        if (
          document.activeElement !== input &&
          input.getAttribute("aria-invalid") !== "true"
        )
          input.value = p.get();
    } catch (e) {
      adapter.setPlaying?.(false);
      message("The graph could not update: " + e.message, true);
    }
  }
  function invalidate(force = false) {
    if (force) revision = null;
    if (!frame && !disposed && !document.hidden)
      frame = requestAnimationFrame(() => render(force));
  }
  const unsubscribe = adapter.subscribe?.(() => invalidate());
  const theme = () => {
    const light =
      document.documentElement.dataset.theme === "light" ||
      document.documentElement.dataset.physicsTheme === "light";
    root.dataset.theme = light ? "light" : "dark";
    renderer.setTheme(root.dataset.theme);
  };
  const themes = new MutationObserver(theme);
  themes.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "data-physics-theme"],
  });
  theme();
  const visibility = () => {
    if (document.hidden) {
      adapter.setPlaying?.(false);
      adapter.gestures?.stop();
      cancelAnimationFrame(frame);
      frame = 0;
    } else invalidate(true);
  };
  document.addEventListener("visibilitychange", visibility);
  const escape = (e) => {
    if (e.key === "Escape" && root.contains(document.activeElement)) {
      root.classList.remove("pv-focused");
      focus.textContent = "Focus";
      focus.setAttribute("aria-pressed", "false");
      renderer.setInteractive(false);
      syncInteraction();
      renderer.resize();
    }
  };
  root.addEventListener("keydown", escape);
  setMode(options.initialMode || "3d");
  render(true);
  const controller = {
    invalidate,
    renderer,
    root,
    getSnapshot: () => snapshot,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      unsubscribe?.();
      themes.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      root.removeEventListener("keydown", escape);
      adapter.gestures?.stop();
      renderer.dispose();
      root.remove();
    },
  };
  root.__physicsVisualization = controller;
  return controller;
}

// Reusable authored graph modes: valid mathematics, not a stand-alone route.
export function mountExplorer(host, { compileExpression = compile } = {}) {
  const panel = el("div", "pv-expressions");
  host.append(panel);
  const modes = select(
    "Graph type",
    [
      ["surface", "Surface z = f(x, y)"],
      ["curve", "Parametric curve r(t)"],
    ],
    () => update(),
  );
  panel.append(modes.wrap);
  const fields = [];
  for (const [name, value] of [
    ["Surface", "0.5*(x^2+y^2)"],
    ["x(t)", "cos(t)"],
    ["y(t)", "sin(t)"],
    ["z(t)", "t/6"],
  ]) {
    const l = el("label"),
      input = document.createElement("input");
    l.append(el("span", null, name), input);
    input.value = value;
    input.maxLength = 300;
    input.setAttribute("aria-label", name + " expression");
    panel.append(l);
    fields.push({ l, input });
  }
  const error = el("p");
  const domains = [];
  for (const [name, value] of [
    ["Domain minimum", -3],
    ["Domain maximum", 3],
    ["Parameter start", 0],
    ["Parameter end", 4 * Math.PI],
  ]) {
    const label = el("label"),
      input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.value = value;
    input.setAttribute("aria-label", name);
    label.append(el("span", null, name), input);
    panel.append(label);
    domains.push({ label, input });
  }
  error.setAttribute("role", "status");
  panel.append(button("Plot expression", "Plot expression", update), error);
  let current,
    rev = 0,
    view;
  const listeners = new Set();
  function update() {
    try {
      const mode = modes.input.value;
      fields.forEach(
        ({ l }, i) => (l.hidden = mode === "surface" ? i !== 0 : i === 0),
      );
      domains.forEach(
        ({ label }, i) => (label.hidden = mode === "surface" ? i > 1 : i < 2),
      );
      const range = domains
        .slice(mode === "surface" ? 0 : 2, mode === "surface" ? 2 : 4)
        .map(({ input }) => input.valueAsNumber);
      if (
        !range.every(Number.isFinite) ||
        range[0] >= range[1] ||
        range.some((v) => Math.abs(v) > 1e6)
      )
        throw Error("Choose a finite increasing domain within ±1,000,000.");
      const extent = (values) => {
        const finite = values.filter(
          (v) => Number.isFinite(v) && Math.abs(v) < 1e12,
        );
        if (!finite.length) throw Error("No finite values in this domain.");
        const lo = Math.min(...finite),
          hi = Math.max(...finite),
          pad = Math.max((hi - lo) * 0.06, Math.abs(lo) * 0.01, 0.05);
        return [lo - pad, hi + pad];
      };
      if (mode === "surface") {
        const f = compileExpression(fields[0].input.value, ["x", "y"]);
        const surface = {
          domain: [range, range],
          sample: (x, y) => f({ x, y }),
          label: "Function value",
        };
        const zRange = extent(surfaceGrid(surface, 48).values);
        current = {
          revision: ++rev,
          coordinateCompatible: false,
          axes: [
            { label: "x", unit: "model" },
            { label: "y", unit: "model" },
            { label: "f(x,y)", unit: "model" },
          ],
          bounds: [range, range, zRange],
          surface,
        };
      } else {
        const f = fields
          .slice(1)
          .map(({ input }) => compileExpression(input.value, ["t"]));
        const segments = sampleCurve(
          (t) => f.map((fn) => fn({ t })),
          range,
          900,
        );
        current = {
          revision: ++rev,
          coordinateCompatible: true,
          axes: ["x", "y", "z"].map((label) => ({ label, unit: "model" })),
          bounds: [0, 1, 2].map((i) =>
            extent(segments.flat().map((p) => p[i])),
          ),
          lines: segments.map((points) => ({
            points,
            label: "Parametric curve",
          })),
        };
      }
      error.textContent = "";
      listeners.forEach((fn) => fn());
    } catch (e) {
      error.textContent = e.message;
    }
  }
  update();
  view = mount(host, {
    title: "Mathematical workspace",
    subtitle: "Inspect the geometry of a relationship.",
    description:
      "User-defined mathematical functions in arbitrary model units. Domains are editable above; axes fit sampled values. Non-finite samples are omitted. Finite sampling can miss a singularity or a narrow feature; this does not establish a physical law.",
    getSnapshot: () => current,
    subscribe: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
  });
  return {
    dispose() {
      view.dispose();
      panel.remove();
    },
  };
}
