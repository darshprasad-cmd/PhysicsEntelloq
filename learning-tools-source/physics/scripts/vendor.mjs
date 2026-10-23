import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const files = {
  mathlive: ['mathlive.min.mjs', 'mathlive-fonts.css', 'mathlive-static.css', 'LICENSE.txt'],
  jsxgraph: ['distrib/jsxgraphcore.mjs', 'distrib/jsxgraph.css', 'LICENSE.MIT', 'distrib/jsxgraphcore.mjs.LICENSE.txt'],
};
const manifest = { generated: '2026-10-24', files: [] };
for (const [pkg, paths] of Object.entries(files)) {
  await mkdir(`vendor/${pkg}`, { recursive: true });
  const info = JSON.parse(await readFile(`node_modules/${pkg}/package.json`, 'utf8'));
  for (const file of paths) {
    const to = `vendor/${pkg}/${file.split('/').pop()}`;
    await cp(`node_modules/${pkg}/${file}`, to);
    manifest.files.push({path:to, package:pkg, version:info.version, sha256:createHash('sha256').update(await readFile(to)).digest('hex')});
  }
}
await cp('node_modules/mathlive/fonts', 'vendor/mathlive/fonts', {recursive:true});
await cp('node_modules/mathlive/sounds', 'vendor/mathlive/sounds', {recursive:true});
await writeFile('vendor/manifest.json', JSON.stringify(manifest, null, 2)+'\n');
console.log('Vendored pinned MathLive and JSXGraph with original licences, fonts and sounds.');
