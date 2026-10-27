// Mathematical coordinates are right-handed, Z-up. Display scaling is separate.
export const finitePoint = (p) =>
  Array.isArray(p) && p.length >= 3 && p.slice(0, 3).every(Number.isFinite);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function cartesian(p, system = "cartesian") {
  if (!finitePoint(p))
    throw new RangeError("Three finite coordinates are required.");
  const [r, a, b] = p;
  if (system === "cylindrical") return [r * Math.cos(a), r * Math.sin(a), b];
  if (system === "spherical")
    return [
      r * Math.sin(a) * Math.cos(b),
      r * Math.sin(a) * Math.sin(b),
      r * Math.cos(a),
    ];
  return p.slice(0, 3);
}
export function coordinates([x, y, z], system = "cartesian") {
  const rho = Math.hypot(x, y),
    r = Math.hypot(x, y, z);
  if (system === "cylindrical")
    return [rho, rho > 1e-14 ? Math.atan2(y, x) : null, z];
  if (system === "spherical")
    return [
      r,
      r > 1e-14 ? Math.acos(clamp(z / r, -1, 1)) : null,
      rho > 1e-14 ? Math.atan2(y, x) : null,
    ];
  return [x, y, z];
}
export function difference(a, b, axes) {
  const delta = b.map((v, i) => v - a[i]);
  const spatial =
    axes.length === 3 &&
    axes.every((x) => x.dimension === "length" && x.unit === axes[0].unit);
  return {
    delta,
    distance: spatial ? Math.hypot(...delta) : null,
    unit: spatial ? axes[0].unit : null,
  };
}
export function transform(bounds, uniform = false, displayScale = [1, 1, 1]) {
  const center = bounds.map(([lo, hi]) => (lo + hi) / 2),
    span = bounds.map(([lo, hi]) => Math.max(1e-9, hi - lo));
  const baseScale = uniform
    ? span.map(() => 2 / Math.max(...span))
    : span.map((s) => 2 / s);
  const scale = baseScale.map(
    (s, i) => s * clamp(displayScale[i] ?? 1, 0.1, 2),
  );
  return {
    to: (p) => p.map((v, i) => (v - center[i]) * scale[i]),
    from: (p) => p.map((v, i) => v / scale[i] + center[i]),
    scale,
  };
}
export function rk4(f, p, h) {
  const k1 = f(p),
    k2 = f(p.map((v, i) => v + (h * k1[i]) / 2)),
    k3 = f(p.map((v, i) => v + (h * k2[i]) / 2)),
    k4 = f(p.map((v, i) => v + h * k3[i]));
  return p.map((v, i) => v + (h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) / 6);
}
// Direction curves, not trajectories: dt is arc length in the field's coordinates.
export function streamline(
  field,
  seed,
  bounds,
  { step = 0.04, maxSteps = 600, tolerance = 1e-4 } = {},
) {
  const direction = (p) => {
    const v = field(...p),
      m = Math.hypot(...v);
    return m > 1e-10 && Number.isFinite(m) ? v.map((x) => x / m) : [0, 0, 0];
  };
  let p = seed.slice(),
    h = step;
  const points = [p];
  for (let i = 0; i < Math.min(2000, maxSteps); i++) {
    if (Math.hypot(...direction(p)) < 0.5) break;
    let one = rk4(direction, p, h),
      half = rk4(direction, rk4(direction, p, h / 2), h / 2),
      err = Math.hypot(...one.map((v, j) => v - half[j]));
    if (err > tolerance && h > step / 32) {
      h /= 2;
      i--;
      continue;
    }
    if (
      !finitePoint(half) ||
      half.some((v, j) => v < bounds[j][0] || v > bounds[j][1])
    )
      break;
    if (Math.hypot(...half.map((v, j) => v - p[j])) < 1e-8) break;
    points.push(half);
    p = half;
    if (err < tolerance / 16) h = Math.min(step, h * 2);
  }
  return points;
}
export function surfaceGrid(surface, n = 48) {
  n = clamp(Math.round(n), 8, 256);
  const positions = [],
    values = [],
    valid = [],
    indices = [];
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const x =
        surface.domain[0][0] +
        (i / n) * (surface.domain[0][1] - surface.domain[0][0]);
      const y =
        surface.domain[1][0] +
        (j / n) * (surface.domain[1][1] - surface.domain[1][0]);
      let z;
      try {
        z = surface.sample(x, y);
      } catch {
        z = NaN;
      }
      const good = Number.isFinite(z) && Math.abs(z) < 1e12;
      positions.push([x, y, good ? z : 0]);
      values.push(z);
      valid.push(good);
    }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i,
        b = a + 1,
        c = a + n + 1,
        d = c + 1;
      if ([a, b, c, d].every((k) => valid[k])) {
        indices.push(a, b, c, b, d, c);
      }
    }
  return { positions, values, valid, indices };
}
export function sampleCurve(fn, [lo, hi], count = 600) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo)
    throw new RangeError("Use an increasing finite parameter interval.");
  count = clamp(count, 2, 4000);
  const segments = [];
  let line = [];
  for (let i = 0; i <= count; i++) {
    let p;
    try {
      p = fn(lo + ((hi - lo) * i) / count);
    } catch {
      p = null;
    }
    if (!finitePoint(p) || p.some((v) => Math.abs(v) > 1e8)) {
      if (line.length > 1) segments.push(line);
      line = [];
    } else line.push(p);
  }
  if (line.length > 1) segments.push(line);
  return segments;
}
export function format(v) {
  return v === null || !Number.isFinite(v)
    ? "undefined"
    : Math.abs(v) < 1e-10
      ? "0"
      : Number(v.toPrecision(5)).toLocaleString("en-US", {
          maximumSignificantDigits: 5,
        });
}
// Stable fixed steps; dropping excessive wall-time does not increase solver dt.
export class FixedClock {
  constructor(h, step) {
    this.h = h;
    this.step = step;
    this.accumulator = 0;
    this.time = 0;
    this.speed = 1;
    this.playing = false;
  }
  advance(dt) {
    if (!this.playing) return 0;
    this.accumulator += clamp(dt, 0, 0.1) * this.speed;
    let n = 0;
    while (this.accumulator + 1e-12 >= this.h && n < 200) {
      this.step();
      this.time += this.h;
      this.accumulator -= this.h;
      n++;
    }
    return n;
  }
  reset() {
    this.accumulator = 0;
    this.time = 0;
  }
}
export function validateSnapshot(s) {
  if (
    !s ||
    !Array.isArray(s.axes) ||
    s.axes.length !== 3 ||
    !Array.isArray(s.bounds) ||
    s.bounds.length !== 3 ||
    !s.bounds.every(
      (b) => b.length === 2 && b.every(Number.isFinite) && b[1] > b[0],
    )
  )
    throw new Error("Invalid graph axes or bounds.");
  for (const a of s.axes)
    if (typeof a.label !== "string" || typeof a.unit !== "string")
      throw new Error("Axes require names and units.");
  return s;
}
