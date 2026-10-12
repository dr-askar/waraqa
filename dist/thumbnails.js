// Derived previews stay in memory; originals and encrypted storage are untouched.
export function createThumbnailLibrary({limit=96,size=420}={}){
 const cache=new Map();let generation=0,observer=null,serial=Promise.resolve();
 async function preview(blob,key){
  if(cache.has(key)){const entry=cache.get(key);cache.delete(key);cache.set(key,entry);return entry;}
  const token=generation;const bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'});
  let result;try{const scale=Math.min(1,size/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);result=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('تعذر تجهيز المعاينة')),'image/jpeg',.76));}finally{bitmap.close();}
  if(token!==generation)return null;const entry={url:URL.createObjectURL(result),bytes:result.size};cache.set(key,entry);prune();return entry;
 }
 function prune(){for(const [key,entry] of cache){if(cache.size<=limit)break;const inUse=[...document.querySelectorAll('img[data-preview-key]')].some(img=>img.dataset.previewKey===key&&img.getAttribute('src')===entry.url);if(!inUse){URL.revokeObjectURL(entry.url);cache.delete(key);}}}
 function attach(root,sources){
  observer?.disconnect();const token=generation;
  const load=img=>{const key=img.dataset.previewKey,blob=sources.get(key);if(!blob)return;const cached=cache.get(key);if(cached){img.src=cached.url;return;}
   serial=serial.catch(()=>{}).then(async()=>{if(!img.isConnected||token!==generation)return;try{const entry=await preview(blob,key);if(entry&&img.isConnected&&token===generation&&img.dataset.previewKey===key){img.src=entry.url;img.dataset.previewBytes=String(entry.bytes);}}catch{if(img.isConnected)img.dataset.previewFailed='true';}});
  };
  const images=root.querySelectorAll('img[data-preview-key]');if('IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);load(entry.target);}},{rootMargin:'250px'});images.forEach(img=>observer.observe(img));}else images.forEach(load);prune();
 }
 function clear(){generation++;observer?.disconnect();for(const entry of cache.values())URL.revokeObjectURL(entry.url);cache.clear();}
 return{attach,clear,stats:()=>({count:cache.size,bytes:[...cache.values()].reduce((n,e)=>n+e.bytes,0)})};
}
