import * as Core from './core.js';

// Keep placement geometry inside the page, including unusually tall signatures.
export function fitSignature(frame, width, height) {
  const scale = Math.min(1, width / frame.w, height / frame.h);
  const w = frame.w * scale, h = frame.h * scale;
  return {...frame, w, h, x: Math.max(0, Math.min(width-w, frame.x)), y: Math.max(0, Math.min(height-h, frame.y))};
}
export function trimSignature(canvas, removeWhite=false) {
  const ctx=canvas.getContext('2d'), image=ctx.getImageData(0,0,canvas.width,canvas.height);
  let x0=canvas.width,y0=canvas.height,x1=-1,y1=-1;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const i=(y*canvas.width+x)*4;
    if(removeWhite && Math.min(image.data[i],image.data[i+1],image.data[i+2])>240)image.data[i+3]=0;
    if(image.data[i+3]>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  }
  if(x1<0)throw Error('لا يوجد رسم واضح في التوقيع');
  ctx.putImageData(image,0,0);
  const out=Core.makeCanvas(x1-x0+1,y1-y0+1);
  out.getContext('2d').drawImage(canvas,x0,y0,out.width,out.height,0,0,out.width,out.height);
  return out;
}

export async function openSignatureEditor(page, deps) {
  const {modal,button,close,toast,save,getPreference,setPreference,cleanup}=deps;
  const source=await Core.image(page.blob), canvas=Core.makeCanvas(source.width,source.height),ctx=canvas.getContext('2d');
  let commands=[],undos=[],redos=[],active=-1,gesture=null,alive=true,loading=false,saving=false;
  const bitmaps=new Set();
  const $=s=>document.querySelector(s);
  modal('توقيع، قلم أو طمس دائم',`<p class="hint">ارسم بالقلم أو أضف توقيعاً، ثم اسحبه من داخل إطاره. لمس الصفحة خارج الإطار يثبّت موضعه ويتيح الرسم.</p><div class="form-row"><label>الأداة<select id="pen-mode"><option value="pen">قلم / توقيع بالإصبع</option><option value="highlight">تمييز</option><option value="redact">طمس دائم أسود</option></select></label><label>لون القلم<input id="pen-color" type="color" value="#163f35"></label><label>حجم القلم<input id="pen-size" type="range" min="2" max="45" value="8"></label></div><div class="actions-wrap"><button class="secondary" id="undo-ink">تراجع</button><button class="secondary" id="redo-ink">إعادة</button><button class="secondary" id="add-text">إضافة نص / تاريخ</button><button class="secondary" id="save-signature">حفظ رسم القلم كتوقيع</button><button class="secondary" id="load-signature">إضافة التوقيع المحفوظ</button><button class="secondary" id="import-signature">استيراد توقيع</button><input id="signature-file" type="file" accept="image/png,image/jpeg,image/webp" hidden><label><input id="signature-remove-white" type="checkbox"> إزالة الخلفية البيضاء عند الاستيراد</label><label>حجم التوقيع<input id="signature-size" type="range" min="5" max="95" value="30"></label><button class="secondary" id="center-signature">توسيط التوقيع</button><button class="secondary" id="delete-signature">حذف التوقيع المحدد</button></div><div id="ink-canvas"></div><p class="hint">التراجع والإعادة لآخر 3 عمليات في هذه الجلسة. الإغلاق يلغي المسودة. التوقيع مرئي وليس توقيعاً رقمياً موثّقاً. الطمس يزال من صورة التصدير، لكن الأصل يبقى في التطبيق والنسخ الاحتياطية.</p>`,[button('حفظ التعديلات',async()=>{
    if(loading||gesture||saving)return toast('انتظر اكتمال التعديل');
    saving=true;$('#modal-body').inert=true;draw(false);
    try {
    const redacted=!!page.redacted||commands.some(c=>c.mode==='redact');
    draw(false);
    const output=await Core.toBlob(canvas);
    if(!alive)return;
    await save(output,canvas.width,canvas.height,redacted,()=>alive);
    if(alive)close();
    } finally {saving=false;if(alive){$('#modal-body').inert=false;draw();}}
  },true),button('إلغاء',close)]);
  canvas.className='edit-canvas';$('#ink-canvas').append(canvas);
  function snapshot(){return commands.map(c=>({...c,points:c.points?.map(p=>({...p}))}));}
  function checkpoint(){undos.push(snapshot());undos=undos.slice(-3);redos=[];}
  function stroke(context,c){
    context.save();context.strokeStyle=c.color;context.fillStyle=c.color;context.lineWidth=c.size;context.lineCap=c.mode==='redact'?'square':'round';context.lineJoin='round';context.globalAlpha=c.mode==='highlight'?.25:1;
    if(c.points.length===1){const p=c.points[0];context.beginPath();context.arc(p.x,p.y,c.size/2,0,Math.PI*2);context.fill();}
    else {context.beginPath();c.points.forEach((p,i)=>i?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y));context.stroke();}
    context.restore();
  }
  function draw(outline=true){
    const retained=new Set([commands,...undos,...redos].flat().filter(c=>c.kind==='signature').map(c=>c.bitmap));for(const bitmap of bitmaps)if(!retained.has(bitmap)){bitmap.close();bitmaps.delete(bitmap);}
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0);
    for(const c of commands){if(c.kind==='stroke')stroke(ctx,c);else if(c.kind==='signature')ctx.drawImage(c.bitmap,c.x,c.y,c.w,c.h);else{ctx.save();ctx.fillStyle=c.color;ctx.font=`${Math.max(24,canvas.width*.035)}px Tahoma, Arial`;ctx.textAlign='right';ctx.fillText(c.text,canvas.width*.95,canvas.height*.93,canvas.width*.9);ctx.restore();}}
    const s=commands[active];if(outline&&s?.kind==='signature'){ctx.save();ctx.strokeStyle='#1684df';ctx.lineWidth=Math.max(2,canvas.width/400);ctx.setLineDash([8,5]);ctx.strokeRect(s.x,s.y,s.w,s.h);ctx.restore();canvas.dataset.signature=JSON.stringify({x:s.x,y:s.y,w:s.w,h:s.h});}else delete canvas.dataset.signature;
    $('#undo-ink').disabled=!undos.length;$('#redo-ink').disabled=!redos.length;
    for(const id of ['signature-size','center-signature','delete-signature'])$('#'+id).disabled=s?.kind!=='signature';
  }
  function pos(e){const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(canvas.width,(e.clientX-r.left)*canvas.width/r.width)),y:Math.max(0,Math.min(canvas.height,(e.clientY-r.top)*canvas.height/r.height))};}
  canvas.onpointerdown=e=>{
    if(loading||gesture||e.button>0)return;e.preventDefault();const p=pos(e);
    const hit=commands.findLastIndex(c=>c.kind==='signature'&&p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h);
    checkpoint();canvas.setPointerCapture(e.pointerId);
    if(hit>=0){active=hit;gesture={id:e.pointerId,mode:'move',last:p};$('#signature-size').value=commands[hit].w/canvas.width*100;}
    else{active=-1;const mode=$('#pen-mode').value,size=Number($('#pen-size').value);commands.push({kind:'stroke',mode,color:mode==='redact'?'#000':mode==='highlight'?'#ead059':$('#pen-color').value,size:mode==='redact'?Math.max(20,size*4):mode==='highlight'?size*3:size,points:[p]});gesture={id:e.pointerId,mode:'stroke'};}
    draw();
  };
  canvas.onpointermove=e=>{if(gesture?.id!==e.pointerId)return;const p=pos(e);if(gesture.mode==='move'){const s=commands[active];commands[active]=fitSignature({...s,x:s.x+p.x-gesture.last.x,y:s.y+p.y-gesture.last.y},canvas.width,canvas.height);gesture.last=p;}else commands.at(-1).points.push(p);draw();};
  canvas.onpointerup=e=>{if(gesture?.id===e.pointerId){gesture=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}};
  canvas.onpointercancel=e=>{if(gesture?.id!==e.pointerId)return;gesture=null;commands=undos.pop()||commands;active=-1;draw();};
  function undo(redo=false){if(loading||gesture)return;const from=redo?redos:undos,to=redo?undos:redos;if(!from.length)return;to.push(snapshot());commands=from.pop();active=-1;draw();}
  $('#undo-ink').onclick=()=>undo();$('#redo-ink').onclick=()=>undo(true);
  $('#add-text').onclick=()=>{const text=prompt('النص أو التاريخ الذي تريد إضافته:',new Date().toLocaleDateString('ar'));if(!text||!alive)return;checkpoint();commands.push({kind:'text',text,color:$('#pen-color').value});active=-1;draw();};
  let resizing=false;
  $('#signature-size').oninput=()=>{const s=commands[active];if(!s||loading||gesture)return;if(!resizing){checkpoint();resizing=true;}const w=canvas.width*Number($('#signature-size').value)/100;commands[active]=fitSignature({...s,w,h:w*s.bitmap.height/s.bitmap.width},canvas.width,canvas.height);draw();};
  $('#signature-size').onchange=()=>{resizing=false;};
  $('#center-signature').onclick=()=>{const s=commands[active];if(!s)return;checkpoint();commands[active]={...s,x:(canvas.width-s.w)/2,y:(canvas.height-s.h)/2};draw();};
  $('#delete-signature').onclick=()=>{if(active<0)return;checkpoint();commands.splice(active,1);active=-1;draw();};
  async function task(fn){if(loading)return;loading=true;try{await fn();}catch(error){if(alive)toast(error.message);}finally{loading=false;}}
  async function place(blob){const bitmap=await Core.image(blob);if(!alive){bitmap.close();return;}bitmaps.add(bitmap);checkpoint();const w=canvas.width*Number($('#signature-size').value)/100;commands.push(fitSignature({kind:'signature',bitmap,x:canvas.width*.1,y:canvas.height*.7,w,h:w*bitmap.height/bitmap.width},canvas.width,canvas.height));active=commands.length-1;draw();toast('اسحب التوقيع لمكانه، واضبط حجمه ثم احفظ');}
  $('#save-signature').onclick=()=>task(async()=>{
    const ink=Core.makeCanvas(canvas.width,canvas.height);for(const c of commands)if(c.kind==='stroke'&&c.mode==='pen')stroke(ink.getContext('2d'),c);
    const png=await Core.toBlob(trimSignature(ink),'image/png');if(!alive)return;
    await setPreference('signature',await Core.blobData(png));if(alive)toast('تم حفظ التوقيع لإعادة الاستخدام');
  });
  $('#load-signature').onclick=()=>task(async()=>{const data=await getPreference('signature');if(!alive)return;if(!data)throw Error('لا يوجد توقيع محفوظ. ارسم واحداً أو استورده.');await place(Core.dataBlob(data));});
  $('#import-signature').onclick=()=>$('#signature-file').click();
  $('#signature-file').onchange=e=>{const file=e.target.files[0],removeWhite=$('#signature-remove-white').checked;e.target.value='';if(!file)return;task(async()=>{
    if(file.size>30*1024*1024)throw Error('حجم صورة التوقيع أكبر من 30MB');
    const bitmap=await Core.image(file);try{const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),c=Core.makeCanvas(bitmap.width*scale,bitmap.height*scale);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);const png=await Core.toBlob(trimSignature(c,removeWhite),'image/png');if(!alive)return;await place(png);}finally{bitmap.close();}
  });};
  cleanup(()=>{alive=false;$('#modal-body').inert=false;source.close();for(const bitmap of bitmaps)bitmap.close();});draw();
}
