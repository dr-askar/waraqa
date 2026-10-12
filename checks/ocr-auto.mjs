import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'../dist');
const server=createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.svg':'image/svg+xml','.woff':'font/woff','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4186,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),external=[];
 context.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4186/')&&!r.url().startsWith('blob:'))external.push(r.url());});
 await page.goto('http://127.0.0.1:4186');await page.waitForFunction(()=>document.body.dataset.ready==='true');
 const results=await page.evaluate(async()=>{
  const core=await import('./core.js'),ocr=await import('./ocr.js'),detect=await import('./ocr-language-detect.js'),store=await import('./storage.js');const font=new FontFace('FixtureAmiri','url(./vendor/Amiri-Regular.ttf)');await font.load();document.fonts.add(font);
  const variants=[['ara','eng'],['eng','fra'],['ara','eng','fra'],['rus','eng']];const results=[];
  for(const langs of variants){const c=core.makeCanvas(1500,1000),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='black';ctx.font='40px Arial';ctx.fillText('This document contains important information about the meeting and the project.',60,140);ctx.fillText('We keep our documents organized and read the original text carefully.',60,220);
   if(langs.includes('fra')){ctx.font='40px Arial';ctx.fillText('Ce document contient des informations importantes sur la réunion.',60,340);ctx.fillText('Nous organisons les documents personnels et lisons les informations.',60,420);}
   if(langs.includes('ara')){ctx.font='60px FixtureAmiri';ctx.textAlign='right';ctx.direction='rtl';ctx.fillText('هذه وثيقة باللغة العربية لاختبار تحديد اللغة وقراءة النصوص المطبوعة',1440,640);ctx.fillText('يمكن تنظيم المستندات وحفظ الصفحات على الهاتف بسهولة',1440,740);}
   if(langs.includes('rus')){ctx.font='40px Arial';ctx.fillText('Этот документ содержит важную информацию о встрече.',60,420);ctx.fillText('Мы сохраняем личные документы и читаем текст внимательно.',60,520);}

   const blob=await core.toBlob(c),result=await ocr.recognize(blob,'auto',()=>{},{orientation:'0',quality:'best'});results.push({expected:langs,language:result.language,text:result.text,detection:result.languageDetection});const d=store.newDoc(langs.join('+'));d.pages=[{...store.newPage(blob,1500,1000),ocr:result}];await store.saveDoc(d);const roundtrip=await store.decodeDoc(await store.encodeDoc(d));if(JSON.stringify(roundtrip.pages[0].ocr.languageDetection)!==JSON.stringify(result.languageDetection))throw Error('Language metadata lost in backup');
  }
  const short=detect.languagesFromText('OK');if(!short.uncertain)throw Error('Short text must be uncertain');return results;
 });
 console.log('Auto-language measurements:',JSON.stringify(results));for(const result of results){assert.deepEqual(new Set(result.language.split('+')),new Set(result.expected));assert.match(result.text,/document/i);assert.ok(result.detection);}
 await page.reload();await page.waitForSelector('.doc-card');await page.locator('[data-open]').first().click();await page.locator('[data-ocr]').first().click();await page.waitForSelector('#ocr-text-kind');await page.locator('#ocr-language').selectOption('auto');assert.equal(await page.locator('#ocr-extra-language').isDisabled(),true);await page.locator('#ocr-language').selectOption('eng');assert.equal(await page.locator('#ocr-extra-language').isDisabled(),false);await page.locator('#ocr-text-kind').selectOption('handwritten');assert.equal(await page.locator('#ocr-handwriting-info').isVisible(),true);assert.match(await page.locator('#ocr-handwriting-info').textContent(),/ليس محركاً متخصصاً/);assert.equal(await page.locator('#ocr-quality').isDisabled(),true);
 const sample=await readFile(path.join(import.meta.dirname,'samples/handwriting.png'));
 const handwriting=await page.evaluate(async bytes=>{const ocr=await import('./ocr.js');return ocr.recognize(new Blob([new Uint8Array(bytes)],{type:'image/png'}),'eng',()=>{},{orientation:'0',layout:'11',textKind:'handwritten',quality:'fast'});},Array.from(sample));console.log('Handwriting limitation measurement:',JSON.stringify({text:handwriting.text,confidence:handwriting.confidence}));assert.equal(handwriting.experimentalHandwriting,true);assert.equal(handwriting.quality,'best');
 await page.evaluate(async()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true');await context.setOffline(true);
 const offline=await page.evaluate(async()=>{const store=await import('./storage.js'),ocr=await import('./ocr.js');const docs=await store.allDocs(),d=docs.find(d=>d.pages[0].ocr.language.split('+').length===2&&d.pages[0].ocr.language.includes('ara'));return ocr.recognize(d.pages[0].blob,'auto',()=>{},{orientation:'0',quality:'best'});});assert.deepEqual(new Set(offline.language.split('+')),new Set(['ara','eng']));assert.deepEqual(external,[]);console.log('PASS: per-page Arabic/English and English/French detection, metadata backups, manual language override, experimental handwriting disclosure, quality and offline local-only processing');
}finally{await browser.close();await new Promise(r=>server.close(r));}
