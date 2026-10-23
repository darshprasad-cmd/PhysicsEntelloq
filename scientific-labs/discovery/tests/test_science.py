import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from notebook import alias_frequency, fit_pendulum, fit_projectile, parse_measurements, pendulum_period


class ScienceTests(unittest.TestCase):
    def test_pendulum_recovers_gravity_and_period_scaling(self):
        rows = [{"length_m": length, "period_s": pendulum_period(length, 9.81)} for length in [.3, .7, 1.1, 1.5, 2]]
        fit = fit_pendulum(rows)
        self.assertAlmostEqual(fit["gravity"], 9.81, places=10)
        self.assertLess(fit["gravity_se"], 1e-10)
        self.assertAlmostEqual(pendulum_period(4, 9.81), 2 * pendulum_period(1, 9.81))

    def test_pendulum_uncertainty_responds_to_residuals(self):
        rows = [{"length_m": 1, "period_s": period} for period in [1.9, 2, 2.1, 2.05, 1.95]]
        fit = fit_pendulum(rows)
        self.assertGreater(fit["gravity_se"], 0)
        with self.assertRaises(ValueError): fit_pendulum([{"length_m": -1, "period_s": 2}] * 4)

    def test_projectile_recovers_known_coefficients(self):
        rows = [{"time_s": t, "x_m": 2 + 3 * t, "y_m": 1 + 6 * t - 4.905 * t * t} for t in [0, .1, .25, .5, .8, 1.1]]
        fit = fit_projectile(rows)
        self.assertAlmostEqual(fit["gravity"], 9.81, places=10)
        self.assertAlmostEqual(fit["height0"], 1, places=10)
        self.assertAlmostEqual(fit["vy0"], 6, places=10)
        self.assertAlmostEqual(fit["vx"], 3, places=10)
        self.assertAlmostEqual(fit["x0"], 2, places=10)
        self.assertLess(fit["gravity_se"], 1e-9)

    def test_projectile_rejects_duplicate_time_and_short_spans(self):
        with self.assertRaisesRegex(ValueError, "distinct"):
            fit_projectile([{"time_s": 1, "x_m": 1, "y_m": 1}] * 4)
        with self.assertRaisesRegex(ValueError, "microsecond"):
            fit_projectile([{"time_s": t * 1e-9, "x_m": 1, "y_m": 1} for t in range(4)])

    def test_alias_matches_identical_sampled_cosines(self):
        self.assertEqual(alias_frequency(7, 10), 3)
        self.assertEqual(alias_frequency(7, 30), 7)
        self.assertEqual(alias_frequency(10, 10), 0)
        for index in range(30):
            t = index / 10
            self.assertAlmostEqual(math.cos(2 * math.pi * 7 * t), math.cos(2 * math.pi * 3 * t), places=11)

    def test_csv_schema_finiteness_bounds_and_utf8_bom(self):
        rows = parse_measurements(b'\xef\xbb\xbflength_m,period_s\n1,2\n1.1,2.1\n1.2,2.2\n1.3,2.3\n', ("length_m", "period_s"))
        self.assertEqual(len(rows), 4)
        for data in [b'x,y\n1,2', b'length_m,period_s\n1,NaN\n1,2\n1,2\n1,2', b'length_m,length_m,period_s\n1,1,2']:
            with self.assertRaises(ValueError): parse_measurements(data, ("length_m", "period_s"))


if __name__ == "__main__": unittest.main()
