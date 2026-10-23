export type ExperimentKind = "pendulum" | "bounce" | "projectile";
export interface ModelConfig {
  kind: ExperimentKind;
  gravity: number;
  length: number;
  angle: number;
  restitution: number;
  initialHeight: number;
  speed: number;
}
export interface Sample {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  confidence?: number;
}
export interface RawPoint {
  t: number;
  x: number;
  y: number;
  confidence: number;
}
export interface Calibration {
  pixelsPerMeter: number;
  originX: number;
  originY: number;
  uncertaintyPx: number;
}
export interface Observation {
  samples: Sample[];
  name: string;
  source: "video" | "synthetic";
  calibration?: Calibration;
}
export interface NotebookEntry {
  id: string;
  title: string;
  createdAt: string;
  config: ModelConfig;
  hypothesis: string;
  conclusion: string;
  observation?: Observation;
}
export const DEFAULT_CONFIG: ModelConfig = {
  kind: "pendulum",
  gravity: 9.81,
  length: 1.5,
  angle: 32,
  restitution: 0.75,
  initialHeight: 2.4,
  speed: 4,
};
