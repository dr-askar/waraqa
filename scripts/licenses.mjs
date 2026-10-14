import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>readFile(path.join(root,p),'utf8');
const lock=JSON.parse(await read('package-lock.json'));
const sections=['Waraqa distribution notices\nGenerated from package-lock.json and installed upstream files.\nA dependency inventory is not a claim that every dependency is bundled.'];
for(const file of ['LICENSE','NOTICE','THIRD_PARTY_NOTICES.md','assets/Amiri-OFL.txt','dist/fonts/OFL.txt','checks/samples/NOTICE.md']) sections.push(`=== ${file} ===\n${await read(file)}`);
const missing=[];
for(const [dir,info] of Object.entries(lock.packages).sort(([a],[b])=>a.localeCompare(b))) {
  if(!dir||info.dev)continue;
  let files;
  try {files=await readdir(path.join(root,dir));} catch(error) {if(error.code==='ENOENT'&&info.optional)continue;throw error;}
  const name=dir.split('node_modules/').at(-1);
  const texts=[];
  for(const file of files.filter(f=>/^(licen[cs]e|notice|copying)(\.|-|$)/i.test(f)||f==='FEEL-FREE.md').sort()) {
    const text=await readFile(path.join(root,dir,file),'utf8').catch(error=>{if(error.code==='EISDIR')return '';throw error;});
    if(text.trim())texts.push(`--- ${file} ---\n${text}`);
  }
  if(!texts.length&&name==='franc-min')texts.push(await read('assets/franc-LICENSE.txt'));
  if(!texts.length&&name==='isarray')texts.push(await read(`${dir}/README.md`));
  if(!texts.length&&name.startsWith('@napi-rs/canvas-'))texts.push(await read('node_modules/@napi-rs/canvas/LICENSE'));
  if(!texts.length) {missing.push(`${name}@${info.version}: metadata ${info.license||'UNKNOWN'}; no standalone text in installed package`);texts.push('No standalone upstream text found; see inventory review notes.');}
  sections.push(`=== ${name}@${info.version} (${info.license||'UNKNOWN'}) ===\n${texts.join('\n\n')}`);
}
sections.push(`=== Review notes ===\n${missing.length?missing.join('\n'):'All installed production packages have included notices.'}\nOCR model repositories use Apache 2.0; pinned sources are recorded in scripts/ocr-models.json.\nAndroid dependencies retain their own licenses; see THIRD_PARTY_NOTICES.md.`);
await mkdir(path.join(root,'dist/licenses'),{recursive:true});
await writeFile(path.join(root,'dist/licenses/THIRD_PARTY.txt'),sections.join('\n\n')+'\n');
for(const file of ['LICENSE','NOTICE'])await writeFile(path.join(root,'dist/licenses',file),await read(file));
console.log(`Distribution notices generated; ${missing.length} metadata-only upstream entries flagged for review.`);
