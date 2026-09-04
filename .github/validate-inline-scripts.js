const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
let parsed = 0;

for (const match of scripts) {
  const openingTag = match[0].slice(0, match[0].indexOf('>'));
  if (/\bsrc\s*=/.test(openingTag)) continue;
  new Function(match[1]);
  parsed += 1;
}

if (!parsed) throw new Error('No inline scripts found');
console.log(`Parsed ${parsed} inline scripts.`);
