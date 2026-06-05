# 数据库设计文档

## 存储驱动

CareerTrack 支持两种数据库后端，默认使用 SQLite（零配置），可选 PostgreSQL。

| 驱动 | 环境变量 | 说明 |
|------|---------|------|
| SQLite | `STORAGE_DRIVER=sqlite`（默认） | 零配置本地存储，数据库文件 `.careertrack/careertrack.db` |
| PostgreSQL | `STORAGE_DRIVER=postgres` | 需要 `DATABASE_URL` 环境变量 |

### 驱动选择逻辑

1. 设置 `STORAGE_DRIVER=sqlite` → SQLite（显式）
2. 设置 `STORAGE_DRIVER=postgres` → PostgreSQL（显式）
3. 未设置 `STORAGE_DRIVER`，有 `DATABASE_URL` → PostgreSQL（向后兼容）
4. 未设置 `STORAGE_DRIVER`，无 `DATABASE_URL` → SQLite（默认）

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `STORAGE_DRIVER` | 否 | 自动检测 | `sqlite` 或 `postgres` |
| `DATABASE_URL` | postgres 模式必填 | - | PostgreSQL 连接串 |
| `SQLITE_DB_PATH` | 否 | `.careertrack/careertrack.db` | SQLite 数据库文件路径 |

## 表结构设计（SQLite）

SQLite 使用以下类型映射：`UUID → TEXT`，`JSONB → TEXT`，`BOOLEAN → INTEGER`，`TIMESTAMP → TEXT`。

首次启动时自动建表，无需手动执行迁移。

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || ...),  -- UUID v4
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    otp_secret VARCHAR(100),
    otp_enabled INTEGER DEFAULT 0,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 个人信息表
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY DEFAULT ...,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    basic_info TEXT DEFAULT '{}',      -- JSON 对象
    education TEXT DEFAULT '[]',       -- JSON 数组
    skills TEXT DEFAULT '[]',
    work_experience TEXT DEFAULT '[]',
    projects TEXT DEFAULT '[]',
    portfolio TEXT DEFAULT '[]',
    awards TEXT DEFAULT '[]',
    other_experience TEXT DEFAULT '[]',
    research TEXT DEFAULT '[]',
    summary TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 简历表
CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY DEFAULT ...,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT '未命名简历',
    modules_config TEXT DEFAULT '{...}',   -- JSON 对象
    content TEXT DEFAULT '{}',             -- JSON 对象
    is_public INTEGER DEFAULT 0,
    public_slug VARCHAR(50) UNIQUE,
    modules_order TEXT DEFAULT '[...]',    -- JSON 数组
    template VARCHAR(20) DEFAULT 'classic',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- MCP Key 表
