import type { ModelConfig, Sample } from "../types";

export const BOUNCE_RADIUS = 0.08;

export interface ModelFacts {
  solver: string;
  equation: string;
  assumptions: string[];
  smallAnglePeriod?: number;
  impactTime?: number;
}

function finiteInRange(
  name: string,
  value: number,
  min: number,
  max: number,
): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(
      `${name} must be a finite number between ${min} and ${max}.`,
    );
  }
}

function validate(config: ModelConfig): void {
  if (!["pendulum", "bounce", "projectile"].includes(config.kind)) {
    throw new RangeError(
      "Choose a pendulum, bouncing ball, or projectile experiment.",
    );
  }
  finiteInRange("Gravity", config.gravity, 0.001, 1000);
  if (config.kind === "pendulum") {
    finiteInRange("Pendulum length", config.length, 0.01, 1000);
    finiteInRange("Release angle", config.angle, -179, 179);
  } else {
    finiteInRange(
      "Initial height",
      config.initialHeight,
      config.kind === "bounce" ? BOUNCE_RADIUS : 0,
      10000,
    );
    if (config.kind === "bounce")
      finiteInRange("Restitution", config.restitution, 0, 1);
    else {
      finiteInRange("Launch speed", config.speed, 0, 10000);
      finiteInRange("Launch angle", config.angle, -180, 180);
    }
  }
}

function sampleTimes(duration: number, sampleRate: number): number[] {
  finiteInRange("Duration", duration, 0, 600);
  finiteInRange("Sample rate", sampleRate, 1, 1000);
  if (duration * sampleRate > 100000)
    throw new RangeError("Use at most 100,000 simulation intervals.");
  const count = Math.floor(duration * sampleRate);
  const times = Array.from({ length: count + 1 }, (_, i) => i / sampleRate);
  if (duration - times[times.length - 1] > 1e-10) times.push(duration);
  else times[times.length - 1] = duration;
  return times;
}

function pendulum(config: ModelConfig, times: number[]): Sample[] {
  const { gravity: g, length: length } = config;
  let theta = (config.angle * Math.PI) / 180;
  let omega = 0;
  let previousTime = 0;
  const acceleration = (angle: number) => -(g / length) * Math.sin(angle);
  // Resolve both real time and the oscillator's natural time scale.
  const maxStep = Math.min(1 / 240, 0.02 / Math.sqrt(g / length));
  return times.map((t) => {
    const steps = Math.ceil((t - previousTime) / maxStep);
    const dt = steps === 0 ? 0 : (t - previousTime) / steps;
    for (let i = 0; i < steps; i++) {
      const a1 = omega;
      const b1 = acceleration(theta);
      const a2 = omega + (b1 * dt) / 2;
      const b2 = acceleration(theta + (a1 * dt) / 2);
      const a3 = omega + (b2 * dt) / 2;
      const b3 = acceleration(theta + (a2 * dt) / 2);
      const a4 = omega + b3 * dt;
      const b4 = acceleration(theta + a3 * dt);
      theta += (dt * (a1 + 2 * a2 + 2 * a3 + a4)) / 6;
      omega += (dt * (b1 + 2 * b2 + 2 * b3 + b4)) / 6;
    }
    previousTime = t;
    return {
      t,
      x: length * Math.sin(theta),
      y: length * (1 - Math.cos(theta)),
      vx: length * Math.cos(theta) * omega,
      vy: length * Math.sin(theta) * omega,
    };
  });
}

function projectileInitial(config: ModelConfig): {
  vx: number;
  vy: number;
  impactTime: number;
} {
  const angle = (config.angle * Math.PI) / 180;
  const vx = config.speed * Math.cos(angle);
  const vy = config.speed * Math.sin(angle);
  const root = Math.sqrt(vy * vy + 2 * config.gravity * config.initialHeight);
  // The equivalent rationalized form avoids cancellation for downward launches.
  const impactTime =
    vy < 0
      ? (2 * config.initialHeight) / (root - vy)
      : (vy + root) / config.gravity;
  return { vx, vy, impactTime };
}

