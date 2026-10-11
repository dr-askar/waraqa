export const id = () => crypto.randomUUID();
export function splitRanges(size, fractions) {
  if (!Number.isInteger(size) || size < 2) throw Error('حجم الصفحة غير صالح');
  const cuts = [...new Set(fractions.map(f => {
    if (!Number.isFinite(f)) throw Error('مكان الفصل غير صالح');
    return Math.max(1, Math.min(size-1, Math.round(size*f)));
  }))].sort((a,b)=>a-b);
  return [0,...cuts,size].slice(0,-1).map((start,i)=>({start,end:[...cuts,size][i]}));
}
export function fitRect(w,h,area) {
  if (!(w>0 && h>0 && area.w>0 && area.h>0)) throw Error('أبعاد غير صالحة');
  const scale=Math.min(area.w/w,area.h/h);
  return {x:area.x+(area.w-w*scale)/2,y:area.y+(area.h-h*scale)/2,w:w*scale,h:h*scale};
}
export function cells(w,h,vertical,margin) {
  const m=Math.max(0,Math.min(margin,Math.min(w,h)/8));
  if(vertical){ const ch=(h-3*m)/2; return [{x:m,y:m,w:w-2*m,h:ch},{x:m,y:2*m+ch,w:w-2*m,h:ch}]; }
  const cw=(w-3*m)/2;return [{x:m,y:m,w:cw,h:h-2*m},{x:2*m+cw,y:m,w:cw,h:h-2*m}];
}
export function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;}
export async function image(blob){return createImageBitmap(blob,{imageOrientation:'from-image'});}
export function toBlob(canvas,type='image/jpeg',quality=.93){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('تعذر معالجة الصورة')),type,quality));}
export async function normalize(blob){
  if(blob.size>30*1024*1024) throw Error('الصورة أكبر من 30 ميغابايت');
  const img=await image(blob);
  try{const scale=Math.min(1,2400/Math.max(img.width,img.height));const c=makeCanvas(img.width*scale,img.height*scale);const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);return {blob:await toBlob(c),width:c.width,height:c.height};}finally{img.close();}
}
export async function composePages(blobs,{vertical=true,landscape=false,margin=40,size='a4',swap=false}={}) {
  const [w,h]=size==='letter'?(landscape?[1584,1224]:[1224,1584]):(landscape?[1684,1190]:[1190,1684]);
  const c=makeCanvas(w,h),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,w,h);
  const area=cells(w,h,vertical,margin), sources=swap?[...blobs].reverse():blobs;
  for(let i=0;i<2;i++){const img=await image(sources[i]);try{const r=fitRect(img.width,img.height,area[i]);ctx.drawImage(img,r.x,r.y,r.w,r.h);}finally{img.close();}}
  return c;
}
export async function splitPage(blob,vertical,fractions,reverse=false){
  const img=await image(blob);try {
    const ranges=splitRanges(vertical?img.width:img.height,fractions);
    const results=ranges.map(({start,end})=>{const c=makeCanvas(vertical?end-start:img.width,vertical?img.height:end-start);c.getContext('2d').drawImage(img,vertical?start:0,vertical?0:start,c.width,c.height,0,0,c.width,c.height);return c;});
    return reverse?results.reverse():results;
  }finally{img.close();}
}
export async function rotate(blob){const img=await image(blob);try{const c=makeCanvas(img.height,img.width),ctx=c.getContext('2d');ctx.translate(c.width/2,c.height/2);ctx.rotate(Math.PI/2);ctx.drawImage(img,-img.width/2,-img.height/2);return c;}finally{img.close();}}
export async function enhance(blob,{filter='original',brightness=0,contrast=0}={}) {
  if(filter==='clean'){const scanner=await import('./scanner.js');blob=await toBlob(await scanner.cleanBackground(blob));filter='original';}
  const img=await image(blob);const c=makeCanvas(img.width,img.height);try{c.getContext('2d').drawImage(img,0,0);}finally{img.close();}
  const ctx=c.getContext('2d'),pixels=ctx.getImageData(0,0,c.width,c.height),data=pixels.data;
  const factor=(259*(contrast+255))/(255*(259-contrast));
  for(let i=0;i<data.length;i+=4){
    let r=data[i],g=data[i+1],b=data[i+2];
    if(filter==='gray'||filter==='bw'){r=g=b=.299*r+.587*g+.114*b;}
    r=factor*(r-128)+128+brightness;g=factor*(g-128)+128+brightness;b=factor*(b-128)+128+brightness;
    if(filter==='bw'){r=g=b=(r>160?255:0);}
    data[i]=r;data[i+1]=g;data[i+2]=b;
  }
  ctx.putImageData(pixels,0,0);return c;
}
// Bilinear quadrilateral crop: user-adjusted document corners, preserving all edits locally.
// This maps the selected quadrilateral to a rectangle; a projective transform is calculated below.
export function homography(points) {
  const source=[[0,0],[1,0],[1,1],[0,1]], matrix=[];
  for(let i=0;i<4;i++){const [u,v]=source[i],{x,y}=points[i];matrix.push([u,v,1,0,0,0,-u*x,-v*x,x]);matrix.push([0,0,0,u,v,1,-u*y,-v*y,y]);}
  for(let col=0;col<8;col++){
    let pivot=col;for(let row=col+1;row<8;row++)if(Math.abs(matrix[row][col])>Math.abs(matrix[pivot][col]))pivot=row;
    [matrix[col],matrix[pivot]]=[matrix[pivot],matrix[col]];
    if(Math.abs(matrix[col][col])<1e-9)throw Error('زوايا القص غير صالحة');
    const n=matrix[col][col];for(let j=col;j<=8;j++)matrix[col][j]/=n;
    for(let row=0;row<8;row++)if(row!==col){const f=matrix[row][col];for(let j=col;j<=8;j++)matrix[row][j]-=f*matrix[col][j];}
  }return matrix.map(r=>r[8]);
}
export function project(h,u,v){const z=h[6]*u+h[7]*v+1;return{x:(h[0]*u+h[1]*v+h[2])/z,y:(h[3]*u+h[4]*v+h[5])/z};}
export async function perspectiveCrop(blob,points){
  // Reject crossed or collapsed polygons before rasterization.
  const cross=[];for(let i=0;i<4;i++){const a=points[i],b=points[(i+1)%4],c=points[(i+2)%4];cross.push((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x));}
  if(cross.some(n=>n<=.0001))throw Error('رتّب الزوايا حول الورقة بدون تقاطع');
  const img=await image(blob);
  try {
    const p=points.map(({x,y})=>({x:x*(img.width-1),y:y*(img.height-1)}));
    const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const w=Math.round(Math.max(dist(p[0],p[1]),dist(p[3],p[2]))),h=Math.round(Math.max(dist(p[0],p[3]),dist(p[1],p[2])));
    if(w<20||h<20)throw Error('مساحة القص صغيرة جداً');
    const source=makeCanvas(img.width,img.height);source.getContext('2d').drawImage(img,0,0);
    const pixels=source.getContext('2d').getImageData(0,0,img.width,img.height).data,out=makeCanvas(w,h),ctx=out.getContext('2d'),dest=ctx.createImageData(w,h),mapping=homography(p);
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){const q=project(mapping,x/Math.max(w-1,1),y/Math.max(h-1,1)),sx=Math.max(0,Math.min(img.width-1,q.x)),sy=Math.max(0,Math.min(img.height-1,q.y)),x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(img.width-1,x0+1),y1=Math.min(img.height-1,y0+1),fx=sx-x0,fy=sy-y0,di=(y*w+x)*4;for(let channel=0;channel<4;channel++){const a=pixels[(y0*img.width+x0)*4+channel],b=pixels[(y0*img.width+x1)*4+channel],c=pixels[(y1*img.width+x0)*4+channel],d=pixels[(y1*img.width+x1)*4+channel];dest.data[di+channel]=(a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;}}
      if(y%100===0)await new Promise(resolve=>setTimeout(resolve,0));
    }ctx.putImageData(dest,0,0);return out;
  }finally{img.close();}
}
export async function blobData(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('تعذر قراءة الملف'));reader.readAsDataURL(blob);});}
export function dataBlob(data){if(typeof data!=='string'||!/^data:image\/(jpeg|png);base64,/.test(data))throw Error('صيغة الصورة غير مدعومة');const [header,encoded]=data.split(',');const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));return new Blob([bytes],{type:header.includes('png')?'image/png':'image/jpeg'});}

