import { describe, expect, it } from 'vitest';
import { calibratePoints, fitFrame, makeCalibration, patchRect, sampleTimes } from '../src/lib/tracking';

describe('video measurements', () => {
  it('uses a y-up calibrated plane and physical timestamps for velocity', () => {
    const calibration = makeCalibration({ x: 0, y: 0 }, { x: 100, y: 0 }, 2, { x: 10, y: 100 });
    const result = calibratePoints([{ t: 4, x: 10, y: 100, confidence: 1 }, { t: 4.5, x: 35, y: 50, confidence: .9 }, { t: 5, x: 60, y: 0, confidence: .8 }], calibration);
    expect(result.map(p => [p.t, p.x, p.y, p.vx, p.vy])).toEqual([[0, 0, 0, 1, 2], [.5, .5, 1, 1, 2], [1, 1, 2, 1, 2]]);
  });
  it('sorts, deduplicates timestamps and rejects non-finite measurements', () => {
    const result = calibratePoints([{ t: 2, x: 5, y: 10, confidence: 1 }, { t: 1, x: 0, y: 0, confidence: 1 }, { t: 2, x: 5, y: 10, confidence: 1 }, { t: NaN, x: 10, y: 0, confidence: 1 }], { pixelsPerMeter: 5, originX: 0, originY: 0, uncertaintyPx: 2 });
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ t: 1, x: 1, y: -2, vx: 1, vy: -2 });
  });
  it('rejects an unusable scale', () => {
    expect(() => makeCalibration({ x: 0, y: 0 }, { x: 1, y: 1 }, 1, { x: 0, y: 0 })).toThrow('5 pixels');
    expect(() => makeCalibration({ x: 0, y: 0 }, { x: 100, y: 0 }, 0, { x: 0, y: 0 })).toThrow('greater than zero');
  });
  it('fits landscape and portrait footage without exceeding the analysis budget', () => {
    expect(fitFrame(1920, 1080)).toEqual({ width: 640, height: 360 });
    expect(fitFrame(1080, 1920)).toEqual({ width: 270, height: 480 });
    expect(sampleTimes(3, 30)).toHaveLength(181);
    expect(sampleTimes(3, 30).at(-1)).toBe(15);
    expect(sampleTimes(2, 2)).toEqual([]);
    expect(sampleTimes(0, .1)).toEqual([0, 1 / 15]);
  });
  it('keeps the full tracking patch inside the picture', () => {
    expect(patchRect({ x: 1, y: 479 }, 18, 640, 480)).toEqual({ x: 0, y: 444, width: 36, height: 36 });
  });
});
