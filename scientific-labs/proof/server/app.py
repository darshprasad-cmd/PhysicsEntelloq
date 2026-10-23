from __future__ import annotations
import argparse
import json
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
from urllib.parse import urlsplit
sys.path.insert(0, str(Path(__file__).resolve().parent))
from checker import ROOT, TIMEOUT, check, version

class LocalServer(ThreadingHTTPServer):
    allow_reuse_address = False
    def server_bind(self):
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "dist"), **kwargs)

    def reply(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def host_allowed(self):
        return self.headers.get("Host") in (f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}")

    def do_GET(self):
        if not self.host_allowed(): return self.reply(403, {"message": "Local host only."})
        if urlsplit(self.path).path == "/api/health":
            engine = version()
            return self.reply(200, {"available": bool(engine), "engine": engine, "service": "Entelloq Proof Studio", "maxSeconds": TIMEOUT})
        if self.path.startswith("/api/"): return self.reply(404, {"message": "Unknown endpoint."})
        if self.path == "/" and not (ROOT / "dist" / "index.html").exists():
            return self.reply(503, {"message": "Build the interface with npm run build, or run npm run dev on port 5193."})
        return super().do_GET()

    def do_POST(self):
        if not self.host_allowed(): return self.reply(403, {"message": "Local host only."})
        allowed = {f"http://{host}:{port}" for host in ("127.0.0.1", "localhost") for port in (self.server.server_port, 5193, 5194, 4173)}
        if self.headers.get("Origin") not in allowed | {None}:
            return self.reply(403, {"message": "This checker accepts local interface requests only."})
        if urlsplit(self.path).path != "/api/check": return self.reply(404, {"message": "Unknown endpoint."})
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return self.reply(415, {"message": "JSON requests only."})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 1 <= length <= 4096: raise ValueError("Request size out of bounds.")
            payload = json.loads(self.rfile.read(length))
            result = check(payload)
        except (ValueError, json.JSONDecodeError) as error:
            return self.reply(400, {"status": "invalid", "verified": False, "message": str(error)})
        return self.reply(200, result)

    def log_message(self, format, *args):
        print(format % args, flush=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8773)
    args = parser.parse_args()
    server = LocalServer(("127.0.0.1", args.port), Handler)
    print(f"Proof Studio: http://127.0.0.1:{args.port}", flush=True)
    print(version() or "Lean unavailable. Run setup-lean.ps1 before checking proofs.", flush=True)
    server.serve_forever()
