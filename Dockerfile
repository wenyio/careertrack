# CareerTrack 前端 Dockerfile
#
# 多阶段构建：
# 1. 构建阶段：编译 Next.js 项目
# 2. 运行阶段：运行编译后的应用

# ============================================
# 构建阶段
# ============================================
FROM node:20-alpine AS builder

# 安装原生模块编译依赖（better-sqlite3 等）
RUN apk add --no-cache python3 make g++

# 创建项目目录
WORKDIR /app

# 复制依赖文件（利用 Docker 缓存）
COPY package.json package-lock.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# ============================================
# 运行阶段
# ============================================
FROM node:20-alpine AS runner

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 创建项目目录
WORKDIR /app

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 设置权限
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 启动命令
CMD ["node", "server.js"]
