import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, PointerEvent } from "react";
import {
  Crosshair,
  Download,
  Film,
  MousePointer2,
  Play,
  ScanLine,
  StopCircle,
  Upload,
  X,
} from "lucide-react";
import type { Observation, RawPoint } from "../types";
import {
  calibratePoints,
  fitFrame,
  makeCalibration,
  patchRect,
  rawCsv,
  sampleTimes,
} from "../lib/tracking";
import type { PixelPoint } from "../lib/tracking";
import "./video-lab.css";

type PickMode = "scaleA" | "scaleB" | "origin" | "object" | "manual";
type Selection = PixelPoint & { t: number };
type WorkerReply = PixelPoint & {
  id: number;
  confidence: number;
  error?: string;
};
const labels: Record<PickMode, string> = {
  scaleA: "scale point A",
  scaleB: "scale point B",
  origin: "coordinate origin",
  object: "object center",
  manual: "manual position",
};

function seekFrame(
  video: HTMLVideoElement,
  time: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted)
      return reject(new DOMException("Stopped", "AbortError"));
    if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2)
      return resolve();
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", failed);
      signal?.removeEventListener("abort", cancelled);
    };
    const done = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(
        new Error(
          "The browser could not decode this frame. Try a different video format.",
        ),
      );
    };
    const cancelled = () => {
      cleanup();
      reject(new DOMException("Stopped", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Video frame decoding took too long. Try a shorter, smaller clip.",
        ),
      );
    }, 8000);
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", failed, { once: true });
    signal?.addEventListener("abort", cancelled, { once: true });
    video.currentTime = Math.max(0, Math.min(video.duration - 0.001, time));
  });
}

