/* Isolated Class 9 pulse measurement rehearsal. Original schematic, no legacy model mutation. */
var PulseLab = (function () {
  'use strict';
  var M = PeqPulseModel, KEY = 'peq_pulse_v1', book = null, stored = true;
  var active = null, cleanup = null, first = true;
  function esc(value) { return String(value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fixed(n, digits) { return Number(n).toFixed(digits === undefined ? 2 : digits); }
  function read() {
    if (book) return book;
    try { book = M.validateNotebook(JSON.parse(localStorage.getItem(KEY) || 'null')); }
    catch (e) { book = { v: 1, trials: [] }; stored = false; }
    return book;
  }
  function save() {
    book = M.validateNotebook(read());
    try { localStorage.setItem(KEY, JSON.stringify(book)); stored = true; } catch (e) { stored = false; }
  }
  function input(id, title, min, max, step) {
    return '<div><label for="' + id + '">' + title + '</label><input id="' + id + '" type="number" inputmode="decimal" min="' + min + '" max="' + max + '" step="' + step + '" required></div>';
  }
  function stop() { if (cleanup) cleanup(); cleanup = null; active = null; }
  function render() {
    stop();
    var s = active = { settings: M.defaults(), elapsedS: 0, playing: false }, raf = 0, last = 0;
    var media = window.matchMedia('(prefers-reduced-motion: reduce)');
    read();
    main.innerHTML = '<section class="wrap pulse-workspace"><div class="pulse-top"><a href="#practicals:9">← Class 9 practicals</a><span>PHYSICS STRAND / SCIENCE / CBSE IX</span></div>' +
      '<header class="pulse-heading"><p class="pulse-eyebrow">THE PULSE BENCH</p><h1 tabindex="-1">One pulse.<br>A measurable journey.</h1><p>Follow a disturbance along a stretched string. Count its return journeys, read a simulated timer, and turn three observations into a speed.</p><p class="pulse-limit">Interactive preparation, not a physical practical record. Ideal string motion and synthetic timing readings are kept separate.</p></header>' +
      '<div class="pulse-layout"><section class="pulse-card pulse-instrument" aria-labelledby="pulse-instrument-title"><div class="pulse-section-head"><h2 id="pulse-instrument-title">01 / Set up and observe</h2><span>MANUAL REPLAY BY DEFAULT</span></div>' +
      '<div class="pulse-fields"><label>Ideal teaching string<select id="pulse-setup"><option value="A">Setup A · model speed 3 m/s</option><option value="B">Setup B · model speed 4 m/s</option></select></label><label>String length L<select id="pulse-length">' + [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(function (n) { return '<option value="' + n + '">' + fixed(n, 1) + ' m</option>'; }).join('') + '</select></label><label>Target round trips N<select id="pulse-trips"><option value="1">1 round trip · 2 traversals</option><option value="3">3 round trips · 6 traversals</option><option value="5">5 round trips · 10 traversals</option></select></label><label>Repeat trial<select id="pulse-trial"><option value="0">Trial 1</option><option value="1">Trial 2</option><option value="2">Trial 3</option></select></label></div>' +
      '<div class="pulse-art"><svg id="pulse-svg" viewBox="0 0 720 240" role="img" aria-labelledby="pulse-svg-title pulse-svg-desc"><title id="pulse-svg-title">Pulse travelling on a stretched string</title><desc id="pulse-svg-desc"></desc><rect class="pulse-board" x="1" y="1" width="718" height="238" rx="12"/><path class="pulse-clamp" d="M50 80V160M670 80V160"/><path class="pulse-baseline" d="M50 120H670"/><path id="pulse-wave" class="pulse-wave"/><g id="pulse-scale"></g><circle id="pulse-marker" r="5" cy="120"/><text x="50" y="40">START / RETURN</text><text x="670" y="40" text-anchor="end">FIXED END</text><text id="pulse-string-label" x="360" y="220" text-anchor="middle"></text></svg></div>' +
      '<p class="pulse-caption">Original transverse-string schematic. Width and displacement are exaggerated; both ends reflect the pulse with inversion. The gold dot tracks the pulse position, not a material particle. String material does not travel to the far end.</p>' +
      '<div class="pulse-readouts"><div><span>Ideal motion clock</span><strong id="pulse-clock">0.00 s</strong></div><div><span>Completed round trips</span><strong id="pulse-returns">0 / 3</strong></div><div><span>Captured timer reading</span><strong id="pulse-timer">Not captured</strong></div></div>' +
      '<label for="pulse-scrub">Inspect the journey · ideal model time in seconds</label><input id="pulse-scrub" type="range" min="0" step="any" value="0"><div class="pulse-actions"><button id="pulse-step" type="button">Step +0.10 s</button><button id="pulse-finish" type="button">Step to target return</button><button id="pulse-play" type="button">Play replay</button><button id="pulse-restart" type="button">Restart replay</button></div><p id="pulse-motion-status" role="status"></p>' +
      '<details><summary>Text equivalent of this journey</summary><p id="pulse-text"></p></details><p id="pulse-offset" class="pulse-fine"></p></section>' +
      '<section class="pulse-card" aria-labelledby="pulse-measure-title"><p class="pulse-eyebrow">02 / READ, CALCULATE, CHECK</p><h2 id="pulse-measure-title">Make the observation yours.</h2><p>Finish the selected replay using the slider, step controls or optional Play. Read L, N and the captured timer. Enter the travelled distance and speed, rounding speed to two decimal places.</p><p class="pulse-equation">distance = 2 × N × L<br>speed = distance ÷ captured time</p><form id="pulse-reading" class="pulse-reading"><div class="pulse-fields">' +
      input('pulse-read-length', 'Measured string length L / m', 1, 5, 0.5) + input('pulse-read-trips', 'Completed round trips N', 1, 5, 1) + input('pulse-read-time', 'Captured timer reading / s', 0.01, 30, 0.01) + input('pulse-read-distance', 'Total travelled distance / m', 0.01, 50, 0.01) + input('pulse-read-speed', 'Calculated speed / m/s · 2 decimals', 0.01, 20, 0.01) +
      '</div><button type="submit">Check & record this trial</button></form><p id="pulse-feedback" role="status"></p><p class="pulse-fine">Recording the same setup, length, trip count and trial replaces its earlier row; it does not count as another repeat.</p><details><summary>Worked example with different teaching values</summary><p>For L = 2 m and N = 3 round trips, the pulse travels 2 × 3 × 2 = 12 m. If a timer reads 1.50 s, its measured speed is 12 ÷ 1.50 = 8.00 m/s. This example is not one of the two configured string speeds.</p><p>One trip to the far end is L, not 2L. Count a round trip only when the pulse returns to the start.</p></details></section></div>' +
      '<section class="pulse-card pulse-notebook" aria-labelledby="pulse-notebook-title"><div class="pulse-section-head"><div><p class="pulse-eyebrow">03 / REPEAT AND REASON</p><h2 id="pulse-notebook-title">Your simulated observations</h2></div><div class="pulse-actions"><button id="pulse-export" type="button">Export CSV</button><button id="pulse-clear" type="button">Clear only this notebook</button></div></div><p>Finish trials 1, 2 and 3 at the same string, length and round-trip setting. Average their captured times first, then calculate distance ÷ mean time—not the mean of the three speeds.</p><p class="pulse-retention">Only the latest 40 distinct checked rows are retained in this browser; older rows are replaced when full. Export any observations you want to keep.</p><p id="pulse-storage" role="status"></p><div id="pulse-notebook"></div><div id="pulse-summary" class="pulse-summary" role="status"></div></section>' +
      '<section class="pulse-explain"><p class="pulse-eyebrow">FROM THE SCREEN TO THE SCHOOL LAB</p><h2>A useful model has visible limits.</h2>' +
      '<div class="pulse-explain-grid"><div><h3>Apparatus and procedure</h3><p>A stretched string or suitable slinky, a metre scale, stopwatch and secure supports form the physical setup. This bench models only the transverse-string alternative. Keep the effective length and stretching conditions fixed for a set of repeats.</p><ol><li>Measure the one-way distance between the chosen endpoints.</li><li>Create one small pulse; count from zero at launch, timing from the start point to the same return point.</li><li>Repeat three times without changing the setup. Use total path 2NL and the mean measured time to estimate speed.</li></ol><p>Our N counts round trips: N returns = 2N one-way journeys. The NCERT manual uses n for one-way journeys. After a round trip, displacement is zero but distance travelled is 2L; speed is not the same as average velocity.</p></div>' +
      '<div><h3>Errors and precautions</h3><p>Unclear endpoints, miscounted returns, a biased length scale, changing tension and timing judgement can affect the result. Timing several returns can reduce the fractional effect of a fixed timing offset; it cannot repair a wrong length or count.</p><p>Ask a teacher to secure the supports and approve stretching. Keep the string free of knots and clear of other surfaces. Keep faces and bystanders away from a stretched spring or string, never overextend a slinky and do not use a heavy or sharp object as a pulse source.</p></div></div>' +
      '<p>Here the declared speeds are 3 or 4 m/s. Changing length holds the configured speed fixed, as if tension and linear density stay constant. The captured readings add the fixed teaching offsets −0.04, +0.02 and +0.04 s to ideal elapsed time, then round to 0.01 s. These are synthetic examples of timing variation—not measured human reaction times, random uncertainty or calibrated apparatus. Their mean is not zero: averaging these readings does not guarantee recovery of the declared speed.</p>' +
      '<p>The ideal replay omits attenuation, dispersion, changing tension and energy losses. Its schematic rigid-end reflections illustrate a transverse string pulse; this is not a model of longitudinal slinky dynamics. No observation is automatically marked as school practical completion or mastery.</p>' +
      '<details><summary>Viva 1 · Why can three similar readings still be wrong?</summary><p>Repeatability is agreement among repeats, not proof of accuracy. A wrongly measured length or a consistent timing bias affects the whole set. Repeating it does not remove that shared error; check the scale, endpoints and method independently.</p></details><details><summary>Viva 2 · Two students time three returns at the same setup. One starts late. What happens?</summary><p>If the stop moment is unchanged, starting late shortens the recorded time. Since distance is unchanged and speed = distance ÷ time, the estimated speed becomes too high. Discuss start and stop judgement separately instead of assuming their effects cancel.</p></details>' +
      '<p>Original diagrams and teaching data. This is preparation for supervised physical work, not an educator-validated instrument, physical-skill assessment or completion certificate.</p><p class="pulse-sources"><a href="https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/ScienceSt_SecP1_2026-27.pdf#page=19" target="_blank" rel="noopener noreferrer">CBSE 2026–27 · Class 9 standard Science · practical 10 · PDF page 19 ↗</a><a id="pulse-ncert" href="https://ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classIX/science/ielm104.pdf#page=52" target="_blank" rel="noopener noreferrer">NCERT Experiment 42 · printed pages 168–172 · PDF pages 52–56 ↗</a><a href="https://openstax.org/books/university-physics-volume-1/pages/16-5-interference-of-waves" target="_blank" rel="noopener noreferrer">OpenStax · fixed-end inversion · Figure 16.17 ↗</a><a href="#practical-guide:s9-e10">Full pulse practical preparation guide →</a></p></section></section>';

    var root = main.querySelector('.pulse-workspace'), el = function (q) { return root.querySelector(q); };
    function tell(q, text) { var node = el(q); if (node.textContent !== text) node.textContent = text; }
    function settingsFromControls() { return { setup: el('#pulse-setup').value, lengthM: Number(el('#pulse-length').value), roundTrips: Number(el('#pulse-trips').value), trial: Number(el('#pulse-trial').value) }; }
    function pause() { s.playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; if (root.isConnected) el('#pulse-play').textContent = 'Play replay'; }
    function update() {
      var x = M.experiment(s.settings), frame = M.frame(s.settings, s.elapsedS), length = s.settings.lengthM;
      s.elapsedS = frame.elapsedS;
      var position = 50 + frame.positionM / length * 620, curve = '', phase = (s.elapsedS * x.idealSpeedMps / length) % 2;
      for (var i = 0; i <= 160; i++) { var px = 50 + i / 160 * 620, fraction = i / 160, displacement = 0;
        // Odd, 2L-periodic image pulses cancel continuously at each fixed end.
        // This avoids a sign-flipping graphic at reflection; shape/amplitude stay schematic.
        for (var k = -2; k <= 2; k++) { var outgoing = (fraction - phase - 2 * k) / .042, incoming = (fraction + phase - 2 * k) / .042;
          displacement += Math.exp(-outgoing * outgoing) - Math.exp(-incoming * incoming);
        }
        var y = i === 0 || i === 160 ? 120 : 120 - 34 * displacement;
        curve += (i ? 'L' : 'M') + fixed(px, 2) + ',' + fixed(y, 2);
      }
      el('#pulse-wave').setAttribute('d', curve); el('#pulse-marker').setAttribute('cx', fixed(position, 2));
      el('#pulse-scrub').max = x.idealTimeS; el('#pulse-scrub').value = s.elapsedS;
      tell('#pulse-clock', fixed(s.elapsedS) + ' s'); tell('#pulse-returns', frame.returns + ' / ' + s.settings.roundTrips);
      tell('#pulse-timer', frame.complete ? fixed(x.observedTimeS) + ' s' : 'Not captured');
      tell('#pulse-string-label', 'L = ' + fixed(length, 1) + ' m · Setup ' + s.settings.setup + ' · ideal speed ' + (s.settings.setup === 'A' ? 3 : 4) + ' m/s');
      var description = 'Trial ' + (s.settings.trial + 1) + ': pulse position ' + fixed(frame.positionM) + ' m from the start; ' + (frame.direction > 0 ? 'toward the far end' : 'toward the start') + '. Ideal time ' + fixed(s.elapsedS) + ' s. Completed ' + frame.returns + ' of ' + s.settings.roundTrips + ' round trips.';
      if (frame.complete) description += ' Captured timer reading ' + fixed(x.observedTimeS) + ' s, including the declared synthetic offset.';
      tell('#pulse-text', description); tell('#pulse-svg-desc', description);
      tell('#pulse-motion-status', media.matches ? 'Reduced motion is on: use the slider or manual steps; automatic replay is disabled.' : frame.complete ? 'Target return reached. Read the captured timer and record this trial.' : s.playing ? 'Replay running at ideal model time. Pause whenever you need.' : 'Replay paused. All measurement steps are available without automatic motion.');
      el('#pulse-play').disabled = media.matches || frame.complete; el('#pulse-step').disabled = frame.complete; el('#pulse-finish').disabled = frame.complete;
      tell('#pulse-offset', 'Trial ' + (s.settings.trial + 1) + ' uses a declared synthetic timer offset of ' + ['−0.04', '+0.02', '+0.04'][s.settings.trial] + ' s. It changes the captured reading, not the string motion. Timer display resolution: 0.01 s.');
      el('#pulse-svg').dataset.positionM = fixed(frame.positionM, 4); el('#pulse-svg').dataset.complete = String(frame.complete);
      if (frame.complete) pause();
    }
    function scale() {
      var marks = '', length = s.settings.lengthM;
      for (var m = 0; m <= length + .00001; m += .5) { var px = 50 + m / length * 620; marks += '<path d="M' + px + ' 165v' + (m % 1 ? 7 : 12) + '"/><text x="' + px + '" y="195" text-anchor="middle">' + fixed(m, 1) + '</text>'; }
      el('#pulse-scale').innerHTML = '<path d="M50 165H670"/>' + marks;
    }
    function notebook() {
      var rows = read().trials;
      tell('#pulse-storage', stored ? 'Saved on this browser only. Other notes, preferences and progress are untouched.' : 'Storage unavailable or invalid. Observations remain in this session; export a copy before leaving.');
      el('#pulse-notebook').innerHTML = rows.length ? '<div class="pulse-table" role="region" tabindex="0" aria-label="Simulated pulse observations; scroll horizontally"><table><caption>Checked synthetic observations · not school measurements</caption><thead><tr><th scope="col">Setup / trial</th><th scope="col">L / m</th><th scope="col">N</th><th scope="col">Time / s</th><th scope="col">Distance / m</th><th scope="col">Speed / m/s</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><th scope="row">' + esc(r.setup) + ' / ' + (r.trial + 1) + '</th><td>' + fixed(r.lengthM, 1) + '</td><td>' + r.roundTrips + '</td><td>' + fixed(r.inputs.timeS) + '</td><td>' + fixed(r.inputs.distanceM) + '</td><td>' + fixed(r.inputs.speedMps) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p>No checked observations yet. Finish and record a replay to begin.</p>';
      var summary = M.summary(rows, s.settings);
      tell('#pulse-summary', summary ? 'Three distinct trials at Setup ' + summary.setup + ', L = ' + fixed(summary.lengthM, 1) + ' m, N = ' + summary.roundTrips + ': mean captured time = ' + fixed(summary.meanTimeS, 4) + ' s. Distance ÷ mean time = ' + fixed(summary.distanceM) + ' ÷ ' + fixed(summary.meanTimeS, 4) + ' = ' + fixed(summary.speedMps) + ' m/s. This does not establish physical accuracy.' : 'Record all three distinct trials at the currently selected setup, length and trip count to compare their mean time. Changing settings does not erase saved rows.');
    }
    function reset() {
      pause(); s.settings = settingsFromControls(); s.elapsedS = 0;
      el('#pulse-reading').reset(); tell('#pulse-feedback', 'Replay reset for the selected trial. Saved observations remain.'); scale(); update(); notebook();
    }
    ['setup', 'length', 'trips', 'trial'].forEach(function (name) { el('#pulse-' + name).onchange = reset; });
    el('#pulse-setup').value = s.settings.setup; el('#pulse-length').value = s.settings.lengthM; el('#pulse-trips').value = s.settings.roundTrips; el('#pulse-trial').value = s.settings.trial;
    function move(t) { pause(); s.elapsedS = Math.max(0, Math.min(M.experiment(s.settings).idealTimeS, t)); update(); }
    el('#pulse-scrub').oninput = function () { move(Number(this.value)); };
    el('#pulse-step').onclick = function () { move(s.elapsedS + .1); };
    el('#pulse-finish').onclick = function () { move(M.experiment(s.settings).idealTimeS); };
    el('#pulse-restart').onclick = reset;
    function tick(now) {
      raf = 0;
      if (!s.playing || !root.isConnected || document.hidden || media.matches) { pause(); return; }
      if (last) s.elapsedS += (now - last) / 1000;
      last = now; update(); if (s.playing) raf = requestAnimationFrame(tick);
    }
    el('#pulse-play').onclick = function () {
      if (s.playing) { pause(); update(); return; }
      if (media.matches || document.hidden || M.frame(s.settings, s.elapsedS).complete) return;
      s.playing = true; last = 0; this.textContent = 'Pause replay'; update(); raf = requestAnimationFrame(tick);
    };
    el('#pulse-reading').onsubmit = function (event) {
      event.preventDefault(); pause(); update();
      var values = { lengthM: el('#pulse-read-length').value, roundTrips: el('#pulse-read-trips').value, timeS: el('#pulse-read-time').value, distanceM: el('#pulse-read-distance').value, speedMps: el('#pulse-read-speed').value };
      var result = M.check(s.settings, s.elapsedS, values);
      if (!result.ok) { tell('#pulse-feedback', 'Not recorded. ' + result.errors.join(' ')); return; }
      read().trials.push(result.record); save(); notebook();
      tell('#pulse-feedback', 'Trial ' + (s.settings.trial + 1) + ' checked and recorded. Select another repeat trial without changing the setup to build a three-trial comparison.');
    };
    el('#pulse-export').onclick = function () {
      if (!read().trials.length) { tell('#pulse-storage', 'No checked observations to export yet.'); return; }
      var url = URL.createObjectURL(new Blob([M.csv(read().trials)], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
      a.href = url; a.download = 'pulse-simulated-observations.csv'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    };
    el('#pulse-clear').onclick = function () {
      if (!confirm('Clear only the pulse notebook? Other notes and preferences will stay.')) return;
      book = { v: 1, trials: [] }; save(); notebook(); tell('#pulse-feedback', 'Only the pulse notebook was cleared.');
    };
    function visibility() { if (document.hidden) { pause(); update(); } }
    function preference() { if (media.matches) pause(); update(); }
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', preference);
    cleanup = function () { pause(); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', preference); };
    scale(); update(); notebook(); AppDesign.afterView();
    if (!document.querySelector('#cbse-questionnaire[open],#cbse-entry[open]')) root.querySelector('h1').focus({ preventScroll: true });
  }
  function decorate() {
    var catalogue = main.querySelector('.practical-library:not(.practical-reader)'), current = catalogue && catalogue.querySelector('.practical-classes [aria-current="page"]');
    if (current && current.getAttribute('href') === '#practicals:9' && !catalogue.querySelector('[data-pulse-entry]')) {
      catalogue.querySelector('.practical-filters').insertAdjacentHTML('beforebegin', '<section class="pulse-discovery"><div><h2>Measure a pulse journey</h2><p>Class 9 interactive bench · length, return count, three captured times and speed reasoning.</p></div><a data-pulse-entry href="#practical:pulse">Open pulse bench →</a></section>');
      var scope = catalogue.querySelector('.practical-scope p:nth-of-type(2)');
      if (scope) scope.textContent = 'This Class 9 catalogue includes an interactive pulse-speed measurement bench. The Class 11 catalogue has Vernier caliper, screw-gauge, spherometer and irregular-lamina benches. Other entries are preparation guides. Virtual work does not replace supervised school practicals or certify competence.';
    }
    var reader = main.querySelector('.practical-reader'), guide = typeof PeqPracticalLibrary !== 'undefined' && PeqPracticalLibrary.byId('s9-e10');
    if (reader && guide && reader.querySelector('h1').textContent === guide.title && !reader.querySelector('[data-pulse-entry]')) reader.querySelector('.practical-safety').insertAdjacentHTML('afterend', '<p class="practical-bench-link"><a data-pulse-entry href="#practical:pulse">Open the interactive Class 9 pulse bench ↗</a></p>');
  }
  var after = AppDesign.afterView;
  AppDesign.afterView = function () { after(); decorate(); };
  var previousGo = go;
  go = function (view, id) {
    var cold = first; first = false; if (cold && location.hash === '#practical:pulse') view = 'pulse';
    stop();
    if (view === 'pulse') { previousGo('home'); curView = 'pulse'; nav('lab'); setCrumb([{ t: 'CBSE IX' }, { t: 'Pulse measurement' }]); try { history.replaceState(null, '', '#practical:pulse'); } catch (e) {} render(); return; }
    return previousGo(view, id);
  };
  addEventListener('hashchange', function () { if (location.hash === '#practical:pulse') go('pulse'); else if (active) stop(); });
  addEventListener('pagehide', function () { if (cleanup) cleanup(); });
  addEventListener('pageshow', function (event) { if (event.persisted && location.hash === '#practical:pulse') go('pulse'); });
  return { key: KEY, read: read, state: function () { return active; } };
})();
