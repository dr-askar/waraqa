const CACHE='waraqa-shell-v1';
const ASSETS=['./','./index.html','./style.css','./app.js','./core.js','./storage.js','./drive.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('waraqa-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{if(response.ok&&!response.redirected){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('./',copy)));}return response;}).catch(()=>caches.match('./').then(cached=>cached||Response.error())));return;
  }
  if(!ASSETS.some(asset=>new URL(asset,self.location.href).pathname===url.pathname))return;
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
