import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/types';
import type { ModelConfig, Sample } from '../src/types';
import { BOUNCE_RADIUS, compareSamples, estimatePeriod, generateSimulation, getModelFacts } from '../src/lib/physics';

const config = (overrides: Partial<ModelConfig> = {}): ModelConfig => ({ ...DEFAULT_CONFIG, ...overrides });
const point = (t: number, x: number, y = x): Sample => ({ t, x, y, vx: 0, vy: 0 });

describe('nonlinear pendulum', () => {
  it('preserves link length and energy per unit mass across a large-amplitude oscillation', async () => {
    const c = config({ angle: 75, length: 1.7 });
    const data = await generateSimulation(c, 30, 60);
    const initialEnergy = c.gravity * data[0].y;
    for (const sample of data) {
      expect(Math.hypot(sample.x, sample.y - c.length)).toBeCloseTo(c.length, 10);
      const energy = (sample.vx ** 2 + sample.vy ** 2) / 2 + c.gravity * sample.y;
      expect(Math.abs(energy / initialEnergy - 1)).toBeLessThan(1e-7);
    }
    expect(data[0].x).toBeGreaterThan(0);
    expect(data[0].vx).toBe(0);
  });

  it('approaches the small-angle period and captures the longer large-angle period', async () => {
    const small = await generateSimulation(config({ angle: 2 }), 16, 120);
    const large = await generateSimulation(config({ angle: 75 }), 16, 120);
    const predicted = 2 * Math.PI * Math.sqrt(DEFAULT_CONFIG.length / DEFAULT_CONFIG.gravity);
    expect(estimatePeriod(small)).not.toBeNull();
    expect(Math.abs(estimatePeriod(small)! / predicted - 1)).toBeLessThan(0.001);
    expect(estimatePeriod(large)!).toBeGreaterThan(predicted * 1.1);
  });

  it('scales period with the inverse square root of gravity', async () => {
    const earth = await generateSimulation(config({ angle: 20 }), 20, 120);
    const quarterGravity = await generateSimulation(config({ gravity: DEFAULT_CONFIG.gravity / 4, angle: 20 }), 20, 120);
    expect(estimatePeriod(quarterGravity)! / estimatePeriod(earth)!).toBeCloseTo(2, 4);
  });

  it('returns no period for stationary or insufficient data', async () => {
    expect(estimatePeriod(await generateSimulation(config({ angle: 0 }), 12))).toBeNull();
    expect(estimatePeriod(await generateSimulation(config(), 0.1))).toBeNull();
    expect(estimatePeriod([])).toBeNull();
  });
});

describe('projectile', () => {
  it('follows independent analytical components before impact', async () => {
    const c = config({ kind: 'projectile', initialHeight: 3, speed: 8, angle: 30 });
    const data = await generateSimulation(c, 0.5, 120);
    for (const sample of data) {
      expect(sample.x).toBeCloseTo(8 * Math.cos(Math.PI / 6) * sample.t, 11);
      expect(sample.y).toBeCloseTo(3 + 4 * sample.t - c.gravity * sample.t ** 2 / 2, 11);
      expect(sample.vy).toBeCloseTo(4 - c.gravity * sample.t, 11);
      expect((sample.vx ** 2 + sample.vy ** 2) / 2 + c.gravity * sample.y).toBeCloseTo(32 + c.gravity * 3, 10);
    }
  });

  it('holds the exact impact point after ground contact without continuing underground', async () => {
    const c = config({ kind: 'projectile', initialHeight: 0, speed: 10, angle: 45 });
    const data = await generateSimulation(c, 5, 60);
    const impact = getModelFacts(c).impactTime!;
    const landed = data.filter((sample) => sample.t >= impact);
    expect(landed.length).toBeGreaterThan(0);
    for (const sample of landed) {
      expect(sample.x).toBeCloseTo(100 / c.gravity, 10);
      expect(sample.y).toBe(0);
      expect(sample.vx).toBe(0);
      expect(sample.vy).toBe(0);
    }
    expect(data.every((sample) => sample.y >= 0)).toBe(true);
  });
});

