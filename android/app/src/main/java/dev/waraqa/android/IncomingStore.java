package dev.waraqa.android;

import android.content.*;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;
import org.json.*;
import java.io.*;
import java.util.*;

/** Private, bounded staging area. No inbox files are exposed by FileProvider. */
final class IncomingStore {
 static final long LIMIT=80L*1024*1024,TTL=60L*60*1000;
 final Context context; final File root;
 IncomingStore(Context context){this.context=context;root=new File(context.getFilesDir(),"incoming");root.mkdirs();}
 synchronized JSONObject accept(Intent intent)throws Exception {
  ArrayList<Uri> uris=new ArrayList<>();
  if(Intent.ACTION_SEND.equals(intent.getAction())){Uri u=intent.getParcelableExtra(Intent.EXTRA_STREAM);if(u!=null)uris.add(u);}
  else if(Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())){ArrayList<Uri> list=intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);if(list!=null)uris.addAll(list);}
  if(uris.isEmpty()&&intent.getClipData()!=null)for(int i=0;i<intent.getClipData().getItemCount();i++){Uri u=intent.getClipData().getItemAt(i).getUri();if(u!=null)uris.add(u);}
  if(uris.isEmpty()||uris.size()>80)throw new IOException("اختر صوراً أو PDF، بحد أقصى 80 ملفاً.");
  if(list().length()>=3)throw new IOException("استورد الملفات المنتظرة أو ألغها قبل إرسال ملفات جديدة.");
  String id=UUID.randomUUID().toString();File dir=new File(root,id);dir.mkdirs();boolean complete=false;
  try{JSONArray files=new JSONArray();long total=0;
   for(Uri uri:uris){if(!"content".equals(uri.getScheme()))throw new IOException("مصدر الملف غير مدعوم.");
    String name="shared-file",type=context.getContentResolver().getType(uri);
    try(Cursor c=context.getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst()&&!c.isNull(0))name=c.getString(0);}
    name=safeName(name);String ext=name.lastIndexOf('.')>=0?name.substring(name.lastIndexOf('.')+1):"";String inferred=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.toLowerCase(Locale.ROOT));
    if(type==null||type.equals("application/octet-stream"))type=inferred;
    if(type==null||!(type.startsWith("image/")||type.equals("application/pdf")))throw new IOException("الاستقبال مخصص للصور وPDF.");
    String fid=UUID.randomUUID().toString();File file=new File(dir,fid);long size=0;
    try(InputStream in=context.getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(file)){if(in==null)throw new IOException("تعذر قراءة الملف.");byte[] bytes=new byte[65536];int n;while((n=in.read(bytes))!=-1){size+=n;total+=n;if(total>LIMIT)throw new IOException("حجم المشاركة يتجاوز 80 ميغابايت.");out.write(bytes,0,n);}}
    if(size==0)throw new IOException("الملف فارغ.");files.put(new JSONObject().put("id",fid).put("name",name).put("type",type).put("size",size));
   }
   JSONObject batch=new JSONObject().put("id",id).put("created",System.currentTimeMillis()).put("files",files);File temp=new File(dir,"index.tmp");try(Writer w=new OutputStreamWriter(new FileOutputStream(temp),java.nio.charset.StandardCharsets.UTF_8)){w.write(batch.toString());}if(!temp.renameTo(new File(dir,"index.json")))throw new IOException("تعذر حفظ الملفات الواردة.");complete=true;return batch;
  }finally{if(!complete)erase(dir);}
 }
 synchronized JSONArray list()throws Exception{JSONArray result=new JSONArray();File[] dirs=root.listFiles();if(dirs==null)return result;Arrays.sort(dirs,Comparator.comparingLong(File::lastModified));for(File dir:dirs){File index=new File(dir,"index.json");if(!index.isFile()){if(dir.lastModified()<System.currentTimeMillis()-TTL)erase(dir);continue;}try{JSONObject batch=new JSONObject(readText(index));if(batch.getLong("created")<System.currentTimeMillis()-TTL)erase(dir);else result.put(batch);}catch(Exception e){erase(dir);}}return result;}
 synchronized JSONObject get(String id)throws Exception{JSONArray batches=list();for(int i=0;i<batches.length();i++)if(batches.getJSONObject(i).getString("id").equals(id))return batches.getJSONObject(i);return null;}
 synchronized byte[] read(String batchId,String fileId,long offset,int length)throws Exception{JSONObject batch=get(batchId);if(batch==null)throw new IOException("انتهت صلاحية الملفات.");if(length<1||length>196608||offset<0)throw new IOException("طلب قراءة غير صالح.");JSONArray files=batch.getJSONArray("files");for(int i=0;i<files.length();i++){JSONObject f=files.getJSONObject(i);if(f.getString("id").equals(fileId)){long size=f.getLong("size");if(offset>=size)throw new IOException("طلب قراءة غير صالح.");byte[] data=new byte[(int)Math.min(length,size-offset)];try(RandomAccessFile in=new RandomAccessFile(new File(new File(root,batchId),fileId),"r")){in.seek(offset);in.readFully(data);}return data;}}throw new IOException("الملف غير موجود.");}
 synchronized void delete(String id)throws Exception{if(get(id)!=null)erase(new File(root,id));}
 static String safeName(String name){String safe=name.replaceAll("[\\\\/\\x00-\\x1f]","_").trim();return safe.isEmpty()?"shared-file":safe.substring(0,Math.min(safe.length(),150));}
 static String readText(File file)throws IOException{try(InputStream in=new FileInputStream(file)){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] bytes=new byte[8192];int n;while((n=in.read(bytes))!=-1)out.write(bytes,0,n);return new String(out.toByteArray(),java.nio.charset.StandardCharsets.UTF_8);}}
 static void erase(File file){if(file.isDirectory()){File[] list=file.listFiles();if(list!=null)for(File f:list)erase(f);}file.delete();}
}
