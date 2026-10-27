import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  clamp,
  finitePoint,
  transform,
  surfaceGrid,
  format,
  streamline,
} from "./core.mjs";

const palettes = {
  dark: {
    background: "#0c1720",
    grid: "#28414f",
    text: "#dceaf2",
    line: "#92cbea",
  },
  light: {
    background: "#f2f6f8",
    grid: "#c1cfd7",
    text: "#203a49",
    line: "#185f88",
  },
};
export function colorRamp(value, lo, hi, light = false) {
  const t = clamp((value - lo) / (hi - lo || 1), 0, 1),
    a = new THREE.Color(light ? "#234e70" : "#294b75"),
    b = new THREE.Color(light ? "#2b939e" : "#80c4d2"),
    c = new THREE.Color(light ? "#a55a22" : "#edc58c");
  return t < 0.5 ? a.lerp(b, t * 2) : b.lerp(c, (t - 0.5) * 2);
}

export class GraphRenderer {
  constructor(host, { onPick, onStatus, onChange } = {}) {
    this.host = host;
    this.onPick = onPick;
    this.onStatus = onStatus;
    this.onChange = onChange;
    this.items = new Map();
    this.labels = [];
    this.mode = "3d";
    this.projection = "xy";
    this.theme = "dark";
    this.disposed = false;
    this.lost = false;
    this.samples = [];
    this.interacting = false;
    this.quality = 48;
    this.flatZoom=1;
    this.flatOffset=[0,0];
    this.canvas = document.createElement("canvas");
    this.canvas.className = "pv-canvas";
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute(
      "aria-label",
      "Interactive physics graph. Use the camera controls or inspect samples below.",
    );
    host.append(this.canvas);
    this.fallback = document.createElement("canvas");
    this.fallback.className = "pv-canvas pv-fallback";
    this.fallback.hidden = true;
    host.append(this.fallback);
    this.labelLayer = document.createElement("div");
    this.labelLayer.className = "pv-axis-labels";
    host.append(this.labelLayer);
    this.onLost = (e) => {
      e.preventDefault();
      this.lost = true;
      this.fallback.hidden = false;
      this.canvas.hidden = true;
      this.onStatus?.(
        "Graphics context lost. Your data is preserved in the 2D view.",
        true,
      );
      this.renderFallback();
    };
    this.onRestored = () => {
      if (this.disposed) return;
      this.lost = false;
      this.fallback.hidden = true;
      this.canvas.hidden = false;
      this.onStatus?.("3D graphics restored. Press Play when ready.");
      // Three's own restoration listener must rebuild GL state before drawing.
      this.restoreFrame=requestAnimationFrame(()=>{if(!this.disposed)this.draw();});
    };
    this.canvas.addEventListener("webglcontextlost", this.onLost);
    this.canvas.addEventListener("webglcontextrestored", this.onRestored);
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        powerPreference: "low-power",
      });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
      this.camera.up.set(0, 0, 1);
      this.camera.position.set(2.7, -3.5, 2.6);
      this.ortho = new THREE.OrthographicCamera(
        -1.5,
        1.5,
        1.5,
        -1.5,
        0.01,
        100,
      );
      this.ortho.up.set(0, 1, 0);
      this.ortho.position.set(0, 0, 5);
      this.controls = new OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = false;
      this.controls.enableZoom = false;
      this.controls.minDistance = 1.3;
      this.controls.maxDistance = 14;
      this.controls.addEventListener("change", () => {
        this.draw();
        this.onChange?.();
      });
      this.controls.addEventListener("start", () => (this.interacting = true));
      this.controls.addEventListener("end", () => (this.interacting = false));
      this.scene.add(new THREE.HemisphereLight(0xe9f5ff, 0x263b49, 2.1));
      const sun = new THREE.DirectionalLight(0xffffff, 2);
      sun.position.set(-3, -4, 7);
      this.scene.add(sun);
      this.dataGroup = new THREE.Group();
      this.scene.add(this.dataGroup);
      this.gridGroup = new THREE.Group();
      this.scene.add(this.gridGroup);
      this.setInteractive(false);
    } catch {
      this.renderer?.dispose();
      this.renderer = null;
      this.canvas.hidden = true;
      this.fallback.hidden = false;
      this.onStatus?.(
        "3D is unavailable on this device. The 2D view and numerical data remain available.",
      );
    }
    this.pointerStart = (e) => {
      this.down = { x: e.clientX, y: e.clientY };
    };
    this.pointerEnd = (e) => {
      if (
        !this.down ||
        Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 5
      )
        return;
      this.pick(e);
    };
    for (const c of [this.canvas, this.fallback]) {
      c.addEventListener("pointerdown", this.pointerStart);
      c.addEventListener("pointerup", this.pointerEnd);
    }
    this.key = (e) => {
      if (e.target !== this.canvas) return;
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "+",
          "=",
          "-",
          "Home",
          "Escape",
        ].includes(e.key)
      ) {
        e.preventDefault();
        if (e.key === "Escape") {
          this.setInteractive(false);
          this.onChange?.();
        } else if (e.key === "Home") this.resetCamera();
        else if (["+", "=", "-"].includes(e.key))
          this.zoom(e.key === "-" ? 1.15 : 1 / 1.15);
        else
          this.orbit(
            e.key === "ArrowLeft" ? -0.12 : e.key === "ArrowRight" ? 0.12 : 0,
            e.key === "ArrowUp" ? 0.12 : e.key === "ArrowDown" ? -0.12 : 0,
          );
      }
    };
    this.canvas.addEventListener("keydown", this.key);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }
  setInteractive(value) {
    this.interactive = !!value;
    if (this.controls) {
      this.controls.enabled = this.interactive && this.mode === "3d";
      this.controls.enableZoom = this.interactive;
      this.canvas.style.touchAction = this.interactive ? "none" : "pan-y";
    }
  }
  setMode(mode, projection = this.projection) {
    this.mode = mode;
    this.projection = projection;
    this.setInteractive(this.interactive);
    this.orient2D();
    this.draw();
  }
  orient2D() {
    if (!this.ortho) return;
    const c = this.ortho;
    c.up.set(0, 1, 0);
    if (this.projection === "xz") {
      c.position.set(0, -5, 0);
      c.up.set(0, 0, 1);
    } else if (this.projection === "yz") {
      c.position.set(5, 0, 0);
      c.up.set(0, 0, 1);
    } else c.position.set(0, 0, 5);
    c.lookAt(0, 0, 0);
    c.updateProjectionMatrix();
  }
  zoom(factor) {
    if(!this.renderer || this.lost){this.flatZoom=clamp(this.flatZoom/factor,.35,5);this.draw();return;}
    if (this.mode === "2d") {
      if (this.ortho) {
        this.ortho.zoom = clamp(this.ortho.zoom / factor, 0.35, 5);
        this.ortho.updateProjectionMatrix();
      }
    } else if (this.controls) {
      this.camera.position
        .sub(this.controls.target)
        .multiplyScalar(factor)
        .clampLength(1.3, 14)
        .add(this.controls.target);
      this.controls.update();
    }
    this.draw();
  }
  orbit(azimuth, elevation) {
    if (!this.controls || this.mode === "2d") return;
    const offset = this.camera.position.clone().sub(this.controls.target),
      q = new THREE.Quaternion().setFromUnitVectors(
        this.camera.up,
        new THREE.Vector3(0, 1, 0),
      );
    offset.applyQuaternion(q);
    const s = new THREE.Spherical().setFromVector3(offset);
    s.theta += azimuth;
    s.phi = clamp(s.phi - elevation, 0.08, Math.PI - 0.08);
    offset.setFromSpherical(s).applyQuaternion(q.invert());
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
    this.draw();
  }
  pan(dx, dy) {
    if(!this.renderer || this.lost){this.flatOffset[0]+=dx*50;this.flatOffset[1]-=dy*50;this.draw();return;}
    if (!this.controls) return;
    const camera = this.cameraNow();
    const right = new THREE.Vector3()
        .setFromMatrixColumn(camera.matrix, 0)
        .multiplyScalar(dx),
      up = new THREE.Vector3()
        .setFromMatrixColumn(camera.matrix, 1)
        .multiplyScalar(dy);
    const shift = right.add(up);
    camera.position.add(shift);
    if (this.mode === "3d") {
      this.controls.target.add(shift);
      this.controls.update();
    }
    this.draw();
  }
  resetCamera() {
    this.flatZoom=1;this.flatOffset=[0,0];
    if (this.camera) {
      this.camera.position.set(2.7, -3.5, 2.6);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
      this.ortho.zoom = 1;
      this.orient2D();
    }
    this.draw();
  }
  setTheme(theme) {
    this.theme = theme === "light" ? "light" : "dark";
    this.palette = palettes[this.theme];
    if (this.renderer) {
      this.renderer.setClearColor(this.palette.background);
      this.buildGrid();
    }
    if (this.snapshot) this.update(this.snapshot, this.quality, true);
  }
  remove(object) {
    object.traverse((o) => {
      o.geometry?.dispose();
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material?.dispose();
      if (o.isInstancedMesh) o.dispose();
    });
    object.removeFromParent();
  }
  buildGrid() {
    if (!this.gridGroup || !this.mapping) return;
    while (this.gridGroup.children.length)
      this.remove(this.gridGroup.children[0]);
    const positions = [];
    const lo = this.mapping.to(this.snapshot.bounds.map((b) => b[0]));
    const hi = this.mapping.to(this.snapshot.bounds.map((b) => b[1]));
    for (let i = 0; i <= 8; i++) {
      const x = lo[0] + ((hi[0] - lo[0]) * i) / 8,
        y = lo[1] + ((hi[1] - lo[1]) * i) / 8;
      positions.push(
        lo[0],
        y,
        lo[2],
        hi[0],
        y,
        lo[2],
        x,
        lo[1],
        lo[2],
        x,
        hi[1],
        lo[2],
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    this.gridGroup.add(
      new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({
          color: this.palette.grid,
          transparent: true,
          opacity: 0.65,
        }),
      ),
    );
    const axes = [
      [...lo, hi[0] + 0.12, lo[1], lo[2]],
      [hi[0], lo[1], lo[2], hi[0], hi[1] + 0.12, lo[2]],
      [...lo, lo[0], lo[1], hi[2] + 0.12],
    ];
    for (const a of axes) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
      this.gridGroup.add(
        new THREE.Line(
          g,
          new THREE.LineBasicMaterial({
            color: this.palette.text,
            transparent: true,
            opacity: 0.5,
          }),
        ),
      );
    }
  }
  buffer(geometry, key, values, size) {
    let a = geometry.getAttribute(key);
    if (!a || a.array.length !== values.length) {
      a = new THREE.Float32BufferAttribute(values, size);
      a.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(key, a);
    } else {
      a.array.set(values);
      a.needsUpdate = true;
    }
  }
  line(key, points, color) {
    let obj = this.items.get(key);
    if (!obj) {
      obj = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color }),
      );
      this.items.set(key, obj);
      this.dataGroup.add(obj);
    }
    obj.material.color.set(color);
    const values = [];
    for (const p of points) values.push(...this.mapping.to(p));
    this.buffer(obj.geometry, "position", values, 3);
    obj.geometry.computeBoundingSphere();
    return obj;
  }
  update(snapshot, quality = 48, force = false) {
    this.snapshot = snapshot;
    this.quality = quality;
    this.palette = palettes[this.theme];
    this.mapping = transform(
      snapshot.bounds,
      snapshot.axes.every(
        (a) => a.dimension === "length" && a.unit === snapshot.axes[0].unit,
      ),
      snapshot.displayScale,
    );
    this.samples = [];
    this.grid = null;
    const liveKeys = new Set();
    let lineIndex = 0;
    const lines = [...(snapshot.lines || [])];
    if (snapshot.field)
      for (const seed of (snapshot.seeds || []).slice(0, 30))
        lines.push({
          label: "Streamline",
          color: this.palette.line,
          points: streamline(snapshot.field, seed, snapshot.bounds),
        });
    this.lines = lines;
    for (const line of lines) {
      let segment = [];
      const flush = () => {
        if (segment.length > 1) {
          const key = "line" + lineIndex++;
          liveKeys.add(key);
          if (this.renderer)
            this.line(key, segment, line.color || this.palette.line);
        }
        segment = [];
      };
      line.points.forEach((p, i) => {
        if (!finitePoint(p)) {
          flush();
          return;
        }
        segment.push(p);
        this.samples.push({
          point: p,
          label: line.label || "Trajectory",
          index: i,
        });
      });
      flush();
    }
    if (snapshot.surface) {
      this.grid = surfaceGrid(
        snapshot.surface,
        Math.max(quality, snapshot.surface.minResolution || 0),
      );
      const { positions, valid, indices } = this.grid,
        finite = this.grid.values.filter(Number.isFinite);
      const lo = snapshot.surface.range?.[0] ?? (finite.length?Math.min(...finite):0),
        hi = snapshot.surface.range?.[1] ?? (finite.length?Math.max(...finite):1);
      this.range = [lo, hi];
      this.samples.push(
        ...positions.flatMap((p, i) =>
          valid[i]
            ? [
                {
                  point: p,
                  label: snapshot.surface.label || "Surface",
                  index: i,
                },
              ]
            : [],
        ),
      );
      if (this.renderer) {
        let mesh = this.items.get("surface");
        if (!mesh) {
          mesh = new THREE.Mesh(
            new THREE.BufferGeometry(),
            new THREE.MeshStandardMaterial({
              side: THREE.DoubleSide,
              roughness: 0.8,
              metalness: 0,
              vertexColors: true,
              transparent: true,
              opacity: 0.93,
              polygonOffset: true,
              polygonOffsetFactor: 1,
              polygonOffsetUnits: 1,
            }),
          );
          this.items.set("surface", mesh);
          this.dataGroup.add(mesh);
        }
        liveKeys.add("surface");
        const values = [],
          colors = [];
        positions.forEach((p, i) => {
          values.push(...this.mapping.to(p));
          const col = colorRamp(
            valid[i] ? p[2] : lo,
            lo,
            hi,
            this.theme === "light",
          );
          colors.push(col.r, col.g, col.b);
        });
        this.buffer(mesh.geometry, "position", values, 3);
        this.buffer(mesh.geometry, "color", colors, 3);
        const oldIndex = mesh.geometry.index;
        if (oldIndex && oldIndex.count === indices.length) {
          oldIndex.array.set(indices);
          oldIndex.needsUpdate = true;
        } else mesh.geometry.setIndex(indices);
        mesh.geometry.computeVertexNormals();
        mesh.geometry.computeBoundingSphere();
      }
    }
    const particles = (snapshot.particles || [])
      .filter((p) => finitePoint(p.point))
      .slice(0, 5000);
    particles.forEach((p, i) =>
      this.samples.push({
        point: p.point,
        label: p.label || "Particle",
        index: i,
      }),
    );
    if (this.renderer && particles.length) {
      let mesh = this.items.get("particles");
      if (!mesh || mesh.count !== particles.length) {
        if (mesh) this.remove(mesh);
        mesh = new THREE.InstancedMesh(
          new THREE.SphereGeometry(0.026, 10, 7),
          new THREE.MeshBasicMaterial({
            color: this.theme === "light" ? "#9d561b" : "#f1c78d",
          }),
          particles.length,
        );
        this.items.set("particles", mesh);
        this.dataGroup.add(mesh);
      }
      liveKeys.add("particles");
      mesh.material.color.set(this.theme === "light" ? "#9d561b" : "#f1c78d");
      const obj = new THREE.Object3D();
      particles.forEach((p, i) => {
        obj.position.set(...this.mapping.to(p.point));
        obj.updateMatrix();
        mesh.setMatrixAt(i, obj.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    const vectors = (snapshot.vectors || [])
      .filter(
        (v) =>
          finitePoint(v.origin) &&
          finitePoint(v.value) &&
          Math.hypot(...v.value) > 1e-10,
      )
      .slice(0, 1200);
    vectors.forEach((v, i) =>
      this.samples.push({
        point: v.origin,
        label: "Field vector",
        value: v.value,
        index: i,
      }),
    );
    if (this.renderer && vectors.length) {
      for (const kind of ["shaft", "head"]) {
        let mesh = this.items.get(kind);
        if (!mesh || mesh.count !== vectors.length) {
          if (mesh) this.remove(mesh);
          mesh = new THREE.InstancedMesh(
            kind === "head"
              ? new THREE.ConeGeometry(0.028, 0.09, 7)
              : new THREE.CylinderGeometry(0.007, 0.007, 1, 5),
            new THREE.MeshBasicMaterial({
              color: this.theme === "light" ? "#276e76" : "#a4d8d3",
            }),
            vectors.length,
          );
          this.items.set(kind, mesh);
          this.dataGroup.add(mesh);
        }
        liveKeys.add(kind);
        mesh.material.color.set(this.theme === "light" ? "#276e76" : "#a4d8d3");
        const obj = new THREE.Object3D(),
          up = new THREE.Vector3(0, 1, 0);
        vectors.forEach((v, i) => {
          const start = new THREE.Vector3(...this.mapping.to(v.origin)),
            delta = new THREE.Vector3(
              ...v.value.map((x, j) => x * this.mapping.scale[j]),
            ).normalize();
          const length = 0.16;
          obj.position
            .copy(start)
            .addScaledVector(delta, kind === "head" ? length : length / 2);
          obj.quaternion.setFromUnitVectors(up, delta);
          obj.scale.set(1, kind === "head" ? 1 : length, 1);
          obj.updateMatrix();
          mesh.setMatrixAt(i, obj.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
    if (this.renderer) {
      for (const [key, obj] of this.items)
        if (!liveKeys.has(key)) {
          this.remove(obj);
          this.items.delete(key);
        }
      if (
        force ||
        this.axisKey !== JSON.stringify([snapshot.axes, snapshot.bounds])
      )
        this.buildGrid();
    }
    const axisKey = JSON.stringify([snapshot.axes, snapshot.bounds]);
    if (axisKey !== this.axisKey) {
      this.axisKey = axisKey;
      this.updateAxisLabels();
    }
    this.draw();
  }
  updateAxisLabels() {
    if (!this.snapshot) return;
    this.labelLayer.replaceChildren();
    this.labels = [];
    const lo = this.mapping.to(this.snapshot.bounds.map((b) => b[0]));
    const hi = this.mapping.to(this.snapshot.bounds.map((b) => b[1]));
    for (let i = 0; i < 3; i++) {
      const axis = this.snapshot.axes[i],
        position = [i === 1 ? hi[0] : lo[0], lo[1], lo[2]];
      position[i] = hi[i] + 0.18;
      const el = document.createElement("span");
      el.textContent = axis.label + (axis.unit ? " / " + axis.unit : "");
      el.className = "pv-axis-name";
      this.labelLayer.append(el);
      this.labels.push({ el, position, axis: i });
      for (const end of [0, 1]) {
        const p = [i === 1 ? hi[0] : lo[0], lo[1], lo[2]];
        p[i] = end ? hi[i] : lo[i];
        if (!end && i > 0) continue;
        const tick = document.createElement("span");
        tick.className = "pv-axis-tick";
        tick.textContent = format(this.snapshot.bounds[i][end]);
        this.labelLayer.append(tick);
        this.labels.push({ el: tick, position: p, axis: i });
      }
    }
  }
  cameraNow() {
    return this.mode === "2d" ? this.ortho : this.camera;
  }
  draw() {
    if (this.disposed || !this.snapshot) return;
    if (!this.renderer || this.lost) {
      this.labelLayer.hidden = true;
      this.renderFallback();
      return;
    }
    this.labelLayer.hidden = false;
    const camera = this.cameraNow();
    this.renderer.render(this.scene, camera);
    const rect = this.host.getBoundingClientRect();
    for (const { el, position, axis } of this.labels) {
      const v = new THREE.Vector3(...position).project(camera);
      el.style.left =
        clamp(((v.x + 1) / 2) * rect.width, 55, rect.width - 80) + "px";
      el.style.top =
        clamp(((1 - v.y) / 2) * rect.height, 14, rect.height - 28) + "px";
      el.hidden =
        v.z > 1 ||
        (this.mode === "2d" &&
          axis ===
            (this.projection === "xy" ? 2 : this.projection === "xz" ? 1 : 0));
    }
  }
  resize() {
    const r = this.host.getBoundingClientRect();
    this.width = Math.max(1, r.width);
    this.height = Math.max(1, r.height);
    if (this.renderer) {
      this.renderer.setSize(this.width, this.height, false);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      const aspect = this.width / this.height;
      const vertical = 1.45 / Math.min(1, aspect);
      this.ortho.top = vertical;
      this.ortho.bottom = -vertical;
      this.ortho.left = -vertical * aspect;
      this.ortho.right = vertical * aspect;
      this.ortho.updateProjectionMatrix();
    }
    this.draw();
  }
  projectionIndices() {
    return this.projection === "xz"
      ? [0, 2]
      : this.projection === "yz"
        ? [1, 2]
        : [0, 1];
  }
  flatPoint(p) {
    const [a, b] = this.projectionIndices(),
      v = this.mapping.to(p);
    const scale = Math.min(this.width - 85, this.height - 80) / 2 * this.flatZoom;
    return [this.width / 2 + v[a] * scale+this.flatOffset[0], this.height / 2 - v[b] * scale+this.flatOffset[1]];
  }
  renderFallback() {
    if (!this.snapshot) return;
    const c = this.fallback,
      dpr = Math.min(devicePixelRatio || 1, 1.5),
      w = this.width,
      h = this.height;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = this.palette.background;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = this.palette.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(45 + (i * (w - 85)) / 8, 40);
      ctx.lineTo(45 + (i * (w - 85)) / 8, h - 40);
      ctx.moveTo(45, 40 + (i * (h - 80)) / 8);
      ctx.lineTo(w - 40, 40 + (i * (h - 80)) / 8);
      ctx.stroke();
    }
    if (this.grid) {
      for (let i = 0; i < this.grid.indices.length; i += 3) {
        const pts = this.grid.indices
          .slice(i, i + 3)
          .map((j) => this.grid.positions[j]);
        ctx.fillStyle =
          "#" +
          colorRamp(
            pts.reduce((sum, p) => sum + p[2], 0) / 3,
            ...this.range,
            this.theme === "light",
          ).getHexString();
        ctx.beginPath();
        pts.forEach((p, j) => {
          const xy = this.flatPoint(p);
          j ? ctx.lineTo(...xy) : ctx.moveTo(...xy);
        });
        ctx.closePath();
        ctx.fill();
      }
    }
    for (const line of this.lines || []) {
      ctx.strokeStyle = line.color || this.palette.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let pen = false;
      for (const p of line.points) {
        if (!finitePoint(p)) {
          pen = false;
          continue;
        }
        const [x, y] = this.flatPoint(p);
        pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
    }
    for (const vector of this.snapshot.vectors || []) {
      if (!finitePoint(vector.origin) || !finitePoint(vector.value)) continue;
      const [a, b] = this.projectionIndices(),
        start = this.flatPoint(vector.origin);
      const dx = vector.value[a] * this.mapping.scale[a],
        dy = -vector.value[b] * this.mapping.scale[b],
        length = Math.hypot(dx, dy);
      if (length < 1e-10) continue;
      const ux = dx / length,
        uy = dy / length,
        x = start[0] + ux * 14,
        y = start[1] + uy * 14;
      ctx.strokeStyle = this.palette.line;
      ctx.beginPath();
      ctx.moveTo(...start);
      ctx.lineTo(x, y);
      ctx.lineTo(x - 5 * ux - 3 * uy, y - 5 * uy + 3 * ux);
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5 * ux + 3 * uy, y - 5 * uy - 3 * ux);
      ctx.stroke();
    }
    ctx.fillStyle = this.theme === "light" ? "#9d561b" : "#f1c78d";
    for (const particle of this.snapshot.particles || []) {
      if (!finitePoint(particle.point)) continue;
      const [x, y] = this.flatPoint(particle.point);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    const [a, b] = this.projectionIndices();
    ctx.fillStyle = this.palette.text;
    ctx.font = "12px system-ui";
    ctx.fillText(
      this.snapshot.axes[a].label + " / " + this.snapshot.axes[a].unit,
      45,
      h - 12,
    );
    ctx.fillText(
      this.snapshot.axes[b].label + " / " + this.snapshot.axes[b].unit,
      45,
      22,
    );
    ctx.fillText(
      this.snapshot.bounds[a].map(format).join(" … "),
      w - 170,
      h - 12,
    );
    ctx.fillText(this.snapshot.bounds[b].map(format).join(" … "), w - 170, 22);
  }
  pick(event) {
    if (!this.snapshot) return;
    const rect = this.host.getBoundingClientRect(),
      px = event.clientX - rect.left,
      py = event.clientY - rect.top;
    let best = null,
      distance = 24;
    if (this.renderer && !this.lost) {
      const ray = new THREE.Raycaster();
      ray.params.Line.threshold = 0.025;
      ray.setFromCamera(
        new THREE.Vector2(
          (px / this.width) * 2 - 1,
          1 - (py / this.height) * 2,
        ),
        this.cameraNow(),
      );
      const surface = this.items.get("surface");
      if (surface) {
        const hit = ray.intersectObject(surface)[0];
        if (hit) {
          const p = this.mapping.from(hit.point.toArray());
          const z = this.snapshot.surface.sample(p[0], p[1]);
          if (Number.isFinite(z)) {
            this.onPick?.({
              point: [p[0], p[1], z],
              label: "Surface · evaluated at probe",
              index: -1,
            });
            return;
          }
        }
      }
    }
    for (const sample of this.samples) {
      let xy;
      if (this.renderer && !this.lost) {
        const v = new THREE.Vector3(...this.mapping.to(sample.point)).project(
          this.cameraNow(),
        );
        if (v.z > 1) continue;
        xy = [((v.x + 1) / 2) * this.width, ((1 - v.y) / 2) * this.height];
      } else xy = this.flatPoint(sample.point);
      const d = Math.hypot(xy[0] - px, xy[1] - py);
      if (d < distance) {
        best = sample;
        distance = d;
      }
    }
    if (best) this.onPick?.(best);
  }
  stats() {
    return {
      webgl: !!this.renderer && !this.lost,
      mode: this.mode,
      quality: this.quality,
      samples: this.samples.length,
      objects: this.items.size,
      calls: this.renderer?.info.render.calls || 0,
      memory: this.renderer ? { ...this.renderer.info.memory } : null,
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.restoreFrame);
    this.observer.disconnect();
    this.controls?.dispose();
    for (const obj of this.items.values()) this.remove(obj);
    this.items.clear();
    if (this.gridGroup)
      while (this.gridGroup.children.length)
        this.remove(this.gridGroup.children[0]);
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
    this.canvas.removeEventListener("keydown", this.key);
    for (const c of [this.canvas, this.fallback]) {
      c.removeEventListener("pointerdown", this.pointerStart);
      c.removeEventListener("pointerup", this.pointerEnd);
    }
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.host.replaceChildren();
  }
}
