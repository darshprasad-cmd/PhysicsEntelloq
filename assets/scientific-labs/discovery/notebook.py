# /// script
# requires-python = ">=3.12"
# dependencies = ["marimo==0.25.2"]
# ///
"""Entelloq Discovery: an editable, reactive scientific notebook.

The exported browser edition runs this same Python in Pyodide. Generated data
are educational fixtures; estimates are conditional on the stated model.
"""
import marimo

__generated_with = "0.25.2"
app = marimo.App(width="medium", app_title="Entelloq Discovery", css_file="notebook.css")

with app.setup:
    import csv
    import html
    import io
    import json
    import math
    import random
    import statistics
    import marimo as mo


@app.function
def parse_measurements(contents: bytes, columns: tuple[str, ...], minimum: int = 4):
    """Validate a bounded numeric CSV. Extra columns are allowed and ignored."""
    if len(contents) > 1_000_000:
        raise ValueError("Use a CSV smaller than 1 MB.")
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("Save your CSV as UTF-8 text.") from exc
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames or any(name not in reader.fieldnames for name in columns):
        raise ValueError("Expected column headers: " + ", ".join(columns) + ".")
    if len(set(reader.fieldnames)) != len(reader.fieldnames):
        raise ValueError("Column headers must be unique.")
    rows = []
    for line, row in enumerate(reader, start=2):
        if len(rows) >= 5000:
            raise ValueError("Use at most 5,000 data rows.")
        try:
            values = {name: float(row[name]) for name in columns}
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Row {line} has a missing or non-numeric value.") from exc
        if not all(math.isfinite(value) and abs(value) <= 1_000_000 for value in values.values()):
            raise ValueError(f"Row {line} must contain finite values within ±1,000,000.")
        rows.append(values)
    if len(rows) < minimum:
        raise ValueError(f"Include at least {minimum} measurements.")
    return rows


@app.function
def pendulum_period(length: float, gravity: float):
    if not (math.isfinite(length) and math.isfinite(gravity) and length > 0 and gravity > 0):
        raise ValueError("Length and gravity must be positive finite values.")
    return 2 * math.pi * math.sqrt(length / gravity)


@app.function
def fit_pendulum(rows):
    """Unweighted OLS of T = A sqrt(L), through zero. Residual-based 1σ SE."""
    if len(rows) < 3 or any(row["length_m"] <= 0 or row["period_s"] <= 0 for row in rows):
        raise ValueError("Use at least three positive lengths and positive periods.")
    roots = [math.sqrt(row["length_m"]) for row in rows]
    periods = [row["period_s"] for row in rows]
    denominator = sum(value * value for value in roots)
    coefficient = sum(x * y for x, y in zip(roots, periods)) / denominator
    residuals = [y - coefficient * x for x, y in zip(roots, periods)]
    variance = sum(value * value for value in residuals) / (len(rows) - 1)
    coefficient_se = math.sqrt(variance / denominator)
    gravity = (2 * math.pi / coefficient) ** 2
    return {"gravity": gravity, "gravity_se": 2 * gravity * coefficient_se / coefficient,
            "coefficient": coefficient, "rms": math.sqrt(sum(x * x for x in residuals) / len(rows)), "residuals": residuals}


@app.function
def solve_linear(matrix, values):
    """Small dense Gaussian elimination with partial pivoting; no hidden library."""
    n = len(values)
    work = [list(map(float, row)) + [float(value)] for row, value in zip(matrix, values)]
    for column in range(n):
        pivot = max(range(column, n), key=lambda row: abs(work[row][column]))
        if abs(work[pivot][column]) < 1e-12:
            raise ValueError("The measurements do not span enough distinct times for a fit.")
        work[column], work[pivot] = work[pivot], work[column]
        divisor = work[column][column]
        work[column] = [value / divisor for value in work[column]]
        for row in range(n):
            if row != column:
                factor = work[row][column]
                work[row] = [a - factor * b for a, b in zip(work[row], work[column])]
    return [row[-1] for row in work]


