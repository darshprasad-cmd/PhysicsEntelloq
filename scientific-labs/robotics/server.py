"""Local-only scientific workbench. No telemetry, uploads, or arbitrary code API."""
import argparse, importlib.util, json, subprocess, sys, tempfile, threading, socket
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from kinematics import validate_request
ROOT=Path(__file__).resolve().parent
LOCK=threading.Lock()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'web'),**kwargs)
    def log_message(self,*args):pass
    def send_json(self,status,data):
        content=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(content)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(content)
    def do_GET(self):
        if not self.local_host():return self.send_json(403,{'error':'Use the localhost workbench address.'})
        if self.path=='/api/status':return self.send_json(200,{'available':importlib.util.find_spec('genesis') is not None,'engine':'Genesis World','mode':'local CPU'})
        return super().do_GET()
    def do_POST(self):
        if not self.local_host():return self.send_json(403,{'error':'Use the localhost workbench address.'})
        if self.path!='/api/simulate':return self.send_json(404,{'error':'Unknown endpoint.'})
        origin=self.headers.get('Origin')
        if origin and urlparse(origin).netloc!=self.headers.get('Host'):return self.send_json(403,{'error':'Only this local workbench may submit a run.'})
        try:
            size=int(self.headers.get('Content-Length','0'))
            if size<1 or size>4096:raise ValueError('Request must be 1–4096 bytes.')
            data=validate_request(json.loads(self.rfile.read(size)))
        except (ValueError,json.JSONDecodeError) as e:return self.send_json(400,{'error':str(e)})
        if not LOCK.acquire(blocking=False):return self.send_json(409,{'error':'A simulation is already running. Wait for it to finish.'})
        try:
            with tempfile.TemporaryDirectory(prefix='entelloq-run-') as folder:
                inp=Path(folder)/'input.json';out=Path(folder)/'result.json';inp.write_text(json.dumps(data),encoding='utf-8')
                result=subprocess.run([sys.executable,str(ROOT/'genesis_runner.py'),str(inp),str(out)],capture_output=True,text=True,timeout=180,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
                evidence=json.loads(out.read_text(encoding='utf-8')) if out.exists() else {'error':'Genesis did not return a result. Check the local runtime installation.'}
                return self.send_json(200 if result.returncode==0 else 500,evidence)
        except subprocess.TimeoutExpired:return self.send_json(504,{'error':'Simulation exceeded 180 seconds. Try again after the first-time compiler setup, or use a shorter run.'})
        except Exception as e:return self.send_json(500,{'error':str(e)})
        finally:LOCK.release()

    def local_host(self):
        return self.headers.get('Host') in (f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}')

class LocalServer(ThreadingHTTPServer):
    def server_bind(self):
        if hasattr(socket,'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
            self.allow_reuse_address=False
        super().server_bind()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8772);args=parser.parse_args()
    print(f'Entelloq Robotics: http://127.0.0.1:{args.port}',flush=True)
    LocalServer(('127.0.0.1',args.port),Handler).serve_forever()
