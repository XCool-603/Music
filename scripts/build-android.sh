#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "============================================"
echo "  Building MUSE.AUDIO Android APK (Capacitor)"
echo "============================================"

echo "[1/4] Installing dependencies..."
npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts

echo "[2/4] Building web assets..."
BUILD_TARGET=capacitor npm run build:frontend

echo "[3/4] Syncing Capacitor Android project..."
npx cap sync android

echo "[4/4] Building Android APK..."
cd android
./gradlew assembleDebug
cd ..

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
  echo ""
  echo "============================================"
  echo "  BUILD SUCCESS"
  echo "  APK: $PROJECT_DIR/$APK_PATH"
  echo "============================================"
else
  echo "ERROR: APK not found at $APK_PATH" >&2
  exit 1
fi
