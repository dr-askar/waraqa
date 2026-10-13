"""Check the published signed APK against release metadata and the native build version."""
import os, re, json, hashlib, subprocess
from pathlib import Path
root=Path(__file__).resolve().parent.parent
apk=root/'dist/android/waraqa-android.apk'
metadata=json.loads((apk.parent/'release.json').read_text())
config=(root/'android/app/build.gradle').read_text()
build_tools=Path(os.environ['ANDROID_HOME'])/'build-tools/35.0.0'
badging=subprocess.run([str(build_tools/'aapt'),'dump','badging',str(apk)],check=True,capture_output=True,text=True).stdout
version=re.search(r"versionName '([^']+)'",config).group(1)
code=int(re.search(r'versionCode (\d+)',config).group(1))
assert metadata['version']==version and metadata['versionCode']==code
assert f"versionCode='{code}' versionName='{version}'" in badging
assert f"name='{metadata['package']}'" in badging.splitlines()[0]
assert apk.stat().st_size==metadata['size']
assert hashlib.sha256(apk.read_bytes()).hexdigest()==metadata['sha256']
certs=subprocess.run([str(build_tools/'apksigner'),'verify','--print-certs',str(apk)],check=True,capture_output=True,text=True).stdout
assert 'certificate SHA-256 digest: '+metadata['certificateSha256'] in certs
assert metadata['certificateSha256']=='8f1b09425def86c8165e03b2e901d06d1cdb83d991e5985f64a945521e68e8b8'
assert 'android.permission.POST_NOTIFICATIONS' in badging
print(f'PASS: signed APK {version} ({code}), package, permissions, size, SHA-256 and original signing certificate')
