#!/usr/bin/env bash
# ========================================================
# MUSE.AUDIO Docker 一键部署 / 更新脚本
# ========================================================
set -e

echo "=========================================="
echo "  MUSE.AUDIO Docker 一键部署与启动"
echo "=========================================="

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未检测到 Docker，请先安装 Docker！"
    echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | bash"
    exit 1
fi

# 检查 docker compose 命令
COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ 错误: 未检测到 docker compose 或 docker-compose 插件！"
    exit 1
fi

echo "📦 正在拉取/检查最新代码..."
if [ -d ".git" ]; then
    git pull origin main || echo "⚠️ git pull 失败或无更新，跳过直接构建..."
fi

echo "🚀 开始构建并启动容器..."
$COMPOSE_CMD up -d --build

echo ""
echo "=========================================="
echo "🎉 MUSE.AUDIO 部署成功！"
echo "=========================================="
echo "  本地访问地址: http://127.0.0.1:3001/music/"
echo "  API 接口地址: http://127.0.0.1:3001/api/music/banner"
echo "  容器状态查看: $COMPOSE_CMD ps"
echo "  查看实时日志: $COMPOSE_CMD logs -f"
echo "=========================================="
