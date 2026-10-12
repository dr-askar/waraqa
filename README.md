# ورقة — Waraqa 6

ماسح مستندات بواجهة ويب قابلة للتثبيت ونسخة Android تستقبل الصور وPDF مباشرة من قائمة المشاركة.

**جرّبه: https://dr-askar.github.io/waraqa/**

## الميزات المنفذة

| الوظيفة | المتاح |
| --- | --- |
| المسح | كاميرا خلفية، كشف حدود الورقة مباشرة، إرشادات الإضاءة والثبات، التقاط تلقائي اختياري، تصوير عدة صفحات، فلاش عند دعم الجهاز |
| القص | قص تلقائي عند ثقة كافية وتصحيح منظور؛ تدقيق الحواف بدقة أعلى، أربع زوايا قابلة للتعديل مع عدسة تكبير ومعاينة؛ حفظ الصورة الأصلية |
| الاستيراد | صور متعددة وPDF، بما فيه PDF المحمي بكلمة مرور |
| تحسين الصورة | تدوير، رمادي، أبيض وأسود، تنظيف الخلفية، إضاءة وتباين؛ أوضاع المستند والإيصال والبطاقة واللوح الأبيض |
| دمج محتوى صفحتين | صفحة واحدة فعلية أفقية أو عمودية، A4/Letter، هوامش وترتيب قابل للتبديل، تحريك مستقل لكل صورة، تكبير بإصبعين أو مقبض الزاوية، وقص الجزء المطلوب قبل الدمج؛ مع الاحتفاظ بالأصل |
| تقسيم محتوى الصفحة | 2–4 صفحات، أفقياً أو عمودياً، خطوط فصل قابلة للتعديل وترتيب معكوس اختياري |
| إدارة الصفحات | ترتيب ونسخ واستخراج وحذف، جمع مستندات، تراجع وإعادة حتى ثلاثة تعديلات للصورة |
| المكتبة | أسماء ومجلدات ووسوم ومفضلة، بحث بالأسماء والنص المستخرج، ترتيب وسلة واستعادة وحذف نهائي |
| النصوص | OCR عربي وإنجليزي محلي بنماذج دقيقة أو سريعة، تحسين التباين وتصحيح ميل النص، اختيار شكل النص، عرض ثقة المحرك، تحرير ونسخ وتصدير TXT |
| التصدير | PDF متعدد الصفحات قابل للبحث، A4/Letter/حجم الصورة، جودة وعلامة مائية اختياريتان؛ JPG/PNG ومشاركة وطباعة |
| الحماية | PDF بكلمة مرور وتشفير AES-256؛ قفل محلي بكلمة مرور يشفر المستندات والتوقيع المحفوظ بـAES-GCM؛ نسخ احتياطية مشفرة اختيارياً |
| التوقيع | رسم بالإصبع، حفظ توقيع لإعادة الاستخدام، استيراد ونقل وتحجيم التوقيع، قلم وتمييز ونص وتاريخ وطمس مدمج في صورة التصدير |
| Google Drive | حفظ نسخة من قائمة مشاركة أندرويد دون إعداد OAuth؛ أو ربط اختياري للمزامنة اليدوية أو التلقائية أثناء فتح التطبيق، رفع قابل للاستئناف، نسخ تعارض منفصلة، وتنظيف النسخ السحابية للمستندات المحذوفة |
| الواجهة | عربية RTL، خيار إنجليزي LTR للقوائم الأساسية، وضع داكن، تثبيت وعمل دون إنترنت بعد تحميل الأدوات المطلوبة |

## أين تُحفظ الملفات؟

الصور والمستندات محفوظة في **IndexedDB داخل المتصفح على جهازك**. GitHub يحتوي كود التطبيق فقط، ولا يستقبل صور المستخدم. المعالجة وOCR تتم على الجهاز. المزامنة اختيارية وترفع نسخ مستندات إلى مجلد التطبيق الخاص في **حساب Google Drive الخاص بالمستخدم**. لا تستخدم اتصال Drive الخاص بـChatGPT.

