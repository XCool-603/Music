@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Building MUSE.AUDIO Windows EXE (Tauri)
echo ============================================

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..

cd /d "%PROJECT_DIR%"

echo [1/3] Installing dependencies...
call npm ci 2>nul || call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)

echo [2/3] Building web assets...
call npm run build:frontend
if errorlevel 1 (
    echo ERROR: Vite build failed
    exit /b 1
)

echo [3/3] Building Windows package...
call npx tauri build
if errorlevel 1 (
    echo ERROR: Tauri build failed
    exit /b 1
)

echo.
echo ============================================
echo   BUILD SUCCESS
echo   Output: src-tauri\target\release\bundle\
echo ============================================

endlocal
