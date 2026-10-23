# Synthetic CSV examples

Both CSV files are generated mathematical examples, not measurements from experiments. They are original Entelloq test material covered by the product MIT license.

- `synthetic-pendulum.csv`: exact small-angle periods `T = 2π√(L/9.81)` at lengths 0.3, 0.5, 0.7, 1.0, 1.3, and 1.6 metres, with no noise.
- `synthetic-projectile.csv`: exact positions `x = 3t`, `y = 1 + 6t − 4.905t²`, in metres, at the listed timestamps in seconds. No air resistance, no bounce, no noise.

Both ideal fits recover gravity 9.81 m/s², subject to floating-point rounding. Near-zero fit residuals on these exact synthetic examples do not indicate zero uncertainty in a physical measurement. The application labels uploaded examples as a user-selected CSV; these filenames and this provenance identify their synthetic source.
