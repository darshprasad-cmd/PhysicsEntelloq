const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),baseline='0430503c086e0cddc19037d4c212b798ca8c17a7';
const original=execFileSync('git',['show',baseline+':index.html'],{cwd:root,maxBuffer:30*1024*1024}).toString().replace(/\r\n/g,'\n');
let current=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
function omitLaunchAndApprovedStyles(s){for(const name of ['LAUNCH','OBSERVATORY','OBSERVATORY-MARKUP'])s=s.replace(new RegExp('/\\* EXPERIENCE:'+name+':START \\*/[\\s\\S]*?/\\* EXPERIENCE:'+name+':END \\*/'),'LAUNCH-APPROVED:'+name);return s.replace(/<!-- EXPERIENCE:CSS:START -->[\s\S]*?<!-- EXPERIENCE:CSS:END -->/,'APPROVED-LAUNCH-AND-WORKSPACE-STYLES');}
assert.equal(omitLaunchAndApprovedStyles(current),omitLaunchAndApprovedStyles(original),'All application HTML and JavaScript outside the approved launch modules must remain unchanged; the user authorized workspace styling on 2026-10-14');
const model=s=>s.slice(s.indexOf('var LaunchOrbitModel='),s.indexOf('var Observatory='));
const oldModel=execFileSync('git',['show',baseline+':experience/observatory.js'],{cwd:root}).toString();
assert.equal(model(fs.readFileSync(path.join(root,'experience/observatory.js'),'utf8')).replace(/\r\n/g,'\n'),model(oldModel).replace(/\r\n/g,'\n'),'The validated analytic model is unchanged');
console.log('PASS: internal application HTML/JavaScript and LaunchOrbitModel unchanged against '+baseline+'; authorized workspace styles excluded');
