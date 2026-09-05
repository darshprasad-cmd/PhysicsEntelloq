/* Recover the unchanged, previously published portrait; no image transformation. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const old=execFileSync('git',['show','4e0d225:index.html'],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
const line=old.split(/\r?\n/).find(x=>x.trim().startsWith('var LND_HTML='));
if(!line)throw Error('Original launch page not found');
const html=JSON.parse(line.trim().slice(13,-1));
const section=html.slice(html.indexOf('<!-- FOUNDER -->'),html.indexOf('<!-- FAQ -->'));
const match=section.match(/src="data:image\/jpeg;base64,([^"]+)"/);
if(!match)throw Error('Original founder photograph not found');
const bytes=Buffer.from(match[1],'base64'),file=path.join(root,'assets','darsh-prasad.jpg');
if(fs.existsSync(file)&&!fs.readFileSync(file).equals(bytes))throw Error('Different portrait exists; refusing to replace');
fs.writeFileSync(file,bytes);
console.log('Recovered original founder portrait:',bytes.length,'bytes; SHA256',crypto.createHash('sha256').update(bytes).digest('hex'));
