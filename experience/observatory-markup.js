/* Reality, opened. Launch art is separate from the established learning workspace. */
var CINEMATIC_ORBIT_ARTWORK='__CINEMATIC_ORBIT__';
var OBSERVATORY_ARTWORK=CINEMATIC_ORBIT_ARTWORK;
function observatoryMarkup(){return `
<a class="pe-skip" href="#pe-title">Skip to the launch content</a>
<div class="obs-continuum" aria-hidden="true"></div>
<main id="pe-main">
<div class="ro-opening"><div class="obs-mast ro-mast">
  <div class="obs-backdrop" aria-hidden="true"><picture><source media="(max-width:540px)" srcset="__CINEMATIC_MOBILE__"><img src="${CINEMATIC_ORBIT_ARTWORK}" alt="" width="1672" height="941" fetchpriority="high" decoding="async"></picture></div>
  <canvas id="pe-cinematic-canvas" class="ro-cinematic" aria-hidden="true"></canvas>
  <div class="ro-resolution" aria-hidden="true"><canvas id="ro-resolved-orbit"></canvas><div><span class="pe-kicker">FROM AN IMAGE TO AN IDEA</span><h2>Now change<br><em>its course.</em></h2><p>The artwork gives way to a model.<br>One parameter makes the difference.</p><a href="#pe-experiment" tabindex="-1">TAKE THE CONTROLS ↓</a></div></div>
  <header class="obs-nav ro-nav">
    <a href="#pe-main" class="obs-brand" aria-label="Physics Entelloq home"><span>ENTELLOQ</span><small>PHYSICS</small></a>
    <nav id="ro-menu" aria-label="Explore Physics Entelloq"><a href="#pe-experiment">Experience</a><a href="#pe-worlds">Explore</a><a href="#pe-founder">Our story</a><button data-enter="search" class="obs-search" aria-label="Search physics"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></svg></button></nav>
    <div class="obs-account"><button class="obs-signin" data-signup>Sign in</button><button class="ro-enter" data-enter="home">Enter Physics <span aria-hidden="true">↗</span></button><button class="ro-menu-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="ro-menu">☰</button></div>
  </header>
  <section class="obs-hero ro-hero" aria-labelledby="pe-title">
    <div class="obs-copy"><div class="obs-kicker"><span></span> REALITY, OPENED / 01</div><h1 id="pe-title">The universe.<br>In your<br><em>hands.</em></h1><p>The universe becomes understandable<br class="ro-desktop-break"> when you can change it.</p><div class="obs-actions"><button class="obs-primary" data-enter="home">Enter Physics <span aria-hidden="true">↗</span></button><a class="obs-walkthrough" href="#pe-experiment">Explore the experience <span aria-hidden="true">↓</span></a></div><p class="ro-guest">OPEN TO EVERY CURIOUS MIND. EXPLORE AS A GUEST.</p></div>
    <div class="ro-object-label" aria-hidden="true"><span></span>THE ORBITAL OBSERVATORY<br><small>One small change. A different trajectory.</small></div>
  </section>
  <div class="ro-hero-footer"><p><span class="ro-status-dot"></span> A LIVING LABORATORY FOR PHYSICS</p><a href="#pe-experiment">SCROLL TO CHANGE THE SYSTEM <span aria-hidden="true">↓</span></a></div>
</div></div>
<button class="obs-pause ro-pause" id="pe-pause" aria-pressed="false" aria-label="Pause scene animation">Ⅱ <span>Pause motion</span></button>
<section class="ro-experiment" id="pe-experiment" aria-labelledby="ro-experiment-title">
  <div class="ro-section-top"><span class="pe-kicker">01 / FROM WONDER TO UNDERSTANDING</span><span class="ro-micro">AN INTERACTIVE TWO-BODY EXPERIMENT</span></div>
  <div class="ro-experiment-intro"><h2 id="ro-experiment-title">A small change.<br><em>A whole new orbit.</em></h2><p>Gravity keeps pulling. Sideways speed decides the path. Change the initial velocity and watch a mathematical prediction take shape.</p></div>
  <div class="ro-instrument">
    <div class="ro-orbit-stage"><canvas id="pe-orbit-canvas" role="img" aria-label="Calculated Newtonian orbital trajectory. The adjacent controls provide the speed, path classification and model assumptions."></canvas><svg class="ro-orbit-fallback" viewBox="0 0 800 600" aria-hidden="true"><defs><radialGradient id="ro-planet-light"><stop stop-color="#374f60"/><stop offset="1" stop-color="#091117"/></radialGradient></defs><ellipse cx="400" cy="300" rx="245" ry="138" fill="none" stroke="#91c9ee" stroke-opacity=".45"/><circle cx="400" cy="300" r="93" fill="url(#ro-planet-light)" stroke="#91c9ee" stroke-opacity=".3"/></svg><span class="ro-stage-title">GRAVITATIONAL ORBITS</span><span class="ro-stage-note">Projected orbit · body sizes and playback are illustrative</span><span class="ro-vector-label">v →</span></div>
    <aside class="obs-control ro-control" aria-labelledby="obs-control-title">
      <header><span class="obs-gravity" aria-hidden="true">◎</span><div><h3 id="obs-control-title">You set the trajectory.</h3><p>One variable. A visible consequence.</p></div></header>
      <div class="obs-parameter ro-speed"><label for="pe-velocity">Initial sideways speed <output id="pe-velocity-value">7.56 km/s</output></label><input id="pe-velocity" type="range" min="4" max="18" step="0.01" value="7.56" aria-describedby="pe-orbit-insight"><div class="ro-range-ends"><span>4 km/s</span><span>18 km/s</span></div></div>
      <div class="obs-preset"><label for="pe-trajectory">Explore a path</label><select id="pe-trajectory"><option value="circular">Near-circular</option><option value="elliptical">Elliptical</option><option value="escape">Escape</option><option value="custom">Custom</option></select></div>
      <div class="obs-result" role="status"><strong id="pe-orbit-state">NEAR-CIRCULAR ORBIT</strong><p id="pe-orbit-insight">Gravity bends the path.</p></div>
      <details class="obs-model"><summary>Model &amp; assumptions</summary><p>Newtonian two-body preview. Tangential launch at 6,971 km from the centre; planet radius fixed at 6,371 km. Central mass can change independently of radius. No atmosphere or other bodies.</p><div class="obs-parameter"><label for="pe-mass">Central mass <output id="pe-mass-value">5.97 × 10²⁴ kg</output></label><input id="pe-mass" type="range" min="0.5" max="2" step="0.01" value="1"></div><p id="pe-model-speeds"></p><p>The conic follows the analytic model. Displayed body sizes, perspective and playback time are illustrative. The opening planet is generated artwork.</p></details>
      <button class="ro-instrument-enter" data-enter="sandbox">Keep experimenting in Sandbox <span aria-hidden="true">↗</span></button>
    </aside>
  </div>
</section>
<section class="ro-product-reveal" aria-labelledby="ro-product-title">
  <div class="ro-section-top"><span class="pe-kicker">02 / THIS IS WHERE YOU TAKE OVER</span><span class="ro-micro">REAL PRODUCT. REAL INTERACTION.</span></div>
  <div class="ro-product-head"><h2 id="ro-product-title">Reach into<br><em>the experiment.</em></h2><div><p>Move a mass. Pluck a string. Follow the forces. A laboratory that responds to your curiosity.</p><button class="pe-text-button" data-enter="sandbox">Open the Sandbox <span aria-hidden="true">↗</span></button></div></div>
  <figure class="ro-film"><video muted loop playsinline preload="none" controls poster="__SANDBOX_POSTER__" aria-label="Recorded Physics Entelloq Sandbox demonstration: tracked hands move simulated masses"><source data-src="__SANDBOX_VIDEO__" type="video/mp4"></video><figcaption><span>PHYSICS ENTELLOQ / SANDBOX</span><span>Actual product recording · silent · hand control is optional</span></figcaption></figure>
  <div class="obs-bottom"><div class="obs-stats" aria-label="What you can explore"><div><b>${DB.length}</b><span>connected concepts</span></div><div><b>${Deep.list().length}</b><span>deep courses</span></div><div><b>${Adv.list().length}</b><span>advanced treatments</span></div><div><b>6</b><span>ways to understand</span></div></div></div>
  <div class="obs-features" aria-label="Ways to explore physics">
    <button class="obs-feature" data-enter="lab"><span class="ro-feature-index">01</span><span class="obs-feature-copy"><strong>Experiment.</strong><small>Change a condition. Measure what follows.</small></span><span class="obs-arrow" aria-hidden="true">↗</span></button>
    <button class="obs-feature" data-enter="learn"><span class="ro-feature-index">02</span><span class="obs-feature-copy"><strong>See the idea.</strong><small>Intuition, visuals and mathematical reasoning.</small></span><span class="obs-arrow" aria-hidden="true">↗</span></button>
    <button class="obs-feature" data-enter="universe"><span class="ro-feature-index">03</span><span class="obs-feature-copy"><strong>Connect it.</strong><small>Explore the relationships between concepts.</small></span><span class="obs-arrow" aria-hidden="true">↗</span></button>
    <button class="obs-feature" data-enter="adv"><span class="ro-feature-index">04</span><span class="obs-feature-copy"><strong>Go further.</strong><small>Advanced models, derivations and their limits.</small></span><span class="obs-arrow" aria-hidden="true">↗</span></button>
  </div>
</section>`;}