@app.function
def fit_projectile(rows):
    """Fit y=c+bt+at² on a centered/scaled time basis, with residual-based SE."""
    if len(rows) < 4:
        raise ValueError("At least four positions are needed for a quadratic fit with uncertainty.")
    times = [row["time_s"] for row in rows]
    if min(times) < 0:
        raise ValueError("Time must be non-negative and measured from your chosen release.")
    if len(set(times)) != len(times):
        raise ValueError("Each row must have a distinct timestamp.")
    center = statistics.mean(times)
    scale = max(times) - min(times)
    if scale < 1e-6:
        raise ValueError("Measurements must span more than one microsecond.")
    basis = [[1.0, (t - center) / scale, ((t - center) / scale) ** 2] for t in times]
    normal = [[sum(row[i] * row[j] for row in basis) for j in range(3)] for i in range(3)]
    rhs = [sum(row[i] * value["y_m"] for row, value in zip(basis, rows)) for i in range(3)]
    coefficients = solve_linear(normal, rhs)
    a = coefficients[2] / scale ** 2
    b = coefficients[1] / scale - 2 * coefficients[2] * center / scale ** 2
    c = coefficients[0] - coefficients[1] * center / scale + coefficients[2] * center ** 2 / scale ** 2
    residuals = [row["y_m"] - (c + b * row["time_s"] + a * row["time_s"] ** 2) for row in rows]
    variance = sum(value ** 2 for value in residuals) / (len(rows) - 3)
    inverse_column = solve_linear(normal, [0, 0, 1])
    gravity_se = 2 * math.sqrt(max(0, variance * inverse_column[2])) / scale ** 2
    mean_x = statistics.mean(row["x_m"] for row in rows)
    denominator = sum((t - center) ** 2 for t in times)
    velocity_x = sum((row["time_s"] - center) * (row["x_m"] - mean_x) for row in rows) / denominator
    return {"gravity": -2 * a, "gravity_se": gravity_se, "vy0": b, "height0": c,
            "vx": velocity_x, "x0": mean_x - velocity_x * center,
            "rms": math.sqrt(sum(value ** 2 for value in residuals) / len(rows)), "residuals": residuals}


@app.function
def alias_frequency(frequency: float, sample_rate: float):
    if not (math.isfinite(frequency) and math.isfinite(sample_rate) and frequency >= 0 and sample_rate > 0):
        raise ValueError("Use a non-negative signal frequency and a positive sampling rate.")
    return abs((frequency + sample_rate / 2) % sample_rate - sample_rate / 2)


@app.function
def chart_svg(series, title, xlabel, ylabel, height=300):
    """Accessible deterministic SVG; all series are (label, points, color, kind)."""
    all_points = [point for _, points, _, _ in series for point in points]
    if not all_points:
        return ""
    xs, ys = zip(*all_points)
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(0, min(ys)), max(ys)
    if xmax - xmin < 1e-9: xmax = xmin + 1
    if ymax - ymin < 1e-9: ymax = ymin + 1
    padding = (ymax - ymin) * .1
    ymin, ymax = ymin - padding, ymax + padding
    width, left, right, top, bottom = 820, 70, 24, 28, 58
    px = lambda x: left + (x - xmin) / (xmax - xmin) * (width - left - right)
    py = lambda y: height - bottom - (y - ymin) / (ymax - ymin) * (height - top - bottom)
    parts = [f'<svg viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;background:#fbf9f5;border-radius:12px"><title>{html.escape(title)}</title>']
    for index in range(5):
        y = ymin + (ymax - ymin) * index / 4
        parts.append(f'<path d="M {left} {py(y):.2f} H {width-right}" stroke="#e7e2d9"/><text x="{left-12}" y="{py(y)+4:.2f}" text-anchor="end" fill="#80796e" font-size="11">{y:.3g}</text>')
        x = xmin + (xmax - xmin) * index / 4
        parts.append(f'<text x="{px(x):.2f}" y="{height-bottom+24}" text-anchor="middle" fill="#80796e" font-size="11">{x:.3g}</text>')
    for label, points, color, kind in series:
        if kind == "dots":
            parts.extend(f'<circle cx="{px(x):.2f}" cy="{py(y):.2f}" r="3.3" fill="{color}"/>' for x, y in points)
        else:
            path = " ".join(f'{"M" if index == 0 else "L"} {px(x):.2f} {py(y):.2f}' for index, (x, y) in enumerate(points))
            dash = 'stroke-dasharray="7 5"' if kind == "dash" else ""
            parts.append(f'<path d="{path}" fill="none" stroke="{color}" stroke-width="2.3" {dash}/>')
    parts.append(f'<text x="{width/2}" y="{height-10}" text-anchor="middle" fill="#695f4f" font-size="12">{html.escape(xlabel)}</text><text transform="translate(16 {height/2}) rotate(-90)" text-anchor="middle" fill="#695f4f" font-size="12">{html.escape(ylabel)}</text></svg>')
    legend = ''.join(f'<span style="display:inline-flex;gap:7px;align-items:center"><i style="width:16px;height:3px;background:{color};display:inline-block"></i>{html.escape(label)}</span>' for label, _, color, _ in series)
    return ''.join(parts) + f'<div style="display:flex;gap:20px;flex-wrap:wrap;font-size:11px;color:#73634c;padding:12px 8px">{legend}</div>'


