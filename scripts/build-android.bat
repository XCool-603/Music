@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Building MUSE.AUDIO Android APK (Capacitor)
echo ============================================

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..

cd /d "%PROJECT_DIR%"

echo [1/4] Installing dependencies...
call npm ci --ignore-scripts 2>nul || call npm install --ignore-scripts
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)

echo [2/4] Building web assets...
set BUILD_TARGET=capacitor
call npm run build:frontend
if errorlevel 1 (
    echo ERROR: Vite build failed
    exit /b 1
)

echo [3/4] Syncing Capacitor Android project...
call npx cap sync android
if errorlevel 1 (
    echo ERROR: Capacitor sync failed
    exit /b 1
)

echo [4/4] Building Android APK...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 (
    echo ERROR: Gradle build failed
    exit /b 1
)
cd ..

set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
if exist "%APK_PATH%" (
    echo.
    echo ============================================
    echo   BUILD SUCCESS
    echo   APK: %PROJECT_DIR%\%APK_PATH%
    echo ============================================
) else (
    echo ERROR: APK not found at %APK_PATH%
    exit /b 1
)

endlocal
