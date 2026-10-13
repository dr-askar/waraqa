package dev.waraqa.android;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import android.net.Uri;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONObject;
import java.util.Arrays;

final class NotificationShortcuts {
 static final String CHANNEL="waraqa_shortcuts_v1",GROUP="waraqa.shortcuts",EXTRA_TOOL="waraqa_shortcut";
 static final int CAPTURE=7101,EDIT=7102,SUMMARY=7100;
 static boolean validTool(String tool){return Arrays.asList("scan","ocr","id","book","signature","tools").contains(tool);}
 static boolean selected(Context c){return c.getSharedPreferences("notifications",Context.MODE_PRIVATE).getBoolean("shortcuts",false);}
 static boolean permitted(Context c){return (Build.VERSION.SDK_INT<33||c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)&&NotificationManagerCompat.from(c).areNotificationsEnabled();}
 static boolean available(Context c){NotificationChannel channel=c.getSystemService(NotificationManager.class).getNotificationChannel(CHANNEL);return permitted(c)&&(channel==null||channel.getImportance()!=NotificationManager.IMPORTANCE_NONE);}
 static JSONObject status(Context c)throws Exception{return new JSONObject().put("supported",true).put("enabled",selected(c)).put("permission",available(c));}
 static Intent intent(Context c,String tool){if(!validTool(tool))throw new IllegalArgumentException("unsupported shortcut");return new Intent(c,MainActivity.class).setAction("dev.waraqa.android.SHORTCUT").setData(Uri.parse("waraqa://shortcut/"+tool)).putExtra(EXTRA_TOOL,tool).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);}
 static PendingIntent pending(Context c,String tool){return PendingIntent.getActivity(c,tool.hashCode(),intent(c,tool),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 static void configure(Context c,boolean enabled){if(enabled&&!available(c))throw new IllegalStateException(c.getString(R.string.notification_blocked));c.getSharedPreferences("notifications",Context.MODE_PRIVATE).edit().putBoolean("shortcuts",enabled).apply();if(enabled)show(c);else{NotificationManagerCompat n=NotificationManagerCompat.from(c);n.cancel(CAPTURE);n.cancel(EDIT);n.cancel(SUMMARY);}}
 static void restore(Context c){if(selected(c)&&available(c))show(c);}
 @SuppressWarnings("MissingPermission")
 static void show(Context c){
  if(!available(c))return;NotificationManager manager=c.getSystemService(NotificationManager.class);NotificationChannel channel=new NotificationChannel(CHANNEL,c.getString(R.string.notification_channel),NotificationManager.IMPORTANCE_LOW);channel.setDescription(c.getString(R.string.notification_description));channel.setShowBadge(false);manager.createNotificationChannel(channel);
  NotificationManagerCompat n=NotificationManagerCompat.from(c);
  RemoteViews row=new RemoteViews(c.getPackageName(),R.layout.notification_shortcuts);
  int[] ids={R.id.shortcut_scan,R.id.shortcut_id,R.id.shortcut_book,R.id.shortcut_ocr,R.id.shortcut_signature,R.id.shortcut_tools};
  String[] tools={"scan","id","book","ocr","signature","tools"};
  for(int i=0;i<ids.length;i++)row.setOnClickPendingIntent(ids[i],pending(c,tools[i]));
  NotificationCompat.Builder notification=new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(R.drawable.ic_notification).setColor(0xff3764ed).setContentTitle(c.getString(R.string.notification_channel)).setContentIntent(pending(c,"tools")).setStyle(new NotificationCompat.DecoratedCustomViewStyle()).setCustomContentView(row).setCustomBigContentView(row).setOngoing(true).setOnlyAlertOnce(true).setSilent(true).setShowWhen(false).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setCategory(NotificationCompat.CATEGORY_SERVICE);
  n.cancel(EDIT);n.cancel(SUMMARY);n.notify(CAPTURE,notification.build());
 }
}
