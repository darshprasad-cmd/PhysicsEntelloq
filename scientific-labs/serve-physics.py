"""Serve Physics Entelloq locally with narrow proxies to its optional scientific engines."""
from __future__ import annotations

import argparse
import http.client
import json
import math
import mimetypes
from pathlib import Path
import re
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
API_PREFIX = "/assets/scientific-labs/"
BACKENDS = {"robotics": ("127.0.0.1", 8772), "proof": ("127.0.0.1", 8773)}
ENDPOINTS = {
    "robotics/api/status": ("robotics", "GET", "/api/status", 8),
    "robotics/api/simulate": ("robotics", "POST", "/api/simulate", 195),
    "proof/api/health": ("proof", "GET", "/api/health", 8),
    "proof/api/check": ("proof", "POST", "/api/check", 30),
}
MAX_REQUEST = 4096
MAX_RESPONSE = 2 * 1024 * 1024
WEB_EXTENSIONS = {
    ".html", ".htm", ".js", ".mjs", ".css", ".json", ".csv", ".txt", ".md",
    ".xml", ".wasm", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".otf", ".mp4", ".webm", ".mp3", ".ogg", ".wav",
    ".pdf", ".glb", ".gltf", ".bin", ".pdb", ".cif", ".map",
}
PRIVATE_DIRECTORIES = {"node_modules", "work", "runtime", "__pycache__", "venv"}
for suffix, content_type in {".wasm": "application/wasm", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".glb": "model/gltf-binary"}.items():
    mimetypes.add_type(content_type, suffix)


def finite_json(raw):
    def invalid_constant(_value):
        raise ValueError("JSON numbers must be finite.")

    def finite_float(value):
        number = float(value)
        if not math.isfinite(number):
            raise ValueError("JSON numbers must be finite.")
        return number

    # parse_constant handles NaN/Infinity tokens, but valid exponent syntax can
    # also overflow a float. The decoder calls parse_float at every nesting level.
    return json.loads(raw, parse_constant=invalid_constant, parse_float=finite_float)


class LocalServer(ThreadingHTTPServer):
    allow_reuse_address = False
    daemon_threads = True

    def __init__(self, address, *, root=ROOT, backends=None):
        if address[0] != "127.0.0.1":
            raise ValueError("The companion binds only to 127.0.0.1.")
        self.root = Path(root).resolve()
        self.backends = dict(BACKENDS if backends is None else backends)
        if any(host != "127.0.0.1" or not isinstance(port, int) or not 1 <= port <= 65535 for host, port in self.backends.values()):
            raise ValueError("Scientific engines must use explicit loopback ports.")
        super().__init__(address, Handler)

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


