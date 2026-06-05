#!/bin/bash
# CareerTrack 启动脚本
# 用法：bash start.sh [--version | tarball 路径]

set -e

# 显示版本
show_version() {
    if [ -f VERSION ]; then
        echo "CareerTrack v$(cat VERSION)"
    else
        echo "CareerTrack (unknown version)"
    fi
}

# 参数处理
case "${1}" in
    --version|-v)
        show_version
        exit 0
        ;;
esac

# 如果不在 deploy 目录，尝试解压或使用已有目录
if [ ! -f server.js ]; then
    TARBALL="${1:-$(ls deploy-v*.tar.gz 2>/dev/null | head -1)}"

    if [ -d deploy ]; then
        if [ -n "$TARBALL" ] && [ -f "$TARBALL" ]; then
            echo "⚠️  已存在 deploy 目录，自动删除并重新部署"
            rm -rf deploy
        else
            echo "ℹ️  使用已有 deploy 目录"
        fi
    fi

    if [ ! -d deploy ]; then
        if [ -z "$TARBALL" ] || [ ! -f "$TARBALL" ]; then
            echo "❌ 未找到压缩包"
            echo "用法：bash start.sh [deploy-v*.tar.gz]"
            exit 1
        fi
        echo "📦 解压 $TARBALL ..."
        tar -xzf "$TARBALL"
        rm -f "$TARBALL"
    fi

    cd deploy
fi

show_version

export DATABASE_URL="${DATABASE_URL:-postgres://careertrack:careertrack@localhost:5432/careertrack}"
export JWT_SECRET="${JWT_SECRET:-change-me-in-production}"
export PORT="${PORT:-3000}"
export HOSTNAME="0.0.0.0"

echo "🚀 启动中 (端口: $PORT)..."
node server.js
