import { trajectory } from "./core.mjs";
export function connectVisualization(workspace, getState, change) {
  const controls = document.createElement("div");
  controls.className = "pt-actions pt-viz-entry";
  const spatial = document.createElement("button"),
    functions = document.createElement("button"),
    back = document.createElement("button");
  spatial.type = functions.type = back.type = "button";
  spatial.textContent = "Inspect motion in 3D";
  functions.textContent = "Surfaces & parametric curves";
  back.textContent = "← Return to motion diagrams";
  back.hidden = true;
  controls.append(spatial, functions, back);
  const slot = document.createElement("div");
  slot.className = "pt-viz-zone";
  slot.hidden = true;
  const grid = workspace.querySelector(".pt-grid");
  grid.before(controls, slot);
  let view = null,
    serial = 0,
    disposed = false,
    time = 0,
    playing = false,
    rate = 1,
    raf = 0,
    last = 0;
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn());
  function onParameter(event) {
    if (event.target.closest("[data-key],[data-earth],[data-moon]")) {
      time = 0;
      notify();
    }
  }
  workspace.addEventListener("input", onParameter);
  workspace.addEventListener("click", onParameter);
  function stop() {
    playing = false;
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  function clock(now) {
    if (disposed || !view) return;
    const model = trajectory(getState());
    if (document.hidden) {
      stop();
      return;
    }
    if (last)
      time = Math.min(
        model.flight,
        time + Math.min(0.1, (now - last) / 1000) * rate,
      );
    last = now;
    if (time >= model.flight) playing = false;
    notify();
    if (playing) raf = requestAnimationFrame(clock);
  }
  function close() {
    serial++;
    stop();
    view?.dispose();
    view = null;
    slot.replaceChildren();
    slot.hidden = true;
    grid.hidden = false;
    back.hidden = true;
    spatial.hidden = false;
    functions.hidden = false;
    dispatchEvent(new Event("resize"));
  }
  async function open(kind) {
    close();
    const generation = ++serial;
    slot.hidden = false;
    slot.textContent = "Loading scientific renderer…";
    grid.hidden = true;
    back.hidden = false;
    spatial.hidden = true;
    functions.hidden = true;
    try {
      const engine = await import("/assets/physics-visualization/engine.mjs");
      if (disposed || generation !== serial) return;
      slot.textContent = "";
      if (kind === "functions") {
        view = engine.mountExplorer(slot);
        return;
      }
      const adapter = {
        title: "Projectile motion",
        subtitle: "The same trajectory, inspected in space.",
        equation: "x = vₓt · y = vᵧt − ½gt² · z = 0",
        description:
          "Ideal point projectile, constant downward gravity and no drag, launched and landing at y = 0. This is a planar trajectory: a 3D camera does not add out-of-plane motion. Geometry and predictions use the same analytical function as the motion diagrams.",
        parameters: [
          ["vx", "Horizontal velocity", "m/s", -20, 20, 0.1],
          ["vy", "Upward velocity", "m/s", 0.1, 20, 0.1],
          ["g", "Gravity", "m/s²", 0.1, 25, 0.01],
        ].map(([key, label, unit, min, max, step]) => ({
          label,
          unit,
          min,
          max,
          step,
          get: () => getState()[key],
          set: (value) => {
            time = 0;
            change(key, value);
            notify();
          },
        })),
        getSnapshot() {
          const state = getState(),
            model = trajectory(state),
            points = Array.from({ length: 301 }, (_, i) => {
              const p = model.at((model.flight * i) / 300);
              return [p.x, p.y, 0];
            }),
            p = model.at(time);
          return {
            revision: [state.vx, state.vy, state.g, time].join(":"),
            time,
            axes: ["x", "height y", "z"].map((label) => ({
              label,
              unit: "m",
              dimension: "length",
            })),
            bounds: [
              [Math.min(0, model.range) - 1, Math.max(0, model.range) + 1],
              [-1, Math.max(2, model.peak * 1.2)],
              [-1, 1],
            ],
            lines: [{ label: "Analytical trajectory", points }],
            particles: [
              { point: [p.x, p.y, 0], label: "Projectile at current time" },
            ],
          };
        },
        subscribe: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
        isPlaying: () => playing,
        setPlaying(value) {
          stop();
          playing = value;
          if (playing) {
            if (time >= trajectory(getState()).flight) time = 0;
            raf = requestAnimationFrame(clock);
          }
          notify();
        },
        setSpeed: (v) => (rate = v),
        reset() {
          stop();
          time = 0;
          notify();
        },
      };
      view = engine.mount(slot, adapter);
    } catch (e) {
      slot.textContent =
        "The 3D renderer could not open. Return to the motion diagrams and try again.";
    }
  }
  spatial.onclick = () => open("motion");
  functions.onclick = () => open("functions");
  back.onclick = close;
  return {
    notify,
    dispose() {
      disposed = true;
      close();
      listeners.clear();
      workspace.removeEventListener("input", onParameter);
      workspace.removeEventListener("click", onParameter);
      controls.remove();
      slot.remove();
    },
  };
}
