export const fingerprint=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');
export const textFingerprint=ocr=>fingerprint(new Blob([JSON.stringify(ocr||null)]));
const pending=job=>['queued','running'].includes(job.status);
export function createProcessingQueue({load,save,process,onChange=()=>{},paused=()=>false,locks=globalThis.navigator?.locks}){
 let jobs=[],active=null,timer=null,stopped=false,ready=false,serial=Promise.resolve();const progress=new Map();
 const withLock=(name,fn,options={})=>locks?locks.request(name,options,lock=>lock?fn():null):fn();
 async function metadata(change){const operation=()=>withLock('waraqa-processing-metadata',async()=>{const list=(await load())||[],result=await change(list);await save(list);jobs=list;onChange(snapshot());return result;});const result=serial.then(operation,operation);serial=result.catch(()=>{});return result;}
 const snapshot=()=>jobs.map(j=>({...j,progress:progress.get(j.id)??(j.completed||0)/Math.max(1,j.pages.length)}));
 async function update(id,patch){return metadata(list=>{const job=list.find(j=>j.id===id);if(job&&!(job.status==='cancelled'&&['done','running'].includes(patch.status)))Object.assign(job,patch);return job;});}
 function wake(){if(!ready||stopped||timer)return;timer=setTimeout(()=>{timer=null;pump().catch(error=>{ready=false;jobs=jobs.map(j=>pending(j)?{...j,status:'failed',error:String(error.message||'تعذرت المعالجة')}:j);onChange(snapshot());});},paused()?350:30);}
 async function pump(){
  if(stopped||active)return;if(paused()){wake();return;}
  await withLock('waraqa-processing-executor',async()=>{
   if(stopped||paused()||active)return;
   jobs=(await load())||[];const job=jobs.find(pending);if(!job){onChange(snapshot());return;}
   active={id:job.id,controller:new AbortController()};const signal=active.controller.signal;
   const context={signal,progress:(fraction)=>{if(signal.aborted||stopped)return;progress.set(job.id,Math.max(progress.get(job.id)||0,Math.min(1,fraction)));onChange(snapshot());},checkpoint:async(completed,extra={})=>{job.completed=completed;await update(job.id,{completed,...extra});},wait:async()=>{const saved=((await load())||[]).find(j=>j.id===job.id);if(!saved||saved.status==='cancelled')active?.controller.abort();while(paused()&&!signal.aborted&&!stopped)await new Promise(r=>setTimeout(r,80));if(signal.aborted||stopped)throw new DOMException('تم إلغاء المعالجة','AbortError');}};
   try{await update(job.id,{status:'running',error:null});await context.wait();await process(job,context);await context.wait();if(signal.aborted||stopped)throw new DOMException('تم إلغاء المعالجة','AbortError');progress.set(job.id,1);await update(job.id,{status:'done',completed:job.pages.length,finished:Date.now()});}
   catch(error){if(!stopped){const current=((await load())||[]).find(j=>j.id===job.id);if(current?.status!=='cancelled')await update(job.id,{status:signal.aborted?'cancelled':'failed',error:signal.aborted?null:String(error.message||'تعذر إكمال المعالجة'),finished:Date.now()});}}
   finally{active=null;onChange(snapshot());}
  },{ifAvailable:true});if(!stopped&&jobs.some(pending))wake();
 }
 return{
  async init(){stopped=false;ready=true;jobs=(await load())||[];onChange(snapshot());wake();},
  async enqueue(value){const id=await metadata(list=>{const duplicate=list.find(j=>pending(j)&&j.documentId===value.documentId&&j.kind===value.kind&&JSON.stringify(j.pages.map(p=>p.id))===JSON.stringify(value.pages.map(p=>p.id)));if(duplicate)return duplicate.id;while(list.filter(j=>!pending(j)).length>40){const index=list.findIndex(j=>!pending(j));list.splice(index,1);}const job={...value,id:crypto.randomUUID(),created:Date.now(),status:'queued',completed:0};list.push(job);return job.id;});wake();return id;},
  async cancel(id){if(active?.id===id)active.controller.abort();await update(id,{status:'cancelled',finished:Date.now(),error:null});wake();},
  async retry(id){ready=true;stopped=false;progress.delete(id);await update(id,{status:'queued',error:null,finished:null});wake();},
  async reload(){jobs=(await load())||[];onChange(snapshot());wake();},
  async stop(){stopped=true;ready=false;clearTimeout(timer);timer=null;active?.controller.abort();while(active)await new Promise(r=>setTimeout(r,10));await serial;jobs=[];progress.clear();onChange([]);},
  snapshot,wake
 };
}
