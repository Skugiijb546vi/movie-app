# Build Sebar Tv APK

Hamu shtek 7azra. Tanha am hangawana bka:

## 1. Export bo GitHub
La Lovable-da ba `GitHub → Export to GitHub` project export ka, awjash `git clone` bka bo computer-akat.

## 2. Install krdn
```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
```

## 3. Android platform zyad ka
```bash
npx cap add android
npx cap sync android
```

## 4. La Android Studio bkarawa
```bash
npx cap open android
```

## 5. APK build ka
La Android Studio:
- **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- APK la `android/app/build/outputs/apk/debug/app-debug.apk` mane

## Notes
- `capacitor.config.ts` ba shewaz drust krawa ka rasterast site-a published-akat load kat, bo away hamu update-ek automatic bchete APK-akawa (be pewistiy rebuild).
- Agar denahawe app-ka offline kar kat, `server.url` la config-a la bar-a wa `npm run build` bka.
