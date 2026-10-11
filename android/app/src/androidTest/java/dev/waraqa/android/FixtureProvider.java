package dev.waraqa.android;

import android.content.*;
import android.database.*;
import android.graphics.*;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.os.*;
import android.os.Process;
import android.provider.OpenableColumns;
import java.io.*;
import java.util.*;

/** Test APK only. Fixtures are created by their owning process, not instrumentation's target UID. */
public final class FixtureProvider extends ContentProvider {
 static final String AUTHORITY="dev.waraqa.android.test.fixtures";
 @Override public boolean onCreate(){return true;}
 @Override public Bundle call(String method,String name,Bundle extras){
  if(!"create".equals(method))throw new IllegalArgumentException("fixture command");
  try{String safe=name.replaceAll("[\\\\/\\x00-\\x1f]","_");if(safe.equals(".")||safe.equals("..")||safe.isEmpty())throw new IOException("fixture name");
   File dir=new File(new File(getContext().getCacheDir(),"fixtures"),UUID.randomUUID().toString());if(!dir.mkdirs())throw new IOException("fixture directory");File f=new File(dir,safe);
   try(OutputStream out=new FileOutputStream(f)){if(extras.getBoolean("pdf")){PdfDocument pdf=new PdfDocument();PdfDocument.Page page=pdf.startPage(new PdfDocument.PageInfo.Builder(120,160,1).create());Paint paint=new Paint();paint.setColor(Color.BLACK);page.getCanvas().drawText("Waraqa",12,30,paint);pdf.finishPage(page);pdf.writeTo(out);pdf.close();}else{Bitmap bitmap=Bitmap.createBitmap(100,140,Bitmap.Config.ARGB_8888);bitmap.eraseColor(Color.WHITE);bitmap.compress(Bitmap.CompressFormat.PNG,100,out);bitmap.recycle();}}
   Uri uri=new Uri.Builder().scheme("content").authority(AUTHORITY).appendPath(dir.getName()).appendPath(safe).build();getContext().grantUriPermission("dev.waraqa.android",uri,Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);Bundle result=new Bundle();result.putString("uri",uri.toString());return result;
  }catch(IOException e){throw new IllegalStateException(e);}
 }
 private File file(Uri uri)throws FileNotFoundException{List<String> parts=uri.getPathSegments();if(parts.size()!=2||!parts.get(0).matches("[0-9a-f-]{36}")||parts.get(1).contains("/")||parts.get(1).equals(".")||parts.get(1).equals(".."))throw new FileNotFoundException("fixture URI");File f=new File(new File(new File(getContext().getCacheDir(),"fixtures"),parts.get(0)),parts.get(1));if(!f.isFile())throw new FileNotFoundException("fixture missing");return f;}
 private void granted(Uri uri,int flags){if(Binder.getCallingUid()!=Process.myUid()&&getContext().checkUriPermission(uri,Binder.getCallingPid(),Binder.getCallingUid(),flags)!=android.content.pm.PackageManager.PERMISSION_GRANTED)throw new SecurityException("fixture URI grant required");}
 @Override public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException{granted(uri,mode.contains("w")?Intent.FLAG_GRANT_WRITE_URI_PERMISSION:Intent.FLAG_GRANT_READ_URI_PERMISSION);return ParcelFileDescriptor.open(file(uri),ParcelFileDescriptor.parseMode(mode));}
 @Override public String getType(Uri uri){return uri.getLastPathSegment().endsWith(".pdf")?"application/pdf":"image/png";}
 @Override public Cursor query(Uri uri,String[] projection,String selection,String[] args,String sort){granted(uri,Intent.FLAG_GRANT_READ_URI_PERMISSION);try{File f=file(uri);String[] columns=projection==null?new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE}:projection;MatrixCursor cursor=new MatrixCursor(columns);Object[] values=new Object[columns.length];for(int i=0;i<columns.length;i++)values[i]=OpenableColumns.DISPLAY_NAME.equals(columns[i])?f.getName():OpenableColumns.SIZE.equals(columns[i])?f.length():null;cursor.addRow(values);return cursor;}catch(IOException e){throw new IllegalArgumentException(e);}}
 @Override public Uri insert(Uri uri,ContentValues values){throw new UnsupportedOperationException();}
 @Override public int update(Uri uri,ContentValues values,String selection,String[] args){throw new UnsupportedOperationException();}
 @Override public int delete(Uri uri,String selection,String[] args){throw new UnsupportedOperationException();}
}
