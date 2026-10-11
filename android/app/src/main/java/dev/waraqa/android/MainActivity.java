package dev.waraqa.android;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.print.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import androidx.core.content.FileProvider;
import androidx.webkit.*;
import org.json.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

public final class MainActivity extends Activity {
 static final String ORIGIN="https://dr-askar.github.io",HOME=ORIGIN+"/waraqa/";
 private final ExecutorService io=Executors.newSingleThreadExecutor();
 private final Handler main=new Handler(Looper.getMainLooper());
 WebView web; IncomingStore inbox;
 private FrameLayout root;private TextView status;private boolean pageFailed;
 private ValueCallback<Uri[]> fileCallback;private Uri cameraUri;private Runnable afterCamera;
 private PermissionRequest webCamera;
 private final Map<String,Export> exports=new HashMap<>();private final ArrayDeque<Save> saves=new ArrayDeque<>();private Save activeSave;
 static final class Export{File file;String name,type;long expected,written;}
 static final class Save{Export export;JavaScriptReplyProxy reply;String request;}
 @Override public void onCreate(Bundle state){super.onCreate(state);inbox=new IncomingStore(this);root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(245,247,252));setContentView(root);
  root.setOnApplyWindowInsetsListener((v,insets)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);}else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  web=new WebView(this);web.setId(dev.waraqa.android.R.id.waraqa_webview);root.addView(web,new FrameLayout.LayoutParams(-1,-1));status=new TextView(this);status.setTextSize(17);status.setTextColor(Color.rgb(23,42,72));status.setBackgroundColor(Color.rgb(245,247,252));status.setGravity(Gravity.CENTER);status.setPadding(24,24,24,24);root.addView(status,new FrameLayout.LayoutParams(-1,-1));status.setText(R.string.loading);
  if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){status.setText(R.string.update_webview);status.setOnClickListener(v->openExternal(Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.webview")));return;}
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
  if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))WebViewCompat.addWebMessageListener(web,"WaraqaAndroid",Collections.singleton(ORIGIN),(view,message,origin,isMainFrame,reply)->{if(!isMainFrame||!originTrusted(origin)||!trusted(Uri.parse(view.getUrl()==null?HOME:view.getUrl())))return;String raw=message.getData();if(raw==null||raw.length()>400000)return;io.execute(()->bridge(raw,reply));});
  web.setWebViewClient(new WebViewClient(){@Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap favicon){pageFailed=false;}@Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if(trusted(uri))return false;if(request.isForMainFrame())openExternal(uri);return true;}@Override public void onPageFinished(WebView view,String url){if(!pageFailed&&trusted(Uri.parse(url)))status.setVisibility(View.GONE);}@Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame()){pageFailed=true;status.setVisibility(View.VISIBLE);status.setText(R.string.load_error);status.setOnClickListener(v->web.reload());}}});
  web.setDownloadListener((url,userAgent,disposition,mime,length)->openExternal(Uri.parse(url)));
  web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;try{if(params.isCaptureEnabled()&&Arrays.stream(params.getAcceptTypes()).anyMatch(s->s.startsWith("image"))){camera(()->{try{File dir=new File(getCacheDir(),"camera");dir.mkdirs();File f=File.createTempFile("scan-",".jpg",dir);cameraUri=FileProvider.getUriForFile(MainActivity.this,getPackageName()+".files",f);Intent i=new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);i.putExtra(android.provider.MediaStore.EXTRA_OUTPUT,cameraUri);i.setClipData(ClipData.newRawUri("photo",cameraUri));i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);startActivityForResult(i,101);}catch(Exception e){finishPicker(null);}});}else{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);String[] types=Arrays.stream(params.getAcceptTypes()).filter(t->t.contains("/")).toArray(String[]::new);if(types.length>0)i.putExtra(Intent.EXTRA_MIME_TYPES,types);startActivityForResult(i,100);}return true;}catch(Exception e){finishPicker(null);return false;}}
   @Override public void onPermissionRequest(PermissionRequest request){if(!originTrusted(request.getOrigin())||!Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)){request.deny();return;}webCamera=request;camera(()->{if(webCamera!=null){webCamera.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});webCamera=null;}});}
   @Override public void onPermissionRequestCanceled(PermissionRequest request){if(webCamera==request)webCamera=null;}
  });
  pruneExports();handleIntent(getIntent());
 }
 static boolean originTrusted(Uri uri){return "https".equals(uri.getScheme())&&"dr-askar.github.io".equals(uri.getHost())&&(uri.getPort()==-1||uri.getPort()==443);}
 static boolean trusted(Uri uri){return originTrusted(uri)&&uri.getPath()!=null&&uri.getPath().startsWith("/waraqa/");}
 private void openExternal(Uri uri){if(!Arrays.asList("https","http").contains(uri.getScheme()))return;try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){Toast.makeText(this,"تعذر فتح الرابط.",Toast.LENGTH_SHORT).show();}}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);handleIntent(intent);}
 private void handleIntent(Intent intent){if(Intent.ACTION_SEND.equals(intent.getAction())||Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())){status.setVisibility(View.VISIBLE);status.setText(R.string.receiving);io.execute(()->{try{JSONObject batch=inbox.accept(intent);main.post(()->web.loadUrl(HOME+"?native_share="+batch.optString("id")));}catch(Exception e){main.post(()->{Toast.makeText(this,e.getMessage(),Toast.LENGTH_LONG).show();web.loadUrl(HOME);});}});}else web.loadUrl(HOME);}
 private void camera(Runnable granted){if(checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)granted.run();else{afterCamera=granted;requestPermissions(new String[]{Manifest.permission.CAMERA},102);}}
 @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results){super.onRequestPermissionsResult(code,permissions,results);if(code==102){Runnable action=afterCamera;afterCamera=null;if(results.length>0&&results[0]==PackageManager.PERMISSION_GRANTED&&action!=null)action.run();else{if(webCamera!=null){webCamera.deny();webCamera=null;}finishPicker(null);}}}
 private void finishPicker(Uri[] uris){if(fileCallback!=null){fileCallback.onReceiveValue(uris);fileCallback=null;}cameraUri=null;}
 private void bridge(String raw,JavaScriptReplyProxy reply){String request="";try{JSONObject m=new JSONObject(raw);request=m.getString("requestId");if(request.length()>100)throw new IOException("invalid request");String action=m.getString("action");Object value;
  switch(action){case "hello":value=new JSONObject().put("version",BuildConfig.VERSION_NAME).put("platform","android");break;
   case "list":value=inbox.list();break;
   case "read":value=android.util.Base64.encodeToString(inbox.read(m.getString("batchId"),m.getString("fileId"),m.getLong("offset"),m.getInt("length")),android.util.Base64.NO_WRAP);break;
   case "delete":inbox.delete(m.getString("batchId"));value=true;break;
   case "beginExport":{long size=m.getLong("size");if(size<0||size>IncomingStore.LIMIT||exports.size()>=3)throw new IOException("حجم التصدير يتجاوز الحد المدعوم.");String id=UUID.randomUUID().toString();Export out=new Export();out.name=IncomingStore.safeName(m.getString("name"));out.type=m.optString("type","application/octet-stream");if(!out.type.matches("[a-zA-Z0-9.+-]+/[a-zA-Z0-9.+-]+"))out.type="application/octet-stream";out.expected=size;File dir=new File(getCacheDir(),"exports");dir.mkdirs();File exportDir=new File(dir,id);exportDir.mkdirs();out.file=new File(exportDir,out.name);try(FileOutputStream ignored=new FileOutputStream(out.file)){}exports.put(id,out);value=id;break;}
   case "writeExport":{Export out=exports.get(m.getString("token"));if(out==null||out.written!=m.getLong("offset"))throw new IOException("invalid export position");byte[] data=android.util.Base64.decode(m.getString("data"),android.util.Base64.DEFAULT);if(data.length>196608||out.written+data.length>out.expected)throw new IOException("invalid export size");try(OutputStream stream=new FileOutputStream(out.file,true)){stream.write(data);}out.written+=data.length;value=true;break;}
   case "finishExport":{Export out=exports.remove(m.getString("token"));if(out==null||out.expected!=out.written)throw new IOException("ملف التصدير غير مكتمل.");String mode=m.getString("mode"),id=request;
    if(mode.equals("save")){main.post(()->{Save save=new Save();save.export=out;save.reply=reply;save.request=id;saves.add(save);startSave();});return;}
    if(mode.equals("share")){main.post(()->{try{Uri uri=FileProvider.getUriForFile(this,getPackageName()+".files",out.file);Intent i=new Intent(Intent.ACTION_SEND);i.setType(out.type);i.putExtra(Intent.EXTRA_STREAM,uri);i.putExtra(Intent.EXTRA_TITLE,out.name);i.setClipData(ClipData.newUri(getContentResolver(),out.name,uri));i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(Intent.createChooser(i,getString(R.string.share_file)));respond(reply,id,true,true);}catch(Exception e){respond(reply,id,false,e.getMessage());}});return;}
    if(mode.equals("print")){main.post(()->{try{printPdf(out);respond(reply,id,true,true);}catch(Exception e){respond(reply,id,false,e.getMessage());}});return;}
    throw new IOException("invalid export mode");}
   default:throw new IOException("unsupported native request");
  }respond(reply,request,true,value);
 }catch(Exception e){respond(reply,request,false,e.getMessage()==null?"تعذر إكمال العملية.":e.getMessage());}}
 private void respond(JavaScriptReplyProxy reply,String request,boolean ok,Object value){main.post(()->{try{if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))return;reply.postMessage(new JSONObject().put("requestId",request).put("ok",ok).put(ok?"value":"error",value==null?JSONObject.NULL:value).toString());}catch(Exception ignored){}});}
 private void startSave(){if(activeSave!=null||saves.isEmpty())return;activeSave=saves.remove();try{Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType(activeSave.export.type);i.putExtra(Intent.EXTRA_TITLE,activeSave.export.name);startActivityForResult(i,103);}catch(Exception e){respond(activeSave.reply,activeSave.request,false,e.getMessage());activeSave.export.file.delete();activeSave=null;startSave();}}
 @Override protected void onActivityResult(int code,int result,Intent data){super.onActivityResult(code,result,data);if(code==100){finishPicker(WebChromeClient.FileChooserParams.parseResult(result,data));}else if(code==101){finishPicker(result==RESULT_OK&&cameraUri!=null?new Uri[]{cameraUri}:null);}else if(code==103&&activeSave!=null){Save saved=activeSave;activeSave=null;if(result==RESULT_OK&&data!=null&&data.getData()!=null){Uri uri=data.getData();io.execute(()->{try(InputStream in=new FileInputStream(saved.export.file);OutputStream out=getContentResolver().openOutputStream(uri)){if(out==null)throw new IOException("تعذر حفظ الملف.");byte[] bytes=new byte[65536];int n;while((n=in.read(bytes))!=-1)out.write(bytes,0,n);respond(saved.reply,saved.request,true,true);}catch(Exception e){respond(saved.reply,saved.request,false,e.getMessage());}finally{saved.export.file.delete();}});}else{saved.export.file.delete();respond(saved.reply,saved.request,false,"cancelled");}startSave();}}
 private void printPdf(Export out){PrintManager manager=(PrintManager)getSystemService(PRINT_SERVICE);manager.print(out.name,new PrintDocumentAdapter(){@Override public void onLayout(PrintAttributes old,PrintAttributes attrs,CancellationSignal signal,LayoutResultCallback callback,Bundle extras){if(signal.isCanceled()){callback.onLayoutCancelled();return;}callback.onLayoutFinished(new PrintDocumentInfo.Builder(out.name).setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).build(),true);}@Override public void onWrite(PageRange[] pages,ParcelFileDescriptor destination,CancellationSignal signal,WriteResultCallback callback){io.execute(()->{try(InputStream in=new FileInputStream(out.file);OutputStream stream=new FileOutputStream(destination.getFileDescriptor())){byte[] data=new byte[65536];int n;while((n=in.read(data))!=-1){if(signal.isCanceled()){callback.onWriteCancelled();return;}stream.write(data,0,n);}callback.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});}catch(Exception e){callback.onWriteFailed(e.getMessage());}});}},null);}
 private void pruneExports(){io.execute(()->{for(String name:new String[]{"exports","camera"}){File[] files=new File(getCacheDir(),name).listFiles();if(files!=null)for(File f:files)if(f.lastModified()<System.currentTimeMillis()-86400000)IncomingStore.erase(f);}});}
 @Override public void onBackPressed(){web.evaluateJavascript("(()=>{const d=document.querySelector('#modal');if(d?.open){document.querySelector('#modal-close')?.click();return true;}const b=document.querySelector('#back');if(document.querySelector('#editor')?.hidden===false){b?.click();return true;}return false;})()",result->{if(!"true".equals(result))super.onBackPressed();});}
 @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);if(webCamera!=null)webCamera.deny();web.destroy();io.shutdown();super.onDestroy();}
}
