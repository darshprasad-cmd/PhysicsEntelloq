import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'scientific-labs'),destination=path.join(root,'assets/scientific-labs');
const products=['reality','reason','discovery','robotics','proof'];
const manifestFile=path.join(source,'asset-manifest.json');
const excluded=new Set(['node_modules','dist','work','.venv','__pycache__','qa','test-results','verification']);
function files(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
  if(excluded.has(entry.name)||entry.name.endsWith('.tsbuildinfo'))return [];
  const p=path.join(folder,entry.name);return entry.isDirectory()?files(p):[p];
}).sort();}
function hashes(folder){return Object.fromEntries(files(folder).map(p=>[path.relative(folder,p).split(path.sep).join('/'),crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));}
function state(){return {format:1,products:Object.fromEntries(products.map(name=>[name,{source:hashes(path.join(source,name)),assets:hashes(path.join(destination,name))}]))};}
if(process.argv.includes('--check')){
  if(!fs.existsSync(manifestFile)||JSON.stringify(state())!==JSON.stringify(JSON.parse(fs.readFileSync(manifestFile,'utf8'))))throw Error('Scientific module source or assets changed. Rebuild and regenerate the asset manifest.');
  console.log('Scientific source and asset hashes match the recorded build.');
}else{
  if(!process.argv.includes('--record-existing')){
    for(const name of ['reality','reason','proof']){
      const cwd=path.join(source,name);
      for(const args of [['ci'],['test'],['run','build']]){
        const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',args,{cwd,stdio:'inherit',shell:process.platform==='win32',windowsHide:true});
        if(result.error||result.status!==0)throw result.error||Error(`${name}: npm ${args.join(' ')} failed.`);
      }
      // Only a known generated directory below assets/scientific-labs may be replaced.
      const target=path.resolve(destination,name);
      if(path.dirname(target)!==path.resolve(destination))throw Error('Invalid output path.');
      fs.rmSync(target,{recursive:true,force:true});
      fs.cpSync(path.join(cwd,'dist'),target,{recursive:true});
    }
    fs.cpSync(path.join(source,'robotics/web'),path.join(destination,'robotics'),{recursive:true});
    for(const file of ['index.html','styles.css','notebook.html','notebook.css','notebook.py','examples','LICENSE'])fs.cpSync(path.join(source,'discovery',file),path.join(destination,'discovery',file),{recursive:true});
  }
  fs.writeFileSync(manifestFile,JSON.stringify(state(),null,2)+'\n');
  console.log('Recorded scientific source and generated-asset hashes.');
}