function projectile(config: ModelConfig, times: number[]): Sample[] {
  const initial = projectileInitial(config);
  return times.map((t) => {
    if (t >= initial.impactTime) {
      return { t, x: initial.vx * initial.impactTime, y: 0, vx: 0, vy: 0 };
    }
    return {
      t,
      x: initial.vx * t,
      y: config.initialHeight + initial.vy * t - (config.gravity * t * t) / 2,
      vx: initial.vx,
      vy: initial.vy - config.gravity * t,
    };
  });
}

let rapierReady:
  Promise<typeof import("@dimforge/rapier2d-compat")> | undefined;

async function bounce(config: ModelConfig, times: number[]): Promise<Sample[]> {
  rapierReady ??= import("@dimforge/rapier2d-compat")
    .then(async (rapier) => {
      await rapier.init();
      return rapier;
    })
    .catch((error: unknown) => {
      rapierReady = undefined;
      throw error;
    });
  const rapier = await rapierReady;
  const world = new rapier.World({ x: 0, y: -config.gravity });
  try {
    world.integrationParameters.numSolverIterations = 8;
    world.integrationParameters.maxCcdSubsteps = 4;
    world.createCollider(
      rapier.ColliderDesc.cuboid(1000, 0.1)
        .setTranslation(0, -0.1)
        .setFriction(0)
        .setRestitution(config.restitution)
        .setRestitutionCombineRule(rapier.CoefficientCombineRule.Max),
    );
    const ball = world.createRigidBody(
      rapier.RigidBodyDesc.dynamic()
        .setTranslation(0, config.initialHeight)
        .setLinvel(0, 0)
        .setLinearDamping(0)
        .setAngularDamping(0)
        .setCanSleep(true)
        .setCcdEnabled(true),
    );
    world.createCollider(
      rapier.ColliderDesc.ball(BOUNCE_RADIUS)
        .setFriction(0)
        .setRestitution(config.restitution)
        .setRestitutionCombineRule(rapier.CoefficientCombineRule.Max),
      ball,
    );
    let previousTime = 0;
    return times.map((t) => {
      const steps = Math.ceil((t - previousTime) * 480);
      if (steps > 0) {
        world.timestep = (t - previousTime) / steps;
        for (let i = 0; i < steps; i++) world.step();
      }
      previousTime = t;
      const position = ball.translation();
      const velocity = ball.linvel();
      return {
        t,
        x: position.x,
        y: position.y,
        vx: velocity.x,
        vy: velocity.y,
      };
    });
  } finally {
    world.free();
  }
}

/** Generate SI-unit model samples. y is upward; time starts at release/launch. */
export async function generateSimulation(
  config: ModelConfig,
  duration = 12,
  sampleRate = 60,
): Promise<Sample[]> {
  validate(config);
  const times = sampleTimes(duration, sampleRate);
  const result =
    config.kind === "pendulum"
      ? pendulum(config, times)
      : config.kind === "projectile"
        ? projectile(config, times)
        : await bounce(config, times);
  if (
    result.some(
      (sample) =>
        ![sample.t, sample.x, sample.y, sample.vx, sample.vy].every(
          Number.isFinite,
        ),
    )
  ) {
    throw new Error(
      "This configuration produced an unstable simulation. Reduce its scale and try again.",
    );
  }
  return result;
}

