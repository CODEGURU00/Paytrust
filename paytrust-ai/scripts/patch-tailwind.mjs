import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = path.resolve(__dirname, '../node_modules/@tailwindcss/turbopack/dist/index.js');

if (!fs.existsSync(targetPath)) {
  console.log('[patch-tailwind] Target file not found, skipping.');
  process.exit(0);
}

let content = fs.readFileSync(targetPath, 'utf8');

const targetStr = 'for(let o of r.scanner.scan())r.candidates.add(o);';
const patchMarker = '/* TAILWIND_WASI_WINDOWS_FALLBACK */';

if (content.includes(patchMarker)) {
  console.log('[patch-tailwind] Already patched.');
  process.exit(0);
}

if (!content.includes(targetStr)) {
  console.warn('[patch-tailwind] Could not find target pattern to patch.');
  process.exit(0);
}

const replacementStr = `for(let o of r.scanner.scan())r.candidates.add(o);${patchMarker}if(r.candidates.size===0){const _walk=(dir)=>{try{const entries=k.default.readdirSync(dir,{withFileTypes:true});for(const ent of entries){if(ent.name.startsWith('.')||ent.name==='node_modules'||ent.name==='dist'||ent.name==='public'||ent.name==='test-results')continue;const full=p.default.join(dir,ent.name);if(ent.isDirectory()){_walk(full);}else if(/\\.(tsx|ts|jsx|js|html|css|md)$/i.test(ent.name)){const ext=p.default.extname(ent.name).slice(1);const ctn=k.default.readFileSync(full,'utf8');const matched=r.scanner.getCandidatesWithPositions({content:ctn,extension:ext});for(const c of matched)r.candidates.add(c.candidate);this.addDependency(full);}}}catch(err){}};_walk(u);}`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync(targetPath, content, 'utf8');
console.log('[patch-tailwind] Successfully applied WASI Windows fallback patch to @tailwindcss/turbopack.');
