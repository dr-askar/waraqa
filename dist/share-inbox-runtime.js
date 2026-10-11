(()=>{
// A short-lived local inbox bridges Android's POST to the application window.
// It is separate from encrypted documents and cleared on save/cancel or expiry.
const SHARE_LIMIT=80*1024*1024,SHARE_TTL=60*60*1000;
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open('waraqa-share-inbox',1);r.onupgradeneeded=()=>r.result.createObjectStore('incoming',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function transaction(mode,callback){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('incoming',mode);let result;callback(tx.objectStore('incoming'),value=>{result=value;});tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
async function pruneShares(){await transaction('readwrite',store=>{const r=store.openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;if(c.value.created<Date.now()-SHARE_TTL)c.delete();c.continue();};});}
function supportedShare(file){return file instanceof Blob&&file.size>0&&(file.type.startsWith('image/')||file.type==='application/pdf'||/\.(pdf|png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name||''));}
async function saveShare(files){if(!files.length||files.some(f=>!supportedShare(f)))throw Error('unsupported');if(files.length>80||files.reduce((n,f)=>n+f.size,0)>SHARE_LIMIT)throw Error('too-large');await pruneShares();const id=crypto.randomUUID();await transaction('readwrite',store=>store.put({id,created:Date.now(),files:files.map(f=>({name:f.name||'shared-file',type:f.type,blob:f}))}));return id;}
async function readShare(id){await pruneShares();return transaction('readonly',(store,done)=>{const r=store.get(id);r.onsuccess=()=>done(r.result);});}
async function deleteShare(id){await transaction('readwrite',store=>store.delete(id));}

globalThis.WaraqaShareInbox={SHARE_LIMIT,SHARE_TTL,pruneShares,supportedShare,saveShare,readShare,deleteShare};
})();
