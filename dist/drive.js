import {allDocs,saveDoc,encodeDoc,decodeDoc,syncHeads} from './storage.js';
import {id} from './core.js';
let accessToken=null,expires=0;
const scope='https://www.googleapis.com/auth/drive.appdata';
export function connected(){return !!accessToken&&Date.now()<expires;}
export async function googleScript(){
  if(window.google?.accounts?.oauth2)return;
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('تعذر تحميل تسجيل Google. تحقق من الإنترنت.'));};document.head.append(script);});
}
export function authorize(clientId){
  if(!clientId?.endsWith('.apps.googleusercontent.com'))return Promise.reject(Error('أضف معرّف OAuth صحيحاً في الإعدادات أولاً.'));
  return new Promise((resolve,reject)=>{
    const client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope,callback:result=>{if(result.error)return reject(Error('لم يتم تفويض Google Drive'));accessToken=result.access_token;expires=Date.now()+(Number(result.expires_in)-60)*1000;resolve();},error_callback:()=>reject(Error('أُلغي تسجيل الدخول أو مُنعت النافذة. افتح التطبيق مباشرة في Chrome.'))});
    client.requestAccessToken({prompt:''});
  });
}
export function disconnect(){accessToken=null;expires=0;}
async function api(path,options={}){
  if(!connected())throw Error('انتهت جلسة Drive. اربط الحساب من جديد.');
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),90000);
  try{
    const response=await fetch(`https://www.googleapis.com/${path}`,{...options,signal:abort.signal,headers:{...options.headers,Authorization:`Bearer ${accessToken}`}});
    if(!response.ok){if(response.status===401)disconnect();throw Error(`تعذر اتصال Drive (${response.status}). لم تُحذف ملفاتك.`);}
    return response;
  }finally{clearTimeout(timer);}
}
export async function syncDrive(progress=()=>{}){
  const user=await (await api('drive/v3/about?fields=user(permissionId,emailAddress)')).json();
  const account=user.user.permissionId;
  const cacheKey=`waraqa-drive-headers-${account}`;let cache={};try{cache=JSON.parse(localStorage.getItem(cacheKey)||'{}');}catch{}
  const files=[];let next='';
  do{const result=await (await api(`drive/v3/files?spaces=appDataFolder&pageSize=1000&fields=nextPageToken,files(id,appProperties)&q=trashed%3Dfalse${next?`&pageToken=${encodeURIComponent(next)}`:''}`)).json();files.push(...result.files.filter(f=>f.appProperties?.app==='waraqa-web-v1'));next=result.nextPageToken||'';}while(next);
  const byDocument=new Map(),knownRevs=new Set();
  for(let i=0;i<files.length;i++){
    const file=files[i];let metadata=cache[file.id];
    if(!metadata){progress(`قراءة النسخ السحابية ${i+1}/${files.length}…`);const data=await (await api(`drive/v3/files/${encodeURIComponent(file.id)}?alt=media`)).json();if(data.schema!==1||!Array.isArray(data.pages))throw Error('نسخة Drive غير مدعومة');metadata={id:data.id,rev:data.rev,ancestors:data.ancestors||[],fileId:file.id};cache[file.id]=metadata;}
    knownRevs.add(`${metadata.id}:${metadata.rev}`);
    if(!byDocument.has(metadata.id))byDocument.set(metadata.id,[]);byDocument.get(metadata.id).push(metadata);
  }
  localStorage.setItem(cacheKey,JSON.stringify(cache));
  let changed=0;
  for(const [documentId,snapshots] of byDocument){
    const locals=await allDocs(),local=locals.find(d=>d.id===documentId);
    const heads=syncHeads([...snapshots,...(local?[local]:[])]).sort((a,b)=>a.rev.localeCompare(b.rev));
    if(heads.length===1&&local?.rev===heads[0].rev)continue;
    // Preserve every competing head as a separate local document before changing the original.
    const preferred=heads.find(h=>h.rev===local?.rev)||heads[0];
    for(const head of heads){
      if(head.rev===preferred.rev)continue;
      const conflictOf=`${documentId}:${head.rev}`;
      if(locals.some(d=>d.conflictOf===conflictOf))continue;
      progress('الاحتفاظ بنسخة تعارض بدون استبدال عملك…');
      const data=head.pages?head:await decodeDoc(await (await api(`drive/v3/files/${encodeURIComponent(head.fileId)}?alt=media`)).json());
      await saveDoc({...data,id:id(),name:`${data.name} (نسخة تعارض)`,rev:id(),ancestors:[],conflictOf},false);changed++;
    }
    if(local?.rev!==preferred.rev){progress('استعادة مستند من Drive…');const data=await decodeDoc(await (await api(`drive/v3/files/${encodeURIComponent(preferred.fileId)}?alt=media`)).json());await saveDoc(data,false);changed++;}
  }
  // Immutable snapshots avoid overwriting another device's simultaneous upload.
  for(const doc of await allDocs()){
    if(knownRevs.has(`${doc.id}:${doc.rev}`))continue;
    progress(`رفع «${doc.name}»…`);
    const encoded=await encodeDoc(doc),payload=JSON.stringify(encoded);
    if(new Blob([payload]).size>50*1024*1024)throw Error('هذا المستند كبير للمزامنة الحالية. قسّمه إلى مستندات أصغر؛ بياناتك المحلية باقية.');
    const metadata={name:`${doc.id}-${doc.rev}.waraqa`,parents:['appDataFolder'],appProperties:{app:'waraqa-web-v1',document:doc.id,revision:doc.rev}};
    const boundary=`waraqa-${id()}`;
    const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`,payload,`\r\n--${boundary}--\r\n`]);
    await api('upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});changed++;
  }
  localStorage.setItem('waraqa-last-sync',new Date().toISOString());
  return{changed,email:user.user.emailAddress};
}