@app.function
def data_table(rows, limit=10):
    if not rows: return ""
    headers = list(rows[0])
    head = ''.join(f'<th>{html.escape(name)}</th>' for name in headers)
    body = ''.join('<tr>' + ''.join(f'<td>{row[name]:.5g}</td>' for name in headers) + '</tr>' for row in rows[:limit])
    return f'<div class="discovery-table"><table><caption>First {min(limit,len(rows))} of {len(rows)} rows. Download CSV for all rows.</caption><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


@app.function
def rows_csv(rows):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0]))
    writer.writeheader(); writer.writerows(rows)
    return output.getvalue()


@app.cell(hide_code=True)
def _():
    mo.Html('''<style>
    :root{--green:#f5c778;--ink:#272117}body{background:#f6f3ef!important}.discovery-header{background:#251f14;border:1px solid #3d3425;color:#efe9df;padding:36px 38px;border-radius:18px;margin:4px 0 18px}.discovery-header a{color:#d6c29f;text-decoration:none;font-size:11px}.discovery-header .kicker{font-size:10px;letter-spacing:2.2px;color:#dfbf88;margin:25px 0 10px}.discovery-header h1{font-size:40px;letter-spacing:-1.7px;line-height:1.12;margin:0 0 16px;font-weight:580}.discovery-header p{font-size:13px;line-height:1.8;color:#bdb5a8;max-width:580px;margin:0}.discovery-badge{display:inline-block;margin-top:20px;border:1px solid #60523a;border-radius:30px;padding:6px 10px;font-size:10px;color:#f5c778}.discovery-result{padding:27px;background:#f0eae0;border:1px solid #e3d9c9;border-radius:14px;margin:16px 0}.discovery-result h2{font-size:24px;margin:0 0 8px;letter-spacing:-.6px}.discovery-result p{font-size:12px;line-height:1.7;color:#73634c}.discovery-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:24px 0}.discovery-metric{padding:16px 18px;background:#faf7f3;border:1px solid #e5ded2;border-radius:10px}.discovery-metric strong{display:block;font-size:25px;font-weight:550;letter-spacing:-.8px}.discovery-metric span{font-size:10px;color:#73634c}.discovery-note{font-size:11px;padding:13px 16px;border-left:3px solid #ad956b;background:#f2eee6;color:#70634c;line-height:1.7;margin:12px 0}.discovery-error{padding:20px;border-radius:10px;background:#fff0e3;border:1px solid #eac8aa;color:#865431}.discovery-table{overflow:auto}.discovery-table table{font-size:11px;width:100%;border-collapse:collapse}.discovery-table th,.discovery-table td{padding:8px 12px;text-align:left;border-bottom:1px solid #e6e0d7}.discovery-table caption{text-align:left;color:#73634c;margin:10px 0}.discovery-section{font-size:10px;letter-spacing:1.8px;color:#73634c;text-transform:uppercase;margin-top:18px}@media(max-width:620px){.discovery-header{padding:25px}.discovery-header h1{font-size:30px}.discovery-metrics{grid-template-columns:1fr}.discovery-result{padding:18px}}
    </style><div class="discovery-header"><a href="index.html">← Discovery home</a> <span style="color:#746449;padding:0 8px">/</span> <a href="../">All Entelloq labs</a><div class="kicker">ENTELLOQ · DISCOVERY NOTEBOOK</div><h1>A question.<br>A model. A little evidence.</h1><p>Change a parameter and the Python notebook recomputes. Follow a fit, question an uncertainty, or discover what a measurement leaves out.</p><span class="discovery-badge">REACTIVE PYTHON · POWERED BY MARIMO</span></div>''')
    return


