import {makeCanvas,image,perspectiveCrop,toBlob} from './core.js';
let cvPromise;
export function loadCv(){
  if(cvPromise)return cvPromise;
  cvPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=new URL('./vendor/opencv.js',import.meta.url).href;
    let expired=false;let timer=setTimeout(()=>{expired=true;cvPromise=null;reject(Error('تعذر تحميل محرك المسح. تحقق من الاتصال في الاستخدام الأول.'));},45000);
    async function ready(){if(expired)return;try{const cv=window.cv;if(cv?.Mat){delete cv.then;clearTimeout(timer);resolve(cv);return;}setTimeout(ready,50);}catch(e){clearTimeout(timer);cvPromise=null;reject(e);}}
    script.onload=ready;script.onerror=()=>{clearTimeout(timer);cvPromise=null;script.remove();reject(Error('محرك المسح غير متاح الآن. القص اليدوي يعمل.'));};document.head.append(script);
  });return cvPromise;
}
export function orderedCorners(points){
  const center=points.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4}),{x:0,y:0});
  const ordered=[...points].sort((a,b)=>Math.atan2(a.y-center.y,a.x-center.x)-Math.atan2(b.y-center.y,b.x-center.x));
  const start=ordered.reduce((best,p,i)=>p.x+p.y<ordered[best].x+ordered[best].y?i:best,0);
  return [...ordered.slice(start),...ordered.slice(0,start)];
}
export function polygonArea(points){return Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0))/2;}
export function movement(a,b){if(!a||!b)return Infinity;return Math.max(...a.map((p,i)=>Math.hypot(p.x-b[i].x,p.y-b[i].y)));}
function colorDifference(data,w,h,x1,y1,x2,y2){
 const index=(x,y)=>(Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x))))*4;
 const a=index(x1,y1),b=index(x2,y2);return Math.hypot(data[a]-data[b],data[a+1]-data[b+1],data[a+2]-data[b+2])/Math.sqrt(3);
}
function boundaryEvidence(gray,w,h,points,color){
 const data=gray.data;let sum=0,support=0,n=0,insideMean=0,outsideMean=0;
 const sample=(x,y)=>data[Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x)))];
 for(let edge=0;edge<4;edge++){const a=points[edge],b=points[(edge+1)%4],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<5)continue;for(let k=2;k<39;k++){const t=k/40,x=a.x+t*dx,y=a.y+t*dy,dist=Math.max(4,Math.min(w,h)*.012),ix=x-dy/len*dist,iy=y+dx/len*dist,ox=x+dy/len*dist,oy=y-dx/len*dist;if(ox<0||oy<0||ox>=w||oy>=h)continue;const inside=sample(ix,iy),outside=sample(ox,oy),difference=Math.max(Math.abs(inside-outside),color?colorDifference(color,w,h,ix,iy,ox,oy):0);sum+=difference;insideMean+=inside;outsideMean+=outside;if(difference>14)support++;n++;}}
 return{contrast:n?sum/n:0,support:n?support/n:0,inside:n?insideMean/n:0,outside:n?outsideMean/n:0};
}
function refineCorners(gray,w,h,points,color){
 const data=gray.data,sample=(x,y)=>data[Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x)))],lines=[];
 for(let edge=0;edge<4;edge++){const a=points[edge],b=points[(edge+1)%4],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length,samples=[],radius=Math.max(3,Math.min(32,Math.min(w,h)*.035));
  for(let k=4;k<57;k++){const t=k/60,x=a.x+t*dx,y=a.y+t*dy;let best={score:0,x,y};for(let d=-radius;d<=radius;d++){const px=x+nx*d,py=y+ny*d,difference=Math.max(Math.abs(sample(px+nx*2,py+ny*2)-sample(px-nx*2,py-ny*2)),color?colorDifference(color,w,h,px+nx*2,py+ny*2,px-nx*2,py-ny*2):0),score=difference*Math.exp(-d*d/(radius*radius));if(score>best.score)best={x:px,y:py,score};}if(best.score>12)samples.push(best);}
  if(samples.length<12){lines.push({a:nx,b:ny,c:-(nx*a.x+ny*a.y)});continue;}
  const weight=samples.reduce((s,p)=>s+p.score,0),cx=samples.reduce((s,p)=>s+p.x*p.score,0)/weight,cy=samples.reduce((s,p)=>s+p.y*p.score,0)/weight;let xx=0,xy=0,yy=0;for(const p of samples){xx+=(p.x-cx)**2*p.score;xy+=(p.x-cx)*(p.y-cy)*p.score;yy+=(p.y-cy)**2*p.score;}const angle=.5*Math.atan2(2*xy,xx-yy),la=-Math.sin(angle),lb=Math.cos(angle);lines.push({a:la,b:lb,c:-la*cx-lb*cy});
 }
 return points.map((original,i)=>{const a=lines[(i+3)%4],b=lines[i],den=a.a*b.b-b.a*a.b;if(Math.abs(den)<.1)return original;const x=(a.b*b.c-b.b*a.c)/den,y=(a.c*b.a-b.c*a.a)/den;return Math.hypot(x-original.x,y-original.y)<Math.min(w,h)*.06&&x>=0&&y>=0&&x<w&&y<h?{x,y}:original;});
}
export async function detectCanvas(canvas,{maxSize=1100}={}){
  const cv=await loadCv(),scale=Math.min(1,maxSize/Math.max(canvas.width,canvas.height)),small=makeCanvas(canvas.width*scale,canvas.height*scale),ctx=small.getContext('2d');ctx.drawImage(canvas,0,0,small.width,small.height);
  const mats=[];const mat=()=>{const m=new cv.Mat();mats.push(m);return m;};let source;
  try{
    source=cv.imread(small);mats.push(source);const gray=mat(),blur=mat(),edges=mat(),binary=mat(),hierarchy=mat(),equalized=mat();cv.cvtColor(source,gray,cv.COLOR_RGBA2GRAY);cv.GaussianBlur(gray,blur,new cv.Size(5,5),0);
    const total=small.width*small.height,w=small.width,h=small.height;let sum=0,variance=0;for(let i=0;i<gray.data.length;i++)sum+=gray.data[i];const mean=sum/total;
    // Laplacian variance provides a low-cost blur warning, not a capture guarantee.
    const lap=mat();cv.Laplacian(gray,lap,cv.CV_64F);for(let i=0;i<lap.data64F.length;i++)variance+=lap.data64F[i]*lap.data64F[i];variance/=total;
    const candidates=[];
    cv.equalizeHist(blur,equalized);const methods=[()=>{cv.Canny(blur,edges,45,140);const kernel=cv.Mat.ones(3,3,cv.CV_8U);try{cv.morphologyEx(edges,binary,cv.MORPH_CLOSE,kernel);}finally{kernel.delete();}},()=>{cv.Canny(equalized,edges,35,110);const kernel=cv.Mat.ones(5,5,cv.CV_8U);try{cv.morphologyEx(edges,binary,cv.MORPH_CLOSE,kernel);}finally{kernel.delete();}},()=>cv.threshold(blur,binary,0,255,cv.THRESH_BINARY+cv.THRESH_OTSU),()=>cv.adaptiveThreshold(blur,binary,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY,31,8)];
    // Per-channel edges retain chromatic boundaries lost during grayscale conversion.
    const channel=mat(),channelBlur=mat(),colorEdges=mat();
    methods.push(()=>{binary.create(h,w,cv.CV_8UC1);binary.setTo(new cv.Scalar(0));for(let c=0;c<3;c++){channel.create(h,w,cv.CV_8UC1);for(let i=0;i<total;i++)channel.data[i]=source.data[i*4+c];cv.GaussianBlur(channel,channelBlur,new cv.Size(5,5),0);cv.Canny(channelBlur,colorEdges,22,70);cv.bitwise_or(binary,colorEdges,binary);}const kernel=cv.Mat.ones(5,5,cv.CV_8U);try{cv.morphologyEx(binary,binary,cv.MORPH_CLOSE,kernel);}finally{kernel.delete();}});
    for(const method of methods){
      method();const contours=new cv.MatVector();try{cv.findContours(binary,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
        for(let i=0;i<contours.size();i++){
          const contour=contours.get(i),approx=new cv.Mat();try{
            const area=Math.abs(cv.contourArea(contour));if(area<total*.12||area>total*.965)continue;
            const perimeter=cv.arcLength(contour,true);for(const epsilon of [.012,.02,.03,.045]){cv.approxPolyDP(contour,approx,perimeter*epsilon,true);if(approx.rows===4&&cv.isContourConvex(approx))break;}if(approx.rows!==4||!cv.isContourConvex(approx))continue;
            const points=orderedCorners(Array.from({length:4},(_,n)=>({x:approx.data32S[n*2],y:approx.data32S[n*2+1]})));
            const border=points.filter(p=>p.x<3||p.y<3||p.x>w-4||p.y>h-4).length;if(border>1)continue;
            const edgesLength=points.map((p,n)=>Math.hypot(p.x-points[(n+1)%4].x,p.y-points[(n+1)%4].y));if(Math.min(...edgesLength)<Math.min(w,h)*.14)continue;
            const refined=refineCorners(gray,w,h,points,source.data),evidence=boundaryEvidence(gray,w,h,refined,source.data),edgeContrast=evidence.contrast,coverage=area/total,shape=Math.min(1,area/polygonArea(points));if(evidence.support<.35)continue;
            const confidence=Math.min(.98,.29+Math.min(.2,coverage*.4)+Math.min(.25,edgeContrast/180)+evidence.support*.18+shape*.08-border*.15);
            const score=coverage*.4+Math.min(.25,edgeContrast/180)+evidence.support*.25+shape*.1-border*.15;
            candidates.push({points:refined.map(p=>({x:p.x/(w-1),y:p.y/(h-1)})),confidence,score,coverage,edgeSupport:evidence.support});
          }finally{contour.delete();approx.delete();}
        }
      }finally{contours.delete();}
    }
    candidates.sort((a,b)=>b.score-a.score);
    return{...(candidates[0]||{points:null,confidence:0}),brightness:mean,sharpness:variance};
  }finally{mats.forEach(m=>m.delete());}
}
export async function detectBlob(blob){const img=await image(blob);try{const scale=Math.min(1,1100/Math.max(img.width,img.height)),canvas=makeCanvas(img.width*scale,img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return await detectCanvas(canvas);}finally{img.close();}}
export async function autoCrop(blob){const detection=await detectBlob(blob);if(!detection.points||detection.confidence<.77)return{blob,detection,cropped:false};
  // Small outward padding protects the physical paper edge and nearby text.
  const cx=detection.points.reduce((s,p)=>s+p.x/4,0),cy=detection.points.reduce((s,p)=>s+p.y/4,0);
  const points=detection.points.map(p=>({x:Math.max(0,Math.min(1,cx+(p.x-cx)*1.012)),y:Math.max(0,Math.min(1,cy+(p.y-cy)*1.012))}));
  const canvas=await perspectiveCrop(blob,points);return{blob:await toBlob(canvas),width:canvas.width,height:canvas.height,detection,cropped:true};
}
export async function cleanBackground(blob){
 const cv=await loadCv(),bitmap=await image(blob),canvas=makeCanvas(bitmap.width,bitmap.height);canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
 const source=cv.imread(canvas),gray=new cv.Mat(),background=new cv.Mat(),smooth=new cv.Mat(),kernel=cv.Mat.ones(31,31,cv.CV_8U);
 try{cv.cvtColor(source,gray,cv.COLOR_RGBA2GRAY);cv.dilate(gray,background,kernel);cv.GaussianBlur(background,smooth,new cv.Size(31,31),0);const ctx=canvas.getContext('2d'),pixels=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<smooth.data.length;i++){const factor=255/Math.max(20,smooth.data[i]);for(let channel=0;channel<3;channel++)pixels.data[i*4+channel]=Math.min(255,pixels.data[i*4+channel]*factor);}ctx.putImageData(pixels,0,0);return canvas;}finally{source.delete();gray.delete();background.delete();smooth.delete();kernel.delete();}
}