قفل التطبيق يشفر التخزين المحلي، ولا يشفر نسخة Drive تلقائياً؛ حماية PDF والنسخة الاحتياطية خياران مستقلان. النسخ السحابية والاحتياطية تتضمن الصورة الأصلية. الطمس يزيل المحتوى من صورة التصدير ويُبطل OCR القديم، لكن الأصل محفوظ داخل التطبيق: لا تشارك نسخة احتياطية إذا كنت تقصد مشاركة مستند منقّح. التوقيع مرئي ولا يمثل توقيعاً رقمياً موثقاً. اقرأ [سياسة الخصوصية](https://dr-askar.github.io/waraqa/privacy.html).

## الاستخدام على الهاتف

افتح الرابط في Chrome، ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» من قائمة المتصفح. عند استيراد صورة، يبدأ الكشف والقص تلقائياً ما لم يُعطّل في الإعدادات. الخلفية المختلفة عن الورقة والإضاءة الجيدة تساعدان الكشف. عند عدم الثقة تبقى الصورة كاملة وتستطيع ضبط الزوايا يدوياً. أول استخدام للكشف وOCR وPDF يحتاج اتصالاً لتنزيل المحركات؛ بعد تحميلها تُخزن محلياً للعمل دون إنترنت.

## Google Drive ببساطة

من الإعدادات اختر **حفظ نسخة في Google Drive**، اختر كلمة مرور للنسخة أو اتركها فارغة، ثم «اختيار مكان الحفظ» واختر Drive من قائمة أندرويد. يختار الهاتف الحساب والمجلد. النسخة المُعدّة للمشاركة اسمها ينتهي بـ`.waraqa.txt` لتوافق مشاركة الملفات في Chrome؛ محتواها قابل للاستعادة في ورقة. هذه **نسخة احتياطية يدوية**، وليست مزامنة تلقائية. إن لم يدعم المتصفح مشاركة الملف، نزّله وارفعه من Drive. لاستعادته استخدم «استعادة نسخة من الملفات» واختر الملف من Drive في منتقي أندرويد، أو نزّله أولاً.

المزامنة المباشرة بين الأجهزة موجودة تحت خيار إضافي. لتكون زر ربط واحد لكل مستخدم، يحتاج صاحب التطبيق إعداد Google مرة واحدة:

1. فعّل Google Drive API وأعدّ consent screen ومستخدمي الاختبار.
2. أنشئ OAuth Client من نوع **Web application** وأضف `https://dr-askar.github.io` إلى Authorized JavaScript origins.
3. في GitHub Settings → Secrets and variables → Actions → Variables، أضف `WARAQA_GOOGLE_CLIENT_ID` بمعرّف العميل العام وأعد النشر. لا تستخدم Client Secret.

عندها يُجهَّز زر Google تلقائياً دون أن ينسخ كل مستخدم معرّفاً. يوجد إدخال يدوي اختياري للإعداد داخل التطبيق. لا يوجد إعداد OAuth مرفق حالياً؛ حفظ النسخ عبر مشاركة الهاتف يعمل مستقلاً عنه.

المزامنة المباشرة تطلب نطاق `drive.appdata` فقط. access token في ذاكرة الجلسة، والنسخ في appDataFolder المخفي. تحافظ على نسخ التعارض وتستأنف الرفع المنقطع. فصل الحساب لا يحذف ملفاته ولا يلغي الإذن الدائم، الذي يُلغى من إعدادات حساب Google. التلقائية تعمل والتطبيق مفتوح وجلسة Google صالحة؛ Wi-Fi يمنعها إذا لم يستطع المتصفح تأكيد نوع الشبكة.

## تحسين النص والقص

للمستند العربي، اختر العربية فقط. الوضع «دقيق» يستخدم tessdata_best ويحتاج نحو 24MB لنموذجي العربية والإنجليزية أول مرة؛ الوضع السريع أخف. تُحسّن الصورة للقراءة فقط دون تغيير صور المستند. تصحيح الميل ونقل مواضع الكلمات يعيدان إحداثيات OCR إلى الصورة الأصلية لـPDF القابل للبحث. عرض الثقة تقدير للمحرك ولا يمثل قياس الدقة الحقيقي. النتائج قد تختلف حسب الخط والصورة، وتحتاج مراجعة.

كشف الورقة يفحص الحواف على دقة أعلى، يجرّب عدة عمليات كشف ويقيّم امتداد الحدود، ثم يحسّن موضع خطوطها. عند عدم الثقة تبقى الصورة كاملة؛ يمكن مراجعة الزوايا والقص يدوياً بعدسة تكبير.

## التشغيل والتدقيق

يتطلب Node 22 أو أحدث:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
python3 -m http.server 4173 --directory dist
```

افتح `http://localhost:4173`. الكاميرا والتشفير وPWA تحتاج HTTPS أو localhost. تشغيل الهاتف عبر IP كمبيوتر على HTTP لا يكفي.

```sh
npm run check
npm test
npx playwright install --with-deps chromium
npm run test:browser
npm run test:advanced
npm run test:ocr
```

فحوصات المنطق تتحقق أيضاً من حدود قصّ الدمج، حفظ نسب الصور عند التكبير، وإرجاع مواضع OCR بعد التحسين، ومن تغطية التقسيم لكل البكسلات، نسب الدمج، المنظور، بنية PDF وأنساب إصدارات المزامنة. اختبارات Chromium تتحقق من الواجهة على الهاتف، الاستيراد والدمج والتقسيم والقص، التصدير وإعادة التحميل والعمل دون إنترنت؛ وتستخدم محركات OpenCV وTesseract وPDF.js وQPDF الفعلية للكشف وOCR العربي والإنجليزي، البحث العربي داخل PDF، AES-256 ورفض كلمة مرور خاطئة، تشفير التخزين، التوقيع، النسخ المشفرة وترحيل البيانات السابقة. اختبار المزامنة يستخدم نقل HTTP محاكياً ويشغّل منطق Drive والتخزين الفعلي للاستئناف ومنع التكرار والتعارض والحذف السحابي.

GitHub Actions يبني الأدوات ويشغل هذه الاختبارات قبل نشر ناتج `dist`. يمكن تشغيل `node checks/ocr-qa.mjs` لمقارنة قراءة عينتين عربيتين بنماذج سريعة ودقيقة، إحداهما مائلة مع ظلال. في العينة المائلة انخفض خطأ الحروف من نحو 33% إلى نحو 3%؛ وفي العينة الواضحة كان الوضع السريع أفضل قليلاً. هذه نتيجة عينات محددة وليست ضماناً لدقة الصور الحقيقية. أدوات الطرف الثالث تأتي من حزم npm المثبتة بإصدارات محددة وملف القفل. تنزيل خط Amiri ونماذج OCR يتحقق من SHA-256. رخصها تُنسخ إلى `dist/vendor`؛ المخرجات الكبيرة وصور الاختبارات لا تُرفع للمستودع.

## حدود التنفيذ

- تجربة الكاميرا والفلاش والتثبيت على Android فعلي، والمزامنة بحساب Google حقيقي، تحتاج الهاتف وإعداد OAuth المستخدم؛ لا يغطيها اختبار Chromium الآلي.
- OCR قابل للخطأ ويحتاج مراجعة، خصوصاً الخط اليدوي والصور الضعيفة. تعديل النص يوقف إدراجه في PDF كطبقة بحث لعدم تطابق مواضع الكلمات؛ أعد OCR للصورة عند الحاجة.
- لا توجد مزامنة مضمونة عند إغلاق التطبيق أو قفل بالبصمة. اللغة الإنجليزية تغطي القوائم الأساسية؛ بعض التعليمات الطويلة عربية.
- حد الصورة المدخلة 30MB والضلع الأطول 2400px، وPDF المدخل والمستند المتزامن 50MB، والمستند 80 صفحة، وملف الاستعادة 80MB. الملفات الكبيرة قد تحتاج تقسيمها للحفاظ على الذاكرة.
- المتصفح قد يمسح التخزين عند ضغط المساحة أو مسح بيانات الموقع. اطلب التخزين الدائم واحفظ نسخاً احتياطية؛ فقدان كلمة مرور القفل لا يمكن استرجاعه.
- تحسين الكتاب المنحني والتعرف الدقيق على الجداول والخط اليدوي ليست ميزات هذه النسخة.

تحديث 3.1: الدمج يدعم منزلقات مستقلة لمكان وعرض كل صورة، ومقبضاً أكبر للمس. التقسيم يدعم خطوطاً أفقية وعمودية معاً قابلة للسحب، وتغيير اتجاه كل خط وحذفه، حتى 25 جزءاً بترتيب صفوف من اليمين لليسار. تبقى الصفحات الأصلية محفوظة.

واجهة 4.0: هوية زرقاء جديدة، خط Readex Pro محلي (مرخّص OFL)، أيقونات SVG محلية، عرض المكتبة كبطاقات أو قائمة مع حفظ الاختيار، ملخص فعلي للمستندات والصفحات والمفضلة، قوائم أدوات للصفحات والمستندات، وشريط هاتف بخمسة أقسام. يدعم التصميم العربية RTL والإنجليزية LTR والوضع الداكن، وتعمل الأصول البصرية دون إنترنت بعد التثبيت.

إصدار 5.0: لغات الواجهة العربية والإنجليزية والفرنسية والألمانية والإسبانية والتركية؛ و14 لغة OCR (العربية، الإنجليزية، الفرنسية، الألمانية، الإسبانية، التركية، الإيطالية، البرتغالية، الروسية، الفارسية، الهندية، الصينية المبسطة، اليابانية، الكورية). نماذج سريعة ودقيقة محلية، تتحمل اللغة المختارة عند أول استخدام، مع حفظ اللغة وإمكانية الجمع بينها.

التصدير الجديد: DOCX بصور الصفحات أو النص المستخرج القابل للتعديل؛ XLSX بورقة لكل صفحة مع معاينة خلايا قابلة للتحرير؛ CSV للصفحة المعروضة؛ TXT لكل الصفحات المختارة. اكتشاف الجدول تقديري ويحتاج مراجعة، ولا ندّعي إعادة إنشاء تنسيق Word أو الجداول المعقدة بدقة كاملة. النص يحتاج OCR محفوظاً لكل صفحة؛ لا يُرفع المستند لخدمة تحويل خارجية. تحفظ أرقام Excel كأرقام عندما تكون واضحة وتبقى المعرفات ذات الأصفار والأرقام الطويلة نصاً. ملفات CSV تحيّد النصوص التي قد تُفسّر كصيغ.

### المجلدات
زر «مجلداتي» في المكتبة لإنشاء مجلدات فارغة أو تغيير أسمائها وحذفها. من قائمة المستند اختر «نقل إلى مجلد». حذف المجلد ينقل مستنداته إلى «غير مصنّف» ويحتفظ بحالة سلة المحذوفات. المستندات الجديدة داخل مجلد تأخذ تصنيفه تلقائياً. المجلدات الفارغة تدخل النسخ الاحتياطية المحلية واليدوية؛ المزامنة المباشرة تنقل تصنيف المستندات فقط. أسماء المجلدات تُشفّر عند تفعيل قفل التطبيق.

### استقبال الملفات من مشاركة Android
من الإعدادات اختر «استقبال من التطبيقات» واتبع التثبيت باستخدام Chrome على Android. يعرّف manifest هدف مشاركة POST للصور وPDF؛ يستقبله Service Worker دون خادم، ثم يتيح إنشاء مستند أو الإضافة إلى مستند موجود واختيار مجلد. يجب أن يكون التطبيق مثبتاً ودعم Web Share Target متاحاً؛ قد تتأخر تحديثات manifest عند التطبيقات المثبتة سابقاً. فتح الموقع وحده لا يسجل هدف مشاركة.
الملفات الواردة محفوظة مؤقتاً محلياً وغير مشفرة حتى الاستيراد أو الإلغاء، وتُنظّف بعد انتهاء مهلة ساعة عند فتح التطبيق أو استقبال مشاركة جديدة. التطبيق المقفل يطلب كلمة المرور قبل عرضها؛ المستند النهائي يستخدم تشفير التطبيق المعتاد. الحد 80 ملفاً/80MB. الاختبار الآلي يحاكي طلب المشاركة والاستقبال، أما ظهور الخيار فعلياً في قائمة Android فيحتاج التحقق على هاتف مثبت.

استكشاف المشاركة: الإصدار 5.2.1 يحدّث manifest من الشبكة أولاً مع نسخة للعمل بدون إنترنت. «فحص التحديث» يتحقق من الإعداد ويطلب فحص Service Worker؛ لا يجبر تحديث WebAPK في Android. «تجربة مشاركة صورة» يفتح قائمة النظام بصورة تجريبية محلية. ظهور نافذة التطبيق أو حدث appinstalled لا يثبت تسجيل هدف المشاركة، ولهذا لا تعرض الواجهة تأكيداً بذلك.


## نسخة Android الأصلية 6.0.0

[تنزيل APK](https://dr-askar.github.io/waraqa/android/waraqa-android.apk). تتطلب Android 8 أو أحدث وAndroid System WebView محدثاً. أول فتح يحتاج الإنترنت لتحميل واجهة الموقع؛ يخزّن عامل الخدمة الواجهة للاستخدام المحلي لاحقاً. تحتاج نماذج OCR التنزيل عند أول استخدام لكل لغة.

نسخة Android تسجل ACTION_SEND وACTION_SEND_MULTIPLE للصور وPDF. الملفات المشتركة تُنسخ إلى مساحة التطبيق الخاصة، وتظهر شاشة اختيار مستند بعد فتح القفل إن كان مفعّلاً. لا يُحذف ملف المشاركة إلا بعد حفظ الصفحات؛ إيصالات الاستقبال تمنع التكرار إذا انقطع تأكيد الحذف. حد الدفعة 80 ملفاً أو 80MB، والملفات المعلقة تُحذف بعد ساعة. لا يرفع التطبيق الملفات إلى خادم.

تخزين Android منفصل عن Chrome. قبل الانتقال: الإعدادات ← تنزيل نسخة احتياطية داخل Chrome، ثم الإعدادات ← استعادة نسخة داخل تطبيق Android. التثبيت لا يحذف بيانات Chrome. تصدير الملفات يستخدم منتقي الحفظ أو قائمة المشاركة في Android؛ Drive متاح يدوياً عبر المشاركة إذا كان مثبتاً. المزامنة المباشرة الاختيارية ليست مجهّزة بتسجيل OAuth أصلي في هذه النسخة.

### البناء والفحص

يتطلب JDK 17 وGradle 8.10.2 وAndroid SDK 35:

```sh
gradle -p android assembleRelease assembleDebugAndroidTest lintRelease
gradle -p android connectedDebugAndroidTest
npm run test:android-bridge
```

حدد ANDROID_HOME أو android/local.properties. اختبارات الجهاز تفحص تسجيل المشاركة، استقبال صور متعددة وPDF عبر مزوّد ملفات خارجي، قراءة البايتات من الجسر، منع قراءة ملف غير مصرح به، استمرار الاستقبال بعد إعادة الفتح، والتصدير عبر المشاركة ومنتقي التخزين. GitHub Actions يشغّلها على محاكي Android 35 قبل نشر الموقع.

نسخة التنزيل موقّعة بمفتاح إصدار محفوظ خارج المستودع. يجب حفظ نسخة آمنة من المفتاح وكلمة مروره لإصدار تحديثات متوافقة؛ لا تضفهما إلى Git. قبل النشر استخدم zipalign ثم apksigner، وحدّث dist/android/SHA256SUMS. التوقيع وشهادة الإصدار العامة يمكن فحصهما بـ apksigner verify --verbose --print-certs. البناء الافتراضي ينتج APK غير موقّع؛ لا يعيد CI توقيع ملف التنزيل.

### Library and colored-paper refinement (2026-10-12)

Document and page action menus now use the browser top layer, with viewport-aware placement, keyboard navigation and an elevated-card fallback for older browsers. The library has larger touch targets, counted folder tabs, clearer previews and title-to-open navigation.

The scanner combines RGB-channel edges with grayscale candidates and RGB boundary evidence. A wider edge-refinement search distinguishes dark paper from its shadow. Browser regression fixtures cover white, off-white, pink, dark and similarly bright but differently colored paper/backgrounds, and reject a blank frame. Detection still needs a visible physical boundary; users can review and adjust the four corners before cropping.

### Progress visibility and rotated OCR (2026-10-12)

Busy processing now opens a modal dialog above the active camera or OCR dialog, with a determinate OCR progress bar and cancellable recognition. Escape and the existing native Back callback cancel recognition without discarding the underlying editor. Camera capture and other non-cancellable work keep their progress visible.

OCR compares all four quarter-turn orientations by default using the selected language model, confidence and word geometry. An explicit orientation can skip this comparison. Rotation happens only on a processing copy; original image blobs and original-image OCR word coordinates are retained. The automatic mode performs additional OCR passes, so it takes longer than a fixed orientation. The regression suite uses real Arabic/English OCR on each rotation, checks word coordinate transforms, and exercises top-layer progress and cancellation in the actual OCR and camera interfaces.

### Local automatic language selection and experimental handwriting (2026-10-12)

The OCR language selector offers automatic selection per page, including up to three languages. A local, checksum-pinned Tesseract OSD model examines the page and its horizontal/vertical halves, followed by OCR and local Franc language classification. Arabic/English candidates are retained for Latin-script pages to avoid missing Arabic minority text. Latin language detection uses substantial text; short, unclear or excessive mixtures are explicitly marked uncertain and can be overridden manually. The detected language set and warnings survive backups. Automatic selection adds processing time and model downloads; warmed models work offline. No document is sent to a recognition service.

Handwriting and mixed printed/handwritten modes are explicitly experimental. They force the best local model, try sparse-text and block layouts, and retain a visible limitation notice and editable results. This is a printed-text engine, **not** a dedicated handwriting recognizer. Cursive handwriting, especially connected Arabic, is not reliable. A real cursive English reference sample produced incomplete/incorrect text in local testing; do not interpret OCR confidence as an accuracy guarantee. See the fixture attribution in `checks/samples/NOTICE.md` and https://tesseract-ocr.github.io/tessdoc/FAQ.html#can-i-use-tesseract-for-handwriting-recognition.

### Responsive library and OCR review

Library and page views use lazy, memory-only 420px thumbnails; full-resolution originals remain unchanged. Selecting pages updates the existing cards without rebuilding their images. OCR runs as a persistent local queue while the library remains usable. Jobs checkpoint completed pages, support cancellation and retry, and resume when the app reopens. Browsers and Android may suspend a closed app: continuous OS background execution is not guaranteed. Camera, image editing and exports retain their existing foreground progress dialogs.

The OCR review shows the source image alongside text, links selected words to their bounding boxes, and highlights low-confidence words. Confidence is an engine estimate, not a measured accuracy guarantee. Manual edits suspend word linking; save corrections before closing. Recognition commits only if both source image and saved OCR still match the job snapshot, preserving concurrent changes. Job metadata follows local password encryption and password rotation. No external OCR service receives images.

Validation: `npm run test:phase-one` exercises thumbnails, non-blocking jobs, concurrent renaming, review links, saved corrections, stale-image protection, cancellation, restart checkpoints and encrypted metadata. The deterministic transport in that suite complements the separate real multilingual OCR suites.

### Capture review, organization and export improvements

- Imported photos receive a lightweight local assessment of resolution, lighting and detail. A page warning opens an image review with crop/enhance shortcuts; any page also has **Check image** in its tools menu. These are estimates, not a calibrated OCR or border-detection accuracy score. Low-light or blank references are covered by tests; photographs can still need manual review. Image edits clear the old assessment.
- Local search normalizes Arabic vowel marks, tatweel, alef variants, alef maqsura, Arabic/Persian digits and Latin accents. Matching saved OCR shows a snippet and opens the matching page’s text review. Search uses all query terms across document metadata and saved page text.
- Library selection supports moving documents to a folder, combining up to 80 pages for export, and moving to/from trash with a 15-second Undo. Each document update rereads its latest revision so concurrent text or name edits survive. Batch writes are individual document transactions, not an all-or-nothing operation for the whole batch. Permanent deletion remains separate.
- PDF presets offer balanced (2400px/.85 JPEG), sharing (1600px/.65) and archive (original resolution/.96), plus custom quality. Export downsampling preserves source images, original-ratio page geometry and source-coordinate searchable text. Source-image previews and source byte size are shown separately from the actual generated file size. Only preset, quality, size, orientation and searchable-text choices are remembered; passwords and watermark contents are never stored in those preferences.
- **Storage and backup** shows approximate image bytes, browser-reported site usage/quota, requests persistent storage, and links to backup/restore. Image byte totals may count identical blobs reconstructed separately after encryption; browser quota and usage include tools and other origin data. Preparing a backup is recorded separately from confirming its external save. Persistent storage cannot protect against explicitly clearing app/browser data.

These changes retain six interface languages, local encryption, native Android sharing and offline use. `npm run test:remaining-phases` checks Arabic/OCR search, concurrent-safe bulk moves, trash Undo, combined export, preferences, real PDF size reduction and text coordinates, review/storage interfaces and offline restart. No Google OAuth configuration, cloud OCR, cursive-handwriting model or book dewarping service is added by these phases.
