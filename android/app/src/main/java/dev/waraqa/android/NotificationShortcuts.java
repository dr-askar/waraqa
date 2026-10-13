package dev.waraqa.android;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import android.net.Uri;
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
  NotificationCompat.Builder capture=base(c,c.getString(R.string.notification_capture),c.getString(R.string.notification_capture_body),"scan");
  capture.addAction(android.R.drawable.ic_menu_camera,c.getString(R.string.shortcut_scan),pending(c,"scan")).addAction(android.R.drawable.ic_menu_myplaces,c.getString(R.string.shortcut_id),pending(c,"id")).addAction(android.R.drawable.ic_menu_agenda,c.getString(R.string.shortcut_book),pending(c,"book"));
  NotificationCompat.Builder edit=base(c,c.getString(R.string.notification_edit),c.getString(R.string.notification_edit_body),"tools");
  edit.addAction(android.R.drawable.ic_menu_edit,c.getString(R.string.shortcut_ocr),pending(c,"ocr")).addAction(android.R.drawable.ic_menu_edit,c.getString(R.string.shortcut_signature),pending(c,"signature")).addAction(android.R.drawable.ic_menu_manage,c.getString(R.string.shortcut_tools),pending(c,"tools"));
  n.notify(CAPTURE,capture.build());n.notify(EDIT,edit.build());n.notify(SUMMARY,base(c,c.getString(R.string.notification_channel),c.getString(R.string.notification_summary),"tools").setGroupSummary(true).build());
 }
 private static NotificationCompat.Builder base(Context c,String title,String body,String tool){return new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(R.drawable.ic_notification).setColor(0xff3764ed).setContentTitle(title).setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(pending(c,tool)).setGroup(GROUP).setOngoing(true).setOnlyAlertOnce(true).setSilent(true).setShowWhen(false).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setCategory(NotificationCompat.CATEGORY_SERVICE).setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_SUMMARY);}
}
