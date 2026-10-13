importScripts('./share-inbox-runtime.js');
const {saveShare}=self.WaraqaShareInbox;
const CACHE='waraqa-shell-v30';
const ASSETS=['./','./index.html','./privacy.html','./style.css','./app.js','./signature-editor.js','./start.js','./workspace/shell.js','./workspace/actions.js','./workspace/repository.js','./workspace-tools.js','./repair-editor.js','./advanced-imaging.js','./book-model.js','./book-workflow.js','./book-repository.js','./document-reader.js','./local-assistant.js','./llm-worker.js','./vendor/pptxgen.mjs','./vendor/katex.mjs','./vendor/katex.min.css','./library-tools.js','./scan-quality.js','./export-profiles.js','./thumbnails.js','./processing-queue.js','./ocr-review.js','./android-bridge.js','./notification-shortcuts.js','./share-inbox.js','./share-inbox-runtime.js','./ui.js','./languages.js','./locales.js','./office.js','./export-ui.js','./vendor/fflate.mjs','./fonts/ReadexPro.woff','./fonts/OFL.txt','./config.js','./compose-editor.js','./split-editor.js','./ocr-preprocess.js','./core.js','./storage.js','./drive.js','./i18n.js','./scanner.js','./ocr.js','./ocr-language-detect.js','./vendor/franc.mjs','./pdf.js','./encrypt-worker.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('waraqa-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL('./',self.location.href);
 if(url.origin!==self.location.origin)return;
 if(request.method==='POST'&&url.pathname===new URL('./share-target',self.location.href).pathname){
  event.respondWith((async()=>{try{if(Number(request.headers.get('content-length'))>90*1024*1024)throw Error('too-large');const form=await request.formData(),files=form.getAll('files').filter(f=>f instanceof Blob);const id=await saveShare(files);return Response.redirect(new URL('./?share='+encodeURIComponent(id),self.location.href).href,303);}catch(error){const reason=['unsupported','too-large'].includes(error.message)?error.message:'storage';return Response.redirect(new URL('./?share_error='+reason,self.location.href).href,303);}})());return;
 }
 if(request.method!=='GET')return;
 // Manifest metadata must refresh even when the application shell is cached.
 if(url.pathname===new URL('./manifest.webmanifest',self.location.href).pathname){
  event.respondWith(fetch(request,{cache:'no-cache'}).then(response=>{if(!response.ok||response.redirected)throw Error('manifest unavailable');const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));return response;}).catch(async()=>await caches.match(request)||Response.error()));return;
 }
 if(request.mode==='navigate'){const appRoot=url.pathname===scope.pathname||url.pathname===new URL('./index.html',self.location.href).pathname;if(appRoot){event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(new URL('./index.html',self.location.href).href)||fetch(request)));}else event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match(request))));return;}
 const vendor=url.pathname.startsWith(new URL('./vendor/',self.location.href).pathname);
 if(!vendor&&!ASSETS.some(asset=>new URL(asset,self.location.href).pathname===url.pathname))return;
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(request)).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&!response.redirected){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
});

self.addEventListener('notificationclick',event=>{event.notification.close();const action=event.action||event.notification.data?.tool||'scan';const tool=['scan','ocr','id','signature'].includes(action)?action:'scan';event.waitUntil(clients.openWindow(new URL('./?tool='+tool,self.location.href).href));});

self.addEventListener('message',event=>{if(event.data?.type==='WARAQA_SHELL')event.ports[0]?.postMessage({cache:CACHE});});
