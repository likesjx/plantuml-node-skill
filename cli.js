#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function main(){
  const argv = process.argv.slice(2);
  if(argv.length < 1){
    console.error('Usage: plantuml-node-skill <input.puml> [--out out.png] [--server https://kroki.io]');
    process.exit(2);
  }
  const input = argv[0];
  let out = null;
  let server = 'https://kroki.io';
  for(let i=1;i<argv.length;i++){
    if(argv[i]==='--out') out = argv[++i];
    if(argv[i]==='--server') server = argv[++i];
  }
  if(!fs.existsSync(input)){ console.error('Input not found:', input); process.exit(3); }
  const body = fs.readFileSync(input, 'utf8');
  const url = server.replace(/\/+$/,'') + '/plantuml/png';
  const res = await fetch(url, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain' } });
  if(!res.ok){
    console.error('Render failed', res.status, await res.text());
    process.exit(4);
  }
  const buffer = await res.buffer();
  out = out || path.basename(input, path.extname(input)) + '.png';
  fs.writeFileSync(out, buffer);
  console.log('Wrote', out);
}

main().catch(e=>{ console.error(e); process.exit(1); });
