# Local scientific engines inside Physics Entelloq

From the Physics project root, run:

```sh
python scientific-labs/serve-physics.py
```

Open **http://127.0.0.1:5411/**. The existing Physics site and its scientific lab assets share this origin. Use `--port 5415` to select a different available port. The server binds only to the loopback interface; it does not expose Physics to other devices. It does not stop or replace other local servers.

Browser-only laboratories work without a companion engine. Robotics can replay its labelled recorded Genesis run; Proof can build a draft but cannot verify it until Lean is available. To compute new results, start the appropriate service in a separate terminal:

```sh
# Use the Python environment where the Robotics requirements are installed.
python scientific-labs/robotics/server.py --port 8772

# Install Lean using Proof's setup instructions, or set LEAN_BIN first.
python scientific-labs/proof/server/app.py --port 8773
```

See the individual lab documentation for installing its runtime. The companion server itself uses only Python's standard library and does not download or launch either engine. Keep these two backend ports unchanged; the public Physics port can vary.

The server forwards only these routes:

| Physics route | Local engine route |
| --- | --- |
| `GET /assets/scientific-labs/robotics/api/status` | `127.0.0.1:8772/api/status` |
| `POST /assets/scientific-labs/robotics/api/simulate` | `127.0.0.1:8772/api/simulate` |
| `GET /assets/scientific-labs/proof/api/health` | `127.0.0.1:8773/api/health` |
| `POST /assets/scientific-labs/proof/api/check` | `127.0.0.1:8773/api/check` |

Hosts must be exactly `127.0.0.1:PORT` or `localhost:PORT`. Browser Origins must match the host being used; `Origin: null` is rejected. POSTs require finite JSON objects of at most 4 KiB. Requests are still validated by the actual engine. Browser cookies and authorization headers are not forwarded. Redirects, non-JSON engine output, and responses over 2 MiB are rejected. Backend timeouts and unavailable services produce explicit failure responses and never a verified result.

Static files are confined to the Physics root and supported web formats. Private directories, dotfiles, Python programs, and directory listings are not served. JavaScript, WASM and media MIME types are provided; single byte ranges support seeking local video. This local development companion is not a public multi-user service.

Run the boundary tests from the Physics root:

```sh
python -m unittest discover -s scientific-labs/tests -p "test_serve_physics.py" -v
```

These tests use temporary files and stub HTTP engines on ephemeral ports. They verify routing, transport, request boundaries, media handling and truthful failure responses. They do not establish Genesis dynamics accuracy, Lean verification, or browser behavior; those are checked separately by the corresponding labs and integration journeys.
