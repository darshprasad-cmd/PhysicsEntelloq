"""Export this self-contained notebook with marimo's Python exporter.

Pinned to marimo 0.25.2's export API. This path does not need the CLI's native
Ruff helper for discovering local modules: the AST is checked to ensure there
are no local or third-party imports apart from marimo. No package is patched.
"""
import ast
import asyncio
from pathlib import Path
import sys

import marimo
from marimo._export.file import export_wasm
from marimo._export.requests import WASMFileExportRequest
from marimo._schemas.export_options import WASMExportOptions
from marimo._templates import get_default_asset_url
from marimo._utils.marimo_path import MarimoPath

root = Path(__file__).resolve().parents[1]
source = root / "notebook.py"
if marimo.__version__ != "0.25.2":
    raise RuntimeError("Install the pinned requirements before exporting: marimo 0.25.2 is required.")
for node in ast.walk(ast.parse(source.read_text(encoding="utf-8"))):
    names = [alias.name for alias in node.names] if isinstance(node, ast.Import) else [node.module or ""] if isinstance(node, ast.ImportFrom) else []
    for name in names:
        if name.split(".")[0] not in sys.stdlib_module_names | {"marimo"}:
            raise ValueError(f"This exporter only supports the self-contained notebook. Unsupported import: {name}")
    if isinstance(node, ast.ImportFrom) and node.level:
        raise ValueError("Local imports require the normal marimo directory export workflow.")
result = asyncio.run(export_wasm(WASMFileExportRequest(path=MarimoPath(str(source)), options=WASMExportOptions(mode="run", show_code=False, asset_url=get_default_asset_url()))))
if result.did_error:
    raise RuntimeError("marimo could not export the notebook.")
destination = root / "notebook.html"
destination.write_bytes(result.contents.encode("utf-8") if isinstance(result.contents, str) else result.contents)
print(f"Exported {destination.name}: {destination.stat().st_size:,} bytes. Requires internet for browser runtime assets.")