// PDF 1.4 with JPEG XObjects. Byte offsets are measured on actual bytes, never JS characters.
export function pdfBytes(pages,{size='a4',landscape=false}={}) {
  if(!pages.length)throw Error('المستند ما فيه صفحات');
  const enc=new TextEncoder(),chunks=[],offsets=[0];let length=0;
  const append=value=>{const bytes=typeof value==='string'?enc.encode(value):value;chunks.push(bytes);length+=bytes.length;};
  append('%PDF-1.4\n%Waraqa\n');
  const object=(n,body)=>{offsets[n]=length;append(`${n} 0 obj\n`);append(body);append('\nendobj\n');};
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
  pages.forEach((page,i)=>{
    const n=3+i*3;let [w,h]=size==='letter'?[612,792]:size==='original'?[page.width*.3,page.height*.3]:[595.28,841.89];if(landscape&&size!=='original')[w,h]=[h,w];
    const m=size==='original'?0:16,r=fitRect(page.width,page.height,{x:m,y:m,w:w-2*m,h:h-2*m});
    const content=`q\n${r.w.toFixed(3)} 0 0 ${r.h.toFixed(3)} ${r.x.toFixed(3)} ${(h-r.y-r.h).toFixed(3)} cm\n/Im${i} Do\nQ\n`;
    object(n,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w.toFixed(3)} ${h.toFixed(3)}] /Resources << /XObject << /Im${i} ${n+1} 0 R >> >> /Contents ${n+2} 0 R >>`);
    offsets[n+1]=length;append(`${n+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`);append(page.bytes);append('\nendstream\nendobj\n');
    object(n+2,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`);
  });
  const xref=length;append(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);for(let i=1;i<offsets.length;i++)append(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const all=new Uint8Array(length);let pos=0;for(const bytes of chunks){all.set(bytes,pos);pos+=bytes.length;}return all;
}
export async function makePdf(pages,options={}){
  const jpeg=[];for(const p of pages){const img=await image(p.blob);try{const c=makeCanvas(img.width,img.height),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0);const blob=await toBlob(c,'image/jpeg',options.quality||.9);jpeg.push({width:c.width,height:c.height,bytes:new Uint8Array(await blob.arrayBuffer())});}finally{img.close();}}
  return new Blob([pdfBytes(jpeg,options)],{type:'application/pdf'});
}

export function splitGridRects(width,height,verticalCuts=[],horizontalCuts=[],rtl=true){
 const xs=splitRanges(width,verticalCuts),ys=splitRanges(height,horizontalCuts);
 if(xs.length*ys.length>25)throw Error('الحد الأقصى 25 جزءاً. احذف بعض خطوط الفصل.');
 return ys.flatMap(y=>(rtl?[...xs].reverse():xs).map(x=>({x:x.start,y:y.start,w:x.end-x.start,h:y.end-y.start})));
}