describe('Rapier bouncing ball', () => {
  it('matches free fall before contact and keeps the ball above the floor within contact tolerance', async () => {
    const c = config({ kind: 'bounce', restitution: 0.8 });
    const data = await generateSimulation(c, 4, 240);
    for (const sample of data.filter((sample) => sample.t < 0.5)) {
      expect(Math.abs(sample.y - (c.initialHeight - c.gravity * sample.t ** 2 / 2))).toBeLessThan(0.008);
    }
    expect(Math.min(...data.map((sample) => sample.y))).toBeGreaterThan(BOUNCE_RADIUS - 0.01);
    expect(data.every((sample) => Math.abs(sample.x) < 1e-6)).toBe(true);
  });

  it('produces first-rebound heights consistent with restitution squared', async () => {
    for (const restitution of [0.4, 0.8]) {
      const c = config({ kind: 'bounce', restitution });
      const data = await generateSimulation(c, 3, 240);
      const firstRebound = data.findIndex((sample, i) => i > 0 && data[i - 1].vy < -0.5 && sample.vy > 0.5);
      expect(firstRebound).toBeGreaterThan(0);
      const apexIndex = data.findIndex((sample, i) => i > firstRebound && sample.vy <= 0);
      expect(apexIndex).toBeGreaterThan(firstRebound);
      const apex = Math.max(...data.slice(firstRebound, apexIndex + 1).map((sample) => sample.y));
      const predicted = BOUNCE_RADIUS + restitution ** 2 * (c.initialHeight - BOUNCE_RADIUS);
      expect(Math.abs(apex - predicted)).toBeLessThan(0.04);
    }
  });

  it('settles without a material rebound at zero restitution', async () => {
    const data = await generateSimulation(config({ kind: 'bounce', restitution: 0 }), 4, 120);
    const late = data.filter((sample) => sample.t > 2);
    expect(late.every((sample) => Math.abs(sample.y - BOUNCE_RADIUS) < 0.01)).toBe(true);
    expect(late.every((sample) => Math.abs(sample.vy) < 0.01)).toBe(true);
  });
});

describe('sampling and input checks', () => {
  it.each(['pendulum', 'bounce', 'projectile'] as const)('returns finite %s data including non-grid end times', async (kind) => {
    const samples = await generateSimulation(config({ kind }), 1.003, 60);
    expect(samples[0].t).toBe(0);
    expect(samples.at(-1)!.t).toBe(1.003);
    expect(samples.every((sample) => Object.values(sample).every(Number.isFinite))).toBe(true);
    expect(samples.every((sample, i) => i === 0 || sample.t > samples[i - 1].t)).toBe(true);
  });

  it('supports a zero-duration initial state and rejects invalid physical inputs', async () => {
    expect(await generateSimulation(config(), 0)).toHaveLength(1);
    await expect(generateSimulation(config({ gravity: NaN }))).rejects.toThrow('Gravity');
    await expect(generateSimulation(config({ length: 0 }))).rejects.toThrow('length');
    await expect(generateSimulation(config({ kind: 'bounce', initialHeight: 0 }))).rejects.toThrow('height');
    await expect(generateSimulation(config({ kind: 'bounce', restitution: 1.1 }))).rejects.toThrow('Restitution');
    await expect(generateSimulation(config(), 1, 0)).rejects.toThrow('Sample rate');
    await expect(generateSimulation(config(), -1)).rejects.toThrow('Duration');
  });
});

describe('comparison', () => {
  it('interpolates only the overlapping interval and reports count in observed samples', () => {
    const model = [point(0, 0), point(1, 2), point(2, 4)];
    const observed = [point(-1, 999), point(0.5, 2), point(1.5, 4), point(3, 999)];
    expect(compareSamples(observed, model, 'x')).toEqual({ rmse: 1, count: 2 });
  });

  it('does not silently shift, scale or fit observations', () => {
    const model = [point(0, 0, 2), point(1, 1, 4), point(2, 2, 6)];
    expect(compareSamples([point(0.5, 10, 3), point(1.5, 10, 5)], model, 'y')).toEqual({ rmse: 0, count: 2 });
    expect(compareSamples([point(0, 3), point(1, 4)], model, 'x')).toEqual({ rmse: 3, count: 2 });
  });

  it('handles invalid, repeated, unsorted and non-overlapping timestamps without mutation', () => {
    const model = [point(1, 2), point(0, 0), point(1, 4), point(NaN, 3)];
    expect(compareSamples([point(0.5, 2), point(0.5, 2)], model, 'x')).toEqual({ rmse: 0, count: 1 });
    expect(model[0].t).toBe(1);
    expect(compareSamples([point(3, 4)], model, 'x')).toBeNull();
    expect(compareSamples([], model, 'x')).toBeNull();
    expect(compareSamples([point(0, NaN)], model, 'x')).toBeNull();
  });
});
