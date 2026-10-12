import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'../dist');
const server=createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/^\/$/,'/index.html'));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.svg':'image/svg+xml','.woff':'font/woff','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4185,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},permissions:['camera']}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4185');await page.waitForFunction(()=>document.body.dataset.ready==='true').catch(async e=>{console.log('Startup errors',errors,await page.locator('#toast').textContent(),await page.locator('#empty').textContent());throw e;});
 const rotations=await page.evaluate(async()=>{
  const core=await import('./core.js'),ocr=await import('./ocr.js'),pre=await import('./ocr-preprocess.js'),store=await import('./storage.js');
  const font=new FontFace('FixtureAmiri','url(./vendor/Amiri-Regular.ttf)');await font.load();document.fonts.add(font);
  const c=core.makeCanvas(1200,700),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='black';ctx.font='bold 64px Arial';ctx.fillText('DOCUMENT SCANNER TEST',80,150);ctx.font='84px FixtureAmiri';ctx.textAlign='right';ctx.direction='rtl';ctx.fillText('وثيقة اختبار باللغة العربية',1100,350);
  const original=await core.toBlob(c,'image/png'),base=await pre.prepareOcr(original,false),results=[];
  for(const angle of [0,90,180,270]){
   const input=await pre.rotatePrepared(base,angle),bitmap=await core.image(input.blob);let last=0;
   const result=await ocr.recognize(input.blob,'ara+eng',fraction=>{if(fraction<last||fraction<0||fraction>1)throw Error('Progress must be monotonic');last=fraction;},{quality:'best',orientation:'auto'});
   // Round-trip word boxes must remain in the original photographed coordinate space.
   const boxValid=result.words.every(w=>w.bbox.x0>=0&&w.bbox.y0>=0&&w.bbox.x1<=bitmap.width&&w.bbox.y1<=bitmap.height&&w.bbox.x1>w.bbox.x0&&w.bbox.y1>w.bbox.y0);
   results.push({angle,correction:result.rotationDegrees,text:result.text,boxValid,complete:last===1});bitmap.close();
   if(angle===90){const d=store.newDoc('Rotated OCR');d.pages=[store.newPage(input.blob,input.transform.width,input.transform.height)];await store.saveDoc(d);}
  }
  // Known rectangles round-trip exactly for every quarter turn, independent of OCR confidence.
  for(const angle of [90,180,270]){const rotated=await pre.rotatePrepared(base,angle),a=angle*Math.PI/180,box={x0:80,y0:90,x1:450,y1:160},points=[[80,90],[450,90],[450,160],[80,160]].map(([x,y])=>({x:(x-600)*Math.cos(a)-(y-350)*Math.sin(a)+rotated.transform.width/2,y:(x-600)*Math.sin(a)+(y-350)*Math.cos(a)+rotated.transform.height/2})),mapped=pre.mapWordBox({x0:Math.min(...points.map(p=>p.x)),y0:Math.min(...points.map(p=>p.y)),x1:Math.max(...points.map(p=>p.x)),y1:Math.max(...points.map(p=>p.y))},rotated.transform);if(Object.keys(box).some(k=>Math.abs(mapped[k]-box[k])>.001))throw Error('Incorrect rotated word coordinates');}
  const manual=await ocr.recognize((await pre.rotatePrepared(base,90)).blob,'eng',()=>{},{orientation:'270',preprocess:false,quality:'fast'});results.push({manual:manual.text,correction:manual.rotationDegrees});return results;
 });
 console.log('Rotation measurements:',JSON.stringify(rotations));for(const r of rotations.slice(0,4)){assert.equal(r.correction,(360-r.angle)%360);assert.match(r.text,/DOCUMENT SCANNER TEST/);for(const word of ['وثيقة','اختبار','باللغة','العربية'])assert.ok(r.text.includes(word));assert.ok(r.boxValid&&r.complete);}assert.equal(rotations[4].correction,270);assert.match(rotations[4].manual,/SCANNER/);
 await page.reload();await page.waitForSelector('.doc-card');await page.locator('[data-open]').first().click();await page.locator('[data-ocr]').first().click();await page.waitForSelector('#ocr-orientation');await page.locator('#modal-actions .primary').click();await page.waitForSelector('#busy[open]');
 const visible=()=>page.evaluate(()=>{const busy=document.querySelector('#busy'),progress=document.querySelector('#busy-progress'),r=progress.getBoundingClientRect();return busy.matches(':modal')&&document.querySelector('#modal').open&&busy.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
 assert.equal(await visible(),true,'OCR progress wins hit testing above the OCR dialog');
 await page.keyboard.press('Escape');await page.waitForSelector('#busy',{state:'hidden'});assert.equal(await page.locator('#modal').evaluate(e=>e.open),true,'Cancellation restores the OCR dialog');assert.equal(await page.locator('#ocr-text').inputValue(),'');
 await page.locator('#modal-actions .primary').click();await page.waitForSelector('#busy[open]');assert.equal(await visible(),true);await page.waitForSelector('#busy',{state:'hidden',timeout:120000});assert.match(await page.locator('#ocr-text').inputValue(),/SCANNER/);assert.equal(await page.locator('#modal').evaluate(e=>e.open),true);await page.locator('#modal-close').click();await page.locator('#back').click();
 // Exercise the camera capture flow with an actual fake media device.
 await page.locator('#scan').click();await page.waitForFunction(()=>document.querySelector('#camera-video')?.videoWidth>0);
 await page.locator('#modal-actions .primary').click();await page.waitForSelector('#busy[open]');assert.equal(await visible(),true,'Camera progress wins hit testing above the camera dialog');await page.waitForSelector('#busy',{state:'hidden',timeout:60000});assert.equal(await page.locator('#modal').evaluate(e=>e.open),true);await page.locator('#modal-close').click();
 assert.deepEqual(errors,[]);console.log('PASS: Arabic/English OCR at all four rotations, manual orientation, original-image word coordinates, monotonic progress, cancellation and top-layer camera/OCR progress');
}finally{await browser.close();await new Promise(r=>server.close(r));}
