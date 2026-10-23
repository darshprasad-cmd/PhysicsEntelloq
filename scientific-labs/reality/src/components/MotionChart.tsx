import type { Sample } from "../types";
export type ChartAxis = "x" | "y" | "speed";
export function sampleValue(s: Sample, axis: ChartAxis) {
  return axis === "speed" ? Math.hypot(s.vx, s.vy) : s[axis];
}
export default function MotionChart({
  samples,
  observed,
  axis,
  time,
  onTime,
}: {
  samples: Sample[];
  observed: Sample[];
  axis: ChartAxis;
  time: number;
  onTime: (t: number) => void;
}) {
  const W = 760,
    H = 220,
    L = 54,
    R = 20,
    T = 22,
    B = 32;
  const all = [...samples, ...observed];
  const maxT = Math.max(1, ...all.map((s) => s.t));
  const vals = all.map((s) => sampleValue(s, axis)).filter(Number.isFinite);
  let low = Math.min(0, ...vals),
    high = Math.max(0.1, ...vals);
  const pad = (high - low) * 0.12;
  low -= pad;
  high += pad;
  const x = (t: number) => L + (t / maxT) * (W - L - R),
    y = (v: number) => T + ((high - v) / (high - low)) * (H - T - B);
  const path = (ss: Sample[]) =>
    ss
      .filter((s) => Number.isFinite(sampleValue(s, axis)))
      .map(
        (s, i) =>
          `${i ? "L" : "M"}${x(s.t).toFixed(2)},${y(sampleValue(s, axis)).toFixed(2)}`,
      )
      .join(" ");
  return (
    <svg
      className="motion-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${axis} over time. Green line is the model; purple dots are observations.`}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onTime(
          Math.max(
            0,
            Math.min(
              maxT,
              ((((e.clientX - r.left) / r.width) * W - L) / (W - L - R)) * maxT,
            ),
          ),
        );
      }}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const v = low + ((high - low) * i) / 4;
        return (
          <g key={i}>
            <line
              x1={L}
              x2={W - R}
              y1={y(v)}
              y2={y(v)}
              stroke="#e2e5df"
              strokeDasharray="3 5"
            />
            <text x={L - 10} y={y(v) + 4} textAnchor="end">
              {v.toFixed(1)}
            </text>
          </g>
        );
      })}
      {Array.from({ length: 7 }, (_, i) => (
        <text key={i} x={x((maxT * i) / 6)} y={H - 9} textAnchor="middle">
          {((maxT * i) / 6).toFixed(0)}s
        </text>
      ))}
      <path d={path(samples)} fill="none" stroke="#31745b" strokeWidth="2.5" />
      {observed
        .filter(
          (_, i) => i % Math.max(1, Math.floor(observed.length / 100)) === 0,
        )
        .map((s, i) => (
          <circle
            key={i}
            cx={x(s.t)}
            cy={y(sampleValue(s, axis))}
            r="3"
            fill="#8b6bd6"
          />
        ))}
      <line
        x1={x(time)}
        x2={x(time)}
        y1={T}
        y2={H - B}
        stroke="#89948d"
        strokeDasharray="4 4"
      />
      <text x={L} y="12">
        {axis === "speed"
          ? "Speed (m/s)"
          : `${axis === "x" ? "Horizontal displacement" : "Height"} (m)`}
      </text>
    </svg>
  );
}
