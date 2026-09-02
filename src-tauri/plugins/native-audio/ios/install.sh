#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Integrate the iOS native-audio plugin into a generated Tauri iOS Xcode project.
#
# Run this ON A MAC after `tauri ios init` has generated the Xcode project:
#
#   cd <repo>/src-tauri
#   tauri ios init
#   bash plugins/native-audio/ios/install.sh
#
# What it does:
#   1. Copies plugins/native-audio/ios/NativeAudioPlugin.swift into the
#      generated Xcode project's Plugins/ directory.
#   2. Registers the Swift file in the app target's Sources build phase using
#      the `xcodeproj` Ruby gem (preferred) or a fallback pbxproj edit.
#
# Prerequisite (preferred path): `gem install xcodeproj` (ships with CocoaPods).
# -----------------------------------------------------------------------------
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SWIFT_SRC="$PLUGIN_DIR/NativeAudioPlugin.swift"
GEN_DIR="$(pwd)/gen/apple"

[ ! -d "$GEN_DIR" ] && {
  echo "ERROR: '$GEN_DIR' not found. Run 'tauri ios init' first." >&2
  exit 1
}

# Locate the generated app source folder (holds <NAME>.xcodeproj and <NAME>/).
APP_ROOT="$(find "$GEN_DIR" -maxdepth 3 -name "*.xcodeproj" -type d | head -n1 | xargs dirname 2>/dev/null || true)"
[ -z "$APP_ROOT" ] && {
  echo "ERROR: no .xcodeproj under $GEN_DIR. Run 'tauri ios init' first (Xcode required)." >&2
  exit 1
}

APP_NAME="$(basename "$APP_ROOT")"
APP_SRC="$APP_ROOT/$APP_NAME"
PLUGINS_DIR="$APP_SRC/Plugins"
mkdir -p "$PLUGINS_DIR"
cp "$SWIFT_SRC" "$PLUGINS_DIR/NativeAudioPlugin.swift"
echo "Copied -> $PLUGINS_DIR/NativeAudioPlugin.swift"

PBXPROJ="$APP_ROOT/$APP_NAME.xcodeproj/project.pbxproj"

add_with_ruby() {
  command -v ruby >/dev/null 2>&1 || return 1
  ruby -e '
    require "xcodeproj"
    proj_path = ARGV[0]; swift_path = ARGV[1]
    proj = Xcodeproj::Project.open(proj_path)
    target = proj.targets.find { |t| t.name == ARGV[2] } || proj.targets.first
    group = proj.main_group.find_subpath("Plugins", true)
    if group.files.none? { |f| f.path == swift_path }
      path = group.new_file(swift_path)
      target.source_build_phase.add_file_reference(path)
      proj.save
      puts "Registered with xcodeproj."
    else
      puts "Already registered."
    end
  ' "$APP_ROOT/$APP_NAME.xcodeproj" "Plugins/NativeAudioPlugin.swift" "$APP_NAME" 2>/dev/null
}

if grep -q "NativeAudioPlugin.swift" "$PBXPROJ"; then
  echo "NativeAudioPlugin.swift already wired in $PBXPROJ — skipping."
elif add_with_ruby; then
  :
else
  echo "WARNING: xcodeproj gem not available; falling back to scripted pbxproj edit."
  FILE_ID="$(printf '%s' NativeAudioPlugin.swift | md5 | head -c 24 | tr 'a-f' 'A-F')"
  BUILD_ID="$(printf '%s' NativeAudioPlugin | md5 | head -c 24 | tr 'a-f' 'A-F')"
  SOURCES_PHASE="$(grep -oE '([0-9A-F]{24}) /\* Sources \*/' "$PBXPROJ" | awk '{print $1}' | head -n1)"
  if [ -n "$SOURCES_PHASE" ]; then
    sed -i.bak "s|/\* End PBXBuildFile section \*/|$BUILD_ID /* NativeAudioPlugin.swift in Sources */ = {isa = PBXBuildFile; fileRef = $FILE_ID /* NativeAudioPlugin.swift */; };\n\t\t/* End PBXBuildFile section */|" "$PBXPROJ"
    sed -i.bak "s|/\* End PBXFileReference section \*/|$FILE_ID /* NativeAudioPlugin.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = NativeAudioPlugin.swift; path = Plugins/NativeAudioPlugin.swift; sourceTree = \"<group>\"; };\n\t\t/* End PBXFileReference section */|" "$PBXPROJ"
    sed -i.bak "s|($SOURCES_PHASE /\* Sources \*/ \\) = {|\\1(\n\t\t\t\t$BUILD_ID /* NativeAudioPlugin.swift in Sources */,|" "$PBXPROJ"
    rm -f "$PBXPROJ.bak"
    echo "Wired into $PBXPROJ via fallback."
  else
    echo "ERROR: could not locate Sources phase. Add NativeAudioPlugin.swift manually in Xcode." >&2
    exit 1
  fi
fi

echo ""
echo "Done. Next: tauri ios build (with an Apple Developer signing team)."