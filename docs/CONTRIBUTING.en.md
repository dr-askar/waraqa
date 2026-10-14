# Contributing to Waraqa

Waraqa was initiated by [Mohammad Askar (dr-askar)](https://github.com/dr-askar) in 2026. Code,
translations, accessibility reviews, device testing and documentation are welcome.
See [architecture](ARCHITECTURE.md), [project rules](../AGENTS.md) and
[editing/recovery requirements](EDITING-AND-RECOVERY.md).

Search existing issues, discuss large changes first, fork the repository and create
a focused branch. Submit a PR to `main` with the problem, resulting behavior,
relevant validation and any recovery limitations. Use synthetic documents in
screenshots. Maintainers can label approachable issues `good first issue`.

## Run locally

Use Node.js 22, npm and Python 3. Native builds use JDK 17, Gradle 8.11.1 and Android
SDK 36. These are pinned build requirements, not a claim of current Play policy compliance.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173`. The first build downloads pinned processing engines,
fonts and OCR models. A phone needs HTTPS rather than an HTTP LAN address.

```sh
npm run check
npm test
npx playwright install --with-deps chromium
npm run test:workspace
```

Run the feature-specific scripts listed in `package.json`; CI runs the full suite.
Android: `gradle -p android assembleRelease assembleDebugAndroidTest lintRelease`;
instrumentation: `gradle -p android connectedDebugAndroidTest` on an API 35 emulator.
Debug builds do not require the official signing key. Never commit keys, passwords,
OAuth secrets or `android/local.properties`.

Preserve originals, encryption, prior storage formats, local processing, RTL and
offline use. Preview/cancel must not silently save changes. Update the PWA cache
version when published assets change. Do not add cloud processing or analytics
without an explicit product decision and privacy review. Document actual capability
limits, especially handwriting, OCR and experimental AI.

Translations live in `dist/languages.js`, `dist/locales.js`, `dist/i18n.js`, and native
Android `values*/strings.xml`. Test language switching, long labels and RTL/LTR.

## Licensing and recognition

Intentional submissions for inclusion use Apache 2.0 section 5 unless explicitly
stated otherwise and accepted by maintainers under compatible terms. Contributors
retain copyright; no copyright assignment or CLA is currently required. Preserve
third-party notices and document new dependency/asset licenses. Review AI-assisted
changes and disclose assistance where useful to explain provenance or validation.
Accepted contributors may add their preferred name to [AUTHORS.md](../AUTHORS.md).
Follow the [code of conduct](../CODE_OF_CONDUCT.md).