CREATE TABLE IF NOT EXISTS mcp_keys (
    id TEXT PRIMARY KEY DEFAULT ...,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prefix VARCHAR(20) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'read_write',
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT,
    revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_mcp_keys_user_id ON mcp_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_keys_hash ON mcp_keys(hash);
```

> 完整的建表 SQL 见 `src/lib/storage/schema.ts`。

## 表结构设计（PostgreSQL）

### users 用户表

存储用户账号信息和认证数据。

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    otp_secret VARCHAR(100),           -- TOTP 密钥，NULL 表示未启用 OTP
    otp_enabled BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) NOT NULL DEFAULT 'user',  -- 用户角色：user / admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_users_username ON users(username);
```

**字段说明:**
- `id`: 用户唯一标识，使用 UUID 避免 ID 猜测
- `username`: 登录用户名，唯一
- `password_hash`: bcrypt 加密后的密码
- `otp_secret`: TOTP 密钥，启用 OTP 时生成
- `otp_enabled`: 是否启用 OTP 二次验证
- `role`: 用户角色，`user`（普通用户）或 `admin`（管理员），新注册默认 `user`

### profiles 个人信息表

存储用户的个人信息，每种经历类型使用 JSONB 数组存储。

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 基本信息
    basic_info JSONB DEFAULT '{}',

    -- 各类经历（数组形式）
    education JSONB DEFAULT '[]',          -- 教育经历
    skills JSONB DEFAULT '[]',             -- 专业技能
    work_experience JSONB DEFAULT '[]',    -- 工作经历
    projects JSONB DEFAULT '[]',           -- 项目经历
    portfolio JSONB DEFAULT '[]',          -- 个人作品
    awards JSONB DEFAULT '[]',             -- 荣誉奖项
    other_experience JSONB DEFAULT '[]',   -- 其他经历
    research JSONB DEFAULT '[]',           -- 研究经历

    -- 个人简介
    summary TEXT DEFAULT '',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

**JSONB 字段结构:**

```json
// basic_info
{
  "name": "张三",
  "phone": "13800138000",
  "email": "zhangsan@example.com",
  "avatar": "/uploads/avatar.jpg",
  "job_intention": {
    "current_status": "在职",
    "position": "前端工程师",
    "expected_city": "北京",
    "expected_salary": "20-30K"
  },
  "other": {
    "education_level": "本科",
    "website": "https://example.com",
    "wechat": "zhangsan",
    "city": "北京",
    "github": "https://github.com/zhangsan",
    "age": 28,
    "work_years": 5,
    "gender": "男"
  }
}

// education 数组中的单个对象
{
  "id": "uuid",
  "school": "北京大学",
  "major": "计算机科学",
  "degree": "本科",
  "start_date": "2016-09",
  "end_date": "2020-06",
  "degree_type": "全日制",
  "college": "计算机学院",
  "city": "北京",
  "description": "在校经历描述"
}

// skills 数组中的单个对象
{
  "id": "uuid",
  "name": "JavaScript",
  "description": "熟练掌握 ES6+，有丰富的 React 开发经验"
}

// work_experience 数组中的单个对象
{
  "id": "uuid",
  "company": "字节跳动",
  "start_date": "2020-07",
  "end_date": null,  // null 表示"至今"
  "department": "前端团队",
  "position": "高级前端工程师",
  "city": "北京",
  "description": "工作内容描述"
}

// projects 数组中的单个对象
{
  "id": "uuid",
  "name": "电商平台重构",
  "start_date": "2021-01",
  "end_date": "2021-06",
  "role": "前端负责人",
  "city": "北京",
  "link": "https://project-url.com",
  "description": "项目描述"
}

// portfolio 数组中的单个对象
{
  "id": "uuid",
  "name": "开源项目",
  "link": "https://github.com/...",
  "image": "/uploads/portfolio.jpg",
  "description": "项目描述"
}

// awards 数组中的单个对象
{
  "id": "uuid",
  "name": "最佳员工",
  "date": "2023-12",
  "description": "获奖描述"
}

// other_experience 和 research 结构类似
{
  "id": "uuid",
  "name": "经历名称",
  "start_date": "2020-01",
  "end_date": "2020-06",
  "role": "角色",
  "department": "部门",
  "city": "城市",
  "description": "详细描述"
}
```

### resumes 简历表

存储简历配置和内容。

```sql
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT '未命名简历',

    -- 模块开关配置
    modules_config JSONB DEFAULT '{
        "basic_info": true,
        "education": true,
        "skills": true,
        "work_experience": true,
        "projects": true,
        "portfolio": false,
        "awards": false,
        "other_experience": false,
        "research": false,
        "summary": false
    }',

    -- 简历内容（可以覆盖个人信息）
    content JSONB DEFAULT '{}',

    -- 公开相关
    is_public BOOLEAN DEFAULT FALSE,
    public_slug VARCHAR(50) UNIQUE,

    -- 模块排序
    modules_order JSONB DEFAULT '["basic_info", "education", "skills", "work_experience", "projects", "portfolio", "awards", "other_experience", "research", "summary"]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_public_slug ON resumes(public_slug) WHERE public_slug IS NOT NULL;
```

### mcp_keys MCP Key 表

存储 MCP 服务的 API Key，用于 AI Agent 访问。

```sql
CREATE TABLE mcp_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prefix VARCHAR(20) NOT NULL,        -- Key 前缀，用于列表展示
    hash VARCHAR(64) NOT NULL,           -- Key 的 SHA-256 哈希
    scope VARCHAR(20) NOT NULL DEFAULT 'read_write',  -- 权限范围：read_write / read_only
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,  -- 最后使用时间
    revoked_at TIMESTAMP WITH TIME ZONE     -- 撤销时间，NULL 表示有效
);

-- 索引
CREATE INDEX idx_mcp_keys_user_id ON mcp_keys(user_id);
CREATE INDEX idx_mcp_keys_hash ON mcp_keys(hash);
```

**字段说明:**
- `id`: Key 唯一标识
- `user_id`: 关联用户，级联删除
- `prefix`: Key 前缀（12 字符），用于在列表中展示，不足以还原完整 Key
- `hash`: Key 明文的 SHA-256 哈希，用于鉴权验证
- `scope`: 权限范围，`read_write`（读写）或 `read_only`（只读）
- `last_used_at`: 每次鉴权成功时更新
- `revoked_at`: 撤销时写入时间戳，撤销后 Key 立即失效

**content 字段说明:**

`content` 字段用于存储简历的自定义内容。结构与 `profiles` 类似，但每个字段都是可选的：
- 如果某个字段存在，使用 content 中的值
- 如果某个字段不存在或为 null，自动使用 profile 中的值

```json
{
  "basic_info": { ... },     // 可选，覆盖个人信息
  "education": [ ... ],      // 可选，覆盖个人信息
  "skills": [ ... ],         // 可选，覆盖个人信息
  // ... 其他字段同理
}
```

## 数据关系

```
users (1) ──── (1) profiles
  │
  │
  ├──── (N) resumes
  │
  │
  └──── (N) mcp_keys
```

- 一个用户对应一份个人信息（1:1）
- 一个用户可以有多份简历（1:N）
- 一个用户可以有多个 MCP Key（1:N）
- 简历内容可以引用或覆盖个人信息

## 扩展性设计

### 1. 模块扩展

`modules_config` 使用 JSONB，可以轻松添加新模块：
```json
{
  "custom_module": true,
  "certificates": true
}
```

### 2. AI 功能扩展

未来可在 `content` 中添加 AI 生成的内容标记：
```json
{
  "skills": [
    {
      "id": "uuid",
      "name": "JavaScript",
      "description": "AI 优化后的描述",
      "ai_optimized": true
    }
  ]
}
```

### 3. 多用户扩展

当前设计已支持多用户，只需：
- 添加用户注册接口
- 修改前端为多用户流程

### 4. 模版系统扩展

未来可添加 `templates` 表：
```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    content JSONB,
    -- ...
);
```

## 迁移管理

### SQLite

SQLite 使用自动建表策略。首次启动时，`src/lib/storage/schema.ts` 中的 `initSchema()` 函数会自动执行 `CREATE TABLE IF NOT EXISTS` 创建所有表。

无需手动执行迁移。

### PostgreSQL

PostgreSQL 的迁移通过 SQL 文件手动执行。迁移文件位于 `migrations/` 目录。

```bash
# 使用 psql 执行迁移
psql -U postgres -d careertrack -f migrations/add_user_role.sql
psql -U postgres -d careertrack -f migrations/add_modules_order_and_template.sql
```
