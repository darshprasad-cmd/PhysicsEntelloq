/* Reference-matched opening scene. Counts come from the app; controls are native. */
function observatoryMarkup(){return `
<a class="pe-skip" href="#pe-title">Skip to the launch content</a>
<main id="pe-main"><div class="obs-mast">
  <div class="obs-backdrop" aria-hidden="true"><img src="__OBSERVATORY_BACKGROUND__" alt="" width="1536" height="1024" fetchpriority="high" decoding="async"></div>
  <canvas id="pe-orbit-canvas" class="obs-motion" role="img" aria-label="Animated predicted orbital trajectory. Mass, speed and calculated orbit type are available in the controls."></canvas>
  <header class="obs-nav">
    <a href="#pe-main" class="obs-brand" aria-label="Physics Entelloq home"><span>ENTELLOQ</span><small>PHYSICS</small></a>
    <nav aria-label="Explore Physics Entelloq"><a href="#pe-worlds">Explore</a><button data-enter="learn">Learn</button><button data-enter="lab">Simulate</button><button data-enter="research">Research</button><a href="#pe-founder">Founder</a></nav>
    <div class="obs-account"><button class="obs-search" data-enter="search" aria-label="Search physics"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></svg></button><button class="obs-signin" data-signup>Sign in</button><button class="obs-start" data-signup>Get Started <span aria-hidden="true">→</span></button></div>
    <span class="obs-nav-note" aria-hidden="true">CURIOUS<br>PEOPLE<br>CHANGE<br>WORLDS.</span>
  </header>
  <section class="obs-hero" aria-labelledby="pe-title">
    <div class="obs-copy"><div class="obs-kicker">PHYSICS ENTELLOQ <span></span></div><h1 id="pe-title">See Physics.<br>Do Physics.<br><em>Understand It.</em></h1><p>Entelloq is an immersive physics learning platform that brings concepts to life through interactive simulations, visualization, and real-world applications.</p><div class="obs-actions"><button class="obs-primary" data-enter="home">Start Exploring <span aria-hidden="true">→</span></button><a class="obs-walkthrough" href="#pe-loop"><span class="obs-play" aria-hidden="true">▷</span><span>See how it works<small>A guided introduction</small></span></a></div><p class="obs-invitation">“Physics isn’t a wall of formulas — it’s the most beautiful game in the universe.”<span>— Darsh Prasad, founder</span></p></div>
    <aside class="obs-control" aria-labelledby="obs-control-title">
      <header><span class="obs-gravity" aria-hidden="true">◎</span><div><h2 id="obs-control-title">Gravitational Orbits</h2><p>Adjust a parameter. Watch the path respond.</p></div><button data-enter="sandbox" aria-label="Open the orbital sandbox">↗</button></header>
      <div class="obs-parameter"><label for="pe-mass">Central mass (M) <output id="pe-mass-value">5.97 × 10²⁴ kg</output></label><input id="pe-mass" type="range" min="0.5" max="2" step="0.01" value="1" aria-describedby="pe-orbit-insight"></div>
      <div class="obs-parameter"><label for="pe-velocity">Initial velocity (v) <output id="pe-velocity-value">7.56 km/s</output></label><input id="pe-velocity" type="range" min="4" max="18" step="0.01" value="7.56" aria-describedby="pe-orbit-insight"></div>
      <div class="obs-preset"><label for="pe-trajectory">Try a trajectory</label><select id="pe-trajectory"><option value="circular">Near-circular</option><option value="elliptical">Elliptical</option><option value="escape">Escape</option><option value="custom">Custom</option></select></div>
      <div class="obs-result" role="status"><strong id="pe-orbit-state">NEAR-CIRCULAR ORBIT</strong><p id="pe-orbit-insight">Gravity bends the path.</p></div>
      <details class="obs-model"><summary>Model &amp; assumptions</summary><p>Newtonian two-body preview. Tangential launch at 6,971 km from the centre; planet radius fixed at 6,371 km. Central mass changes independently of radius. No atmosphere or other bodies.</p><p id="pe-model-speeds"></p><p>Orbit projection and playback time are illustrative, not to scale. The photographic scene is artwork.</p></details>
    </aside>
    <div class="obs-right-note" aria-hidden="true"><span>SAME LAWS.<br>BIGGER QUESTIONS.</span><i></i><p>OBSERVE<br>EXPERIMENT<br>SIMULATE<br>QUESTION<br>UNDERSTAND<br>REPEAT</p></div>
  </section>
  <div class="obs-bottom"><div class="obs-stats" aria-label="What you can explore"><div><b>${DB.length}</b><span>connected concepts</span></div><div><b>${Deep.list().length}</b><span>deep courses</span></div><div><b>${Adv.list().length}</b><span>advanced treatments</span></div><div><b>∞</b><span>curiosity</span></div></div><button class="obs-pause" id="pe-pause" aria-pressed="false" aria-label="Pause scene animation">Ⅱ <span>Pause scene</span></button></div>
  <div class="obs-features" aria-label="Ways to explore physics">
    <button class="obs-feature" data-enter="lab"><span class="obs-thumb obs-thumb-sim" aria-hidden="true"></span><span class="obs-feature-copy"><strong>Interactive Simulations</strong><small>From projectile motion to planetary orbits.</small></span><span class="obs-arrow" aria-hidden="true">→</span></button>
    <button class="obs-feature" data-enter="learn"><span class="obs-thumb obs-thumb-field" aria-hidden="true"></span><span class="obs-feature-copy"><strong>Visual Learning</strong><small>See physics the way it really happens.</small></span><span class="obs-arrow" aria-hidden="true">→</span></button>
    <button class="obs-feature" data-enter="universe"><span class="obs-thumb obs-thumb-prism" aria-hidden="true"></span><span class="obs-feature-copy"><strong>Real-World Applications</strong><small>Connect concepts to the world around you.</small></span><span class="obs-arrow" aria-hidden="true">→</span></button>
    <button class="obs-feature" data-enter="adv"><span class="obs-thumb obs-thumb-galaxy" aria-hidden="true"></span><span class="obs-feature-copy"><strong>Research &amp; Beyond</strong><small>Go deeper in the Advanced Studio.</small></span><span class="obs-arrow" aria-hidden="true">→</span></button>
  </div>
  <div class="obs-mast-footer"><span>PHYSICS ENTELLOQ<br>A NEW WAY TO LEARN</span><p>Knowledge moves the world.</p><a href="#pe-loop">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></a></div>
</div>`;}
