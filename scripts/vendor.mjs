import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
const base=path.resolve(import.meta.dirname,'..'),out=path.join(base,'dist/vendor');await mkdir(out,{recursive:true});
const files=[['fflate/esm/browser.js','fflate.mjs'],['@techstark/opencv-js/dist/opencv.js','opencv.js'],['tesseract.js/dist/tesseract.min.js','tesseract.min.js'],['tesseract.js/dist/worker.min.js','ocr-worker.min.js'],['tesseract.js-core/tesseract-core-lstm.wasm.js','tesseract-core-lstm.wasm.js'],['tesseract.js-core/tesseract-core-simd-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js'],['jspdf/dist/jspdf.umd.min.js','jspdf.umd.min.js'],['pdfjs-dist/build/pdf.min.mjs','pdf.mjs'],['pdfjs-dist/build/pdf.worker.min.mjs','pdf.worker.mjs'],['@jspawn/qpdf-wasm/qpdf.mjs','qpdf.mjs'],['@jspawn/qpdf-wasm/qpdf.js','qpdf.js'],['@jspawn/qpdf-wasm/browser.js','browser.js'],['@jspawn/qpdf-wasm/qpdf.wasm','qpdf.wasm']];
for(const [source,target]of files)await cp(path.join(base,'node_modules',source),path.join(out,target));
await build({entryPoints:[path.join(base,'node_modules/franc-min/index.js')],outfile:path.join(out,'franc.mjs'),bundle:true,format:'esm',platform:'browser',minify:true});
for(const file of ['tesseract-core.wasm.js','tesseract-core-simd.wasm.js'])await cp(path.join(base,'node_modules/tesseract.js-core',file),path.join(out,file));
const fontTarget=path.join(out,'Amiri-Regular.ttf');try{await cp(path.join(base,'assets/Amiri-Regular.ttf'),fontTarget);}catch{execFileSync('curl',['--fail','--location','--retry','2','--max-time','120','https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf','-o',fontTarget],{stdio:'inherit'});}
if(createHash('sha256').update(await readFile(fontTarget)).digest('hex')!=='ab391c4147d054c48976e98322ad0eefe1427aa0e0502a12a4c75d80a70cfcd7')throw Error('Unexpected Arabic font checksum');
await cp(path.join(base,'assets/Amiri-OFL.txt'),path.join(out,'Amiri-OFL.txt'));
const manifest=JSON.parse(await readFile(path.join(base,'scripts/ocr-models.json'),'utf8'));
await mkdir(path.join(out,'ocr-best'),{recursive:true});
const {gunzipSync}=await import('node:zlib');
for(const language of manifest.languages)for(const kind of ['fast','best']){const target=path.join(out,kind==='best'?'ocr-best':'',language.code+'.traineddata.gz');let raw;try{raw=gunzipSync(await readFile(target));}catch{const file=target+'.raw';execFileSync('curl',['--fail','--location','--retry','2','--max-time','120',`https://raw.githubusercontent.com/tesseract-ocr/tessdata_${kind}/${manifest.commits[kind]}/${language.code}.traineddata`,'-o',file],{stdio:'inherit'});raw=await readFile(file);await writeFile(target,gzipSync(raw));await import('node:fs/promises').then(fs=>fs.unlink(file));}if(createHash('sha256').update(raw).digest('hex')!==language.hashes[kind])throw Error('Unexpected OCR model checksum: '+language.code+'/'+kind);}
for(const [pkg,name]of [['fflate','fflate'],['@techstark/opencv-js','OpenCV'],['tesseract.js','Tesseract'],['tesseract.js-core','Tesseract-core'],['jspdf','jsPDF'],['pdfjs-dist','PDF.js'],['@jspawn/qpdf-wasm','QPDF']]){for(const candidate of ['LICENSE','LICENSE.txt','LICENSE.md'])try{await cp(path.join(base,'node_modules',pkg,candidate),path.join(out,`${name}-LICENSE.txt`));break;}catch{}}
const osdTarget=path.join(out,'osd.traineddata.gz');let osd;try{osd=gunzipSync(await readFile(osdTarget));}catch{const rawPath=osdTarget+'.raw';execFileSync('curl',['--fail','--location','--retry','2','--max-time','120',`https://raw.githubusercontent.com/tesseract-ocr/tessdata/${manifest.osd.commit}/osd.traineddata`,'-o',rawPath],{stdio:'inherit'});osd=await readFile(rawPath);await writeFile(osdTarget,gzipSync(osd));await import('node:fs/promises').then(fs=>fs.unlink(rawPath));}if(createHash('sha256').update(osd).digest('hex')!==manifest.osd.sha256)throw Error('Unexpected script detection model checksum');
await cp(path.join(base,'assets/franc-LICENSE.txt'),path.join(out,'franc-min-LICENSE.txt'));
for(const pkg of ['trigram-utils','n-gram']){try{await cp(path.join(base,'node_modules',pkg,'license'),path.join(out,pkg+'-LICENSE.txt'));}catch{await cp(path.join(base,'node_modules',pkg,'LICENSE'),path.join(out,pkg+'-LICENSE.txt'));}}
console.log('Browser engines and OCR models prepared on the same origin');

const client=process.env.WARAQA_GOOGLE_CLIENT_ID||'';if(client&&!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(client))throw Error('Invalid public Google OAuth client ID');await writeFile(path.join(base,'dist/config.js'),'export const GOOGLE_CLIENT_ID='+JSON.stringify(client)+';\n');

await import('./workspace-build.mjs');

await import('./licenses.mjs');