@app.cell(hide_code=True)
def _():
    investigation = mo.ui.dropdown(options=["Pendulum · measure gravity", "Projectile · fit a flight", "Sampling · the missing motion"], value="Pendulum · measure gravity", label="Choose an investigation")
    data_source = mo.ui.radio(options=["Synthetic demonstration", "My CSV"], value="Synthetic demonstration", inline=True, label="Evidence source")
    gravity = mo.ui.slider(1.6, 20, step=.1, value=9.8, label="Model gravity (m/s²)", show_value=True)
    length = mo.ui.slider(.2, 2.5, step=.05, value=1.0, label="Reference length (m)", show_value=True)
    period_noise = mo.ui.slider(0, .12, step=.005, value=.025, label="Synthetic period noise σ (s)", show_value=True)
    repetitions = mo.ui.slider(6, 40, step=1, value=16, label="Synthetic measurements", show_value=True)
    speed = mo.ui.slider(2, 16, step=.5, value=8, label="Launch speed (m/s)", show_value=True)
    angle = mo.ui.slider(10, 80, step=1, value=45, label="Launch angle (°)", show_value=True)
    height = mo.ui.slider(0, 3, step=.1, value=1, label="Launch height (m)", show_value=True)
    position_noise = mo.ui.slider(0, .15, step=.005, value=.03, label="Synthetic position noise σ (m)", show_value=True)
    signal_frequency = mo.ui.slider(.5, 20, step=.5, value=7, label="Signal frequency (Hz)", show_value=True)
    sampling_rate = mo.ui.slider(2, 60, step=1, value=10, label="Sampling rate (samples/s)", show_value=True)
    seed = mo.ui.number(0, 9999, value=42, step=1, label="Reproducible seed")
    pendulum_upload = mo.ui.file(filetypes=[".csv"], multiple=False, max_size=1_000_000, label="Pendulum CSV")
    projectile_upload = mo.ui.file(filetypes=[".csv"], multiple=False, max_size=1_000_000, label="Projectile CSV")
    reflection = mo.ui.text_area(label="My prediction and interpretation", placeholder="What changed? Which assumption would you test next?", rows=3, max_length=6000)
    mo.vstack([investigation, mo.md("**Start here:** choose a question, change one parameter, then inspect the fitted result and its limits. Generated datasets are always labelled synthetic. Import your own CSV when you are ready.")])
    return (investigation, data_source, gravity, length, period_noise, repetitions, speed, angle, height, position_noise, signal_frequency, sampling_rate, seed, pendulum_upload, projectile_upload, reflection)


