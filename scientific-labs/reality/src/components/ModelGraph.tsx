import { useEffect, useRef, useState } from "react";
import type { Sample } from "../types";
type Controller = {
  dispose: () => void;
  invalidate: (force?: boolean) => void;
};
type Engine = {
  mount: (host: HTMLElement, adapter: Record<string, unknown>) => Controller;
};

/** The shared renderer observes model samples; it never estimates video depth. */
export default function ModelGraph({
  samples,
  time,
}: {
  samples: Sample[];
  time: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<Controller | null>(null),
    latest = useRef({ samples, time });
  const [error, setError] = useState("");
  latest.current = { samples, time };
  useEffect(() => {
    let alive = true;
    const url = "/assets/physics-visualization/engine.mjs";
    import(/* @vite-ignore */ url)
      .then((module: Engine) => {
        if (!alive || !host.current) return;
        view.current = module.mount(host.current, {
          title: "Measured against a model",
          subtitle:
            "Computed trajectory · the observed video remains two-dimensional.",
          description:
            "These are the existing simulation samples, not reconstructed video depth. The trajectory remains on z = 0 in metres. Use the experiment’s playback and parameter controls below. Numerical and observed time-series plots are unchanged.",
          getSnapshot() {
            const { samples: points, time: t } = latest.current;
            const xs = points.map((p) => p.x),
              ys = points.map((p) => p.y),
              a = points.reduce<Sample | undefined>(
                (nearest, p) =>
                  !nearest || Math.abs(p.t - t) < Math.abs(nearest.t - t)
                    ? p
                    : nearest,
                undefined,
              );
            return {
              revision: JSON.stringify([
                points[0],
                points.at(-1),
                t,
                points.length,
              ]),
              time: t,
              axes: ["x", "height y", "z"].map((label) => ({
                label,
                unit: "m",
                dimension: "length",
              })),
              bounds: [
                [Math.min(-1, ...xs), Math.max(1, ...xs)],
                [Math.min(-0.2, ...ys), Math.max(1, ...ys)],
                [-1, 1],
              ],
              lines: [
                {
                  label: "Numerical model samples",
                  points: points.map((p) => [p.x, p.y, 0]),
                },
              ],
              particles: a
                ? [{ point: [a.x, a.y, 0], label: "Current model state" }]
                : [],
            };
          },
        });
      })
      .catch(() => {
        if (alive)
          setError(
            "The 3D renderer could not load. Return to the apparatus to continue.",
          );
      });
    return () => {
      alive = false;
      view.current?.dispose();
      view.current = null;
    };
  }, []);
  useEffect(() => {
    view.current?.invalidate(true);
  }, [samples, time]);
  return (
    <section aria-label="Spatial model inspection">
      {error && <p role="status">{error}</p>}
      <div ref={host} />
    </section>
  );
}
