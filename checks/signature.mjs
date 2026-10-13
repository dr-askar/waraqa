import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const server=createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!p.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.mjs':'application/javascript','.js':'application/javascript','.html':'text/html','.css':'text/css','.webmanifest':'application/manifest+json'})[path.extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(4199,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
 page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});await page.goto('http://127.0.0.1:4199');await page.waitForFunction(()=>document.body.dataset.ready==='true');
 await page.evaluate(async()=>{const s=await import('./storage.js'),c=document.createElement('canvas');c.width=600;c.height=800;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,600,800);const b=await new Promise(r=>c.toBlob(r));const d=s.newDoc('signature audit');d.pages=[s.newPage(b,600,800)];await s.saveDoc(d);});await page.reload();await page.waitForFunction(()=>document.body.dataset.ready==='true');
 await page.locator('[data-open]').first().click();
 const open=async()=>{await page.locator('.page-tools .action-menu summary').first().click();await page.locator('[data-annotate]').first().click();await page.waitForSelector('.edit-canvas');};
 const pixels=()=>page.locator('.edit-canvas').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(a[i]<220||a[i+1]<220||a[i+2]<220)n++;return n;});
 const stroke=async()=>{const c=page.locator('.edit-canvas');await c.scrollIntoViewIfNeeded();const r=await c.boundingBox();await page.mouse.move(r.x+r.width*.2,r.y+r.height*.2);await page.mouse.down();await page.mouse.move(r.x+r.width*.65,r.y+r.height*.3,{steps:10});await page.mouse.up();};
 await open();await stroke();assert.ok(await pixels()>100);await page.locator('#undo-ink').click();assert.equal(await pixels(),0);await page.locator('#save-signature').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('لا يوجد رسم'));assert.equal(await page.evaluate(async()=> (await import('./storage.js')).getUserPreference('signature')),null);
 await page.locator('#redo-ink').click();await page.locator('#save-signature').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('تم حفظ التوقيع'));await page.locator('#load-signature').click();await page.waitForFunction(()=>!!document.querySelector('.edit-canvas').dataset.signature);
 // Drag and resize the selected signature without clipping it.
 await page.locator('#signature-size').evaluate(e=>{e.value='95';e.dispatchEvent(new Event('input'));e.dispatchEvent(new Event('change'));});
 let frame=await page.locator('.edit-canvas').evaluate(c=>JSON.parse(c.dataset.signature));assert.ok(frame.x+frame.w<=600.001&&frame.y+frame.h<=800.001);
 await page.locator('#delete-signature').click();await page.locator('#undo-ink').click();assert.ok(await pixels()>100);
 await page.locator('#modal-actions button').filter({hasText:'إلغاء'}).click();assert.equal(await page.evaluate(async()=>{const s=await import('./storage.js');return (await s.allDocs())[0].pages[0].history.length;}),0);
 // Transparent PNG stays transparent; importing is a draft and does not replace saved signature.
 const signatureBefore=await page.evaluate(async()=> (await import('./storage.js')).getUserPreference('signature'));
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=200;const x=c.getContext('2d');x.strokeStyle='blue';x.lineWidth=3;x.beginPath();x.moveTo(5,5);x.lineTo(15,195);x.stroke();return c.toDataURL().split(',')[1];});
 await open();await page.locator('#signature-file').setInputFiles({name:'tall.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.waitForFunction(()=>!!document.querySelector('.edit-canvas').dataset.signature);
 frame=await page.locator('.edit-canvas').evaluate(c=>JSON.parse(c.dataset.signature));assert.ok(frame.h<=800&&frame.w<=600);assert.ok(frame.w<60,'tall signature fitted by height');assert.equal(await page.evaluate(async()=> (await import('./storage.js')).getUserPreference('signature')),signatureBefore);
 // Redaction undo restores its flag as well as pixels.
 await page.locator('#delete-signature').click();await page.locator('#pen-mode').selectOption('redact');await stroke();await page.locator('#undo-ink').click();
 await page.locator('#modal-actions button').filter({hasText:'حفظ التعديلات'}).click();await page.waitForSelector('#modal',{state:'hidden'});
 assert.equal(await page.evaluate(async()=>{const s=await import('./storage.js');return !!(await s.allDocs())[0].pages[0].redacted;}),false);
 await open();await page.locator('#signature-file').setInputFiles({name:'tall.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.waitForFunction(()=>!!document.querySelector('.edit-canvas').dataset.signature);
 await page.locator('#center-signature').click();await page.locator('#modal-actions button').filter({hasText:'حفظ التعديلات'}).click();await page.waitForSelector('#modal',{state:'hidden'});
 const check=await page.evaluate(async()=>{const s=await import('./storage.js'),d=(await s.allDocs())[0],p=d.pages[0],bitmap=await createImageBitmap(p.blob),c=document.createElement('canvas');c.width=p.width;c.height=p.height;c.getContext('2d').drawImage(bitmap,0,0);bitmap.close();const corner=[...c.getContext('2d').getImageData(280,400,1,1).data];return{corner,history:p.history.length,original:!!p.original};});assert.ok(check.corner[0]>240&&check.corner[1]>240,'transparent margins do not produce black/white image boxes');assert.ok(check.original);assert.equal(check.history,2);
 // Reject stale save and preserve externally changed document.
 await open();await stroke();await page.evaluate(async()=>{const s=await import('./storage.js');const d=(await s.allDocs())[0];await s.mutateDoc(d.id,x=>({...x,name:'concurrent rename'}));});await page.locator('#modal-actions button').filter({hasText:'حفظ التعديلات'}).click();await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('تغيّر المستند'));assert.equal(await page.evaluate(async()=> (await (await import('./storage.js')).allDocs())[0].name),'concurrent rename');assert.equal(await page.locator('#modal').evaluate(e=>e.open),true);
 assert.deepEqual(errors,[]);console.log('PASS signature: stroke undo/redo, saved ink, draft cancellation, transparent import, bounds, redaction recovery, original preservation and stale-save rejection');
}finally{await browser.close();await new Promise(r=>server.close(r));}
