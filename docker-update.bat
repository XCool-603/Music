@echo off
chcp 65001 >nul
echo ==========================================
echo   🔄 MUSE.AUDIO 一键拉取更新与重新部署 (Windows)
echo ==========================================

git fetch --all
git reset --hard origin/main
docker compose up -d --build
docker image prune -f

echo.
echo ==========================================
echo 🎉 更新完成！
echo ==========================================
docker compose ps
pause
