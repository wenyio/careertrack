# 更新日志

本文档记录 CareerTrack 的版本变更历史。

> 格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.0] - 2026-06-05

首个开源版本，整合此前所有功能迭代。

### 文档更新
- README.md — 补充 GitHub OAuth、游客模式、注册码系统等功能描述，更新环境变量说明
- API.md — 补充 GitHub OAuth、注册码、账户管理、管理员注册码管理等接口文档
- DATABASE.md — 新增 `user_oauth_accounts`、`registration_codes` 表，更新 `users` 表字段

### 新增
- **游客模式** — 本地离线创建和编辑简历，无需注册
- **GitHub OAuth 登录** — 支持 GitHub 账号注册与登录
- **注册码系统** — 邀请码注册，支持启用/禁用/删除
- **游客数据迁移** — 登录后可手动导入游客简历到账号
- **后台管理增强** — 用户 OAuth 绑定查看/解绑、注册码管理
- **数组模块字段隐藏** — 隐藏不删值，只影响预览/PDF/公开页
- **简历编辑页导入** — 数组模块支持从个人信息导入条目
- **简历临时预览链接** — 签名 token，24 小时有效
- **MCP 服务** — 通过 MCP 协议供 AI Agent 访问和编辑简历数据
- **Gravatar 头像** — 通过邮箱自动获取头像，内置证件照处理工具
- **4 套简历模板** — classic、minimal、modern、black-white
- **模板头像支持** — classic/minimal/black-white 支持头像显示及靠左开关
- **简历公开** — 生成公开链接，可作为个人主页访问，支持 SEO 优化
- **PDF 导出** — 浏览器原生打印方案
- **移动端响应式适配**
- **内嵌式后台管理** — 用户管理、简历管理、系统统计

### 变更
- 游客/正式简历路由统一，抽象共享组件
- 导航逻辑收敛与优化
- 编辑页提取 EditorContent 消除子组件重复
- 登录/注册页重构为统一认证中心
- 模板架构优化 — Slot-based Template Renderer
- 预览解析层重构，统一 ViewModel
- 服务层统一，消除 route 直接 SQL

### 修复
- crypto.randomUUID 在 HTTP 环境不可用，添加 fallback
- bind 模式 start 路由错误时重定向到设置页
- GitHub OAuth cookie secure 根据实际协议判断
- GitHub OAuth 回调使用 Host header 构建跳转 URL
- Descriptions 组件 span 响应式警告
- 公开简历页 SSR/客户端 hydration 不匹配
- 移动端简历预览闪烁问题

### 技术栈
- Next.js 16 (App Router) + React 19 + TypeScript 5
- Ant Design 6 + Tailwind CSS 4
- Zustand（客户端状态）+ TanStack Query（服务端状态）
- SQLite（默认）/ PostgreSQL 15（可选）
- JWT + TOTP 认证 + GitHub OAuth
- 浏览器原生打印（PDF 导出）
