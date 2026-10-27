import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const here = path.dirname(fileURLToPath(import.meta.url)),
  out = path.resolve(here, "../assets/physics-visualization");
const result = await build({
  entryPoints: [path.join(here, "workspace.mjs")],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  write: false,
  legalComments: "eof",
});
const files = {
  "engine.mjs": result.outputFiles[0].contents,
  "engine.css": fs.readFileSync(path.join(here, "workspace.css")),
  "THREE-LICENSE.txt": fs.readFileSync(
    path.join(here, "node_modules/three/LICENSE"),
  ),
};
const manifest = {
  schema: 1,
  three: "0.186.1",
  assets: Object.entries(files).map(([name, bytes]) => ({
    path: name,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  })),
};
files["manifest.json"] = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
if (process.argv.includes("--check")) {
  for (const [name, bytes] of Object.entries(files))
    if (
      !fs.existsSync(path.join(out, name)) ||
      !Buffer.from(bytes).equals(fs.readFileSync(path.join(out, name)))
    )
      throw Error("Stale visualization asset: " + name);
  console.log("Visualization bundle matches source.");
} else {
  fs.mkdirSync(out, { recursive: true });
  for (const [name, bytes] of Object.entries(files))
    fs.writeFileSync(path.join(out, name), bytes);
  console.log(manifest);
}
