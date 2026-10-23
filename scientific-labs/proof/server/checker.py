"""Local, allowlisted Lean proof checker; never accepts arbitrary source code."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
PUZZLES = {p["id"]: p for p in json.loads((ROOT / "src" / "puzzles.json").read_text(encoding="utf-8"))}
LOCK = threading.BoundedSemaphore(1)
TIMEOUT = 20

def find_lean():
    configured = os.environ.get("LEAN_BIN")
    if configured and Path(configured).is_file(): return str(Path(configured).resolve())
    local = ROOT / "work" / "runtime" / "lean-4.35.0-windows" / "bin" / "lean.exe"
    if local.is_file(): return str(local)
    return shutil.which("lean")

def version(executable=None):
    executable = executable or find_lean()
    if not executable: return None
    try:
        run = subprocess.run([executable, "--version"], capture_output=True, text=True, encoding="utf-8", timeout=4)
        return run.stdout.strip() if run.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired): return None

def build_source(payload):
    if not isinstance(payload, dict) or set(payload) != {"puzzle", "choices"}:
        raise ValueError("Provide only a puzzle ID and its choice IDs.")
    puzzle_id = payload.get("puzzle")
    if not isinstance(puzzle_id, str) or puzzle_id not in PUZZLES:
        raise ValueError("Unknown puzzle.")
    choices = payload.get("choices")
    puzzle = PUZZLES[puzzle_id]
    if not isinstance(choices, list) or len(choices) != len(puzzle["steps"]) or any(not isinstance(choice, str) for choice in choices):
        raise ValueError("Choose one option for each proof step.")
    lines = []
    for step, chosen in zip(puzzle["steps"], choices):
        option = next((o for o in step["options"] if o["id"] == chosen), None)
        if option is None: raise ValueError("Unknown proof choice.")
        lines.append("  " + option["code"])
    # No sorry, axioms, arbitrary tactics, imports, or user source are admitted.
    return "set_option maxHeartbeats 100000\nset_option maxRecDepth 512\n\n" + puzzle["theorem"] + "\n" + "\n".join(lines) + "\n"

def check(payload, *, executable=None, timeout=TIMEOUT):
    source = build_source(payload)
    executable = executable or find_lean()
    if not executable:
        return {"status": "unavailable", "verified": False, "message": "Lean is not installed. Run the setup script, then restart the checker.", "source": source}
    if not LOCK.acquire(blocking=False):
        return {"status": "busy", "verified": False, "message": "Another proof is being checked. Try again shortly."}
    started = time.monotonic()
    try:
        run = subprocess.run([executable, "--stdin"], input=source, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout, cwd=ROOT)
        diagnostics = (run.stdout + run.stderr).strip()[:12000]
        # Exit status is necessary; warnings about unproved declarations are also rejected.
        accepted = run.returncode == 0 and "sorry" not in diagnostics.lower() and "error:" not in diagnostics.lower()
        return {"status": "verified" if accepted else "rejected", "verified": accepted,
                "message": "Lean accepted the complete proof." if accepted else "Lean found a gap or a type mismatch. Revise the argument and try again.",
                "diagnostics": diagnostics, "source": source, "sourceHash": hashlib.sha256(source.encode()).hexdigest(),
                "engine": version(executable), "elapsedMs": round((time.monotonic()-started)*1000)}
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "verified": False, "message": "The checker exceeded its time limit. Its process was terminated; no proof was verified.", "source": source}
    except OSError:
        return {"status": "unavailable", "verified": False, "message": "Lean could not be started. Check the local installation.", "source": source}
    finally:
        LOCK.release()
