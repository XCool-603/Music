#!/usr/bin/env bash
# ========================================================
# MUSE.AUDIO Docker 一键拉取更新与无缝重启脚本
# ========================================================
set -e

echo "=========================================="
echo "  🔄 MUSE.AUDIO 一键拉取更新与重新部署"
echo "=========================================="

COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ 错误: 未检测到 docker compose！"
    exit 1
fi

echo "📥 1. 正在拉取远程最新代码..."
if [ -d ".git" ]; then
    git fetch --all
    git reset --hard origin/main
else
    echo "⚠️ 当前目录非 git 仓库，跳过 git pull..."
fi

echo "🔨 2. 重新构建并平滑重启容器..."
$COMPOSE_CMD up -d --build

echo "🧹 3. 清理废弃的无用镜像以释放磁盘空间..."
docker image prune -f

echo ""
echo "=========================================="
echo "🎉 更新并重新部署成功！"
echo "=========================================="
$COMPOSE_CMD ps
echo "=========================================="
