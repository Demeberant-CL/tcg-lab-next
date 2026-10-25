#!/usr/bin/env bash
# Empaqueta la web de TCG LAB como APK (debug) con Capacitor.
# Requisitos: Node 22+, JDK 21, Android SDK (ANDROID_HOME) y Python 3 con Pillow.
# Resultado: tcg-lab-debug.apk en la raíz del proyecto.
set -euo pipefail
cd "$(dirname "$0")/.."

APP_ID="${APP_ID:-com.tcglab.next}"
CAP_VERSION="${CAP_VERSION:-^7.0.0}"

: "${ANDROID_HOME:?Define ANDROID_HOME con la ruta del SDK de Android}"

npm ci
npm run build

# Capacitor solo se instala para empaquetar: no forma parte de las dependencias de la web.
npm install --no-save "@capacitor/core@$CAP_VERSION" "@capacitor/cli@$CAP_VERSION" "@capacitor/android@$CAP_VERSION"

cat > capacitor.config.json <<JSON
{
  "appId": "$APP_ID",
  "appName": "TCG LAB",
  "webDir": "dist",
  "backgroundColor": "#070B12",
  "android": { "allowMixedContent": false }
}
JSON

[ -d android ] || npx cap add android
python3 scripts/android_icons.py android
npx cap sync android

( cd android && ./gradlew --no-daemon assembleDebug )

cp android/app/build/outputs/apk/debug/app-debug.apk tcg-lab-debug.apk
echo "APK listo: $(pwd)/tcg-lab-debug.apk"
