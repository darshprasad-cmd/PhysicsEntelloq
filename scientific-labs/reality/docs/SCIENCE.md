# Scientific models and measurement boundaries

Reality Lab compares explicit models with supplied observations. A low residual is evidence of agreement for the sampled conditions; it does not prove a universal law or validate a measurement pipeline. Synthetic samples are model demonstrations, not experimental evidence.

## Coordinates and time

Every model produces time in seconds, x/y in metres and vx/vy in metres per second. Positive y points upward. Time zero is the release or launch. The video calibration must use the same coordinate origin, scale, orientation and time zero before comparing trajectories. The solver does not secretly align, rescale or fit the observations.

Default output is 12 seconds at 60 samples per second, including time zero and the final time. An off-grid final time is included. Display sampling is separate from numerical integration. Inputs are checked for finite values and supported physical ranges; invalid input throws a readable error instead of returning NaN data.

## Pendulum

The simulated equation is the nonlinear equation

`d²θ/dt² = −(g/L) sin θ`.

The bob starts at the selected angle in degrees with zero angular velocity. Its fixed pivot is `(0, L)`; the bob is at `x = L sin θ`, `y = L(1 − cos θ)`. Velocities follow the derivatives of these equations. The support is an ideal rigid massless link, so this model does not simulate slack in a string at large release angles. It assumes a point bob, uniform gravity, no air resistance, and no pivot friction.

Integration uses fourth-order Runge–Kutta with substeps no larger than 1/240 second and no larger than 0.02 times the natural time scale `sqrt(L/g)`. This is a numerical solution, not an exact analytic solution. Energy per unit mass, `½(vx² + vy²) + gy`, should remain approximately constant.

`T ≈ 2π sqrt(L/g)` is displayed only as the small-angle reference. The numerical model retains `sin θ` at every angle and therefore predicts a longer period at large amplitudes. See [OpenStax: Pendulums](https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums).

The reported measured period is the median interval between same-direction crossings of the midpoint of the observed x range. It needs repeated crossings, returns no estimate for a stationary or too-short trace, and can be unreliable for noise, drift, aliasing or irregular/nonperiodic motion. It is not a general spectral estimator.

## Projectile

The model is the exact constant-gravity trajectory before first contact with the plane `y = 0`:

`x = v₀ cos α · t`

`y = h₀ + v₀ sin α · t − ½gt²`

`vx = v₀ cos α`, `vy = v₀ sin α − gt`.

The selected angle is measured above horizontal. The projectile is a point, its initial x is zero, and its initial y is the selected height. Gravity is uniform; drag, spin and wind are omitted. See [OpenStax: Projectile Motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion).

**After impact:** samples hold the exact first-contact position with zero velocity. This is a display convention representing the end of flight, not a contact, sliding or bounce simulation. Comparisons intended to assess projectile dynamics should use the airborne part of the observation. Do not interpret the final velocity jump as an acceleration measurement or evidence about material deformation.

## Bouncing ball

The bounce model runs the actual `@dimforge/rapier2d-compat` WebAssembly rigid-body engine. There is a dynamic circular collider of radius **0.08 m** and a fixed floor whose top is `y = 0`. The selected initial height is the ball center height, not its bottom clearance. It must be at least 0.08 m. The ball is released from rest.

Both contact surfaces use the selected restitution coefficient `e` and the maximum combination rule, giving the same effective value. Friction and damping are zero; continuous collision detection is enabled. The simulation takes substeps no larger than 1/480 second, with eight solver iterations and up to four CCD substeps. Sleeping is enabled for settled bodies. Each simulation frees its own physics world.

For an isolated ideal vertical impact on a fixed floor, the outgoing speed is approximately `e` times the incoming speed. Consequently the first rebound height above center-contact height should be approximately `e²(h₀ − 0.08)`. Finite time steps, solver contact tolerance, restitution thresholds and sleeping mean the numerical result is not exact; very small bounces can settle. Positions are the actual solver outputs, including possible submillimetre-scale contact penetration. Air resistance, rolling, deformation, spin and material-dependent restitution are outside this model.

Implementation references: [Rapier JavaScript setup and compatibility initialization](https://rapier.rs/docs/user_guides/javascript/getting_started_js/), [Rapier collider materials and restitution](https://rapier.rs/docs/user_guides/javascript/colliders/). The installed package version is recorded in the lockfile; the online guide may describe a newer release.

## Comparing observation and model

For each valid observed timestamp inside the model's covered interval, the comparison linearly interpolates the chosen model coordinate and calculates the root-mean-square position residual. The result is in metres and includes the number of distinct observed timestamps compared. Samples outside the overlap are excluded, never extrapolated. Nonfinite timestamps or chosen-axis values are excluded; repeated timestamps retain their last value. Input arrays are not modified.

The calculation does not estimate uncertainty, correct camera perspective, compensate for a moving camera, remove lens distortion, infer occluded positions, reject low-confidence tracking points, or fit model parameters. Linear interpolation may bridge gaps in a supplied model trace. The user must inspect coverage, calibration and tracking before interpreting a residual. A single score is not a statistical goodness-of-fit test.

## Verification

The physics tests check pendulum link length and energy stability, the small-angle limit, increased large-angle period, gravity scaling, projectile components and impact handling, Rapier pre-impact free fall and restitution-dependent rebound height, settling at zero restitution, finite/end-point sampling, invalid inputs, and comparison overlap/interpolation. These checks validate specific software behavior against model expectations; they do not establish real-camera tracking accuracy or laboratory validation.
