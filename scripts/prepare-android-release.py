#!/usr/bin/env python3
"""Sign already-built APK/AAB copies without reading or printing password contents."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--keystore', required=True, type=Path)
p.add_argument('--password-file', required=True, type=Path)
p.add_argument('--alias', required=True)
p.add_argument('--output-dir', required=True, type=Path)
p.add_argument('--build-tools', default='35.0.0')
args = p.parse_args()
root = Path(__file__).resolve().parent.parent
java = Path(os.environ['JAVA_HOME']) / 'bin'
tools = Path(os.environ['ANDROID_HOME']) / 'build-tools' / args.build_tools
for file in [args.keystore, args.password_file]:
    if not file.is_file():
        p.error('Required signing file does not exist')
args.output_dir.mkdir(parents=True, exist_ok=True)
gradle = (root / 'android/app/build.gradle').read_text()
version = re.search(r"versionName '([^']+)'", gradle)[1]
code = int(re.search(r'versionCode (\d+)', gradle)[1])
target = re.search(r'targetSdk (\d+)', gradle)[1]
apk = args.output_dir / 'waraqa-android.apk'
aab = args.output_dir / f'waraqa-play-{version}.aab'
if apk.exists() or aab.exists():
    p.error('Use an empty output directory to avoid overwriting a previous release')
subprocess.run([str(tools / 'apksigner'), 'sign', '--ks', str(args.keystore.resolve()),
                '--ks-pass', 'file:' + str(args.password_file.resolve()),
                '--ks-key-alias', args.alias, '--out', str(apk),
                str(root / 'android/app/build/outputs/apk/release/app-release-unsigned.apk')], check=True)
cert = subprocess.check_output([str(tools / 'apksigner'), 'verify', '--print-certs', str(apk)], text=True)
digest = re.search(r'certificate SHA-256 digest: ([a-f0-9]+)', cert)[1]
expected = json.loads((root / 'dist/android/release.json').read_text())['certificateSha256']
if digest != expected:
    raise RuntimeError('Signing certificate differs from the existing official APK')
badging = subprocess.check_output([str(tools / 'aapt'), 'dump', 'badging', str(apk)], text=True)
for text in ["name='dev.waraqa.android'", f"versionCode='{code}'", f"versionName='{version}'", f"targetSdkVersion:'{target}'"]:
    if text not in badging:
        raise RuntimeError('APK metadata does not match the source configuration: ' + text)
subprocess.run([str(java / 'jarsigner'), '-keystore', str(args.keystore.resolve()),
                '-storepass:file', str(args.password_file.resolve()),
                '-signedjar', str(aab), '-digestalg', 'SHA-256',
                str(root / 'android/app/build/outputs/bundle/release/app-release.aab'), args.alias], check=True)
subprocess.run([str(java / 'jarsigner'), '-verify', str(aab)], check=True)
aab_cert = subprocess.check_output([str(java / 'keytool'), '-printcert', '-jarfile', str(aab)], text=True)
if digest.upper() != re.search(r'SHA256: ([A-F0-9:]+)', aab_cert)[1].replace(':', ''):
    raise RuntimeError('AAB certificate does not match the official APK')
with zipfile.ZipFile(aab) as z:
    if z.testzip() is not None or 'base/manifest/AndroidManifest.xml' not in z.namelist():
        raise RuntimeError('Invalid AAB archive')
records = {f.name: {'sha256': hashlib.sha256(f.read_bytes()).hexdigest(), 'size': f.stat().st_size}
           for f in [apk, aab]}
metadata = {'version': version, 'versionCode': code, 'package': 'dev.waraqa.android',
            'targetSdk': int(target), 'certificateSha256': digest, 'files': records}
(args.output_dir / 'release-preparation.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata, indent=2))
