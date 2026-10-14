# Google Play release preparation — 14 October 2026

هذه حزمة تجهيز وليست تأكيد قبول أو نشر في Google Play. الموقع/PWA يبقى على رابطه
الحالي. التطبيق مجاني للمستخدم، لكن حساب المطور يحتاج رسوم Google والتحقق.

## Owner actions still required

- Create/verify a Play Console account in your own legal identity. Official signup
  currently lists a **US$25 one-time fee**, subject to payment availability.
- Supply a public support email, legal developer identity and required contact details.
  `dr-askar` is a GitHub attribution, not a verified legal identity.
- Configure a private security contact; do not use public Issues for personal documents.
- Choose the signing setup **before the first Play release**. To preserve upgrades
  from the existing APK, use the existing app signing identity with Play App Signing
  through Google's supported existing-key/PEPK flow. Do not simply let Google choose
  a different app signing key. Keep upload/app keys private and backed up.
- For new personal accounts subject to the rule, conduct a closed test with at least
  **12 opted-in testers for 14 continuous days**, then apply for production access.
- Complete Data safety, content rating, target audience, app access, ads declaration
  and countries/pricing. Current app has no ads; do not invent a rating or age category.
- Review store screenshots on actual phones; do not use third-party app screenshots.
- Direct Drive OAuth remains optional and needs a separate owner Cloud setup. Validate
  its real Android authorization flow before promising it in the store listing.

## Technical baseline

New apps/updates currently require Android 16 **target API 36** from 31 August 2026.
The previous 6.1.1 APK targeted API 35; it is not the store submission baseline.
Preparation updates compile/target to 36, preserving minimum API 26 and package
`dev.waraqa.android`. Native wrapper stays lightweight; web assets still update
from the official site. Review API 36 compatibility on actual devices, including
back navigation, insets, sharing, notifications and local storage after upgrades.

Build with JDK 17, Gradle 8.11.1 and Android SDK 36:

```sh
gradle -p android bundleRelease assembleRelease assembleDebugAndroidTest lintRelease
```

The prepared release is 6.1.2 (versionCode 60102), target API 36.

The Gradle release AAB is unsigned by default. Sign a copy with `jarsigner` using
the owner-controlled upload/app key selected for Play. Never put passwords on the
command line or in Git; use the documented `-storepass:file` mechanism. The repository provides `scripts/prepare-android-release.py` to sign copies of
both outputs with `--keystore`, `--password-file`, `--alias` and `--output-dir`,
then check the existing official certificate and APK metadata. It never prints
password contents. AAB files
cannot be installed directly on a phone; use Play internal testing or bundletool.
Debug/test builds use a debug identity and cannot replace the official installation.

Current official app certificate SHA-256:
`8f1b09425def86c8165e03b2e901d06d1cdb83d991e5985f64a945521e68e8b8`.
Before upload compare package, versionCode, certificate, permissions and target API.
Keep the versionCode above every previously uploaded version. No Play upload has
been made or verified by this preparation.

## Store assets

- [Arabic and English listing drafts](STORE-LISTING.md).
- [Data safety review worksheet](DATA-SAFETY.md), not a prefilled declaration.
- Existing policy: https://dr-askar.github.io/waraqa/privacy.html . Set the final
  responsible-party/support contact before store submission.
- Generate reviewable artwork and synthetic-data PWA screenshots with
  `node scripts/play-assets.mjs /absolute/output/directory` after `npm run build`
  and Playwright Chromium installation. Four phone images are 1080×1920; the
  feature graphic is 1024×500. Confirm rendering in the native app on real phones
  before using the captures as store screenshots.
- Icon: export the project's own square icon to a 512×512 PNG without third-party
  branding. Feature graphic requires 1024×500 artwork; phone screenshots should show
  real app screens with synthetic documents. Do not add unsupported marketing claims.

## Official references checked on 14 October 2026

- [Account and fee](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [Personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [App signing and existing keys](https://developer.android.com/studio/publish/app-signing)
- [Android 16 behavior changes](https://developer.android.com/about/versions/16/behavior-changes-16)
- [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)

Recheck the live Console immediately before submission; policies and account
requirements can change. This checklist does not grant access to the owner's account.