@app.cell(hide_code=True)
def _(investigation, data_source, gravity, length, period_noise, repetitions, speed, angle, height, position_noise, signal_frequency, sampling_rate, seed, pendulum_upload, projectile_upload):
    if investigation.value.startswith("Pendulum"):
        _controls = mo.vstack([mo.md("### How much can a swinging bob tell you?\nFor small oscillations, **T = 2π√(L/g)**. Fit period against √length and infer gravity. The synthetic measurements vary length around your reference."), data_source, mo.hstack([gravity, length], wrap=True), mo.hstack([period_noise, repetitions], wrap=True), seed])
        if data_source.value == "My CSV":
            _controls = mo.vstack([_controls, pendulum_upload, mo.md("CSV headers: `length_m,period_s`. At least 4 positive measurements; 1 MB / 5,000 rows maximum. Time several complete cycles and divide by the cycle count. Synthetic noise/count/seed controls do not alter imported measurements.")])
    elif investigation.value.startswith("Projectile"):
        _controls = mo.vstack([mo.md("### Can the curve reveal the force?\nFit **y(t) = y₀ + vᵧt − ½gt²**. Compare the gravity inferred from the curve with your model. Coordinates must be in metres, with y positive upward."), data_source, mo.hstack([gravity, speed], wrap=True), mo.hstack([angle, height], wrap=True), mo.hstack([position_noise, seed], wrap=True)])
        if data_source.value == "My CSV":
            _controls = mo.vstack([_controls, projectile_upload, mo.md("CSV headers: `time_s,x_m,y_m`. At least 4 distinct non-negative timestamps; 1 MB / 5,000 rows maximum. Reality Lab CSV exports work directly. Choose only the airborne part: bounces and floor contact violate this model. Noise/seed controls do not alter imported measurements.")])
    else:
        _controls = mo.vstack([mo.md("### What if your camera misses the motion?\nA continuous cosine is sampled at regular intervals. Another frequency can pass through exactly the same samples. This is **aliasing**."), mo.hstack([signal_frequency, sampling_rate], wrap=True), mo.md("Try a 7 Hz signal sampled at 10 samples/s, then increase the sampling rate above 14. The signal is generated mathematically; no physical sensor data are used.")])
    _controls
    return


