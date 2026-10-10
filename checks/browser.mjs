import { chromium } from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'../dist');
const server=createServer(async(req,res)=>{try{const name=req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0];const file=path.join(root,name);if(!file.startsWith(root+path.sep))throw Error();const data=await readFile(file);const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.mjs':'application/javascript','.wasm':'application/wasm','.ttf':'font/ttf'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE_PATH?{executablePath:process.env.BROWSER_EXECUTABLE_PATH}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1,acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>document.querySelector('#empty h3')?.textContent.includes('أول مستند'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile overflow');
 await page.screenshot({path:path.resolve(import.meta.dirname,'mobile-home.png'),fullPage:true});
 const images=await page.evaluate(()=>{return ['#e44','#49a'].map((color,index)=>{const c=document.createElement('canvas');c.width=index?600:400;c.height=index?400:600;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=color;ctx.fillRect(30,30,c.width-60,c.height-60);ctx.fillStyle='white';ctx.font='40px Arial';ctx.fillText('PAGE '+(index+1),60,100);return c.toDataURL('image/png').split(',')[1];});});
 await page.evaluate(()=>localStorage.setItem('waraqa-auto-crop','false'));
 await page.locator('#files').setInputFiles(images.map((base64,i)=>({name:`page-${i}.png`,mimeType:'image/png',buffer:Buffer.from(base64,'base64')})));
 await page.waitForFunction(()=>document.querySelectorAll('.page-card').length===2);await page.waitForSelector('#busy',{state:'hidden'});
 await page.locator('[data-select]').nth(0).check();await page.locator('[data-select]').nth(1).check();await page.locator('#compose').click();await page.waitForSelector('#composition-preview canvas');await page.locator('#modal-actions button').click();await page.waitForFunction(()=>document.querySelectorAll('.page-card').length===3);await page.waitForSelector('#busy',{state:'hidden'});
 await page.locator('#select-all').click();await page.locator('#select-all').click();await page.locator('[data-select]').nth(0).check();await page.locator('#split').click();await page.waitForSelector('#split-preview canvas');await page.locator('#split-count').selectOption('3');await page.waitForFunction(()=>document.querySelectorAll('#split-preview canvas').length===3);await page.locator('#modal-actions button').click();await page.waitForFunction(()=>document.querySelectorAll('.page-card').length===6);await page.waitForSelector('#busy',{state:'hidden'});
 await page.locator('[data-crop]').first().click();await page.waitForSelector('#crop-area canvas');await page.locator('#modal-actions button').click();await page.waitForSelector('#busy',{state:'hidden'});
 await page.locator('[data-enhance]').first().click();await page.locator('#filter').selectOption('gray');await page.waitForSelector('#enhance-preview canvas');await page.locator('#modal-actions button').click();await page.waitForSelector('#busy',{state:'hidden'});
 await page.locator('#export').click();const downloadPromise=page.waitForEvent('download');await page.locator('#modal-actions button').click();const downloaded=await downloadPromise;await downloaded.saveAs(path.resolve(import.meta.dirname,'browser-export.pdf'));await page.waitForSelector('#busy',{state:'hidden'});await page.locator('#modal-close').click();
 await page.screenshot({path:path.resolve(import.meta.dirname,'mobile-editor.png'),fullPage:true});
 await page.reload();await page.waitForSelector('.doc-card');await page.locator('[data-open]').first().click();await page.waitForFunction(()=>document.querySelectorAll('.page-card').length===6);
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await page.waitForSelector('.doc-card');await page.goto('http://127.0.0.1:4173/privacy.html');await page.waitForSelector('h1');await page.goto('http://127.0.0.1:4173');await page.waitForSelector('.doc-card');await context.setOffline(true);await page.reload();await page.waitForSelector('.doc-card');await page.locator('[data-open]').first().click();await page.waitForFunction(()=>document.querySelectorAll('.page-card').length===6);await context.setOffline(false);
 await page.locator('#add-camera').click();await page.waitForFunction(()=>document.querySelector('#camera-video')?.videoWidth>0);await page.waitForFunction(()=>document.querySelector('#camera-guide').textContent!=='جاري تشغيل الكاميرا…',{},{timeout:60000});
 for(let i=1;i<=2;i++){await page.locator('#modal-actions button').first().click();await page.waitForFunction(count=>document.querySelectorAll('.page-card').length===count,6+i);await page.waitForSelector('#busy',{state:'hidden'});}
 await page.locator('#modal-actions button').last().click();assert.equal(await page.locator('.page-card').count(),8);
 assert.deepEqual(errors,[],'Browser errors');
 await page.setViewportSize({width:1440,height:1000});await page.locator('#back').click();await page.screenshot({path:path.resolve(import.meta.dirname,'desktop.png'),fullPage:true});
 console.log('PASS: mobile layout, import, compose, split, crop, enhance, PDF download, restart persistence and offline reload');
} finally {await browser.close();server.close();}
