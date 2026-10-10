import createQpdf from './vendor/qpdf.mjs';
self.onmessage=async({data})=>{
 try{
  globalThis.noExitRuntime=true;
  const qpdf=await createQpdf({locateFile:file=>new URL('./vendor/'+file,import.meta.url).href,noExitRuntime:true,print:()=>{},printErr:()=>{}});
  qpdf.FS.writeFile('/input.pdf',new Uint8Array(data.bytes));
  const owner=crypto.randomUUID()+crypto.randomUUID();
  const code=qpdf.callMain(['--encrypt',data.password,owner,'256','--','/input.pdf','/output.pdf']);
  data.password='';if(code&&code!==3)throw Error('تعذر تشفير الملف');const output=qpdf.FS.readFile('/output.pdf');const bytes=output.slice().buffer;postMessage({bytes},[bytes]);
 }catch(error){postMessage({error:'تعذر حماية PDF. لم يتم تنزيل نسخة غير محمية.'});}
};
