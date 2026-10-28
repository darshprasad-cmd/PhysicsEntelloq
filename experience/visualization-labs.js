/* Rendering adapters only. Experiment closures retain their model and state. */
var PhysicsViz = (function () {
  "use strict";
  var bindings = [],
    active = null,
    graphWorkspace = null,
    modulePromise = null,
    moduleAttempt = 0,
    serial = 0;
  function engine() {
    if (!modulePromise) {
      // Browsers cache failed module fetches. A deliberate retry needs a new URL.
      var url = "./assets/physics-visualization/engine.mjs";
      if (moduleAttempt) url += "?retry=" + moduleAttempt;
      moduleAttempt++;
      modulePromise = import(url).catch(function (e) {
        modulePromise = null;
        throw e;
      });
    }
    return modulePromise;
  }
  function connect(host, spec) {
    if (
      !host ||
      host.matches(".thumb,.xg-thumb,.xg-viz,.xg-preview") ||
      host.closest(".lab-card,.xg-card")
    )
      return null;
    var listeners = new Set(),
      binding = {
        host: host,
        spec: spec,
        alive: true,
        open: false,
        playing: false,
        speed: 1,
        raf: 0,
        clock: 0,
        notify: function () {
          listeners.forEach(function (fn) {
            fn();
          });
        },
      };
    binding.entry = document.createElement("div");
    binding.entry.className = "pv-entry";
    var copy = document.createElement("span");
    copy.textContent = "Inspect this model in 3D";
    var button = document.createElement("button");
    button.className = "mini-b";
    button.type = "button";
    button.textContent = "Open 3D view ↗";
    binding.entry.append(copy, button);
    var entryHost =
      host.id === "lf-stage" ? document.getElementById("lf-ctl") : host;
    (entryHost || host).prepend(binding.entry);
    binding.adapter = Object.assign({}, spec, {
      getSnapshot: spec.getSnapshot,
      subscribe: function (fn) {
        listeners.add(fn);
        return function () {
          listeners.delete(fn);
        };
      },
    });
    button.onclick = function () {
      open(binding);
    };
    binding.button = button;
    binding.dispose = function () {
      if (!binding.alive) return;
      binding.alive = false;
      cancelAnimationFrame(binding.raf);
      binding.adapter.gestures && binding.adapter.gestures.stop();
      if (active === binding) close();
      binding.entry.remove();
      listeners.clear();
    };
    bindings.push(binding);
    return binding;
  }
  function close() {
    if (!active) return;
    var b = active;
    active = null;
    b.open = false;
    b.generation = ++serial;
    b.viewer && b.viewer.dispose();
    b.viewer = null;
    if (b.overlay) b.overlay.remove();
    if (b.inertElements)
      b.inertElements.forEach(function (pair) {
        pair[0].inert = pair[1];
      });
    b.inertElements = null;
    b.overlay = null;
    delete document.body.dataset.physicsGraph;
    b.button && b.button.isConnected && b.button.focus({ preventScroll: true });
  }
  async function open(binding) {
    close();
    if (!binding.alive || !binding.host.isConnected) return;
    active = binding;
    document.body.dataset.physicsGraph = "open";
    binding.open = true;
    if (curView === "sandbox" && Sandbox.stopGraphHandInput)
      Sandbox.stopGraphHandInput();
    var generation = ++serial;
    binding.generation = generation;
    var overlay = document.createElement("section");
    overlay.className = "pv-lab-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute(
      "aria-label",
      binding.spec.title || "Physics visualization",
    );
    var back = document.createElement("button");
    back.className = "mini-b pv-back";
    back.textContent = "← Back to experiment";
    back.onclick = close;
    overlay.append(back);
    var slot = document.createElement("div");
    slot.className = "pv-lab-slot";
    slot.textContent = "Loading scientific renderer…";
    overlay.append(slot);
    document.body.append(overlay);
    binding.inertElements = Array.from(document.body.children)
      .filter(function (node) {
        return node !== overlay;
      })
      .map(function (node) {
        var was = node.inert;
        node.inert = true;
        return [node, was];
      });
    binding.overlay = overlay;
    back.focus();
    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
      if (e.key === "Tab") {
        e.stopPropagation();
        var focusable = Array.from(
          overlay.querySelectorAll(
            'button,input,select,summary,[tabindex="0"]',
          ),
        ).filter(function (el) {
          return !el.disabled && el.getClientRects().length;
        });
        var first = focusable[0],
          last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    try {
      var lib = await engine();
      if (
        !binding.alive ||
        active !== binding ||
        binding.generation !== generation
      )
        return;
      slot.textContent = "";
      binding.viewer = binding.spec.explorer
        ? lib.mountExplorer(slot, {
            compileExpression: binding.spec.compileExpression,
          })
        : lib.mount(slot, binding.adapter);
    } catch (e) {
      if (active === binding) {
        slot.textContent =
          "The 3D renderer could not load. Your experiment is unchanged. ";
        var retry = document.createElement("button");
        retry.className = "mini-b";
        retry.textContent = "Try again";
        retry.onclick = function () {
          open(binding);
        };
        slot.append(retry);
      }
    }
  }
  function refresh(host) {
    bindings.forEach(function (b) {
      if (b.alive && b.host === host) b.notify();
    });
  }
  // The model owner calls this instead of its previous frame loop. The original
  // step function and fixed dt are unchanged; only wall-time scheduling changes.
  function drive(step, draw, opts) {
    var b = bindings[bindings.length - 1];
    if (!opts.viz || !b || !b.alive) return false;
    var h = opts.h || 0.006,
      acc = 0,
      last = 0;
    for (var i = 0; i < (opts.warm || 0); i++) step();
    b.clock = (opts.warm || 0) * h;
    b.playing = !(typeof STILL !== "undefined" && STILL);
    b.adapter.isPlaying = function () {
      return b.playing;
    };
    b.adapter.setPlaying = function (v) {
      b.playing = !!v;
      last = 0;
      b.notify();
    };
    b.adapter.setSpeed = function (v) {
      if ([0.25, 0.5, 1, 2].indexOf(v) >= 0) b.speed = v;
    };
    var reset = b.spec.reset;
    if (reset)
      b.adapter.reset = function () {
        reset();
        b.clock = 0;
        acc = 0;
        last = 0;
        draw();
        b.notify();
      };
    function frame(now) {
      if (!b.alive || !b.host.isConnected) {
        b.dispose();
        return;
      }
      var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (document.hidden) {
        b.playing = false;
        acc = 0;
        last = 0;
      }
      if (b.playing) {
        acc += dt * b.speed;
        for (var n = 0; acc + 1e-12 >= h && n < 200; n++) {
          step();
          acc -= h;
          b.clock += h;
        }
      }
      if (!b.open) draw();
      b.notify();
      b.raf = requestAnimationFrame(frame);
    }
    b.resumeFrame = function () {
      last = 0;
      cancelAnimationFrame(b.raf);
      b.raf = requestAnimationFrame(frame);
    };
    draw();
    b.raf = requestAnimationFrame(frame);
    return true;
  }
  function dispose() {
    close();
    if (graphWorkspace) graphWorkspace.dispose();
    graphWorkspace = null;
    bindings.forEach(function (b) {
      b.dispose();
    });
    bindings = [];
  }
  function latestTime() {
    var b = bindings[bindings.length - 1];
    return b ? b.clock : 0;
  }
  function run(host, step, draw, settings) {
    settings = settings || {};
    var b = bindings.find(function (item) {
      return item.host === host && item.alive;
    });
    if (!b) return { stop: function () {} };
    var last = 0,
      acc = 0,
      h = 1 / 60;
    b.playing = !(typeof STILL !== "undefined" && STILL);
    b.adapter.isPlaying = function () {
      return b.playing;
    };
    b.adapter.setPlaying = function (v) {
      b.playing = !!v;
      last = 0;
      acc = 0;
      b.notify();
    };
    b.adapter.setSpeed = function (v) {
      if ([0.25, 0.5, 1, 2].indexOf(v) >= 0) b.speed = v;
    };
    if (settings.reset)
      b.adapter.reset = function () {
        settings.reset();
        last = 0;
        acc = 0;
        draw();
        b.notify();
      };
    function frame(now) {
      if (!b.alive || !host.isConnected) {
        b.dispose();
        return;
      }
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (document.hidden) {
        b.playing = false;
        last = 0;
      }
      if (b.playing) {
        acc += dt * b.speed;
        for (var n = 0; acc + 1e-12 >= h && n < 12; n++) {
          step();
          acc -= h;
        }
      }
      if (!b.open) draw();
      b.notify();
      b.raf = requestAnimationFrame(frame);
    }
    b.resumeFrame = function () {
      last = 0;
      cancelAnimationFrame(b.raf);
      b.raf = requestAnimationFrame(frame);
    };
    draw();
    b.raf = requestAnimationFrame(frame);
    return { stop: b.dispose };
  }
  function parameter(label, selector, unit) {
    return {
      label: label,
      unit: unit || "",
      min: Number(document.querySelector(selector).min),
      max: Number(document.querySelector(selector).max),
      step: Number(document.querySelector(selector).step) || 0.1,
      get: function () {
        return Number(document.querySelector(selector).value);
      },
      set: function (v) {
        var input = document.querySelector(selector);
        if (input) {
          input.value = v;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          bindings.forEach(function (b) {
            b.notify();
          });
        }
      },
    };
  }
  function hands() {
    var on = false,
      previous = null,
      cam = { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1 },
      raf = 0,
      commands = null,
      last = { x: 0, y: 0, z: 1 };
    function stop() {
      if (!on) return;
      on = false;
      cancelAnimationFrame(raf);
      UniHands.stop();
      UniHands.attach(previous);
      previous = null;
    }
    return {
      active: function () {
        return on && UniHands.isOn();
      },
      start: async function (actions) {
        if (typeof UniHands === "undefined")
          throw Error("Hand tracking is unavailable.");
        if (curView === "sandbox")
          throw Error(
            "Sandbox keeps ownership of hand manipulation. Use the normal graph controls here.",
          );
        commands = actions;
        previous = UniHands.bindings();
        UniHands.stop();
        on = true;
        cam = { x: 0, y: 0, z: 1, tx: 0, ty: 0, tz: 1 };
        last = { x: 0, y: 0, z: 1 };
        function noop() {}
        UniHands.attach({
          cam: cam,
          size: function () {
            return [innerWidth, innerHeight];
          },
          getHover: function () {
            return null;
          },
          getSel: function () {
            return null;
          },
          nodeAt: function () {
            return null;
          },
          hideCard: noop,
          setHover: noop,
          flyTo: noop,
          showCard: noop,
          redraw: noop,
        });
        UniHands.start();
        try {
          await new Promise(function (resolve, reject) {
            var start = Date.now();
            function check() {
              if (!on) return reject(Error("Camera navigation cancelled."));
              if (!UniHands.isOn())
                return reject(
                  Error(
                    "Camera access was denied or hand tracking could not start.",
                  ),
                );
              if (UniHands.ready()) return resolve();
              if (Date.now() - start > 20000)
                return reject(
                  Error(
                    "Camera startup timed out. You can retry or use the normal controls.",
                  ),
                );
              setTimeout(check, 100);
            }
            check();
          });
        } catch (e) {
          stop();
          throw e;
        }
        function update() {
          if (!on) return;
          if (!UniHands.isOn()) {
            stop();
            return;
          }
          cam.x = cam.tx;
          cam.y = cam.ty;
          cam.z = cam.tz;
          commands.orbit(
            Math.max(-0.12, Math.min(0.12, (cam.x - last.x) * 0.001)),
            Math.max(-0.12, Math.min(0.12, (cam.y - last.y) * 0.001)),
          );
          if (cam.z !== last.z)
            commands.zoom(Math.max(0.9, Math.min(1.1, last.z / cam.z)));
          last = { x: cam.x, y: cam.y, z: cam.z };
          raf = requestAnimationFrame(update);
        }
        update();
      },
      stop: stop,
    };
  }
  var goBefore = go;
  go = function (v, id) {
    dispose();
    return goBefore(v, id);
  };
  var labBefore = viewLab;
  viewLab = function () {
    dispose();
    return labBefore.apply(this, arguments);
  };
  var theoryOpen = Theory.open;
  Theory.open = function () {
    dispose();
    return theoryOpen.apply(this, arguments);
  };
  var fullClose = closeLabFull;
  closeLabFull = function () {
    dispose();
    return fullClose.apply(this, arguments);
  };
  var grapherMount = Grapher.mount;
  Grapher.mount = function (host) {
    host = typeof host === "string" ? document.querySelector(host) : host;
    if (!host) return;
    if (graphWorkspace) graphWorkspace.dispose();
    // Lab > Graphs is the workspace itself, not a link to a modal elsewhere.
    var shell = document.createElement("section");
    shell.className = "pv-graph-section";
    shell.setAttribute("aria-label", "Graphing workspace");
    shell.innerHTML =
      '<div class="pv-graph-bar"><div role="tablist" aria-label="Graphing tools">' +
      '<button type="button" role="tab" id="pv-graph-tab-3d" aria-controls="pv-graph-3d" aria-selected="true">3D graphs</button>' +
      '<button type="button" role="tab" id="pv-graph-tab-2d" aria-controls="pv-graph-2d" aria-selected="false" tabindex="-1">2D curves</button>' +
      '</div><p>Plot a surface. Trace a curve. Inspect every coordinate.</p></div>' +
      '<div id="pv-graph-3d" role="tabpanel" aria-labelledby="pv-graph-tab-3d"></div>' +
      '<div id="pv-graph-2d" role="tabpanel" aria-labelledby="pv-graph-tab-2d" hidden></div>';
    host.replaceChildren(shell);
    var tabs = Array.from(shell.querySelectorAll('[role="tab"]')),
      spatial = shell.querySelector("#pv-graph-3d"),
      planar = shell.querySelector("#pv-graph-2d"),
      selected = 0,
      viewer = null,
      planarMounted = false,
      alive = true,
      loading = false,
      generation = 0;
    function choose(index) {
      selected = index;
      tabs.forEach(function (tab, i) {
        tab.setAttribute("aria-selected", String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
      });
      spatial.hidden = index !== 0;
      planar.hidden = index !== 1;
      if (index === 0) loadSpatial();
      else if (!planarMounted) {
        // Mount the existing parser, sliders and canvas only at a visible size.
        // Keep its DOM alive across tab switches so entered expressions survive.
        grapherMount.call(Grapher, planar);
        planarMounted = true;
      }
    }
    async function loadSpatial() {
      if (viewer || loading || !alive) return;
      loading = true;
      var token = ++generation;
      spatial.setAttribute("aria-busy", "true");
      var status = document.createElement("p");
      status.className = "pv-graph-status";
      status.setAttribute("role", "status");
      status.textContent = "Loading 3D graphs… Your 2D tools are available beside this tab.";
      spatial.replaceChildren(status);
      try {
        var lib = await engine();
        if (!alive || token !== generation || !host.isConnected) return;
        // A fast switch to 2D must not create a hidden WebGL canvas.
        if (selected !== 0) return;
        spatial.replaceChildren();
        viewer = lib.mountExplorer(spatial);
        var equations = document.createElement("details"),
          summary = document.createElement("summary");
        equations.className = "pv-graph-equations";
        equations.open = host.getBoundingClientRect().width > 600;
        summary.textContent = "Equations & domain";
        equations.append(summary, spatial.querySelector(".pv-expressions"));
        spatial.prepend(equations);
      } catch (e) {
        if (!alive || token !== generation) return;
        status.textContent = "3D graphs could not load. Retry, or use the 2D curves tab.";
        var retry = document.createElement("button");
        retry.type = "button";
        retry.className = "mini-b";
        retry.textContent = "Retry 3D graphs";
        retry.onclick = loadSpatial;
        spatial.replaceChildren(status, retry);
      } finally {
        if (alive && token === generation) {
          loading = false;
          spatial.removeAttribute("aria-busy");
        }
      }
    }
    tabs.forEach(function (tab, i) {
      tab.onclick = function () { choose(i); };
      tab.onkeydown = function (event) {
        var next = event.key === "Home" ? 0 : event.key === "End" ? 1 :
          ["ArrowLeft", "ArrowRight"].includes(event.key) ? 1 - i : null;
        if (next === null) return;
        event.preventDefault();
        choose(next);
        tabs[next].focus();
      };
    });
    graphWorkspace = {
      dispose: function () {
        if (!alive) return;
        alive = false;
        generation++;
        if (viewer) viewer.dispose();
        viewer = null;
        if (planarMounted) Grapher.stop();
        shell.remove();
      },
    };
    choose(0);
    return graphWorkspace;
  };
  var sandboxMount = Sandbox.mount;
  Sandbox.mount = function (host) {
    var result = sandboxMount.apply(this, arguments);
    connect(host, {
      title: "Sandbox trajectories",
      subtitle: "Your live experiment, viewed from another angle.",
      description:
        "Read-only coordinates and recorded trails from the existing Sandbox. Dynamics remain planar at z = 0. Sandbox y increases downwards. Cat’s Cradle uses centimetres; other scenes retain their model units. Hand manipulation stays in the original workspace; no camera control is captured by this inspector.",
      getSnapshot: Sandbox.graphSnapshot,
    });
    return result;
  };
  document.addEventListener("input", function () {
    bindings.forEach(function (b) {
      b.notify();
    });
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden)
      bindings.forEach(function (b) {
        b.playing = false;
        cancelAnimationFrame(b.raf);
        if (b.adapter.gestures) b.adapter.gestures.stop();
      });
    else
      bindings.forEach(function (b) {
        if (b.alive && b.resumeFrame) b.resumeFrame();
      });
  });
  addEventListener("pagehide", dispose);
  return {
    connect: connect,
    drive: drive,
    run: run,
    refresh: refresh,
    dispose: dispose,
    time: latestTime,
    parameter: parameter,
    hands: hands,
    open: open,
    active: function () {
      return active;
    },
  };
})();
