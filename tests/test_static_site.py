from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class StaticSiteContract(unittest.TestCase):
    def test_required_public_files_exist(self):
        for name in ("index.html", "CNAME", "robots.txt", "sitemap.xml", "assets"):
            self.assertTrue((ROOT / name).exists(), name)

    def test_custom_domain_is_stable(self):
        self.assertEqual((ROOT / "CNAME").read_text(encoding="utf-8").strip(), "physics.entelloq.com")

    def test_product_identity_and_core_flows_remain_present(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8").lower()
        for label in ("physics entelloq", "simulation", "experiment", "research"):
            self.assertIn(label, html)

    def test_public_assets_remain_nonempty(self):
        for name in ("apple-touch-icon.png", "icon-512.png", "mark.png", "og-physics.png"):
            path = ROOT / "assets" / name
            self.assertTrue(path.is_file(), name)
            self.assertGreater(path.stat().st_size, 0, name)


if __name__ == "__main__":
    unittest.main()
