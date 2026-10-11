import {id,blobData,dataBlob} from './core.js';
let db;
export function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open('waraqa',2);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('documents'))req.result.createObjectStore('documents',{keyPath:'id'});if(!req.result.objectStoreNames.contains('meta'))req.result.createObjectStore('meta',{keyPath:'key'});};req.onsuccess=()=>{db=req.result;resolve(db)};req.onerror=()=>reject(Error('تعذر فتح التخزين المحلي. استخدم متصفح Chrome بدون التصفح الخفي.'));});}
export async function allDocs(){return new Promise((resolve,reject)=>{const req=db.transaction('documents').objectStore('documents').getAll();req.onsuccess=()=>Promise.all(req.result.map(unseal)).then(resolve,reject);req.onerror=()=>reject(req.error);});}
export async function saveDoc(doc,touch=true){
  const previous=doc.rev;
  const updated=touch?{...doc,rev:id(),ancestors:[...(doc.ancestors||[]),...(previous?[previous]:[])],updated:Date.now()}:doc;
  if(lockConfig&&!activeKey)throw Error('المستندات مقفلة');
  const record=activeKey?await seal(updated,activeKey):updated;
  return new Promise((resolve,reject)=>{const tx=db.transaction('documents','readwrite');tx.objectStore('documents').put(record);tx.oncomplete=()=>resolve(updated);tx.onerror=()=>reject(Error('لم يتم الحفظ. قد تكون مساحة جهازك ممتلئة؛ نزّل نسخة احتياطية.'));tx.onabort=()=>reject(tx.error);});
}
export async function deleteLocal(docId){return new Promise((resolve,reject)=>{const tx=db.transaction('documents','readwrite');tx.objectStore('documents').delete(docId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
export function newDoc(name){return{id:id(),name:name||`مستند ${new Date().toLocaleDateString('ar')}`,created:Date.now(),updated:Date.now(),pages:[],folder:'',favorite:false,trashed:false,rev:id(),ancestors:[]};}
export function newPage(blob,width,height){return{id:id(),blob,original:blob,width,height,history:[],redo:[],ocr:null,redacted:false};}
export async function encodeDoc(doc,includeHistory=false){
  const pages=[];for(const page of doc.pages){pages.push({...page,blob:await blobData(page.blob),original:page.original===page.blob?null:await blobData(page.original),history:includeHistory?await historyJson(page.history):[],redo:includeHistory?await historyJson(page.redo):[]});}
  return{...doc,pages,schema:1};
}
export async function decodeDoc(value){
  if(value.schema!==1||typeof value.id!=='string'||typeof value.name!=='string'||typeof value.rev!=='string'||!Array.isArray(value.pages)||value.pages.length>80)throw Error('نسخة المستند غير مدعومة');
  const pages=value.pages.map(p=>{const blob=dataBlob(p.blob);return{id:typeof p.id==='string'?p.id:id(),blob,original:p.original?dataBlob(p.original):blob,width:p.width,height:p.height,ocr:validateOcr(p.ocr),redacted:!!p.redacted,sourceKind:p.sourceKind||'import',history:historyFromJson(p.history),redo:historyFromJson(p.redo)};});
  return{shareReceipts:Array.isArray(value.shareReceipts)?value.shareReceipts.filter(x=>typeof x==='string'&&x.length<=100).slice(-100):[],id:value.id,name:value.name.slice(0,150),created:Number(value.created)||Date.now(),updated:Number(value.updated)||Date.now(),pages,folder:String(value.folder||'').slice(0,100),favorite:!!value.favorite,trashed:!!value.trashed,deleted:!!value.deleted,tags:Array.isArray(value.tags)?value.tags.filter(t=>typeof t==='string'):[],rev:value.rev,conflictOf:typeof value.conflictOf==='string'?value.conflictOf:undefined,ancestors:Array.isArray(value.ancestors)?value.ancestors.filter(x=>typeof x==='string'):[]};
}
export function syncHeads(snapshots){
  const superseded=new Set(snapshots.flatMap(s=>s.ancestors||[]));
  const revisions=new Map();for(const snapshot of snapshots)if(!superseded.has(snapshot.rev))revisions.set(snapshot.rev,snapshot);
  return [...revisions.values()];
}

const bytes64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);};
const from64=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
let activeKey=null,lockConfig=null;
function metaGet(key){return new Promise((resolve,reject)=>{const r=db.transaction('meta').objectStore('meta').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function lockState(){lockConfig=(await metaGet('lock'))?.value||null;return{enabled:!!lockConfig,locked:!!lockConfig&&!activeKey};}
async function derive(password,salt){const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:from64(salt),iterations:200000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function encryptValue(value,key){const iv=crypto.getRandomValues(new Uint8Array(12)),encoded=new TextEncoder().encode(JSON.stringify(value));return{iv:bytes64(iv),cipher:bytes64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoded)))};}
async function decryptValue(record,key){const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(record.iv)},key,from64(record.cipher));return JSON.parse(new TextDecoder().decode(decoded));}
async function seal(document,key){const encoded=await encodeDoc(document,true);return{id:document.id,sealed:true,...await encryptValue(encoded,key)};}
async function unseal(record){if(!record.sealed)return record;if(!activeKey)throw Error('المستندات مقفلة. أدخل كلمة المرور.');return decodeDoc(await decryptValue(record,activeKey));}
export async function unlockStorage(password){const state=await lockState();if(!state.enabled)return;try{const key=await derive(password,lockConfig.salt);const check=await decryptValue(lockConfig.check,key);if(check!=='waraqa-key-check')throw Error();activeKey=key;}catch{throw Error('كلمة المرور غير صحيحة');}}
export function lockStorage(){activeKey=null;}
export async function configureLock(password){
  const documents=await allDocs();
  // Derive once using the actual persisted salt.
  const salt=password?bytes64(crypto.getRandomValues(new Uint8Array(16))):null;
  const newKey=password?await derive(password,salt):null;
  const config=password?{salt,check:await encryptValue('waraqa-key-check',newKey)}:null;
  const preferences=[];for(const key of ['signature','folders']){const value=await getUserPreference(key);preferences.push({key:'user-'+key,value:newKey&&value!==null?{sealed:true,...await encryptValue(value,newKey)}:value});}
  const records=[];for(const document of documents)records.push(newKey?await seal(document,newKey):document);
  await new Promise((resolve,reject)=>{const tx=db.transaction(['documents','meta'],'readwrite');const store=tx.objectStore('documents');store.clear();records.forEach(record=>store.put(record));tx.objectStore('meta').put({key:'lock',value:config});preferences.forEach(record=>tx.objectStore('meta').put(record));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  activeKey=newKey;lockConfig=config;
}

function validateOcr(value){if(!value||typeof value.text!=='string')return null;return{text:value.text.slice(0,500000),words:Array.isArray(value.words)?value.words.slice(0,10000).filter(w=>typeof w.text==='string'&&w.bbox&&Object.values(w.bbox).every(Number.isFinite)):[],language:String(value.language||'ara+eng'),confidence:Number.isFinite(value.confidence)?value.confidence:undefined,quality:value.quality==='fast'?'fast':'best',deskewDegrees:Number.isFinite(value.deskewDegrees)?value.deskewDegrees:0,edited:!!value.edited};}

async function historyJson(states=[]){const out=[];for(const state of states.slice(-3))out.push({...state,blob:await blobData(state.blob)});return out;}
function historyFromJson(states){return Array.isArray(states)?states.slice(-3).map(state=>({...state,blob:dataBlob(state.blob),ocr:validateOcr(state.ocr)})):[];}
export async function encryptBackup(backup,password){if(password.length<8)throw Error('استخدم كلمة مرور من 8 أحرف على الأقل');const salt=bytes64(crypto.getRandomValues(new Uint8Array(16))),key=await derive(password,salt);return{app:'waraqa-encrypted',schema:1,salt,...await encryptValue(backup,key)};}
export async function decryptBackup(backup,password){if(backup.app!=='waraqa-encrypted'||backup.schema!==1)throw Error('صيغة النسخة المشفرة غير مدعومة');try{return await decryptValue(backup,await derive(password,backup.salt));}catch{throw Error('كلمة مرور النسخة غير صحيحة أو الملف تالف');}}
export async function getUserPreference(key){const record=await metaGet('user-'+key);if(!record)return null;if(record.value?.sealed){if(!activeKey)throw Error('التطبيق مقفل');return decryptValue(record.value,activeKey);}return record.value;}
export async function setUserPreference(key,value){if(lockConfig&&!activeKey)throw Error('التطبيق مقفل');const stored=activeKey?{sealed:true,...await encryptValue(value,activeKey)}:value;await new Promise((resolve,reject)=>{const tx=db.transaction('meta','readwrite');tx.objectStore('meta').put({key:'user-'+key,value:stored});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}

// Rename/delete folder and update all affected revisions in a single transaction.
export async function saveFolderOrganization(documents,folders){
 if(lockConfig&&!activeKey)throw Error('التطبيق مقفل');
 const updated=documents.map(d=>({...d,rev:id(),ancestors:[...(d.ancestors||[]),d.rev],updated:Date.now()}));
 const records=[];for(const d of updated)records.push(activeKey?await seal(d,activeKey):d);
 const value=activeKey?{sealed:true,...await encryptValue(folders,activeKey)}:folders;
 await new Promise((resolve,reject)=>{const tx=db.transaction(['documents','meta'],'readwrite');records.forEach(d=>tx.objectStore('documents').put(d));tx.objectStore('meta').put({key:'user-folders',value});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
