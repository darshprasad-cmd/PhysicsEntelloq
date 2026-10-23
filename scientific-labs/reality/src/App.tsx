import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Atom,
  BookOpen,
  Check,
  CircleHelp,
  Clapperboard,
  FlaskConical,
  Layers3,
  Maximize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { DEFAULT_CONFIG } from "./types";
import type { ModelConfig, NotebookEntry, Observation, Sample } from "./types";
import {
  generateSimulation,
  estimatePeriod,
  compareSamples,
} from "./lib/physics";
import { downloadFile, readNotebook, writeNotebook } from "./lib/storage";
import World from "./components/World";
import MotionChart from "./components/MotionChart";
import type { ChartAxis } from "./components/MotionChart";
import VideoLab from "./components/VideoLab";
const experiments = [
  {
    kind: "pendulum",
    name: "The pendulum",
    description: "Find the rhythm in motion.",
    icon: "◒",
    number: "01",
  },
  {
    kind: "bounce",
    name: "A bouncing ball",
    description: "Where does the energy go?",
    icon: "⤴",
    number: "02",
  },
  {
    kind: "projectile",
    name: "A flight through space",
    description: "One motion. Two directions.",
    icon: "⌁",
    number: "03",
  },
] as const;
type Page = "lab" | "video" | "notebook" | "guide";
function Field({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="parameter">
      <span>
        {label}
        <strong>
          {value.toFixed(step < 0.1 ? 2 : 1)} <small>{unit}</small>
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      <span className="range-ends">
        <small>
          {min} {unit}
        </small>
        <small>
          {max} {unit}
        </small>
      </span>
    </label>
  );
}
export default function App() {
  const [page, setPage] = useState<Page>("lab");
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [trail, setTrail] = useState(true);
  const [axis, setAxis] = useState<ChartAxis>("x");
  const [observation, setObservation] = useState<Observation>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [notebook, setNotebook] = useState<NotebookEntry[]>(readNotebook);
  const [hypothesis, setHypothesis] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [toast, setToast] = useState("");
  const [title, setTitle] = useState("My pendulum investigation");
  const [wide, setWide] = useState(false);
  const frame = useRef(0);
  const current = experiments.find((e) => e.kind === config.kind)!;
  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError("");
    setPlaying(false);
    setTime(0);
    generateSimulation(config, 12, 60)
      .then((data) => {
        if (!cancelled) {
          setSamples(data);
          setBusy(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [config]);
  useEffect(() => {
    if (!playing) return;
    let last = 0;
    const loop = (now: number) => {
      if (last) {
        const d = Math.min((now - last) / 1000, 0.05) * rate;
        setTime((t) => {
          if (t + d >= 12) {
            setPlaying(false);
            return 12;
          }
          return t + d;
        });
      }
      last = now;
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame.current);
  }, [playing, rate]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = (message: string) => setToast(message);
  const change = (key: keyof ModelConfig, value: number) =>
    setConfig((c) => ({ ...c, [key]: value }));
  const select = (kind: ModelConfig["kind"]) => {
    setConfig({
      ...DEFAULT_CONFIG,
      kind,
      angle: kind === "projectile" ? 45 : 32,
    });
    setAxis(kind === "pendulum" ? "x" : "y");
    setTitle(`My ${kind} investigation`);
    setObservation(undefined);
    setHypothesis("");
    setConclusion("");
    setPage("lab");
  };
  const active = samples[Math.min(samples.length - 1, Math.round(time * 60))];
  const period = config.kind === "pendulum" ? estimatePeriod(samples) : null;
  const comparison =
    observation && axis !== "speed"
      ? compareSamples(observation.samples, samples, axis)
      : null;
  const save = () => {
    if (!title.trim()) {
      notify("Give your investigation a title first.");
      return;
    }
    const entry: NotebookEntry = {
      id: crypto.randomUUID(),
      title: title.trim(),
      createdAt: new Date().toISOString(),
      config,
      hypothesis,
      conclusion,
      observation,
    };
    try {
      const next = [entry, ...notebook].slice(0, 40);
      writeNotebook(next);
      setNotebook(next);
      notify("Investigation saved to this browser.");
    } catch {
      notify(
        "Your browser storage is full or unavailable. Export the report to keep it.",
      );
    }
  };
  const exportCsv = () => {
    const data = observation?.samples ?? samples;
    downloadFile(
      `reality-lab-${observation ? "observations" : "model"}.csv`,
      "time_s,x_m,y_m,vx_m_s,vy_m_s,tracking_similarity\n" +
        data
          .map((s) => [s.t, s.x, s.y, s.vx, s.vy, s.confidence ?? ""].join(","))
          .join("\n"),
      "text/csv",
    );
  };
  const report = () =>
    downloadFile(
      "reality-lab-report.json",
      JSON.stringify(
        {
          product: "Entelloq Reality Lab",
          version: 1,
          title,
          exportedAt: new Date().toISOString(),
          config,
          hypothesis,
          conclusion,
          model: {
            engine:
              config.kind === "bounce"
                ? "Rapier 2D"
                : "deterministic educational model",
            units: "metres, seconds, radians internally",
            samples,
          },
          observation: observation ?? null,
          comparison,
          limits: [
            "Planar motion only.",
            "Simulation is an idealized model, not a measurement.",
            "Video velocities are numerical estimates; calibration and tracking errors propagate.",
            "No automated claim of experimental validation.",
          ],
        },
        null,
        2,
      ),
      "application/json",
    );
  const restore = (entry: NotebookEntry) => {
    setConfig(entry.config);
    setTitle(entry.title);
    setHypothesis(entry.hypothesis);
    setConclusion(entry.conclusion);
    setObservation(entry.observation);
    setPage("lab");
    notify("Saved investigation opened.");
  };
  return (
    <div className={`app-shell ${wide ? "wide-view" : ""}`}>
      <aside className="sidebar">
        <a href="../" className="brand" aria-label="Entelloq Labs home">
          <span className="brand-symbol">e</span>
          <span>
            entelloq<span className="brand-sub">REALITY LAB</span>
          </span>
        </a>
        <div className="nav-section">WORKSPACE</div>
        <nav>
          {(
            [
              { id: "lab", label: "Experiment lab", Icon: FlaskConical },
              { id: "video", label: "Video analysis", Icon: Clapperboard },
              { id: "notebook", label: "My notebook", Icon: BookOpen },
              { id: "guide", label: "Field guide", Icon: CircleHelp },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => setPage(id)}
            >
              <Icon size={18} />
              {label}
              {id === "notebook" && (
                <span className="count">{notebook.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-orbit">
            <Atom size={31} />
          </span>
          <h3>The world is your lab.</h3>
          <p>
            Ask a question.
            <br />
            Make a prediction.
            <br />
            Follow the evidence.
          </p>
          <button onClick={() => setPage("guide")}>
            A little guidance <ArrowRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <span className="status-dot" />
          Private by design<small>Your videos stay on this device.</small>
          <a href="../">
            Explore Entelloq Labs <ArrowRight size={13} />
          </a>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {page === "lab"
                ? "Experiment lab"
                : page === "video"
                  ? "Video analysis"
                  : page === "notebook"
                    ? "My notebook"
                    : "Field guide"}
            </strong>
          </div>
          <div className="top-actions">
            <span className="beta-tag">EARLY LAB · v0.1</span>
            <button
              className="icon-btn"
              aria-label="Open field guide"
              onClick={() => setPage("guide")}
            >
              <CircleHelp size={18} />
            </button>
            <span className="avatar">E</span>
          </div>
        </header>
        <main id="main-content">
          {page === "lab" && (
            <>
              <div className="page-intro">
                <div>
                  <p className="eyebrow">
                    <span /> CURIOSITY, MEET EVIDENCE
                  </p>
                  <h1>
                    A little wonder.
                    <br className="mobile-br" /> A lot to discover.
                  </h1>
                  <p>
                    Change something. Notice what happens. Make the invisible
                    visible.
                  </p>
                </div>
                <button
                  className="primary-btn"
                  onClick={() => setPage("video")}
                >
                  <Plus size={17} /> Analyze a video
                </button>
              </div>
              <div className="experiment-tabs">
                {experiments.map((e) => (
                  <button
                    key={e.kind}
                    className={`experiment-tab ${config.kind === e.kind ? "selected" : ""}`}
                    onClick={() => select(e.kind)}
                  >
                    <span className="experiment-symbol">{e.icon}</span>
                    <span>
                      <strong>{e.name}</strong>
                      <small>{e.description}</small>
                    </span>
                    <span className="tab-number">{e.number}</span>
                  </button>
                ))}
              </div>
              {error && (
                <div className="error-box" role="alert">
                  {error}
                </div>
              )}
              <div className="lab-grid">
                <section className="simulation-card">
                  <div className="scene-header">
                    <span>
                      <span className="live-dot" /> {current.name}{" "}
                      <span className="model-tag">SIMULATION</span>
                    </span>
                    <button
                      className="scene-icon"
                      aria-label={
                        wide ? "Exit expanded view" : "Expand workspace"
                      }
                      onClick={() => setWide(!wide)}
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                  <World
                    config={config}
                    samples={samples}
                    time={time}
                    trail={trail}
                  />
                  {busy && (
                    <div className="scene-loading">Preparing the model…</div>
                  )}
                  <div className="scene-footer">
                    <label>
                      <input
                        type="checkbox"
                        checked={trail}
                        onChange={(e) => setTrail(e.target.checked)}
                      />{" "}
                      Motion trail
                    </label>
                    <span>1 metre · 1 second · endless questions</span>
                  </div>
                  <div className="transport">
                    <button
                      className="play-button"
                      disabled={busy || !!error}
                      aria-label={
                        playing ? "Pause simulation" : "Play simulation"
                      }
                      onClick={() => {
                        if (time >= 12) setTime(0);
                        setPlaying(!playing);
                      }}
                    >
                      {playing ? <Pause size={19} /> : <Play size={19} />}
                    </button>
                    <button
                      className="scene-icon"
                      aria-label="Restart simulation"
                      onClick={() => {
                        setTime(0);
                        setPlaying(false);
                      }}
                    >
                      <RotateCcw size={17} />
                    </button>
                    <input
                      aria-label="Simulation time"
                      type="range"
                      min="0"
                      max="12"
                      step="0.016666667"
                      value={time}
                      onChange={(e) => {
                        setPlaying(false);
                        setTime(+e.target.value);
                      }}
                    />
                    <span className="timecode">
                      {time.toFixed(2)} <small>/ 12 s</small>
                    </span>
                    <select
                      aria-label="Playback speed"
                      value={rate}
                      onChange={(e) => setRate(+e.target.value)}
                    >
                      <option value="0.25">0.25×</option>
                      <option value="0.5">0.5×</option>
                      <option value="1">1×</option>
                      <option value="2">2×</option>
                    </select>
                  </div>
                </section>
                <aside className="control-panel">
                  <div className="panel-title">
                    <h2>
                      <Settings2 size={17} /> Make it your experiment
                    </h2>
                    <button
                      className="text-btn"
                      onClick={() =>
                        setConfig({
                          ...DEFAULT_CONFIG,
                          kind: config.kind,
                          angle: config.kind === "projectile" ? 45 : 32,
                        })
                      }
                    >
                      Reset
                    </button>
                  </div>
                  <p className="panel-subtitle">
                    One small change. A new possibility.
                  </p>
                  <div className="planet-select">
                    <button
                      className={config.gravity === 9.81 ? "chosen" : ""}
                      onClick={() => change("gravity", 9.81)}
                    >
                      ◉ Earth
                    </button>
                    <button
                      className={config.gravity === 1.62 ? "chosen" : ""}
                      onClick={() => change("gravity", 1.62)}
                    >
                      ◐ Moon
                    </button>
                    <button
                      className={config.gravity === 3.71 ? "chosen" : ""}
                      onClick={() => change("gravity", 3.71)}
                    >
                      ● Mars
                    </button>
                  </div>
                  <Field
                    label="Gravity"
                    value={config.gravity}
                    min={1}
                    max={20}
                    step={0.01}
                    unit="m/s²"
                    onChange={(v) => change("gravity", v)}
                  />
                  {config.kind === "pendulum" ? (
                    <>
                      <Field
                        label="String length"
                        value={config.length}
                        min={0.4}
                        max={2.4}
                        step={0.05}
                        unit="m"
                        onChange={(v) => change("length", v)}
                      />
                      <Field
                        label="Release angle"
                        value={config.angle}
                        min={5}
                        max={80}
                        step={1}
                        unit="°"
                        onChange={(v) => change("angle", v)}
                      />
                    </>
                  ) : (
                    <>
                      <Field
                        label="Release height"
                        value={config.initialHeight}
                        min={0.3}
                        max={4}
                        step={0.1}
                        unit="m"
                        onChange={(v) => change("initialHeight", v)}
                      />
                      {config.kind === "bounce" ? (
                        <Field
                          label="Restitution"
                          value={config.restitution}
                          min={0}
                          max={0.95}
                          step={0.01}
                          unit=""
                          onChange={(v) => change("restitution", v)}
                        />
                      ) : (
                        <>
                          <Field
                            label="Launch speed"
                            value={config.speed}
                            min={1}
                            max={8}
                            step={0.1}
                            unit="m/s"
                            onChange={(v) => change("speed", v)}
                          />
                          <Field
                            label="Launch angle"
                            value={config.angle}
                            min={5}
                            max={85}
                            step={1}
                            unit="°"
                            onChange={(v) => change("angle", v)}
                          />
                        </>
                      )}
                    </>
                  )}
                  <div className="wonder-note">
                    <Sparkles size={17} />
                    <div>
                      <strong>A question to sit with</strong>
                      <p>
                        {config.kind === "pendulum"
                          ? "Would a heavier bob swing faster? This ideal model predicts that mass cancels out."
                          : config.kind === "bounce"
                            ? "If the ball reaches half its original height, has it kept half its speed?"
                            : "At the highest point, which part of the velocity becomes zero?"}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
              <div className="metrics">
                <div>
                  <span>
                    {config.kind === "pendulum"
                      ? "Period of oscillation"
                      : "Elapsed time"}
                  </span>
                  <strong>
                    {config.kind === "pendulum"
                      ? (period?.toFixed(2) ?? "—")
                      : time.toFixed(2)}{" "}
                    <small>s</small>
                  </strong>
                  <p>
                    {config.kind === "pendulum"
                      ? "Measured from the simulated motion"
                      : "Use the timeline to inspect a moment"}
                  </p>
                </div>
                <div>
                  <span>Current speed</span>
                  <strong>
                    {active ? Math.hypot(active.vx, active.vy).toFixed(2) : "—"}{" "}
                    <small>m/s</small>
                  </strong>
                  <p>How fast the object is moving</p>
                </div>
                <div>
                  <span>
                    {comparison ? "Model–observation RMSE" : "Current height"}
                  </span>
                  <strong>
                    {comparison
                      ? comparison.rmse.toFixed(3)
                      : (active?.y.toFixed(2) ?? "—")}{" "}
                    <small>m</small>
                  </strong>
                  <p>
                    {comparison
                      ? `${comparison.count} overlapping samples · ${axis} axis`
                      : "Measured above the reference level"}
                  </p>
                </div>
              </div>
              <section className="chart-card">
                <div className="chart-heading">
                  <div>
                    <p className="eyebrow">READ THE MOTION</p>
                    <h2>Every movement tells a story.</h2>
                  </div>
                  <div className="chart-tools">
                    <div className="segmented">
                      {(["x", "y", "speed"] as const).map((v) => (
                        <button
                          className={axis === v ? "chosen" : ""}
                          key={v}
                          onClick={() => setAxis(v)}
                        >
                          {v === "x"
                            ? "Position x"
                            : v === "y"
                              ? "Height y"
                              : "Speed"}
                        </button>
                      ))}
                    </div>
                    <button
                      className="icon-btn"
                      onClick={exportCsv}
                      aria-label="Export motion CSV"
                    >
                      <ArrowDownToLine size={17} />
                    </button>
                  </div>
                </div>
                <MotionChart
                  samples={samples}
                  observed={observation?.samples ?? []}
                  axis={axis}
                  time={time}
                  onTime={(t) => {
                    setPlaying(false);
                    setTime(Math.min(12, t));
                  }}
                />
                <div className="chart-caption">
                  <span>
                    <i className="legend-model" />
                    Theoretical model{" "}
                    {observation && (
                      <>
                        <i className="legend-observation" />
                        {observation.source === "video"
                          ? "Video observation"
                          : "Synthetic example"}
                      </>
                    )}
                  </span>
                  <span>
                    {observation ? (
                      <button
                        className="text-btn"
                        onClick={() => setObservation(undefined)}
                      >
                        Remove observation
                      </button>
                    ) : (
                      <button
                        className="text-btn"
                        onClick={() => setPage("video")}
                      >
                        Compare with a real experiment <ArrowRight size={13} />
                      </button>
                    )}
                  </span>
                </div>
                <details className="data-details">
                  <summary>Inspect accessible data table</summary>
                  <div className="table-scroll">
                    <table>
                      <caption>Model values sampled once per second</caption>
                      <thead>
                        <tr>
                          <th>Time (s)</th>
                          <th>x (m)</th>
                          <th>y (m)</th>
                          <th>vx (m/s)</th>
                          <th>vy (m/s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {samples
                          .filter((_, i) => i % 60 === 0)
                          .map((s) => (
                            <tr key={s.t}>
                              <td>{s.t.toFixed(1)}</td>
                              <td>{s.x.toFixed(3)}</td>
                              <td>{s.y.toFixed(3)}</td>
                              <td>{s.vx.toFixed(3)}</td>
                              <td>{s.vy.toFixed(3)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
              <section className="investigation-card">
                <div>
                  <p className="eyebrow">THINK LIKE A SCIENTIST</p>
                  <h2>Your next discovery starts with a question.</h2>
                  <p>Keep your prediction and the result together.</p>
                </div>
                <div className="investigation-form">
                  <label>
                    Investigation title
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={100}
                    />
                  </label>
                  <div className="notes-grid">
                    <label>
                      I predict…
                      <textarea
                        value={hypothesis}
                        onChange={(e) => setHypothesis(e.target.value)}
                        placeholder="What do you expect to change, and why?"
                        maxLength={4000}
                      />
                    </label>
                    <label>
                      I observed…
                      <textarea
                        value={conclusion}
                        onChange={(e) => setConclusion(e.target.value)}
                        placeholder="What happened? What might explain the difference?"
                        maxLength={4000}
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="secondary-btn" onClick={report}>
                      <ArrowDownToLine size={16} /> Export report
                    </button>
                    <button className="primary-btn" onClick={save}>
                      <Save size={16} /> Save investigation
                    </button>
                  </div>
                </div>
              </section>
              <p className="model-footnote">
                Model assumptions:{" "}
                {config.kind === "pendulum"
                  ? "massless fixed-length string, point bob, uniform gravity, no friction. Large angles use the nonlinear equation."
                  : config.kind === "bounce"
                    ? "rigid sphere, flat fixed floor, uniform gravity. Restitution controls energy loss; numerical contact has finite precision."
                    : "uniform gravity, point object, no drag. Motion ends at first ground contact."}{" "}
                <button className="text-btn" onClick={() => setPage("guide")}>
                  Understand the model <ArrowRight size={12} />
                </button>
              </p>
            </>
          )}
          {page === "video" && (
            <>
              <div className="page-intro">
                <div>
                  <p className="eyebrow">BRING THE REAL WORLD IN</p>
                  <h1>From a moment to a measurement.</h1>
                  <p>
                    Track a local recording. Set the scale. Discover the motion
                    hiding inside.
                  </p>
                </div>
              </div>
              <VideoLab
                onObservation={(o) => {
                  setObservation(o);
                  setPage("lab");
                  notify(
                    `Added ${o.samples.length} measured samples. Match the model's starting position and release time before comparing.`,
                  );
                }}
              />
              <div className="info-strip">
                <Layers3 size={20} />
                <p>
                  <strong>Compare like with like.</strong> Choose the
                  corresponding model in Experiment lab first. Align your
                  video’s start with the release, place the reference origin at
                  ground level (or the pendulum’s lowest point), and match the
                  initial conditions.
                </p>
              </div>
            </>
          )}
          {page === "notebook" && (
            <>
              <div className="page-intro">
                <div>
                  <p className="eyebrow">A RECORD OF YOUR CURIOSITY</p>
                  <h1>Small questions. Growing understanding.</h1>
                  <p>
                    Your investigations are saved locally in this browser.
                    Export reports for a lasting copy.
                  </p>
                </div>
                <button className="primary-btn" onClick={() => setPage("lab")}>
                  <Plus size={16} /> New investigation
                </button>
              </div>
              {notebook.length === 0 ? (
                <div className="empty-state">
                  <BookOpen size={44} />
                  <h2>Your first discovery belongs here.</h2>
                  <p>
                    Explore an experiment, write down a prediction, and save it
                    to start your notebook.
                  </p>
                  <button
                    className="primary-btn"
                    onClick={() => setPage("lab")}
                  >
                    Explore the lab <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="notebook-grid">
                  {notebook.map((entry) => (
                    <article className="notebook-card" key={entry.id}>
                      <div className="notebook-meta">
                        <span>{entry.config.kind}</span>
                        <time>
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </time>
                      </div>
                      <h2>{entry.title}</h2>
                      <p>
                        {entry.hypothesis ||
                          "An open question, ready to explore."}
                      </p>
                      <div className="notebook-actions">
                        <button
                          className="text-btn"
                          onClick={() => restore(entry)}
                        >
                          Open investigation <ArrowRight size={14} />
                        </button>
                        <button
                          className="icon-btn"
                          aria-label={`Delete ${entry.title}`}
                          onClick={() => {
                            try {
                              const next = notebook.filter(
                                (n) => n.id !== entry.id,
                              );
                              writeNotebook(next);
                              setNotebook(next);
                              notify(
                                "Investigation removed from this browser.",
                              );
                            } catch {
                              notify("Could not update browser storage.");
                            }
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
          {page === "guide" && (
            <>
              <div className="page-intro">
                <div>
                  <p className="eyebrow">THE ART OF ASKING BETTER QUESTIONS</p>
                  <h1>A field guide to curiosity.</h1>
                  <p>
                    Good science starts with a useful question and an honest
                    measurement.
                  </p>
                </div>
              </div>
              <div className="guide-grid">
                {[
                  {
                    n: "01",
                    title: "Predict before you press play.",
                    body: "Write down what you expect. Change one variable at a time so you can connect a cause to an effect. A surprising result is a useful result.",
                  },
                  {
                    n: "02",
                    title: "Give your pixels a scale.",
                    body: "Keep the camera still and perpendicular to the plane of motion. Include a ruler in that same plane. Mark its endpoints and enter the real distance. Perspective and lens distortion can bias the measurement.",
                  },
                  {
                    n: "03",
                    title: "Follow the object, then question the track.",
                    body: "Pick a distinctive, high-contrast region on the moving object. Avoid occlusion, changing lighting, and motion blur. Tracking similarity is a match score, not a statistical confidence interval. Inspect the path before using the data.",
                  },
                  {
                    n: "04",
                    title: "A model is a deliberate simplification.",
                    body: "Our pendulum uses nonlinear motion without friction. The ball uses a rigid-body contact model. The projectile neglects air resistance. Disagreement with reality can reveal missing physics, measurement error, or a poor starting assumption.",
                  },
                  {
                    n: "05",
                    title: "Keep units and uncertainty visible.",
                    body: "Positions use metres, time uses seconds, and velocity uses metres per second. Video y is flipped into an upward-positive scientific coordinate system. Derivatives amplify noise; reported velocities are estimates.",
                  },
                  {
                    n: "06",
                    title: "Save what would let someone repeat it.",
                    body: "Keep your starting conditions, calibration, prediction, observations, and conclusion. CSV exports contain your samples; the JSON report includes model settings and assumptions. Your video stays on your device.",
                  },
                ].map((g) => (
                  <article className="guide-card" key={g.n}>
                    <span>{g.n}</span>
                    <h2>{g.title}</h2>
                    <p>{g.body}</p>
                  </article>
                ))}
              </div>
              <div className="engine-card">
                <Atom size={30} />
                <div>
                  <h2>Built on open scientific foundations.</h2>
                  <p>
                    <a
                      href="https://github.com/dimforge/rapier"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Rapier
                    </a>{" "}
                    powers rigid-body dynamics.{" "}
                    <a
                      href="https://github.com/opencv/opencv"
                      target="_blank"
                      rel="noreferrer"
                    >
                      OpenCV
                    </a>{" "}
                    powers video template matching. The mathematical model,
                    recording, and your interpretation remain separate.
                  </p>
                </div>
              </div>
              <button className="primary-btn" onClick={() => setPage("lab")}>
                <ArrowLeft size={16} /> Back to the experiment
              </button>
            </>
          )}
          <footer className="footer">
            <span>
              ENTELLOQ <span className="footer-divider">/</span> Reality Lab
            </span>
            <span>Made for the questions that won’t leave you alone.</span>
            <a href="../">
              All labs <ArrowRight size={13} />
            </a>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
