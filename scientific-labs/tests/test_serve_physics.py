"""HTTP-boundary tests using local stub engines; these do not validate Genesis or Lean."""
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
from pathlib import Path
import socket
import tempfile
import threading
import unittest

SPEC = importlib.util.spec_from_file_location("physics_companion", Path(__file__).resolve().parents[1] / "serve-physics.py")
companion = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(companion)


class StubEngine(BaseHTTPRequestHandler):
    requests = []
    response = (200, "application/json", b'{"available":true,"verified":false}')

    def handle_request(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        type(self).requests.append((self.command, self.path, dict(self.headers), body))
        code, content_type, output = type(self).response
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(output)))
        if code == 302:
            self.send_header("Location", "http://external.invalid/")
        self.end_headers()
        self.wfile.write(output)

    do_GET = handle_request
    do_POST = handle_request

    def log_message(self, *_args):
        pass


class CompanionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder = tempfile.TemporaryDirectory()
        cls.root = Path(cls.folder.name)
        for name, data in {
            "index.html": b"<h1>Physics fixture</h1>",
            "experience/index.html": b"<h1>Existing experience</h1>",
            "assets/scientific-labs/robotics/index.html": b"robotics",
            "assets/scientific-labs/proof/index.html": b"proof",
            "assets/engine.wasm": b"\0asm\x01\0\0\0",
            "assets/video.mp4": b"0123456789",
            ".env": b"not public",
            ".git/config": b"not public",
            "work/runtime/secret.json": b'{}',
            "scientific-labs/proof/server/app.py": b"not web content",
            "empty/index.html": b"",
        }.items():
            target = cls.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        cls.backend = ThreadingHTTPServer(("127.0.0.1", 0), StubEngine)
        cls.backend_thread = threading.Thread(target=cls.backend.serve_forever, daemon=True)
        cls.backend_thread.start()
        endpoint = ("127.0.0.1", cls.backend.server_port)
        cls.server = companion.LocalServer(("127.0.0.1", 0), root=cls.root, backends={"robotics": endpoint, "proof": endpoint})
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()
        cls.backend.shutdown(); cls.backend.server_close(); cls.backend_thread.join()
        cls.folder.cleanup()

    def setUp(self):
        StubEngine.requests.clear()
        StubEngine.response = (200, "application/json", b'{"available":true,"verified":false}')

    def request(self, path="/", method="GET", body=None, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        try:
            connection.request(method, path, body=body, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict(response.headers), response.read()
        finally:
            connection.close()

    def post(self, path, body=b'{}', headers=None):
        return self.request(path, "POST", body, {"Content-Type": "application/json", **(headers or {})})

    def test_existing_root_nested_assets_and_head(self):
        self.assertIn(b"Physics fixture", self.request()[2])
        self.assertIn(b"Existing experience", self.request("/experience/")[2])
        self.assertEqual(self.request("/assets/scientific-labs/robotics/")[2], b"robotics")
        status, headers, body = self.request("/experience/", "HEAD")
        self.assertEqual(status, 200); self.assertEqual(body, b"")
        self.assertGreater(int(headers["Content-Length"]), 0)
        self.assertEqual(self.request("/empty/")[2], b"")

    def test_directory_redirect_is_local_and_query_preserving(self):
        status, headers, body = self.request("/experience?view=lab")
        self.assertEqual(status, 308)
        self.assertEqual(headers["Location"], "/experience/?view=lab")
        self.assertEqual(body, b"")

    def test_wasm_type_and_single_media_ranges(self):
        self.assertEqual(self.request("/assets/engine.wasm")[1]["Content-Type"], "application/wasm")
        for header, expected, content_range in [("bytes=2-5", b"2345", "bytes 2-5/10"), ("bytes=-3", b"789", "bytes 7-9/10"), ("bytes=8-", b"89", "bytes 8-9/10")]:
            status, headers, body = self.request("/assets/video.mp4", headers={"Range": header})
            self.assertEqual(status, 206); self.assertEqual(body, expected)
            self.assertEqual(headers["Content-Range"], content_range)
        for header in ["bytes=20-30", "bytes=6-3", "bytes=-0", "bytes=1-2,5-6"]:
            self.assertEqual(self.request("/assets/video.mp4", headers={"Range": header})[0], 416)

    def test_exact_local_host_and_origin(self):
        for host in ["external.example", "127.0.0.1:1", "localhost", "127.0.0.1.evil:5411"]:
            self.assertEqual(self.request(headers={"Host": host})[0], 403)
        local = f"localhost:{self.server.server_port}"
        self.assertEqual(self.request(headers={"Host": local, "Origin": "http://" + local})[0], 200)
        for origin in ["null", "https://external.example", f"http://localhost:{self.server.server_port}"]:
            self.assertEqual(self.post("/assets/scientific-labs/proof/api/check", headers={"Origin": origin})[0], 403)
        self.assertEqual(StubEngine.requests, [])

    def test_private_paths_and_traversal_are_not_served(self):
        for path in ["/.env", "/.git/config", "/work/runtime/secret.json", "/scientific-labs/proof/server/app.py", "/assets/%2e%2e/index.html", "/%2e%2e/index.html", "/assets/"]:
            self.assertEqual(self.request(path)[0], 404, path)
        for path in ["/%5c..%5c.env", "/assets/video.mp4:secret", "/%00", "/%ff"]:
            self.assertEqual(self.request(path)[0], 400, path)
        self.assertEqual(self.request("http://external.invalid/", headers={"Host": f"127.0.0.1:{self.server.server_port}"})[0], 400)

    def test_explicit_api_routes_and_methods(self):
        for product, endpoint in [("robotics", "status"), ("proof", "health")]:
            self.assertEqual(self.request(f"/assets/scientific-labs/{product}/api/{endpoint}")[0], 200)
            self.assertEqual(StubEngine.requests[-1][1], f"/api/{endpoint}")
        for path in ["/assets/scientific-labs/proof/api/arbitrary", "/assets/scientific-labs/robotics/api/../web/index.html"]:
            self.assertEqual(self.request(path)[0], 404)
        self.assertEqual(self.request("/assets/scientific-labs/proof/api/check")[0], 405)
        self.assertEqual(self.post("/assets/scientific-labs/robotics/api/status")[0], 405)
        self.assertEqual(self.request("/assets/scientific-labs/proof/api/health?source=elsewhere")[0], 400)
        self.assertEqual(self.post("/index.html")[0], 405)

    def test_post_body_preserved_without_browser_credentials(self):
        body = b'{"puzzle":"identity","choices":["exact"]}'
        status, _, _ = self.post("/assets/scientific-labs/proof/api/check", body, {"Cookie": "fixture-only", "Authorization": "test-fixture-only"})
        self.assertEqual(status, 200)
        method, path, headers, received = StubEngine.requests[-1]
        self.assertEqual((method, path, received), ("POST", "/api/check", body))
        self.assertEqual(headers["Host"], f"127.0.0.1:{self.backend.server_port}")
        self.assertEqual(headers["Origin"], f"http://127.0.0.1:{self.backend.server_port}")
        self.assertNotIn("Cookie", headers); self.assertNotIn("Authorization", headers)

    def test_json_content_type_size_and_shapes(self):
        path = "/assets/scientific-labs/robotics/api/simulate"
        self.assertEqual(self.post(path, b"x" * 4097)[0], 413)
        self.assertEqual(self.post(path, headers={"Content-Type": "text/plain"})[0], 415)
        self.assertEqual(self.post(path, headers={"Transfer-Encoding": "chunked"})[0], 400)
        for body in [b"", b"{", b"[]", b"null", b'{"kp":NaN}', b'{"kp":Infinity}']:
            self.assertEqual(self.post(path, body)[0], 400, body)
        self.assertEqual(StubEngine.requests, [])

    def test_backend_rejections_remain_rejections(self):
        StubEngine.response = (400, "application/json", b'{"verified":false,"message":"Unknown choice"}')
        status, _, body = self.post("/assets/scientific-labs/proof/api/check")
        self.assertEqual(status, 400)
        self.assertFalse(json.loads(body)["verified"])
        self.assertEqual(json.loads(body)["message"], "Unknown choice")

    def test_overflowing_request_numbers_never_reach_engine(self):
        path = "/assets/scientific-labs/robotics/api/simulate"
        for body in [b'{"kp":1e999}', b'{"kp":-1e999}', b'{"samples":[{"x":1e999}]}']:
            with self.subTest(body=body):
                with self.assertRaises(ValueError):
                    companion.finite_json(body)
                status, _, output = self.post(path, body)
                self.assertEqual(status, 400)
                self.assertFalse(json.loads(output)["verified"])
                self.assertEqual(StubEngine.requests, [])

    def test_overflowing_engine_numbers_cannot_claim_verification(self):
        for output in [b'{"verified":true,"error":1e999}', b'{"verified":true,"error":-1e999}', b'{"verified":true,"samples":[{"x":1e999}]}']:
            with self.subTest(output=output):
                StubEngine.response = (200, "application/json", output)
                status, _, body = self.request("/assets/scientific-labs/proof/api/health")
                self.assertEqual(status, 502)
                self.assertFalse(json.loads(body)["verified"])
                self.assertFalse(json.loads(body)["available"])

    def test_finite_exponent_numbers_survive_both_directions(self):
        payload = b'{"values":[1e308,-1e308,1e-300,0.0],"nested":{"x":6.02e23}}'
        StubEngine.response = (200, "application/json", payload)
        status, _, body = self.post("/assets/scientific-labs/robotics/api/simulate", payload)
        self.assertEqual(status, 200)
        self.assertEqual(StubEngine.requests[-1][3], payload)
        self.assertEqual(json.loads(body), json.loads(payload))

    def test_backend_unexpected_responses_are_not_trusted(self):
        for response in [(302, "application/json", b'{}'), (200, "text/html", b'<h1>error</h1>'), (200, "application/json", b'[]'), (200, "application/json", b'{"value":NaN}'), (200, "application/json", b'{')]:
            StubEngine.response = response
            status, _, body = self.request("/assets/scientific-labs/proof/api/health")
            self.assertEqual(status, 502)
            self.assertFalse(json.loads(body)["verified"])

    def test_unavailable_engine_reports_failure(self):
        with socket.socket() as unused:
            unused.bind(("127.0.0.1", 0)); port = unused.getsockname()[1]
        previous = self.server.backends["robotics"]
        self.server.backends["robotics"] = ("127.0.0.1", port)
        try:
            status, _, body = self.request("/assets/scientific-labs/robotics/api/status")
            self.assertEqual(status, 503)
            self.assertFalse(json.loads(body)["available"])
        finally:
            self.server.backends["robotics"] = previous

    def test_server_cannot_bind_public_interface(self):
        with self.assertRaises(ValueError):
            companion.LocalServer(("0.0.0.0", 0), root=self.root)


if __name__ == "__main__":
    unittest.main()
