import {isAndroidApp,nativeRequest} from './android-bridge.js';

export async function nativeNotificationSettings({modal,button,close,toast}){
 const info=await nativeRequest('hello');
 const version=(info.version||'0').split('.').map(Number),iconRow=(version[0]||0)*10000+(version[1]||0)*100+(version[2]||0)>=60101;
 if(!info.notificationShortcuts||!iconRow){modal('تحديث نسخة أندرويد',`<p>نسخة APK الحالية لا تدعم صف الأيقونات الجديد. ثبّت إصدار 6.1.1 أو أحدث فوق النسخة الحالية للاحتفاظ بمستنداتك.</p><a class="primary" href="./android/waraqa-android.apk" target="_blank" rel="noopener">تنزيل نسخة أندرويد</a>`,[button('إغلاق',close)]);return;}
 let alive=true;
 modal('اختصارات إشعارات أندرويد',`<p class="hint">إشعار واحد مدمج بصف من ست أيقونات. اضغط الأيقونة لفتح أداتها مباشرة.</p><p>مسح · هوية · كتاب · نص · توقيع · أدوات</p><p id="native-notification-status" role="status">جاري فحص الإعدادات…</p><div class="actions-wrap"><button id="native-notification-enable">تشغيل الاختصارات</button><button id="native-notification-disable">إيقاف الاختصارات</button><button id="native-notification-settings">إعدادات إشعارات أندرويد</button></div><p class="hint">الإشعارات صامتة ولا تعرض أسماء مستنداتك. طلب الإذن يظهر عند التشغيل فقط. القفل يبقى مطلوباً قبل فتح مستنداتك. ترتيب الأزرار وظهورها يختلفان حسب إصدار أندرويد والجهاز.</p>`,[button('تم',()=>{alive=false;close();})]);
 const $=s=>document.querySelector(s),node=$('#native-notification-status');
 function update(status){if(!alive||!node.isConnected)return;node.textContent=!status.permission?'الإشعارات محظورة؛ اسمح بها من إعدادات أندرويد':status.enabled?'الاختصارات مفعّلة':'الاختصارات متوقفة';}
 async function change(enabled){const controls=[...document.querySelectorAll('button[id^=native-notification-]')];for(const c of controls)c.disabled=true;try{update(await nativeRequest('notificationShortcuts',{enabled}));}catch(e){toast(e.message);}finally{for(const c of controls)if(c.isConnected)c.disabled=false;}}
 $('#native-notification-enable').onclick=()=>change(true);$('#native-notification-disable').onclick=()=>change(false);$('#native-notification-settings').onclick=()=>nativeRequest('notificationSettings').catch(e=>toast(e.message));update(await nativeRequest('notificationStatus'));
}
export async function hideNotificationShortcuts(){if(isAndroidApp()){const info=await nativeRequest('hello');if(info.notificationShortcuts)await nativeRequest('notificationShortcuts',{enabled:false});return;}const registration=await navigator.serviceWorker?.getRegistration();const notices=await registration?.getNotifications?.({tag:'waraqa-shortcuts'});notices?.forEach(n=>n.close());}
