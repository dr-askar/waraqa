const CACHE='waraqa-shell-v6';
const ASSETS=['./','./index.html','./privacy.html','./style.css','./app.js','./ui.js','./languages.js','./locales.js','./office.js','./export-ui.js','./vendor/fflate.mjs','./fonts/ReadexPro.woff','./fonts/OFL.txt','./config.js','./compose-editor.js','./split-editor.js','./ocr-preprocess.js','./core.js','./storage.js','./drive.js','./i18n.js','./scanner.js','./ocr.js','./pdf.js','./encrypt-worker.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('waraqa-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL('./',self.location.href);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request).then(response=>{if(response.ok&&!response.redirected){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;}).catch(async()=>await caches.match(request)||await caches.match('./')||Response.error()));return;}
 const vendor=url.pathname.startsWith(new URL('./vendor/',self.location.href).pathname);
 if(!vendor&&!ASSETS.some(asset=>new URL(asset,self.location.href).pathname===url.pathname))return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&!response.redirected){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
});
