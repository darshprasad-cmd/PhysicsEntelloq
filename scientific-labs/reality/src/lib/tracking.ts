import type { Calibration, RawPoint, Sample } from "../types";

export interface PixelPoint {
  x: number;
  y: number;
}
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function fitFrame(
  width: number,
  height: number,
  maxWidth = 640,
  maxHeight = 480,
) {
  if (!(width > 0 && height > 0))
    throw new Error("This video has no usable picture.");
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function makeCalibration(
  a: PixelPoint,
  b: PixelPoint,
  length: number,
  origin: PixelPoint,
  uncertaintyPx = 2,
): Calibration {
  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  if (![a.x, a.y, b.x, b.y, origin.x, origin.y, length].every(Number.isFinite))
    throw new Error("Calibration values must be finite numbers.");
  if (length <= 0)
    throw new Error("Enter a reference length greater than zero.");
  if (distance < 5)
    throw new Error("Place the scale points at least 5 pixels apart.");
  return {
    pixelsPerMeter: distance / length,
    originX: origin.x,
    originY: origin.y,
    uncertaintyPx,
  };
}

/** Positions use x-right/y-up. Velocity is a secant at endpoints and a centered secant inside. */
export function calibratePoints(
  points: RawPoint[],
  calibration: Calibration,
): Sample[] {
  if (
    !(calibration.pixelsPerMeter > 0) ||
    !Number.isFinite(calibration.pixelsPerMeter)
  )
    throw new Error("A valid scale is required.");
  const valid = points
    .filter((p) => [p.t, p.x, p.y, p.confidence].every(Number.isFinite))
    .slice()
    .sort((a, b) => a.t - b.t);
  const unique = valid.filter(
    (p, i) => i === 0 || p.t - valid[i - 1].t > 0.00001,
  );
  if (!unique.length) return [];
  const t0 = unique[0].t;
  const samples = unique.map((p) => ({
    t: p.t - t0,
    x: (p.x - calibration.originX) / calibration.pixelsPerMeter,
    y: (calibration.originY - p.y) / calibration.pixelsPerMeter,
    vx: 0,
    vy: 0,
    confidence: p.confidence,
  }));
  for (let i = 0; i < samples.length; i++) {
    const before = samples[Math.max(0, i - 1)];
    const after = samples[Math.min(samples.length - 1, i + 1)];
    const dt = after.t - before.t;
    if (dt > 0) {
      samples[i].vx = (after.x - before.x) / dt;
      samples[i].vy = (after.y - before.y) / dt;
    }
  }
  return samples;
}

export function patchRect(
  point: PixelPoint,
  radius: number,
  frameWidth: number,
  frameHeight: number,
): PixelRect {
  const size = Math.max(
    4,
    Math.min(Math.round(radius * 2), frameWidth, frameHeight),
  );
  return {
    x: Math.max(0, Math.min(frameWidth - size, Math.round(point.x - size / 2))),
    y: Math.max(
      0,
      Math.min(frameHeight - size, Math.round(point.y - size / 2)),
    ),
    width: size,
    height: size,
  };
}

export function sampleTimes(
  start: number,
  duration: number,
  fps = 15,
  maxSeconds = 12,
): number[] {
  if (
    ![start, duration, fps, maxSeconds].every(Number.isFinite) ||
    fps <= 0 ||
    maxSeconds <= 0 ||
    duration <= start ||
    start < 0
  )
    return [];
  const end = Math.min(duration - 0.001, start + maxSeconds);
  const result: number[] = [];
  for (let index = 0; start + index / fps <= end + 0.000001; index++)
    result.push(start + index / fps);
  return result;
}

export function rawCsv(points: RawPoint[], calibration: Calibration): string {
  const samples = calibratePoints(points, calibration);
  return (
    "time_s,x_m,y_m,vx_m_s,vy_m_s,template_similarity\n" +
    samples
      .map((p) => [p.t, p.x, p.y, p.vx, p.vy, p.confidence ?? ""].join(","))
      .join("\n")
  );
}
