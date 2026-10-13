// Load the application only after a controlling shell update is settled.
// A reload happens before app/editor state exists, never during a running task.
async function start(){
 const status=document.getElementById('boot-status');
 if('serviceWorker'in navigator){
  const previous=navigator.serviceWorker.controller;
  try{
   const registration=previous&&!navigator.onLine?await navigator.serviceWorker.getRegistration():await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
   if(previous&&navigator.onLine)await registration.update();
   if(registration.installing||registration.waiting){
    await new Promise((resolve,reject)=>{const worker=registration.installing||registration.waiting;const timeout=setTimeout(()=>finish(Error('تعذر إكمال التحديث؛ اتصل بالإنترنت وأعد فتح ورقة')),45000);function finish(error){clearTimeout(timeout);navigator.serviceWorker.removeEventListener('controllerchange',changed);worker?.removeEventListener('statechange',state);error?reject(error):resolve();}function changed(){if(navigator.serviceWorker.controller&&navigator.serviceWorker.controller!==previous)finish();}function state(){if(worker?.state==='redundant')finish(Error('تعذر تحميل ملفات التحديث'));changed();}navigator.serviceWorker.addEventListener('controllerchange',changed);worker?.addEventListener('statechange',state);changed();});
   }
   if(previous&&navigator.serviceWorker.controller!==previous){location.reload();return;}
  }catch(error){let sameShell=false;if(previous){sameShell=await new Promise(resolve=>{const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(false);},1200);channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data?.cache===document.querySelector('meta[name=waraqa-shell]')?.content);};try{previous.postMessage({type:'WARAQA_SHELL'},[channel.port2]);}catch{clearTimeout(timer);channel.port1.close();resolve(false);}});}if(previous&&!sameShell){status.textContent=error.message;const retry=document.createElement('button');retry.textContent='إعادة المحاولة';retry.onclick=()=>location.reload();status.append(retry);return;}}
 }
 try{await import('./app.js');status?.remove();}catch(error){status.textContent='تعذر تشغيل ورقة؛ أعد فتح التطبيق بعد الاتصال بالإنترنت';const retry=document.createElement('button');retry.textContent='إعادة المحاولة';retry.onclick=()=>location.reload();status.append(retry);console.error(error.name);}
}
start();
