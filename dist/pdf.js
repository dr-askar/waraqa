import {image,makeCanvas,toBlob,fitRect,blobData} from './core.js';
let pdfJs,jspdfPromise;
export async function loadPdf(){pdfJs??=await import('./vendor/pdf.mjs');pdfJs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;return pdfJs;}
export async function importPdf(blob,passwordPrompt,progress=()=>{}){
 if(blob.size>50*1024*1024)throw Error('حد استيراد PDF الحالي 50 ميغابايت');
 const engine=await loadPdf(),task=engine.getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false});
 task.onPassword=async(updatePassword)=>{const password=await passwordPrompt();if(password===null){task.destroy();return;}updatePassword(password);};
 const pdf=await task.promise;const pages=[];
 try{if(pdf.numPages>80)throw Error('حد المستند 80 صفحة. قسّم الملف قبل استيراده.');for(let n=1;n<=pdf.numPages;n++){progress(n,pdf.numPages);const page=await pdf.getPage(n),base=page.getViewport({scale:1}),scale=Math.min(3,2400/Math.max(base.width,base.height)),viewport=page.getViewport({scale}),canvas=makeCanvas(viewport.width,viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'white'}).promise;pages.push({blob:await toBlob(canvas),width:canvas.width,height:canvas.height});page.cleanup();}}finally{await pdf.destroy();}return pages;
}
async function loadJspdf(){if(window.jspdf)return;jspdfPromise??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./vendor/jspdf.umd.min.js',import.meta.url).href;script.onload=resolve;script.onerror=()=>{jspdfPromise=null;reject(Error('تعذر تحميل محرك PDF'));};document.head.append(script);});await jspdfPromise;}
async function font(pdf){const response=await fetch(new URL('./vendor/Amiri-Regular.ttf',import.meta.url));if(!response.ok)throw Error('خط PDF غير متاح');const data=await blobData(await response.blob());pdf.addFileToVFS('Amiri-Regular.ttf',data.split(',')[1]);pdf.addFont('Amiri-Regular.ttf','Amiri','normal');pdf.setFont('Amiri');}
export async function searchablePdf(pages,options={}){
 await loadJspdf();const {jsPDF}=window.jspdf;const pdf=new jsPDF({unit:'pt',format:options.size==='letter'?'letter':'a4',orientation:options.landscape?'landscape':'portrait',compress:true});let loadedFont=false;
 for(let i=0;i<pages.length;i++){
  const p=pages[i],img=await image(p.blob);let canvas;const sourceWidth=img.width,sourceHeight=img.height;try{const scale=options.maxDimension?Math.min(1,options.maxDimension/Math.max(img.width,img.height)):1;canvas=makeCanvas(Math.max(1,Math.round(img.width*scale)),Math.max(1,Math.round(img.height*scale)));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);}finally{img.close();}
  let w=options.size==='letter'?612:595.28,h=options.size==='letter'?792:841.89;if(options.size==='original'){w=sourceWidth*.3;h=sourceHeight*.3;}else if(p.sourceKind==='identity'&&options.size!=='letter'){if(sourceWidth>sourceHeight)[w,h]=[h,w];}else if(options.landscape)[w,h]=[h,w];
  if(i===0){pdf.deletePage(1);}pdf.addPage([w,h],w>h?'landscape':'portrait');const margin=['passport','identity'].includes(p.sourceKind)?0:16,r=fitRect(canvas.width,canvas.height,{x:margin,y:margin,w:w-2*margin,h:h-2*margin});pdf.addImage(canvas.toDataURL('image/jpeg',options.quality||.9),'JPEG',r.x,r.y,r.w,r.h,undefined,'FAST');
  if(options.watermark){if(!loadedFont){await font(pdf);loadedFont=true;}pdf.setFont('Amiri');pdf.setTextColor(160);pdf.setFontSize(18);pdf.text(pdf.processArabic(options.watermark),w/2,h-8,{align:'center'});}
  if(options.searchable&&p.ocr?.words?.length&&!p.ocr.edited){if(!loadedFont){await font(pdf);loadedFont=true;}pdf.setFont('Amiri');for(const [token,subscriber] of Object.entries(pdf.internal.events.getTopics().preProcessText||{}))if(subscriber[0]===pdf.processArabic)pdf.internal.events.unsubscribe(token);for(const word of p.ocr.words){const b=word.bbox;if(!b)continue;const x=r.x+b.x0/sourceWidth*r.w,y=r.y+b.y1/sourceHeight*r.h,size=Math.max(3,(b.y1-b.y0)/sourceHeight*r.h*.85);pdf.setFontSize(size);const desired=Math.max(1,(b.x1-b.x0)/sourceWidth*r.w),measured=pdf.getTextWidth(word.text);if(measured>desired)pdf.setFontSize(Math.max(1,size*desired/measured));pdf.text(word.text.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,''),x,y,{renderingMode:'invisible',isInputVisual:false,isOutputVisual:true});}}
 }
 pdf.setProperties({title:options.title||'Waraqa'});return pdf.output('blob');
}
export async function encryptPdf(blob,password){
 if(password.length<8)throw Error('استخدم كلمة مرور من 8 أحرف على الأقل');
 const bytes=await blob.arrayBuffer();return new Promise((resolve,reject)=>{const worker=new Worker(new URL('./encrypt-worker.js',import.meta.url),{type:'module'});const timer=setTimeout(()=>{worker.terminate();reject(Error('انتهت مهلة تشفير الملف. جرّب مستنداً أصغر.'));},120000);worker.onmessage=({data})=>{clearTimeout(timer);worker.terminate();if(data.error)reject(Error(data.error));else resolve(new Blob([data.bytes],{type:'application/pdf'}));};worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('تعذر تحميل محرك التشفير. لا توجد نسخة غير محمية للتنزيل.'));};worker.postMessage({bytes,password},[bytes]);});
}