export function getModelFacts(config: ModelConfig): ModelFacts {
  validate(config);
  if (config.kind === "pendulum")
    return {
      solver: "Nonlinear equation · fourth-order Runge–Kutta",
      equation: "θ″ = −(g/L) sin θ",
      assumptions: [
        "Fixed pivot and rigid massless link; point bob.",
        "Released from rest; no drag or pivot friction.",
        "The small-angle period is an approximation, not the simulated equation.",
      ],
      smallAnglePeriod: 2 * Math.PI * Math.sqrt(config.length / config.gravity),
    };
  if (config.kind === "projectile")
    return {
      solver: "Analytical constant-gravity trajectory",
      equation: "x = v₀ cos α · t; y = h₀ + v₀ sin α · t − ½gt²",
      assumptions: [
        "Point projectile, uniform gravity, no air resistance.",
        "Angle is measured above horizontal.",
        "After first ground contact the display holds the impact point; no collision model is applied.",
      ],
      impactTime: projectileInitial(config).impactTime,
    };
  return {
    solver: "Rapier 2D · WebAssembly rigid-body contacts",
    equation: "Free fall: y″ = −g; ideal impact limit: vafter = −e · vbefore",
    assumptions: [
      "Ball radius 0.08 m; initial height measures its center above the floor.",
      "Released from rest; fixed horizontal floor, no drag or friction.",
      "Finite solver steps, contact tolerance and sleep thresholds affect small bounces.",
    ],
  };
}

function cleanSeries(
  samples: Sample[],
  axis: "x" | "y",
): { t: number; value: number }[] {
  const byTime = new Map<number, number>();
  for (const sample of samples) {
    if (Number.isFinite(sample.t) && Number.isFinite(sample[axis]))
      byTime.set(sample.t, sample[axis]);
  }
  return Array.from(byTime, ([t, value]) => ({ t, value })).sort(
    (a, b) => a.t - b.t,
  );
}

/** Estimate a full x-oscillation from repeated crossings in the same direction. */
export function estimatePeriod(samples: Sample[]): number | null {
  const series = cleanSeries(samples, "x");
  if (series.length < 5) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const sample of series) {
    min = Math.min(min, sample.value);
    max = Math.max(max, sample.value);
  }
  if (max - min < 1e-8) return null;
  const center = (min + max) / 2;
  const upward: number[] = [];
  const downward: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1];
    const b = series[i];
    const direction =
      a.value < center && b.value >= center
        ? upward
        : a.value > center && b.value <= center
          ? downward
          : null;
    if (direction)
      direction.push(
        a.t + ((center - a.value) * (b.t - a.t)) / (b.value - a.value),
      );
  }
  const intervals = [upward, downward]
    .flatMap((crossings) => crossings.slice(1).map((t, i) => t - crossings[i]))
    .filter((period) => Number.isFinite(period) && period > 0)
    .sort((a, b) => a - b);
  if (intervals.length === 0) return null;
  const middle = Math.floor(intervals.length / 2);
  return intervals.length % 2
    ? intervals[middle]
    : (intervals[middle - 1] + intervals[middle]) / 2;
}

/** Compare at observed timestamps. No extrapolation, fitting, time shift, or unit conversion. */
export function compareSamples(
  observed: Sample[],
  model: Sample[],
  axis: "x" | "y",
): { rmse: number; count: number } | null {
  if (axis !== "x" && axis !== "y")
    throw new RangeError("Comparison axis must be x or y.");
  const actual = cleanSeries(observed, axis);
  const expected = cleanSeries(model, axis);
  if (!actual.length || !expected.length) return null;
  let index = 0;
  let count = 0;
  let scale = 0;
  let scaledSquares = 0;
  for (const sample of actual) {
    if (sample.t < expected[0].t || sample.t > expected[expected.length - 1].t)
      continue;
    while (index < expected.length - 1 && expected[index + 1].t <= sample.t)
      index++;
    const left = expected[index];
    const right = expected[Math.min(index + 1, expected.length - 1)];
    const fraction =
      right.t === left.t ? 0 : (sample.t - left.t) / (right.t - left.t);
    const predicted = left.value * (1 - fraction) + right.value * fraction;
    const error = Math.abs(sample.value - predicted);
    if (!Number.isFinite(error)) return null;
    // Scaled sum of squares prevents overflow for large but finite data.
    if (error > scale) {
      scaledSquares = 1 + scaledSquares * (scale / error) ** 2;
      scale = error;
    } else if (scale > 0) scaledSquares += (error / scale) ** 2;
    count++;
  }
  return count
    ? { rmse: scale * Math.sqrt(scaledSquares / count), count }
    : null;
}
