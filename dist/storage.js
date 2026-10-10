import {id,blobData,dataBlob} from './core.js';
let db;
export function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open('waraqa',1);req.onupgradeneeded=()=>req.result.createObjectStore('documents',{keyPath:'id'});req.onsuccess=()=>{db=req.result;resolve(db)};req.onerror=()=>reject(Error('تعذر فتح التخزين المحلي. استخدم متصفح Chrome بدون التصفح الخفي.'));});}
export async function allDocs(){return new Promise((resolve,reject)=>{const req=db.transaction('documents').objectStore('documents').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function saveDoc(doc,touch=true){
  const previous=doc.rev;
  const updated=touch?{...doc,rev:id(),ancestors:[...(doc.ancestors||[]),...(previous?[previous]:[])],updated:Date.now()}:doc;
  return new Promise((resolve,reject)=>{const tx=db.transaction('documents','readwrite');tx.objectStore('documents').put(updated);tx.oncomplete=()=>resolve(updated);tx.onerror=()=>reject(Error('لم يتم الحفظ. قد تكون مساحة جهازك ممتلئة؛ نزّل نسخة احتياطية.'));tx.onabort=()=>reject(tx.error);});
}
export async function deleteLocal(docId){return new Promise((resolve,reject)=>{const tx=db.transaction('documents','readwrite');tx.objectStore('documents').delete(docId);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
export function newDoc(name){return{id:id(),name:name||`مستند ${new Date().toLocaleDateString('ar')}`,created:Date.now(),updated:Date.now(),pages:[],folder:'',favorite:false,trashed:false,rev:id(),ancestors:[]};}
export function newPage(blob,width,height){return{id:id(),blob,original:blob,width,height,history:[]};}
export async function encodeDoc(doc){
  const pages=[];for(const page of doc.pages){pages.push({...page,blob:await blobData(page.blob),original:page.original===page.blob?null:await blobData(page.original),history:[]});}
  return{...doc,pages,schema:1};
}
export async function decodeDoc(value){
  if(value.schema!==1||typeof value.id!=='string'||typeof value.name!=='string'||typeof value.rev!=='string'||!Array.isArray(value.pages)||value.pages.length>80)throw Error('نسخة المستند غير مدعومة');
  const pages=value.pages.map(p=>{const blob=dataBlob(p.blob);return{id:typeof p.id==='string'?p.id:id(),blob,original:p.original?dataBlob(p.original):blob,width:p.width,height:p.height,history:[]};});
  return{id:value.id,name:value.name.slice(0,150),created:Number(value.created)||Date.now(),updated:Number(value.updated)||Date.now(),pages,folder:String(value.folder||'').slice(0,100),favorite:!!value.favorite,trashed:!!value.trashed,rev:value.rev,conflictOf:typeof value.conflictOf==='string'?value.conflictOf:undefined,ancestors:Array.isArray(value.ancestors)?value.ancestors.filter(x=>typeof x==='string'):[]};
}
export function syncHeads(snapshots){
  const superseded=new Set(snapshots.flatMap(s=>s.ancestors||[]));
  const revisions=new Map();for(const snapshot of snapshots)if(!superseded.has(snapshot.rev))revisions.set(snapshot.rev,snapshot);
  return [...revisions.values()];
}