@app.cell(hide_code=True)
def _(investigation, data_source, gravity, length, period_noise, repetitions, speed, angle, height, position_noise, signal_frequency, sampling_rate, seed, pendulum_upload, projectile_upload):
    rows = []
    report = {}
    chart = ""
    residual_chart = ""
    result_html = ""
    dataset_error = ""
    _random = random.Random(seed.value)
    _g = gravity.value
    try:
        if investigation.value.startswith("Pendulum"):
            if data_source.value == "My CSV":
                if not pendulum_upload.value: raise ValueError("Choose a pendulum CSV to begin. Your synthetic results are hidden while waiting for your file.")
                rows = parse_measurements(pendulum_upload.contents(), ("length_m", "period_s"))
                _provenance = "User CSV: " + pendulum_upload.name()
            else:
                rows = [{"length_m": length.value * (.3 + 1.4 * i / (repetitions.value - 1)), "period_s": max(.001, pendulum_period(length.value * (.3 + 1.4 * i / (repetitions.value - 1)), _g) + _random.gauss(0, period_noise.value))} for i in range(repetitions.value)]
                _provenance = f"Synthetic small-angle pendulum; Gaussian period noise; seed {seed.value}. Not measured evidence."
            _fit = fit_pendulum(rows)
            _min_l, _max_l = min(row["length_m"] for row in rows), max(row["length_m"] for row in rows)
            _lengths = [_min_l + (_max_l - _min_l) * i / 100 for i in range(101)]
            chart = chart_svg([("Measurements", [(r["length_m"], r["period_s"]) for r in rows], "#8e764d", "dots"), ("Fitted model", [(x, pendulum_period(x, _fit["gravity"])) for x in _lengths], "#3e3423", "line"), ("Your model gravity", [(x, pendulum_period(x, _g)) for x in _lengths], "#c17e47", "dash")], "Period versus length", "Length (m)", "Period (s)")
            residual_chart = chart_svg([("Period residuals", [(r["length_m"], e) for r, e in zip(rows, _fit["residuals"])], "#9a8054", "dots")], "Period residuals", "Length (m)", "Observed − fitted (s)", 220)
            _metrics = [(f'{_fit["gravity"]:.3f}', 'fitted g · m/s²'), (f'± {_fit["gravity_se"]:.3f}', 'residual-based 1σ · m/s²'), (f'{_fit["rms"]:.4f}', 'RMS period residual · s')]
            _limits = "Small-angle, ideal pendulum; fixed pivot, point bob, no drag. Fit T=A√L through zero. The 1σ estimate uses independent equal-variance period residuals and first-order propagation; it excludes length uncertainty, timing bias and model error. It is not a guaranteed accuracy bound."
            _title = "A measurement of a model."
            _sweep = [{"length_m": length.value * factor, "model_period_s": pendulum_period(length.value * factor, _g)} for factor in [.5, .75, 1, 1.25, 1.5]]
            report = {"investigation": "pendulum", "provenance": _provenance, "parameters": {"model_gravity_m_s2": _g, "reference_length_m": length.value, "synthetic_noise_s": period_noise.value, "synthetic_seed": seed.value}, "fit": _fit, "parameter_sweep": _sweep, "limits": _limits}
        elif investigation.value.startswith("Projectile"):
            _vx = speed.value * math.cos(math.radians(angle.value))
            _vy = speed.value * math.sin(math.radians(angle.value))
            _flight = (_vy + math.sqrt(_vy ** 2 + 2 * _g * height.value)) / _g
            if data_source.value == "My CSV":
                if not projectile_upload.value: raise ValueError("Choose a projectile CSV to begin. Select an airborne interval with calibrated metres and seconds.")
                rows = parse_measurements(projectile_upload.contents(), ("time_s", "x_m", "y_m"))
                rows = sorted(rows, key=lambda row: row["time_s"])
                _provenance = "User CSV: " + projectile_upload.name()
            else:
                rows = [{"time_s": _flight * i / 35, "x_m": _vx * _flight * i / 35 + _random.gauss(0, position_noise.value), "y_m": height.value + _vy * _flight * i / 35 - .5 * _g * (_flight * i / 35) ** 2 + _random.gauss(0, position_noise.value)} for i in range(36)]
                _provenance = f"Synthetic ideal projectile; independent Gaussian position noise; seed {seed.value}. Not measured evidence."
            _fit = fit_projectile(rows)
            _times = [min(r["time_s"] for r in rows) + (max(r["time_s"] for r in rows) - min(r["time_s"] for r in rows)) * i / 150 for i in range(151)]
            chart = chart_svg([("Measurements", [(r["time_s"], r["y_m"]) for r in rows], "#8e764d", "dots"), ("Fitted flight", [(t, _fit["height0"] + _fit["vy0"] * t - .5 * _fit["gravity"] * t * t) for t in _times], "#3e3423", "line"), ("Your model", [(t, height.value + _vy * t - .5 * _g * t * t) for t in _times], "#c17e47", "dash")], "Vertical position versus time", "Time (s)", "Height (m)")
            residual_chart = chart_svg([("Vertical residuals", [(r["time_s"], e) for r, e in zip(rows, _fit["residuals"])], "#9a8054", "dots")], "Vertical fit residuals", "Time (s)", "Observed − fitted (m)", 220)
            _metrics = [(f'{_fit["gravity"]:.3f}', 'fitted g · m/s²'), (f'± {_fit["gravity_se"]:.3f}', 'residual-based 1σ · m/s²'), (f'{_fit["rms"]:.4f}', 'RMS vertical residual · m')]
            _limits = "Uniform gravity, no air resistance, no collision, calibrated y-up coordinates. Unweighted quadratic least squares. The 1σ estimate assumes independent equal-variance vertical errors; timing, calibration, perspective and model errors are excluded. A negative fitted g indicates upward curvature, not evidence of negative physical gravity."
            _title = "Let the trajectory speak."
            report = {"investigation": "projectile", "provenance": _provenance, "parameters": {"model_gravity_m_s2": _g, "speed_m_s": speed.value, "angle_deg": angle.value, "height_m": height.value, "synthetic_noise_m": position_noise.value, "synthetic_seed": seed.value}, "fit": _fit, "limits": _limits}
        else:
            _f, _fs = signal_frequency.value, sampling_rate.value
            _alias = alias_frequency(_f, _fs)
            _times = [i * 3 / 1200 for i in range(1201)]
            rows = [{"time_s": i / _fs, "amplitude": math.cos(2 * math.pi * _f * i / _fs)} for i in range(int(3 * _fs) + 1)]
            chart = chart_svg([("Continuous signal", [(t, math.cos(2 * math.pi * _f * t)) for t in _times], "#a99b83", "line"), ("Indistinguishable alias", [(t, math.cos(2 * math.pi * _alias * t)) for t in _times], "#bc7f47", "dash"), ("Captured samples", [(r["time_s"], r["amplitude"]) for r in rows], "#3f3420", "dots")], "Sampling and aliasing", "Time (s)", "Amplitude (arbitrary units)", 350)
            _metrics = [(f'{_f:g}', 'true frequency · Hz'), (f'{_alias:g}', 'folded frequency · Hz'), (f'{_fs:g}', 'sampling rate · samples/s')]
            _provenance = "Analytic cosine samples; no sensor data, noise or random draw."
            _limits = "Uniform instantaneous sampling of one cosine with zero phase. Frequencies separated by integer multiples of the sampling rate can produce identical samples. The Nyquist condition requires sampling strictly above twice the highest signal frequency, plus suitable filtering in real instruments. Finite records, noise and camera exposure add limitations."
            _title = "The samples do not tell the whole story." if _fs <= 2 * _f else "Enough samples to resolve this frequency."
            report = {"investigation": "sampling", "provenance": _provenance, "parameters": {"signal_hz": _f, "sample_rate_hz": _fs, "phase_rad": 0}, "fit": {"folded_frequency_hz": _alias, "strict_nyquist_satisfied": _fs > 2 * _f}, "limits": _limits}
        _metric_html = ''.join(f'<div class="discovery-metric"><strong>{value}</strong><span>{html.escape(label)}</span></div>' for value, label in _metrics)
        result_html = f'<section class="discovery-result"><h2>{_title}</h2><p>{html.escape(report["provenance"])}</p><div class="discovery-metrics">{_metric_html}</div>{chart}<div class="discovery-note">{html.escape(_limits)}</div></section>'
    except (ValueError, csv.Error, OverflowError, ZeroDivisionError) as _error:
        dataset_error = str(_error)
        rows = []
        report = {}
        result_html = f'<div class="discovery-error" role="alert"><strong>Let’s check the data.</strong><p>{html.escape(dataset_error)}</p></div>'
    mo.Html(result_html)
    return (rows, report, residual_chart, dataset_error)


