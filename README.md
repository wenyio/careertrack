# 职迹 CareerTrack

> 记录职业成长轨迹，打造专属职业名片。

An Open-Source Career Portfolio & Resume Platform

## 📖 项目简介

职迹是一个开源的个人简历管理系统，帮助用户统一管理个人信息，快速创建和维护多份简历，并支持简历公开为个人主页。

## ✨ 核心功能

- **个人信息管理** - 统一维护教育经历、工作经历、项目经历等 10 个模块的基础信息
- **简历管理** - 创建、编辑、删除、复制简历，支持多份简历维护
- **模块化编辑** - 10 个简历模块，拖拽排序，自由组合配置
- **实时预览** - 编辑简历时实时查看效果，支持 4 套简历模板
- **PDF 导出** - 一键导出高质量 PDF 简历（浏览器原生打印方案）
- **简历公开** - 生成公开链接，可作为个人主页访问，支持 SEO 优化和分享预览图
- **安全认证** - 支持登录 + 可选 OTP 二次验证
- **MCP 服务** - 通过 MCP 协议供 AI Agent 访问和编辑简历数据
- **Gravatar 头像** - 通过邮箱自动获取头像，内置证件照处理工具
- **后台管理** - 用户管理、简历管理、系统统计

## 🛠️ 技术栈

- **框架**: Next.js 16 (App Router)
- **UI 组件库**: Ant Design 6
- **状态管理**: Zustand (客户端) + TanStack Query (服务端)
- **数据库**: SQLite (默认) / PostgreSQL 15 (可选)
- **认证**: JWT + TOTP (OTP)
- **语言**: TypeScript

## 📁 项目结构

```
CareerTrack/
├── src/
│   ├── app/
│   │   ├── api/                # API Routes (Next.js App Router)
│   │   │   ├── auth/           # 认证（登录/注册/OTP）
│   │   │   ├── profile/        # 个人信息
│   │   │   ├── resumes/        # 简历管理
│   │   │   ├── public/         # 公开简历
│   │   │   ├── mcp/            # MCP 服务端点
│   │   │   ├── mcp-keys/       # MCP Key 管理
│   │   │   └── admin/          # 后台管理
│   │   ├── auth/               # 登录/注册页面
│   │   ├── resumes/            # 简历页面
│   │   ├── admin/              # 后台管理页面
│   │   └── settings/           # 设置页面
│   ├── components/             # 可复用组件
│   │   └── resume/             # 简历相关组件（编辑器、预览、PDF 模板）
│   ├── config/                 # 模块配置
│   ├── hooks/                  # React Hooks
│   ├── lib/                    # 服务端工具库
│   │   ├── storage/            # 数据库存储层（SQLite/PostgreSQL）
│   │   ├── services/           # 业务服务层
│   │   ├── auth.ts             # 认证工具
│   │   └── api.ts              # API 工具
│   ├── services/               # 前端 API 调用
│   ├── stores/                 # Zustand 状态
│   ├── types/                  # TypeScript 类型
│   └── utils/                  # 工具函数
├── migrations/                 # PostgreSQL 迁移文件
├── docs/                       # 项目文档
├── deploy.sh                   # 部署打包脚本
├── start.sh                    # 启动脚本
└── Dockerfile                  # Docker 构建文件
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- PostgreSQL >= 15（可选，默认使用 SQLite，无需安装数据库）

### 本地开发

```bash
# 克隆项目
git clone https://github.com/wenyio/careertrack.git
cd careertrack

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，至少设置 JWT_SECRET

# 启动开发服务器（首次启动自动创建 SQLite 数据库）
npm run dev
```

访问 http://localhost:3000

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `JWT_SECRET` | ✅ | - | JWT 签名密钥 |
| `STORAGE_DRIVER` | ❌ | 自动检测 | `sqlite` 或 `postgres` |
| `DATABASE_URL` | ❌* | - | PostgreSQL 连接串，`postgres` 模式必填 |
| `SQLITE_DB_PATH` | ❌ | `.careertrack/careertrack.db` | SQLite 数据库文件路径 |
| `NEXT_PUBLIC_SITE_URL` | ❌ | `http://localhost:3000` | 公开站点地址 |

**存储驱动选择逻辑：**
- 设置 `STORAGE_DRIVER=postgres` → 使用 PostgreSQL
- 设置 `STORAGE_DRIVER=sqlite` → 使用 SQLite
- 未设置 `STORAGE_DRIVER`，有 `DATABASE_URL` → 使用 PostgreSQL（向后兼容）
- 未设置 `STORAGE_DRIVER`，无 `DATABASE_URL` → 使用 SQLite（默认）

### 部署

```bash
# 构建
npm run build

# 启动
npm start
```

## 📚 文档

- [API 接口文档](docs/API.md)
- [数据库设计文档](docs/DATABASE.md)
- [部署指南](docs/DEPLOYMENT.md)
- [MCP 服务文档](docs/MCP.md)
- [更新日志](docs/CHANGELOG.md)

## 📝 更新日志

当前版本：v1.0.0

详见 [更新日志](docs/CHANGELOG.md)。

## 📄 License

[GNU General Public License v3.0](LICENSE)