class Handler(BaseHTTPRequestHandler):
    server_version = "EntelloqPhysics/1.0"

    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def log_message(self, *_args):
        pass

    def headers_for(self, code, length, content_type, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(length))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Cache-Control", "no-store" if content_type.startswith("application/json") else "no-cache")
        for name, value in (extra or {}).items():
            self.send_header(name, value)
        self.end_headers()

    def reply(self, code, data, content_type="application/json", extra=None):
        if isinstance(data, dict):
            data = json.dumps(data, allow_nan=False).encode("utf-8")
        elif isinstance(data, str):
            data = data.encode("utf-8")
        self.headers_for(code, len(data), content_type, extra)
        if self.command != "HEAD":
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def error(self, code, message):
        self.reply(code, {"available": False, "verified": False, "status": "unavailable", "error": message, "message": message})

    def trusted_request(self):
        host = self.headers.get("Host")
        allowed = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
        if len(self.headers.get_all("Host", [])) != 1 or host not in allowed:
            self.error(403, "Use the localhost Physics address shown by this server.")
            return False
        origin = self.headers.get("Origin")
        if origin is not None and (len(self.headers.get_all("Origin", [])) != 1 or origin != "http://" + host):
            self.error(403, "Submit calculations from this same local Physics page.")
            return False
        return True

    def proxy(self, endpoint):
        product, method, path, timeout = endpoint
        if self.command != method and not (self.command == "HEAD" and method == "GET"):
            return self.reply(405, {"error": "Method not allowed."}, extra={"Allow": method})
        body = None
        if method == "POST":
            if self.headers.get("Transfer-Encoding") or len(self.headers.get_all("Content-Length", [])) != 1:
                return self.error(400, "Provide one Content-Length header for this JSON request.")
            if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                return self.error(415, "Scientific calculations require application/json.")
            try:
                size = int(self.headers["Content-Length"])
                if size > MAX_REQUEST:
                    return self.error(413, "The calculation request exceeds 4096 bytes.")
                if size < 1:
                    raise ValueError("Empty request.")
                body = self.rfile.read(size)
                if len(body) != size or not isinstance(finite_json(body), dict):
                    raise ValueError("Expected a complete JSON object.")
            except (ValueError, RecursionError):
                return self.error(400, "Provide a complete JSON object with finite numbers.")
            except (TimeoutError, OSError):
                return self.error(408, "The request body did not arrive in time.")
        host, port = self.server.backends[product]
        connection = http.client.HTTPConnection(host, port, timeout=timeout)
        try:
            # Use a direct loopback connection. Never forward credentials or follow redirects.
            connection.request(method, path, body=body, headers={"Host": f"{host}:{port}", "Origin": f"http://{host}:{port}", "Content-Type": "application/json"})
            response = connection.getresponse()
            payload = response.read(MAX_RESPONSE + 1)
            if 300 <= response.status < 400 or len(payload) > MAX_RESPONSE or response.getheader("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
                return self.error(502, "The scientific engine returned an unexpected response.")
            result = finite_json(payload)
            if not isinstance(result, dict):
                raise ValueError("Expected an engine response object.")
            return self.reply(response.status, result)
        except (TimeoutError, socket.timeout):
            return self.error(504, "The local scientific engine did not respond in time. A calculation may still be finishing; check its status before retrying.")
        except (OSError, http.client.HTTPException):
            return self.error(503, f"The local {product} engine is not running or disconnected. Start its companion service; browser exploration remains available.")
        except (ValueError, RecursionError):
            return self.error(502, "The scientific engine returned invalid JSON.")
        finally:
            connection.close()

    def static_file(self, parsed, path):
        if self.command not in ("GET", "HEAD"):
            return self.reply(405, {"error": "Method not allowed."}, extra={"Allow": "GET, HEAD"})
        parts = path.strip("/").split("/") if path.strip("/") else []
        if any(part in (".", "..") or part.startswith(".") or part.casefold() in PRIVATE_DIRECTORIES for part in parts):
            return self.error(404, "File not found.")
        try:
            target = self.server.root.joinpath(*parts).resolve()
            relative = target.relative_to(self.server.root)
            if any(part.startswith(".") or part.casefold() in PRIVATE_DIRECTORIES for part in relative.parts):
                return self.error(404, "File not found.")
            if target.is_dir():
                if not path.endswith("/"):
                    location = quote(path, safe="/") + "/" + ("?" + parsed.query if parsed.query else "")
                    return self.reply(308, b"", "text/plain", {"Location": location})
                target = (target / "index.html").resolve()
                relative = target.relative_to(self.server.root)
                if any(part.startswith(".") or part.casefold() in PRIVATE_DIRECTORIES for part in relative.parts):
                    return self.error(404, "File not found.")
            if target.suffix.lower() not in WEB_EXTENSIONS or not target.is_file():
                return self.error(404, "File not found. Build the scientific lab assets if needed.")
            size = target.stat().st_size
            start, end, code = 0, size - 1, 200
            extra = {"Accept-Ranges": "bytes"}
            if self.headers.get("Range"):
                match = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers["Range"])
                if not match or not any(match.groups()) or size == 0:
                    return self.reply(416, b"", "text/plain", {"Content-Range": f"bytes */{size}"})
                first, last = match.groups()
                if first:
                    start = int(first)
                    end = min(int(last), size - 1) if last else size - 1
                else:
                    start = max(0, size - int(last))
                if start > end or start >= size:
                    return self.reply(416, b"", "text/plain", {"Content-Range": f"bytes */{size}"})
                code = 206
                extra["Content-Range"] = f"bytes {start}-{end}/{size}"
            content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
            with target.open("rb") as content:
                self.headers_for(code, max(0, end - start + 1), content_type, extra)
                if self.command == "HEAD":
                    return
                content.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk = content.read(min(65536, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except (ValueError, OSError):
            self.error(404, "File not found.")

    def route(self):
        if not self.trusted_request():
            return
        try:
            parsed = urlsplit(self.path)
            path = unquote(parsed.path, errors="strict")
            if parsed.scheme or parsed.netloc or not path.startswith("/") or path.startswith("//") or any(c in path for c in ("\\", "\0", ":")):
                raise ValueError("Invalid local path.")
        except (ValueError, UnicodeError):
            return self.error(400, "Invalid local path.")
        if path.startswith(API_PREFIX):
            suffix = path[len(API_PREFIX):]
            if suffix in ENDPOINTS:
                if parsed.query:
                    return self.error(400, "Scientific endpoints do not accept query parameters.")
                return self.proxy(ENDPOINTS[suffix])
            if suffix.startswith(("robotics/api", "proof/api")):
                return self.error(404, "Unknown scientific endpoint.")
        return self.static_file(parsed, path)

    do_GET = route
    do_HEAD = route
    do_POST = route


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=5411)
    arguments = parser.parse_args()
    if not 1 <= arguments.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    with LocalServer(("127.0.0.1", arguments.port)) as server:
        print(f"Physics Entelloq: http://127.0.0.1:{server.server_port}", flush=True)
        print("Optional engines: Robotics on 8772; Proof on 8773. Ctrl+C stops this server.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
