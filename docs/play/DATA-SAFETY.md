# Data safety review worksheet

Do not copy this as a final Console declaration. Google defines collection,
sharing, optional processing and service-provider exceptions; answer against the
actual released code, configured services and current policy.

| Data/flow | Actual behavior | Review before declaration |
| --- | --- | --- |
| Photos, PDFs, recognized text, signatures | Stored/processed locally in WebView IndexedDB; no OCR server | Local-only processing is distinct from collection off-device |
| Native share inbox | Files temporarily cached until import/cancel/expiry | Verify lock and expiry; no broad media/storage permission requested |
| Exports and manual backups | Passed to user-selected destination apps | User-initiated transfer; backups include originals and may be unencrypted |
| Optional direct Drive | Originals, edited images, metadata and OCR uploaded to user's appDataFolder | Apply Google's current collection/sharing definitions; optional, not app-lock encrypted |
| Google authorization | Google's identity script, OAuth access token in session memory | Disclose provider; owner setup/verification not completed |
| Optional local profile | User-entered data in local storage; encrypted with app lock | Not an app-owned server account; do not claim remote account deletion exists |
| Optional timestamp/location | Browser geolocation when user requests it; may appear in exported document | Confirm actual native WebView support and permission flow; not background tracking |
| Hosting/tool downloads | GitHub Pages/CDN sees normal request/network metadata | Do not claim no provider sees IP addresses; no added analytics/ad SDK |
| Experimental local AI | Model downloads from upstream public hosts; inference local | Audit current selected model/hosts; document text is not intentionally uploaded for inference |

Inspect the merged Android manifest: INTERNET, CAMERA and POST_NOTIFICATIONS.
Permission presence is not itself evidence of server collection. Native location
permission is not currently declared. External destination apps have their own
privacy terms. App data can be removed by clearing app storage/uninstalling; warn
users to back up first. App lock does not protect independently exported files.

Before launch: add legal responsible-party and support email, check network requests
on an actual device (including optional features), review all SDKs, and reconcile
the public privacy policy, store answers and code. No final Data safety submission
or content rating has been made.