export default function VideoLab({
  onObservation,
}: {
  onObservation: (observation: Observation) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectUrl = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [frame, setFrame] = useState({ width: 640, height: 400 });
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<PickMode>("scaleA");
  const [scaleA, setScaleA] = useState<PixelPoint | null>(null);
  const [scaleB, setScaleB] = useState<PixelPoint | null>(null);
  const [origin, setOrigin] = useState<PixelPoint | null>(null);
  const [object, setObject] = useState<Selection | null>(null);
  const [knownLength, setKnownLength] = useState(1);
  const [radius, setRadius] = useState(18);
  const [cursor, setCursor] = useState({ x: 320, y: 200 });
  const [points, setPoints] = useState<RawPoint[]>([]);
  const [method, setMethod] = useState<"auto" | "manual">("auto");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(
    "Choose a clip to begin. Your video stays on this device.",
  );
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);

  const calibration = (() => {
    if (!scaleA || !scaleB || !origin) return null;
    try {
      return makeCalibration(scaleA, scaleB, knownLength, origin);
    } catch {
      return null;
    }
  })();
  const samples = calibration ? calibratePoints(points, calibration) : [];

  useEffect(
    () => () => {
      abortRef.current?.abort();
      workerRef.current?.terminate();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, frame.width, frame.height);
    ctx.lineWidth = Math.max(1.5, frame.width / 320);
    const mark = (point: PixelPoint, color: string, label: string) => {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = "bold 12px system-ui";
      ctx.fillStyle = "#111b1b";
      ctx.fillRect(
        point.x + 8,
        point.y - 20,
        ctx.measureText(label).width + 10,
        19,
      );
      ctx.fillStyle = color;
      ctx.fillText(label, point.x + 13, point.y - 6);
    };
    if (scaleA && scaleB) {
      ctx.strokeStyle = "#ffe6a0";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(scaleA.x, scaleA.y);
      ctx.lineTo(scaleB.x, scaleB.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (scaleA) mark(scaleA, "#ffe6a0", "A");
    if (scaleB) mark(scaleB, "#ffe6a0", "B");
    if (origin) {
      mark(origin, "#8fd8ed", "0");
      ctx.strokeStyle = "#8fd8ed";
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(origin.x + 32, origin.y);
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(origin.x, origin.y - 32);
      ctx.stroke();
    }
    if (object && points.length === 0) {
      const box = patchRect(object, radius, frame.width, frame.height);
      ctx.strokeStyle = "#c2f578";
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      mark(object, "#c2f578", "Track");
    }
    if (points.length) {
      ctx.strokeStyle = "#c2f578";
      ctx.beginPath();
      points.forEach((point, index) =>
        index === 0
          ? ctx.moveTo(point.x, point.y)
          : ctx.lineTo(point.x, point.y),
      );
      ctx.stroke();
      ctx.fillStyle = "#c2f578";
      for (const point of points) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
      const nearest = points.reduce((a, b) =>
        Math.abs(b.t - time) < Math.abs(a.t - time) ? b : a,
      );
      mark(nearest, "#c2f578", `${nearest.t.toFixed(2)} s`);
    }
    if (document.activeElement === canvas) {
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(cursor.x - 8, cursor.y);
      ctx.lineTo(cursor.x + 8, cursor.y);
      ctx.moveTo(cursor.x, cursor.y - 8);
      ctx.lineTo(cursor.x, cursor.y + 8);
      ctx.stroke();
    }
  }, [frame, scaleA, scaleB, origin, object, radius, points, time, cursor]);
  useEffect(() => {
    draw();
  }, [draw, loaded]);

  function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > 100 * 1024 * 1024) {
      setError("Choose a video smaller than 100 MB.");
      event.target.value = "";
      return;
    }
    if (file.type && !file.type.startsWith("video/")) {
      setError("Choose a video file, such as MP4 or WebM.");
      event.target.value = "";
      return;
    }
    abortRef.current?.abort();
    workerRef.current?.terminate();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    setLoaded(false);
    setDuration(0);
    setTime(0);
    setScaleA(null);
    setScaleB(null);
    setOrigin(null);
    setObject(null);
    setPoints([]);
    setProgress(0);
    setPublished(false);
    setMode("scaleA");
    setFilename(file.name);
    setVideoUrl(objectUrl.current);
    setStatus("Opening your local video…");
  }

  function metadataLoaded() {
    const video = videoRef.current;
    if (!video) return;
    if (
      !Number.isFinite(video.duration) ||
      video.duration <= 0 ||
      video.duration > 30
    ) {
      setError(
        "Use a video between 0 and 30 seconds long. Trim a longer clip before importing.",
      );
      setVideoUrl("");
      setLoaded(false);
      return;
    }
    const dimensions = fitFrame(video.videoWidth, video.videoHeight);
    setFrame(dimensions);
    setCursor({
      x: Math.round(dimensions.width / 2),
      y: Math.round(dimensions.height / 2),
    });
    setDuration(video.duration);
    setStatus(
      "Mark two ends of a known length in the plane of the motion, then set an origin.",
    );
  }

  function pick(point: PixelPoint) {
    if (!loaded || busy) return;
    const safe = {
      x: Math.max(0, Math.min(frame.width - 1, point.x)),
      y: Math.max(0, Math.min(frame.height - 1, point.y)),
    };
    if (![safe.x, safe.y].every(Number.isFinite)) {
      setError("Enter finite pixel coordinates.");
      return;
    }
    setCursor(safe);
    setError("");
    setPublished(false);
    if (mode === "scaleA") {
      setScaleA(safe);
      setMode("scaleB");
    }
    if (mode === "scaleB") {
      setScaleB(safe);
      setMode("origin");
    }
    if (mode === "origin") {
      setOrigin(safe);
      setMode("object");
    }
    if (mode === "object") {
      setObject({ ...safe, t: videoRef.current?.currentTime ?? time });
      setPoints([]);
      setMethod("auto");
      setStatus(
        "Object selected. Start automatic tracking, or mark positions frame by frame.",
      );
    }
    if (mode === "manual") {
      const t = videoRef.current?.currentTime ?? time;
      setPoints((previous) =>
        [
          ...previous.filter((p) => Math.abs(p.t - t) > 0.015),
          { ...safe, t, confidence: 1 },
        ].sort((a, b) => a.t - b.t),
      );
      setMethod("manual");
      setStatus(
        "Position marked. Advance one frame and mark the same object again.",
      );
    }
  }

  function canvasPick(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    pick({
      x: ((event.clientX - rect.left) / rect.width) * frame.width,
      y: ((event.clientY - rect.top) / rect.height) * frame.height,
    });
  }

  function canvasKey(event: KeyboardEvent<HTMLCanvasElement>) {
    const step = event.shiftKey ? 10 : 1;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(cursor);
      return;
    }
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    setCursor((current) => ({
      x: Math.max(
        0,
        Math.min(
          frame.width - 1,
          current.x +
            (event.key === "ArrowRight"
              ? step
              : event.key === "ArrowLeft"
                ? -step
                : 0),
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          frame.height - 1,
          current.y +
            (event.key === "ArrowDown"
              ? step
              : event.key === "ArrowUp"
                ? -step
                : 0),
        ),
      ),
    }));
  }

  async function seek(timeToSeek: number) {
    if (busy || !loaded || !videoRef.current) return;
    try {
      await seekFrame(
        videoRef.current,
        Math.max(0, Math.min(duration - 0.001, timeToSeek)),
      );
      setTime(videoRef.current.currentTime);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not seek this frame.",
      );
    }
  }

  async function track() {
    const video = videoRef.current;
    if (!object || !calibration || !video || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError("");
    setPoints([]);
    setPublished(false);
    setMethod("auto");
    setProgress(0);
    setStatus("Loading OpenCV on your device…");
    const found: RawPoint[] = [];
    let worker: Worker | null = null;
    try {
      worker = new Worker(
        new URL("../workers/tracking.worker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;
      const scratch = document.createElement("canvas");
      scratch.width = frame.width;
      scratch.height = frame.height;
      const context = scratch.getContext("2d", { willReadFrequently: true });
      if (!context)
        throw new Error(
          "Your browser cannot read video pixels. Manual marking is still available.",
        );
      const times = sampleTimes(object.t, duration);
      if (times.length < 2)
        throw new Error(
          "Choose the object earlier in the clip so at least two frames remain.",
        );
      const request = (id: number, initial: boolean): Promise<WorkerReply> =>
        new Promise((resolve, reject) => {
          const cleanup = () => {
            clearTimeout(timer);
            controller.signal.removeEventListener("abort", cancelled);
          };
          const cancelled = () => {
            cleanup();
            reject(new DOMException("Stopped", "AbortError"));
          };
          const timer = window.setTimeout(
            () => {
              cleanup();
              reject(
                new Error(
                  "OpenCV did not respond in time. You can still mark positions manually.",
                ),
              );
            },
            initial ? 45000 : 10000,
          );
          controller.signal.addEventListener("abort", cancelled, {
            once: true,
          });
          if (controller.signal.aborted) return cancelled();
          worker!.onerror = () => {
            cleanup();
            reject(
              new Error(
                "OpenCV could not load in this browser. Manual frame marking is available below.",
              ),
            );
          };
          worker!.onmessage = (event: MessageEvent<WorkerReply>) => {
            if (event.data.id !== id) return;
            cleanup();
            event.data.error
              ? reject(new Error(event.data.error))
              : resolve(event.data);
          };
          context.drawImage(video, 0, 0, frame.width, frame.height);
          const pixels = context.getImageData(
            0,
            0,
            frame.width,
            frame.height,
          ).data;
          worker!.postMessage(
            {
              id,
              type: initial ? "init" : "frame",
              pixels,
              ...frame,
              x: object.x,
              y: object.y,
              radius,
            },
            [pixels.buffer],
          );
        });
      let lost = false;
      for (let index = 0; index < times.length; index++) {
        await seekFrame(video, times[index], controller.signal);
        const match = await request(index, index === 0);
        if (match.confidence < 0.6) {
          lost = true;
          setStatus(
            `Tracking stopped at ${times[index].toFixed(2)} s: similarity fell below 60%. Review the partial trajectory or mark manually.`,
          );
          break;
        }
        found.push({
          t: video.currentTime,
          x: match.x,
          y: match.y,
          confidence: match.confidence,
        });
        setTime(video.currentTime);
        setProgress(Math.round(((index + 1) / times.length) * 100));
        if (index % 3 === 0 || index === times.length - 1)
          setPoints([...found]);
        if (index === 0)
          setStatus("Tracking locally with OpenCV. Keep this tab open…");
      }
      setPoints(found);
      if (!lost)
        setStatus(
          `Tracked ${found.length} positions over ${(found.at(-1)!.t - found[0].t).toFixed(2)} seconds. Review the path before using these measurements.`,
        );
    } catch (caught) {
      setPoints(found);
      if (caught instanceof DOMException && caught.name === "AbortError")
        setStatus(`Stopped. ${found.length} measured positions retained.`);
      else {
        setError(
          caught instanceof Error
            ? caught.message
            : "Tracking failed. Manual marking is still available.",
        );
        setStatus(
          "Use manual marks if automatic tracking cannot follow this object.",
        );
      }
    } finally {
      worker?.terminate();
      workerRef.current = null;
      abortRef.current = null;
      setBusy(false);
    }
  }

  function publish() {
    if (!calibration || samples.length < 2) return;
    onObservation({
      samples,
      name: `${filename} · ${method === "auto" ? "OpenCV" : "manual"} · ${samples.length} positions`,
      source: "video",
      calibration,
    });
    setPublished(true);
  }

  function download() {
    if (!calibration || samples.length < 2) return;
    const csv =
      method === "manual"
        ? rawCsv(points, calibration).replace(
            "template_similarity",
            "manual_mark",
          )
        : rawCsv(points, calibration);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "entelloq-video-measurements.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="vl-lab" aria-labelledby="vl-title">
      <div className="vl-heading">
        <div>
          <span className="vl-eyebrow">THE WORLD IS YOUR LAB</span>
          <h2 id="vl-title">Turn motion into measurement.</h2>
          <p>Film a real experiment. Find the physics hiding in every frame.</p>
        </div>
        <span className="vl-private">
          <span /> Local & private
        </span>
      </div>
      <div className="vl-grid">
        <div className="vl-viewer">
          {!videoUrl ? (
            <label className="vl-dropzone">
              <span className="vl-upload-icon">
                <Film size={34} strokeWidth={1.4} />
              </span>
              <strong>Bring your experiment.</strong>
              <span>A pendulum. A bouncing ball. A question.</span>
              <span className="vl-upload-cta">
                <Upload size={15} /> Choose a video
              </span>
              <small>MP4 or WebM · up to 100 MB · up to 30 seconds</small>
              <input
                type="file"
                accept="video/*"
                onChange={loadFile}
                aria-label="Choose experiment video"
              />
            </label>
          ) : (
            <>
              <div className="vl-video-bar">
                <span>
                  <Film size={14} /> {filename}
                </span>
                <label className="vl-replace">
                  Replace
                  <input
                    type="file"
                    accept="video/*"
                    onChange={loadFile}
                    disabled={busy}
                    aria-label="Replace experiment video"
                  />
                </label>
              </div>
              <div className="vl-canvas-wrap">
                <canvas
                  ref={canvasRef}
                  width={frame.width}
                  height={frame.height}
                  tabIndex={loaded && !busy ? 0 : -1}
                  onPointerDown={canvasPick}
                  onKeyDown={canvasKey}
                  onFocus={draw}
                  onBlur={draw}
                  aria-label={`Experiment frame. Select ${labels[mode]}. Arrow keys move the crosshair; Enter places the point.`}
                />
                <span className="vl-canvas-hint">
                  <MousePointer2 size={13} />{" "}
                  {busy ? "Tracking motion…" : `Click to set ${labels[mode]}`}
                </span>
              </div>
              <div className="vl-timeline">
                <button
                  type="button"
                  onClick={() => void seek(time - 1 / 15)}
                  disabled={busy || !loaded}
                  aria-label="Previous analysis frame"
                >
                  −1 frame
                </button>
                <input
                  aria-label="Video time"
                  type="range"
                  min="0"
                  max={Math.max(0, duration - 0.001)}
                  step="0.001"
                  value={time}
                  disabled={busy || !loaded}
                  onChange={(event) => void seek(Number(event.target.value))}
                />
                <button
                  type="button"
                  onClick={() => void seek(time + 1 / 15)}
                  disabled={busy || !loaded}
                  aria-label="Next analysis frame"
                >
                  +1 frame
                </button>
                <output>
                  {time.toFixed(2)} / {duration.toFixed(2)} s
                </output>
              </div>
            </>
          )}
          <video
            ref={videoRef}
            src={videoUrl || undefined}
            preload="auto"
            muted
            playsInline
            className="vl-hidden-video"
            onLoadedMetadata={metadataLoaded}
            onLoadedData={() => {
              setLoaded(true);
              draw();
            }}
            onSeeked={() => {
              if (videoRef.current) setTime(videoRef.current.currentTime);
            }}
            onError={() => {
              setError(
                "This video could not be opened. Try a browser-supported MP4 or WebM file.",
              );
              setLoaded(false);
            }}
          />
          <div className="vl-capture-note">
            <ScanLine size={17} />
            <p>
              <strong>A steadier camera makes better science.</strong> Film
              perpendicular to the motion with a clear object and a ruler in the
              same plane. Tracking uses a fixed-size image patch; large
              rotations and occlusions can break it.
            </p>
          </div>
        </div>
        <div className="vl-controls">
          <div className="vl-step-heading">
            <span>01</span>
            <h3>Give the frame a scale</h3>
          </div>
          <p className="vl-help">
            Mark two points a known distance apart. Coordinates use right as +x
            and up as +y.
          </p>
          <div className="vl-point-buttons">
            {(["scaleA", "scaleB", "origin"] as PickMode[]).map((key) => (
              <button
                type="button"
                key={key}
                className={mode === key ? "vl-selected" : ""}
                disabled={!loaded || busy}
                onClick={() => setMode(key)}
              >
                <Crosshair size={14} />{" "}
                {key === "scaleA"
                  ? "Point A"
                  : key === "scaleB"
                    ? "Point B"
                    : "Origin"}
                <span>
                  {(
                    key === "scaleA"
                      ? scaleA
                      : key === "scaleB"
                        ? scaleB
                        : origin
                  )
                    ? "✓"
                    : "·"}
                </span>
              </button>
            ))}
          </div>
          <label className="vl-length">
            Distance A → B{" "}
            <span>
              <input
                aria-label="Reference length in metres"
                type="number"
                min="0.001"
                max="10000"
                step="0.01"
                value={knownLength}
                disabled={busy}
                onChange={(event) => {
                  setKnownLength(Number(event.target.value));
                  setPublished(false);
                }}
              />{" "}
              m
            </span>
          </label>
          <div className="vl-scale-state">
            {calibration
              ? `${calibration.pixelsPerMeter.toFixed(1)} pixels / metre · scale ready`
              : "Set A, B, a positive length, and an origin."}
          </div>
          <div className="vl-divider" />
          <div className="vl-step-heading">
            <span>02</span>
            <h3>Follow something interesting</h3>
          </div>
          <p className="vl-help">
            Select the object on its starting frame. Include its edge and a
            little background.
          </p>
          <button
            type="button"
            className={`vl-object-button ${mode === "object" ? "vl-selected" : ""}`}
            disabled={!loaded || busy}
            onClick={() => setMode("object")}
          >
            <Crosshair size={15} />{" "}
            {object
              ? `Object set at ${object.t.toFixed(2)} s`
              : "Select moving object"}
            {object && <span>✓</span>}
          </button>
          <label className="vl-patch">
            Patch size{" "}
            <input
              aria-label="Tracking patch size"
              type="range"
              min="8"
              max="48"
              value={radius}
              disabled={busy}
              onChange={(event) => setRadius(Number(event.target.value))}
            />
            <span>{radius * 2} px</span>
          </label>
          <button
            type="button"
            className="vl-track-button"
            disabled={!calibration || !object || !loaded || busy}
            onClick={() => void track()}
          >
            <Play size={16} fill="currentColor" /> Track motion
          </button>
          <p className="vl-limit">
            OpenCV template matching · 15 samples / second
            <br />
            Processes up to 12 seconds from the selected frame.
          </p>
          {busy && (
            <div className="vl-progress">
              <progress
                max="100"
                value={progress}
                aria-label="Tracking progress"
              />
              <button type="button" onClick={() => abortRef.current?.abort()}>
                <StopCircle size={15} /> Stop {progress}%
              </button>
            </div>
          )}
          <details className="vl-manual">
            <summary>Manual marks & precise placement</summary>
            <p>
              For difficult footage, select manual marking, place the object
              center, then advance a frame. Two or more marks make a trajectory.
            </p>
            <button
              type="button"
              className={mode === "manual" ? "vl-selected" : ""}
              disabled={!loaded || busy}
              onClick={() => {
                setMode("manual");
                if (method !== "manual") {
                  setPoints([]);
                  setPublished(false);
                }
                setMethod("manual");
              }}
            >
              Mark positions manually
            </button>
            <div className="vl-numeric">
              <label>
                Pixel x
                <input
                  aria-label="Pixel x"
                  type="number"
                  min="0"
                  max={frame.width - 1}
                  value={Math.round(cursor.x * 10) / 10}
                  disabled={!loaded || busy}
                  onChange={(event) =>
                    setCursor((current) => ({
                      ...current,
                      x: Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Pixel y
                <input
                  aria-label="Pixel y"
                  type="number"
                  min="0"
                  max={frame.height - 1}
                  value={Math.round(cursor.y * 10) / 10}
                  disabled={!loaded || busy}
                  onChange={(event) =>
                    setCursor((current) => ({
                      ...current,
                      y: Number(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <button
              type="button"
              disabled={!loaded || busy}
              onClick={() => pick(cursor)}
            >
              Set {labels[mode]} at x, y
            </button>
            <small>
              Canvas keyboard: arrows move 1 px; Shift + arrows move 10 px;
              Enter places the selected point.
            </small>
          </details>
        </div>
      </div>
      <div className="vl-status" role="status" aria-live="polite">
        {status}
      </div>
      {error && (
        <div className="vl-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            aria-label="Dismiss video error"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {points.length > 0 && (
        <div className="vl-results">
          <div>
            <span className="vl-eyebrow">YOUR MEASUREMENTS</span>
            <h3>{points.length} positions. One real trajectory.</h3>
            <p>
              {method === "auto"
                ? "OpenCV similarity measures visual matching, not physical accuracy. Check the path for jumps."
                : "Manually selected positions; no automatic tracking confidence is inferred."}{" "}
              {calibration
                ? `Position uncertainty estimate: ±${(calibration.uncertaintyPx / calibration.pixelsPerMeter).toFixed(4)} m (±${calibration.uncertaintyPx} px).`
                : "Finish calibration to use physical units."}{" "}
              This estimate excludes scale, perspective and timing errors.
              Velocity uses finite differences and amplifies noise.
            </p>
          </div>
          <div className="vl-result-actions">
            <button
              type="button"
              onClick={download}
              disabled={samples.length < 2 || busy}
            >
              <Download size={15} /> CSV
            </button>
            <button
              type="button"
              className="vl-track-button"
              onClick={publish}
              disabled={samples.length < 2 || busy}
            >
              {published ? "Added to comparison ✓" : "Use in comparison"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPoints([]);
                setPublished(false);
                setStatus(
                  "Measurements cleared. Select an object or start marking again.",
                );
              }}
            >
              Clear marks
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
