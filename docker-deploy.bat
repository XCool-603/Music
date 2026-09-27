@echo off
chcp 65001 >nul
echo ==========================================
echo   MUSE.AUDIO Docker 一键部署与启动 (Windows)
echo ==========================================

docker compose up -d --build

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==========================================
    echo 🎉 部署成功！
    echo 浏览器访问: http://localhost:3001/music/
    echo 查看日志:   docker compose logs -f
    echo ==========================================
) else (
    echo.
    echo ❌ 启动失败，请检查 Docker Desktop 是否已启动。
)
pause
