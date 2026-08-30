#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "============================================"
echo "  Building MUSE.AUDIO macOS DMG (Tauri)"
echo "============================================"

echo "[1/3] Installing dependencies..."
npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts

echo "[2/3] Building web assets..."
npm run build:frontend

echo "[3/3] Building macOS package..."
npx tauri build

echo ""
echo "============================================"
echo "  BUILD SUCCESS"
echo "  Output: src-tauri/target/release/bundle/"
echo "============================================"
