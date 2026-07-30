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

if [ -z "${JWT_SECRET:-}" ]; then
    echo "❌ JWT_SECRET 未设置。请使用 openssl rand -base64 48 生成强随机密钥。"
    exit 1
fi

if [ "${#JWT_SECRET}" -lt 32 ] \
    || [ "$JWT_SECRET" = "change-me-in-production" ] \
    || [ "$JWT_SECRET" = "replace-with-at-least-32-random-characters" ]; then
    echo "❌ JWT_SECRET 必须至少 32 个字符，且不能使用示例默认值。"
    exit 1
fi

if [ -z "${TOTP_ENCRYPTION_KEY:-}" ]; then
    echo "❌ TOTP_ENCRYPTION_KEY 未设置。请另行生成并长期保存该密钥。"
    exit 1
fi

if [ "${#TOTP_ENCRYPTION_KEY}" -lt 32 ] \
    || [ "$TOTP_ENCRYPTION_KEY" = "careertrack-totp-encryption-key" ] \
    || [ "$TOTP_ENCRYPTION_KEY" = "replace-with-a-different-stable-random-key" ]; then
    echo "❌ TOTP_ENCRYPTION_KEY 必须至少 32 个字符，且不能使用示例默认值。"
    exit 1
fi

export PORT="${PORT:-3000}"
export HOSTNAME="0.0.0.0"

echo "🚀 启动中 (端口: $PORT)..."
node server.js
