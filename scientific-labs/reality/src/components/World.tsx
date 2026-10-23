import type { ModelConfig, Sample } from "../types";
export default function World({
  config,
  samples,
  time,
  trail,
}: {
  config: ModelConfig;
  samples: Sample[];
  time: number;
  trail: boolean;
}) {
  const i = Math.min(samples.length - 1, Math.max(0, Math.round(time * 60))),
    s = samples[i] ?? { x: 0, y: 0, vx: 0, vy: 0 };
  const pend = config.kind === "pendulum";
  const maxX = pend ? 3 : Math.max(5, ...samples.map((p) => p.x));
  const maxY = pend
    ? Math.max(2.8, config.length + 0.5)
    : Math.max(
        3.4,
        config.initialHeight +
          (config.kind === "projectile"
            ? config.speed ** 2 / (2 * config.gravity)
            : 0) +
          0.3,
      );
  const scale = pend
    ? Math.min(290 / (config.length + 0.1), 240)
    : Math.min(540 / maxX, 300 / maxY, 160);
  const originX = pend ? 400 : 130,
    originY = 385;
  const x = (v: number) => originX + v * scale,
    y = (v: number) => originY - v * scale;
  const pivot = { x: 400, y: y(config.length) };
  const bob = { x: x(s.x), y: y(s.y) };
  return (
    <svg
      viewBox="0 0 800 460"
      className="world"
      role="img"
      aria-label={`${config.kind} model at ${time.toFixed(2)} seconds. Horizontal position ${s.x.toFixed(2)} metres, height ${s.y.toFixed(2)} metres.`}
    >
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".8" fill="#50605a" opacity=".36" />
        </pattern>
        <radialGradient id="bob">
          <stop stopColor="#e1ffb0" />
          <stop offset=".5" stopColor="#c2f578" />
          <stop offset="1" stopColor="#7aa34b" />
        </radialGradient>
        <radialGradient id="glow">
          <stop stopColor="#c2f578" stopOpacity=".14" />
          <stop offset="1" stopColor="#c2f578" stopOpacity="0" />
        </radialGradient>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10" fill="#b3bfb8" />
        </marker>
      </defs>
      <rect width="800" height="460" fill="url(#grid)" />
      <circle cx={bob.x} cy={bob.y} r="100" fill="url(#glow)" />
      <line
        x1="48"
        x2="752"
        y1={originY}
        y2={originY}
        stroke="#77877d"
        opacity=".45"
      />
      <text x="55" y={originY + 22} fill="#899a8e" fontSize="11">
        y = 0 m
      </text>
      {trail && (
        <path
          d={samples
            .filter((_, k) => k % 4 === 0)
            .map(
              (p, k) =>
                `${k ? "L" : "M"}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`,
            )
            .join(" ")}
          fill="none"
          stroke="#c2f578"
          opacity=".18"
          strokeWidth="2"
          strokeDasharray="4 6"
        />
      )}
      {pend && (
        <>
          <line
            x1={pivot.x}
            x2={pivot.x}
            y1={pivot.y}
            y2={originY}
            stroke="#799084"
            strokeDasharray="4 6"
            opacity=".5"
          />
          <rect
            x={pivot.x - 42}
            y={pivot.y - 14}
            width="84"
            height="6"
            rx="3"
            fill="#61756b"
          />
          <line
            x1={pivot.x}
            y1={pivot.y}
            x2={bob.x}
            y2={bob.y}
            stroke="#c8d5c9"
            strokeWidth="2.2"
          />
          <circle cx={pivot.x} cy={pivot.y} r="5" fill="#95a89c" />
          <text
            x={(pivot.x + bob.x) / 2 + 14}
            y={(pivot.y + bob.y) / 2}
            fill="#a3b5a8"
            fontSize="12"
          >
            {config.length.toFixed(2)} m
          </text>
        </>
      )}
      {trail &&
        samples
          .slice(Math.max(0, i - 120), i)
          .filter((_, k) => k % 10 === 0)
          .map((p, k) => (
            <circle
              key={k}
              cx={x(p.x)}
              cy={y(p.y)}
              r="3"
              fill="#c2f578"
              opacity={(k + 1) / 16}
            />
          ))}
      <circle cx={bob.x} cy={bob.y} r={pend ? 18 : 13} fill="url(#bob)" />
      <circle
        cx={bob.x - 5}
        cy={bob.y - 6}
        r="4"
        fill="#f6ffe9"
        opacity=".45"
      />
      <g
        transform={`translate(${Math.min(660, bob.x + 30)},${Math.max(50, bob.y - 30)})`}
      >
        <rect width="101" height="47" rx="8" fill="#23372e" stroke="#395242" />
        <text x="12" y="19" fontSize="10" fill="#8ea794">
          VELOCITY
        </text>
        <text x="12" y="36" fontSize="13" fill="#d7e6d8">
          {Math.hypot(s.vx, s.vy).toFixed(2)} m/s
        </text>
      </g>
      <g transform="translate(694 78)">
        <path
          d="M0 0v42 M0 42h36"
          stroke="#82968b"
          fill="none"
          markerEnd="url(#arrow)"
        />
        <text x="-15" y="4" fill="#82968b" fontSize="12">
          y
        </text>
        <text x="42" y="47" fill="#82968b" fontSize="12">
          x
        </text>
      </g>
      <text x="28" y="430" fontSize="10" letterSpacing="1.2" fill="#7d9786">
        {pend
          ? "NONLINEAR PENDULUM · IDEAL MODEL"
          : config.kind === "bounce"
            ? "RIGID-BODY DYNAMICS · RAPIER"
            : "PROJECTILE · NO AIR RESISTANCE"}
      </text>
    </svg>
  );
}
