@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x86_64
if errorlevel 1 (
    echo vcvarsall failed
    exit /b 1
)
echo Environment set up, starting cargo build...
cd /d "%~dp0"
cargo build --release --target x86_64-pc-windows-msvc
