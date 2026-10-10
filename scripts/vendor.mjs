import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {createHash} from 'node:crypto';
const base=path.resolve(import.meta.dirname,'..'),out=path.join(base,'dist/vendor');await mkdir(out,{recursive:true});
const files=[['@techstark/opencv-js/dist/opencv.js','opencv.js'],['tesseract.js/dist/tesseract.min.js','tesseract.min.js'],['tesseract.js/dist/worker.min.js','ocr-worker.min.js'],['tesseract.js-core/tesseract-core-lstm.wasm.js','tesseract-core-lstm.wasm.js'],['tesseract.js-core/tesseract-core-simd-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js'],['jspdf/dist/jspdf.umd.min.js','jspdf.umd.min.js'],['pdfjs-dist/build/pdf.min.mjs','pdf.mjs'],['pdfjs-dist/build/pdf.worker.min.mjs','pdf.worker.mjs'],['@jspawn/qpdf-wasm/qpdf.mjs','qpdf.mjs'],['@jspawn/qpdf-wasm/qpdf.js','qpdf.js'],['@jspawn/qpdf-wasm/browser.js','browser.js'],['@jspawn/qpdf-wasm/qpdf.wasm','qpdf.wasm']];
for(const [source,target]of files)await cp(path.join(base,'node_modules',source),path.join(out,target));
const fontTarget=path.join(out,'Amiri-Regular.ttf');try{await cp(path.join(base,'assets/Amiri-Regular.ttf'),fontTarget);}catch{execFileSync('curl',['--fail','--location','--retry','2','--max-time','120','https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf','-o',fontTarget],{stdio:'inherit'});}
if(createHash('sha256').update(await readFile(fontTarget)).digest('hex')!=='ab391c4147d054c48976e98322ad0eefe1427aa0e0502a12a4c75d80a70cfcd7')throw Error('Unexpected Arabic font checksum');
await cp(path.join(base,'assets/Amiri-OFL.txt'),path.join(out,'Amiri-OFL.txt'));
const modelHashes={ara:'d4be2e97006ed621e8b7b43a57e471a6b1c6c2247e02dc08250377759ef97c23',eng:'537bd938b3aef591a1f86e3af201d9c25cb60159064ed92cb14010f7325c92df'};
for(const lang of ['ara','eng']){
 const target=path.join(out,`${lang}.traineddata.gz`);
 try{await readFile(target);}catch{const raw=path.join(out,`${lang}.traineddata`);execFileSync('curl',['--fail','--location','--retry','2','--max-time','120',`https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/${lang}.traineddata`,'-o',raw],{stdio:'inherit'});await writeFile(target,gzipSync(await readFile(raw)));await import('node:fs/promises').then(fs=>fs.unlink(raw));}
 if(createHash('sha256').update(await readFile(target)).digest('hex')!==modelHashes[lang])throw Error('Unexpected OCR model checksum: '+lang);
}
const bestHashes={ara:'ab9d157d8e38ca00e7e39c7d5363a5239e053f5b0dbdb3167dde9d8124335896',eng:'8280aed0782fe27257a68ea10fe7ef324ca0f8d85bd2fd145d1c2b560bcb66ba'};
await mkdir(path.join(out,'ocr-best'),{recursive:true});
for(const lang of ['ara','eng']){const target=path.join(out,'ocr-best',`${lang}.traineddata.gz`);let raw;try{raw=(await import('node:zlib')).gunzipSync(await readFile(target));}catch{const file=path.join(out,'ocr-best',`${lang}.traineddata`);try{raw=await readFile(file);}catch{execFileSync('curl',['--fail','--location','--retry','2','--max-time','120',`https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/${lang}.traineddata`,'-o',file],{stdio:'inherit'});raw=await readFile(file);}await writeFile(target,gzipSync(raw));await import('node:fs/promises').then(fs=>fs.unlink(file));}if(createHash('sha256').update(raw).digest('hex')!==bestHashes[lang])throw Error('Unexpected high-quality OCR checksum: '+lang);}
for(const [pkg,name]of [['@techstark/opencv-js','OpenCV'],['tesseract.js','Tesseract'],['tesseract.js-core','Tesseract-core'],['jspdf','jsPDF'],['pdfjs-dist','PDF.js'],['@jspawn/qpdf-wasm','QPDF']]){for(const candidate of ['LICENSE','LICENSE.txt','LICENSE.md'])try{await cp(path.join(base,'node_modules',pkg,candidate),path.join(out,`${name}-LICENSE.txt`));break;}catch{}}
console.log('Browser engines and OCR models prepared on the same origin');

const client=process.env.WARAQA_GOOGLE_CLIENT_ID||'';if(client&&!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(client))throw Error('Invalid public Google OAuth client ID');await writeFile(path.join(base,'dist/config.js'),'export const GOOGLE_CLIENT_ID='+JSON.stringify(client)+';\n');
