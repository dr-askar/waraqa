let activeJob=null,scriptPromise=null;
const href=file=>new URL('./vendor/'+file,import.meta.url).href;
async function script(){if(window.Tesseract)return;scriptPromise??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=href('tesseract.min.js');s.onload=resolve;s.onerror=()=>{scriptPromise=null;reject(Error('تعذر تحميل محرك النصوص. جرّب الإنترنت في الاستخدام الأول.'));};document.head.append(s);});await scriptPromise;}
export function cancelOcr(){if(activeJob){activeJob.cancelled=true;activeJob.reject(Error('تم إلغاء استخراج النص'));activeJob.instance?.terminate().catch(()=>{});}}
export async function recognize(blob,language='ara+eng',progress=()=>{}){
 const job={cancelled:false,instance:null};const cancelled=new Promise((_,reject)=>{job.reject=reject;});activeJob=job;
 const operation=(async()=>{
  await script();if(job.cancelled)throw Error('تم إلغاء استخراج النص');
  const instance=await Tesseract.createWorker(language,1,{workerPath:href('ocr-worker.min.js'),corePath:new URL('./vendor/',import.meta.url).href,langPath:new URL('./vendor/',import.meta.url).href,gzip:true,logger:message=>{if(!job.cancelled)progress(message.progress||0,message.status);}});
  job.instance=instance;if(job.cancelled){await instance.terminate();throw Error('تم إلغاء استخراج النص');}
  const {data}=await instance.recognize(blob,{}, {text:true,blocks:true});const words=[];for(const block of data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[])for(const word of line.words||[])if(word.text.trim())words.push({text:word.text,bbox:word.bbox,confidence:word.confidence});return{text:data.text,words,language,edited:false};
 })();
 try{return await Promise.race([operation,cancelled]);}finally{if(job.instance)await job.instance.terminate().catch(()=>{});if(activeJob===job)activeJob=null;}
}
