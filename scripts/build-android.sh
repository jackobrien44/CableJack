#!/usr/bin/env bash
# Builds the Android TV app as a debug .apk for sideloading.
#
# The app is a thin WebView launcher that points to https://cablejack.tv — no
# UI build needed. Updates to the app are live as soon as you deploy; users
# never need to reinstall.
#
# Prerequisites:
#   - Java 17+ (JAVA_HOME set, or java on PATH)
#   - Android SDK (ANDROID_HOME or ANDROID_SDK_ROOT set)
#   - Gradle 8.7+ on PATH  OR  run `gradle wrapper` in android/ first
#     Install Gradle: https://gradle.org/install/
#
# Usage:
#   ./scripts/build-android.sh
#
# Output:
#   android/app/build/outputs/apk/debug/app-debug.apk  — ready to sideload

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$SCRIPT_DIR/../android"

if [ -z "${ANDROID_HOME:-}" ] && [ -z "${ANDROID_SDK_ROOT:-}" ]; then
    echo "ERROR: Set ANDROID_HOME or ANDROID_SDK_ROOT to your Android SDK path."
    exit 1
fi

cd "$ANDROID_DIR"

if [ -f "gradlew" ]; then
    GRADLE="./gradlew"
elif command -v gradle &>/dev/null; then
    GRADLE="gradle"
else
    echo "ERROR: No Gradle found. Either run 'gradle wrapper' in android/ or install Gradle 8.7+."
    echo "       https://gradle.org/install/"
    exit 1
fi

echo "==> Building debug APK..."
$GRADLE assembleDebug

APK=$(find app/build/outputs/apk/debug -name "*.apk" | head -1)

echo ""
echo "Package: $APK"
echo ""
echo "To install (developer mode + network debugging must be enabled on the TV):"
echo "  adb connect <TV_IP>"
echo "  adb install $APK"
echo ""
echo "To launch after installing:"
echo "  adb shell am start -n tv.cablejack.app/.MainActivity"
