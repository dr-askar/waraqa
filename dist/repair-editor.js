import * as Core from './core.js';
import {applyRepairRect} from './advanced-imaging.js';

export async function openRepairEditor(page,{modal,button,close,cleanup,toast,preview,valid=()=>true}){
 const image=await Core.image(page.blob);if(!valid()){image.close();return;}const canvas=Core.makeCanvas(image.width,image.height),ctx=canvas.getContext('2d');
 let mode='pan',rect=null,edits=[],undos=[],redos=[],gesture=null,alive=true,showOriginal=false;
 const $=s=>document.querySelector(s),copy=v=>JSON.parse(JSON.stringify(v));
 const state=()=>({rect:rect&&{...rect},edits:copy(edits)});
 function checkpoint(){undos.push(state());undos=undos.slice(-30);redos=[];}
 function restore(s){rect=s.rect;edits=s.edits;draw();}
 const finish=button('معاينة النتيجة',async()=>{if(!edits.length)return;const result=Core.makeCanvas(canvas.width,canvas.height);render(result.getContext('2d'),false);await preview(result);},true);
 modal('إزالة بقعة / عنصر',`<div class="repair-modes"><button id="repair-pan" aria-pressed="true">تنقّل بالصفحة</button><button id="repair-select" aria-pressed="false">تحديد المنطقة</button></div><p class="hint">اختر التحديد ثم اسحب فوق البقعة. حرّك المستطيل من داخله أو غيّر حجمه من زواياه. جرّب منطقة صغيرة على خلفية بسيطة.</p><div id="repair-board"></div><div class="actions-wrap"><button id="repair-apply">اعتماد إزالة المنطقة</button><button id="repair-clear">إلغاء التحديد</button><button id="repair-before" aria-pressed="false">مقارنة مع الأصل</button><button id="repair-undo">تراجع</button><button id="repair-redo">إعادة</button><button id="repair-reset">إعادة ضبط الكل</button></div><details><summary>لون التعبئة — متقدم</summary><label>الطريقة<select id="repair-fill"><option value="auto">لون مأخوذ من المحيط</option><option value="manual">لون أختاره</option></select></label><label>اللون<input id="repair-color" type="color" value="#ffffff"></label></details><p id="repair-status" role="status"></p><p class="hint">تعبئة محلية بلون المحيط أو لون تختاره؛ لا تعيد تفاصيل الصورة. النتيجة تُحفظ كصفحة جديدة والأصل يبقى محفوظاً. ليست طمساً آمناً. التراجع لآخر 30 عملية في هذه الجلسة.</p>`,[finish,button('إلغاء',close)]);
 canvas.className='repair-canvas';canvas.style.touchAction='pan-y';$('#repair-board').append(canvas);
 function render(context,original=showOriginal){context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0);if(!original)for(const edit of edits)applyRepairRect(context.canvas,edit.rect,edit.color);}
 function draw(){if(!alive)return;render(ctx);if(rect&&!showOriginal){ctx.save();ctx.strokeStyle='#2877ee';ctx.lineWidth=Math.max(2,canvas.width/350);ctx.setLineDash([8,5]);ctx.strokeRect(rect.x,rect.y,rect.w,rect.h);ctx.setLineDash([]);const size=Math.max(8,canvas.width/60);for(const p of corners(rect)){ctx.fillStyle='white';ctx.fillRect(p.x-size/2,p.y-size/2,size,size);ctx.strokeRect(p.x-size/2,p.y-size/2,size,size);}ctx.restore();}
  $('#repair-before').setAttribute('aria-pressed',String(showOriginal));canvas.dataset.state=JSON.stringify({rect,edits,mode});$('#repair-apply').disabled=!rect||showOriginal;$('#repair-clear').disabled=!rect;$('#repair-undo').disabled=!undos.length;$('#repair-redo').disabled=!redos.length;$('#repair-reset').disabled=!edits.length&&!rect;finish.disabled=!edits.length;
  $('#repair-status').textContent=rect?'المنطقة محددة: راجعها ثم اعتمد إزالتها':`مناطق معتمدة: ${edits.length}. ${edits.length?'راجع النتيجة قبل الحفظ.':'حدّد البقعة أولاً.'}`;
 }
 function corners(r){return[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];}
 function position(e){const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(canvas.width,Math.round((e.clientX-r.left)*canvas.width/r.width))),y:Math.max(0,Math.min(canvas.height,Math.round((e.clientY-r.top)*canvas.height/r.height)))};}
 function box(a,b){const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);return{x,y,w:Math.max(1,Math.abs(a.x-b.x)),h:Math.max(1,Math.abs(a.y-b.y))};}
 function setMode(value){mode=value;canvas.style.touchAction=value==='pan'?'pan-y':'none';$('#repair-pan').setAttribute('aria-pressed',String(value==='pan'));$('#repair-select').setAttribute('aria-pressed',String(value==='select'));draw();}
 $('#repair-pan').onclick=()=>setMode('pan');$('#repair-select').onclick=()=>{showOriginal=false;$('#repair-before').setAttribute('aria-pressed','false');setMode('select');};
 canvas.onpointerdown=e=>{if(mode==='pan'||showOriginal||gesture||e.button>0)return;e.preventDefault();const p=position(e),bounds=canvas.getBoundingClientRect(),radius=rect?Math.min(20*canvas.width/bounds.width,rect.w/3,rect.h/3):0,corner=rect?corners(rect).findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<radius):-1,inside=rect&&p.x>=rect.x&&p.x<=rect.x+rect.w&&p.y>=rect.y&&p.y<=rect.y+rect.h;
  checkpoint();gesture={id:e.pointerId,start:p,original:rect&&{...rect},kind:corner>=0?'resize':inside?'move':'new',corner};if(gesture.kind==='new')rect=box(p,p);canvas.setPointerCapture(e.pointerId);draw();
 };
 canvas.onpointermove=e=>{if(gesture?.id!==e.pointerId)return;const p=position(e),g=gesture;if(g.kind==='move'){const r=g.original;rect={...r,x:Math.max(0,Math.min(canvas.width-r.w,r.x+p.x-g.start.x)),y:Math.max(0,Math.min(canvas.height-r.h,r.y+p.y-g.start.y))};}else if(g.kind==='resize')rect=box(corners(g.original)[(g.corner+2)%4],p);else rect=box(g.start,p);draw();};
 canvas.onpointerup=e=>{if(gesture?.id!==e.pointerId)return;gesture=null;if(rect.w<3||rect.h<3)rect=null;canvas.releasePointerCapture(e.pointerId);draw();};
 canvas.onpointercancel=e=>{if(gesture?.id!==e.pointerId)return;gesture=null;restore(undos.pop());};
 $('#repair-apply').onclick=()=>{if(!rect)return;try{const test=Core.makeCanvas(canvas.width,canvas.height);render(test.getContext('2d'),false);applyRepairRect(test,rect,$('#repair-fill').value==='manual'?$('#repair-color').value:null);}catch(e){toast(e.message);return;}checkpoint();edits.push({rect:{...rect},color:$('#repair-fill').value==='manual'?$('#repair-color').value:null});rect=null;draw();};
 $('#repair-clear').onclick=()=>{if(!rect)return;checkpoint();rect=null;draw();};
 for(const [id,redo]of [['repair-undo',false],['repair-redo',true]])$('#'+id).onclick=()=>{if(gesture)return;const from=redo?redos:undos,to=redo?undos:redos;if(!from.length)return;to.push(state());restore(from.pop());};
 $('#repair-reset').onclick=()=>{checkpoint();rect=null;edits=[];showOriginal=false;draw();};
 $('#repair-before').onclick=()=>{showOriginal=!showOriginal;$('#repair-before').setAttribute('aria-pressed',String(showOriginal));draw();};
 cleanup(()=>{alive=false;image.close();});draw();$('#modal-body').scrollTop=0;
}