@app.cell(hide_code=True)
def _(rows, report, residual_chart):
    _view = mo.Html("")
    if rows:
        _details = {"Inspect the first measurements": mo.Html(data_table(rows))}
        if residual_chart: _details["Look at what the fit missed"] = mo.vstack([mo.md("Residuals should be inspected for structure. A smooth trend can indicate missing physics or a biased measurement; a small residual does not establish the model is true."), mo.Html(residual_chart)])
        if "parameter_sweep" in report: _details["Sweep the length, predict the period"] = mo.Html(data_table(report["parameter_sweep"]))
        _view = mo.accordion(_details)
    _view
    return


@app.cell(hide_code=True)
def _(reflection):
    mo.vstack([mo.md("### Keep the question with the evidence\nRecord your prediction, what changed, and what the model leaves out. Your notes are included in the report download; they are not automatically saved."), reflection])
    return


@app.cell(hide_code=True)
def _(rows, report, reflection):
    _downloads = mo.Html("")
    if rows:
        _complete_report = {"product": "Entelloq Discovery", "schema_version": 1, "engine": "marimo 0.25.2 / Python", **report, "reflection": reflection.value, "rows": rows}
        _downloads = mo.hstack([mo.download(json.dumps(_complete_report, indent=2, allow_nan=False).encode(), filename="entelloq-discovery-report.json", mimetype="application/json", label="Download investigation report"), mo.download(rows_csv(rows).encode(), filename=f'{report["investigation"]}-measurements.csv', mimetype="text/csv", label="Download data CSV")], justify="start", gap=1, wrap=True)
    _downloads
    return


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    ---
    **Your next question matters.** Change one assumption, repeat a measurement, and keep the uncertainty visible.

    Browser edition: Python executes on your device; your CSV is processed in browser memory. First load requires internet for marimo and Pyodide. Native edition: keep the server bound to your own device for local processing. Notes and uploads reset when you reload. [Editable notebook source](notebook.py) · [Methods & limitations](README.md) · [Open-source marimo](https://github.com/marimo-team/marimo)
    """)
    return


if __name__ == "__main__":
    app.run()
