import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';

const out=process.argv[2];
if(!out)throw Error('Usage: node scripts/play-assets.mjs /absolute/output/directory');
await mkdir(out,{recursive:true});
const root=path.resolve(import.meta.dirname,'../dist');
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep))throw Error('Outside site');
    const data=await readFile(file);
    res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff':'font/woff','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');
    res.end(data);
  }catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(4194,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
  const context=await browser.newContext({viewport:{width:390,height:693},deviceScaleFactor:1080/390,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4194/');
  await page.waitForFunction(()=>document.body.dataset.ready==='true');
  await page.evaluate(async()=>{
    await document.fonts.ready;
    const store=await import('./storage.js'),core=await import('./core.js');
    for(const [i,name] of ['ملاحظات الاجتماع','فاتورة تجريبية'].entries()) {
      const canvas=core.makeCanvas(420,594),x=canvas.getContext('2d');
      x.fillStyle='white';x.fillRect(0,0,420,594);x.fillStyle=i?'#3764ed':'#9471d9';x.fillRect(32,32,356,8);
      x.font='23px Readex';x.textAlign='right';x.fillText(name,382,94);
      x.fillStyle='#728098';x.font='14px Readex';x.fillText('عينة توضيحية — دون بيانات شخصية',382,132);
      for(let line=0;line<10;line++){x.fillStyle=line%2?'#edf2ff':'#dde5f3';x.fillRect(40,170+line*27,340-(line%3)*30,7);}
      const blob=await core.toBlob(canvas,'image/png'),doc=store.newDoc(name);
      doc.folder='أمثلة';doc.favorite=!i;doc.pages=[store.newPage(blob,420,594)];await store.saveDoc(doc);
    }
  });
  await page.reload();await page.waitForSelector('.doc-card');await page.evaluate(()=>document.fonts.ready);
  for(const lang of ['ar','en']) {
    await page.evaluate(async lang=>(await import('./i18n.js')).setLanguage(lang),lang);
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(out,`phone-home-${lang}.png`),animations:'disabled'});
    await page.locator('[data-open]').first().click();await page.waitForSelector('.page-card');
    await page.screenshot({path:path.join(out,`phone-document-${lang}.png`),animations:'disabled'});
    await page.locator('#back').click();
  }
  const graphic=await browser.newPage({viewport:{width:1024,height:500},deviceScaleFactor:1});
  const icon=(await readFile(path.join(root,'icon-512.png'))).toString('base64');
  const font=(await readFile(path.join(root,'fonts/ReadexPro.woff'))).toString('base64');
  await graphic.setContent(`<!doctype html><html dir="rtl"><style>@font-face{font-family:Readex;src:url(data:font/woff;base64,${font})}*{box-sizing:border-box}body{margin:0;width:1024px;height:500px;background:#f5f7ff;font-family:Readex;display:flex;align-items:center;padding:70px;gap:64px;color:#173057}.mark{width:235px;height:235px;flex:none}.copy{flex:1}h1{font-size:72px;margin:0 0 10px}p{font-size:30px;margin:0 0 22px}.english{direction:ltr;text-align:right;font-size:23px;color:#63749a}.tag{color:#3764ed;font-size:18px}</style><body><img class="mark" src="data:image/png;base64,${icon}" alt=""><div class="copy"><h1>ورقة</h1><p>امسح · رتّب · شارك</p><div class="english">Waraqa — Document Scanner</div><div class="tag">مستنداتك، ببساطة.</div></div></body></html>`);
  await graphic.evaluate(()=>document.fonts.ready);
  await graphic.screenshot({path:path.join(out,'feature-graphic-1024x500.png')});
  await copyFile(path.join(root,'icon-512.png'),path.join(out,'store-icon-512.png'));
  console.log('Store artwork and four real PWA interface screenshots generated with synthetic documents. Review on native phones before submission.');
}finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
