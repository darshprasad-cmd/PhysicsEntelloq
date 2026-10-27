# Physics Entelloq — Ultimate

The operating system for physics mastery. A single-file physics learning, experimentation and research platform:
89 mapped concepts · 25 native simulation factories · a multi-physics sandbox · a 15-mind AI faculty · structured experiment benches · research notebooks · hand-tracked physics.

**Live:** https://physics.entelloq.com

Founded, designed & engineered by Darsh Prasad.

### Visualization Engine V2

The first integrated slice connects the existing projectile experiment and a local circuit workbench to shared playback, probes, graphs and CSV. See the [codebase audit and roadmap](docs/visualization-v2/AUDIT.md), [architecture and model limits](docs/visualization-v2/README.md), and [verification results](docs/visualization-v2/VERIFICATION.md).

### Flagship feature tutorial

The replayable guide lives in `assets/feature-tutorials.js` and `.css`. Launch it from the Entelloq menu → Feature tutorial, or the landing-page guide link. The guide navigates and highlights real controls; it never requests camera permission or resets the experiment. Run `node tests/check-feature-tutorials.cjs` when changing tutorial targets.
