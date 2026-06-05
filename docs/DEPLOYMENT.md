# 部署指南

本文档介绍如何部署 CareerTrack 应用。

CareerTrack 是 Next.js 全栈应用，前端和 API 部署在同一个进程中，无需单独部署后端服务。

## 部署方式

- [本地开发环境](#本地开发环境)
- [Docker 部署](#docker-部署)
- [生产环境手动部署](#生产环境手动部署)

---

## 本地开发环境

### 前置要求

- Node.js >= 18

### 步骤（SQLite 默认模式）

默认使用 SQLite，无需安装数据库，开箱即用：

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，设置 JWT_SECRET

# 启动开发服务器（首次启动自动创建 .careertrack/careertrack.db）
npm run dev
```

访问 http://localhost:3000

### 可选：使用 PostgreSQL

如需使用 PostgreSQL，设置环境变量：

```bash
# .env.local
STORAGE_DRIVER=postgres
DATABASE_URL=postgres://postgres:password@localhost:5432/careertrack
```

启动 PostgreSQL（可使用 Docker）：

```bash
docker run -d \
  --name careertrack-db \
  -e POSTGRES_DB=careertrack \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15-alpine
```

---

## Docker 部署

### 前置要求

- Docker >= 20.10

### 构建镜像

```bash
# 克隆项目
git clone https://github.com/wenyio/careertrack.git
cd careertrack

# 构建 Docker 镜像
docker build -t careertrack .
```

### 运行容器

```bash
# SQLite 模式（默认，零配置）
docker run -d \
  --name careertrack \
  -p 3000:3000 \
  -v careertrack-data:/app/.careertrack \
  -e JWT_SECRET=your-secret-key \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your-strong-password \
  careertrack

# PostgreSQL 模式
docker run -d \
  --name careertrack \
  -p 3000:3000 \
  -e JWT_SECRET=your-secret-key \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your-strong-password \
  -e STORAGE_DRIVER=postgres \
  -e DATABASE_URL=postgres://user:password@host:5432/careertrack \
  careertrack
```

访问 http://localhost:3000

### Dockerfile 说明

项目使用多阶段构建：

1. **构建阶段**（node:18-alpine）：安装依赖、编译 Next.js
2. **运行阶段**（node:18-alpine）：仅复制构建产物，以非 root 用户运行

最终镜像暴露端口 3000，启动命令为 `node server.js`（Next.js standalone 模式）。

---

## 生产环境手动部署

### 方式一：使用部署脚本

项目提供了 `deploy.sh` 脚本，自动完成构建和打包：

```bash
# 执行构建和打包
bash deploy.sh

# 产物为 deploy-v{VERSION}.tar.gz
# 传输到服务器后解压并启动
tar -xzf deploy-v0.10.3.tar.gz
cd deploy
bash start.sh
```

`start.sh` 会自动设置以下默认环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 监听端口 |
| `HOSTNAME` | `0.0.0.0` | 监听地址 |
| `JWT_SECRET` | `change-me-in-production` | **必须修改** |
| `DATABASE_URL` | `postgres://careertrack:careertrack@localhost:5432/careertrack` | PostgreSQL 连接串 |

### 方式二：手动构建

```bash
# 构建
npm run build

# 启动（Next.js standalone 模式）
node .next/standalone/server.js
```

需要确保以下目录/文件可用：
- `.next/static` — 静态资源
- `public` — 公共资源（字体、图片等）

---

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `JWT_SECRET` | ✅ | - | JWT 签名密钥，生产环境必须设置强随机值 |
| `ADMIN_USERNAME` | ❌ | - | 首次启动自动创建的管理员用户名 |
| `ADMIN_PASSWORD` | ❌ | - | 首次启动自动创建的管理员密码（≥6 位） |
| `STORAGE_DRIVER` | ❌ | 自动检测 | `sqlite` 或 `postgres` |
| `DATABASE_URL` | ❌* | - | PostgreSQL 连接串，`postgres` 模式必填 |
| `SQLITE_DB_PATH` | ❌ | `.careertrack/careertrack.db` | SQLite 数据库文件路径 |
| `NEXT_PUBLIC_SITE_URL` | ❌ | `http://localhost:3000` | 公开站点地址 |
| `PORT` | ❌ | `3000` | 监听端口 |
| `HOSTNAME` | ❌ | `0.0.0.0` | 监听地址 |

**存储驱动选择逻辑：**
- 设置 `STORAGE_DRIVER=postgres` → 使用 PostgreSQL
- 设置 `STORAGE_DRIVER=sqlite` → 使用 SQLite
- 未设置 `STORAGE_DRIVER`，有 `DATABASE_URL` → 使用 PostgreSQL（向后兼容）
- 未设置 `STORAGE_DRIVER`，无 `DATABASE_URL` → 使用 SQLite（默认）

---

## 管理员账号

首次启动时，如果数据库中没有管理员账号，系统会检查 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 环境变量，自动创建一个管理员。

```bash
# .env.local 示例
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
```

**行为说明：**
- 数据库中已有管理员 → 跳过，不做任何操作
- 无管理员 + 环境变量已设置 → 自动创建并输出日志
- 无管理员 + 未设置环境变量 → 输出警告，可通过管理面板手动操作数据库

创建成功后，管理员可登录后台管理注册码、用户等。环境变量可在创建后删除（不影响已有账号）。

### Docker 示例

```bash
docker run -d \
  --name careertrack \
  -p 3000:3000 \
  -v careertrack-data:/app/.careertrack \
  -e JWT_SECRET=your-secret-key \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your-strong-password \
  careertrack
```

---

## 安全配置

### 生成密钥

```bash
# 生成 JWT 密钥
openssl rand -base64 64
```

### 配置 HTTPS（Nginx 反向代理）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 配置防火墙

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 数据备份

### SQLite

```bash
# 备份
cp .careertrack/careertrack.db backup_$(date +%Y%m%d).db

# 或使用 SQLite 命令（在线安全备份）
sqlite3 .careertrack/careertrack.db ".backup backup_$(date +%Y%m%d).db"
```

### PostgreSQL

```bash
# 备份
pg_dump -U postgres careertrack > backup_$(date +%Y%m%d).sql

# 恢复
psql -U postgres careertrack < backup_20260603.sql
```

---

## 故障排除

### 应用启动失败

```bash
# 检查端口是否被占用
lsof -i :3000

# 检查环境变量
echo $JWT_SECRET
echo $DATABASE_URL
```

### 数据库连接失败（PostgreSQL）

```bash
# 测试连接
psql -U postgres -d careertrack -c "SELECT 1;"

# 检查 PostgreSQL 是否运行
pg_isready
```

### SQLite 数据库锁定

```bash
# 检查数据库文件权限
ls -la .careertrack/careertrack.db

# 检查是否有其他进程占用
fuser .careertrack/careertrack.db
```

---

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建
npm run build

# 重启服务
# 如果使用 start.sh，重新打包部署即可
bash deploy.sh
# 传输到服务器后重新解压启动
```

---

## 生产环境检查清单

- [ ] `JWT_SECRET` 已设置为强随机值
- [ ] `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 已配置（首次启动）
- [ ] `NEXT_PUBLIC_SITE_URL` 设置为实际域名
- [ ] 已配置 HTTPS
- [ ] 数据库备份策略已就位
- [ ] `NODE_ENV=production`（standalone 构建自动设置）
