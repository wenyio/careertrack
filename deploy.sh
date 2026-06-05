#!/bin/bash
set -e

VERSION=$(node -e "console.log(require('./package.json').version)")
TARBALL="deploy-v${VERSION}.tar.gz"

echo "🔨 构建项目 (v${VERSION})..."
npm run build

echo "📦 打包部署文件..."
rm -rf deploy
mkdir -p deploy

# 只复制部署必需的文件，跳过 tmp/screenshots/test-results 等无关内容
cp .next/standalone/server.js deploy/
cp -r .next/standalone/.next deploy/
cp -r .next/standalone/node_modules deploy/ 2>/dev/null || true
cp -r .next/standalone/src deploy/ 2>/dev/null || true
cp -r .next/static deploy/.next/
cp -r public deploy/public 2>/dev/null || true
cp start.sh deploy/start.sh
echo "$VERSION" > deploy/VERSION

echo "🗜️ 压缩 → ${TARBALL}..."
tar -czf "$TARBALL" deploy
rm -rf deploy

echo "✅ 完成！v${VERSION} → ${TARBALL}"
