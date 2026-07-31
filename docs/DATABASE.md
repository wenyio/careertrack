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

首次访问数据库时先创建基础表，再按 `schema_migrations` 顺序执行未应用的迁移。升级生产环境前仍应先备份数据库。

```sql
-- 迁移版本表
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || ...),  -- UUID v4
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),            -- GitHub-only 用户可为 NULL
    otp_secret VARCHAR(512),                -- AES-256-GCM 密文，绑定用户 ID
    otp_recovery_codes TEXT NOT NULL DEFAULT '[]', -- 恢复码 HMAC 摘要数组
    otp_enabled INTEGER DEFAULT 0,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    auth_provider INTEGER NOT NULL DEFAULT 1,  -- 登录方式位掩码：PASSWORD=1, GITHUB=2
    disabled_at TEXT,                      -- 禁用时间，NULL 表示正常
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC, id DESC);

-- 可撤销登录会话表
CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,                       -- 同 JWT jti
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,    -- JWT SHA-256 摘要，不保存明文
    expires_at TEXT NOT NULL,
    revoked_at TEXT,                          -- 非 NULL 表示已撤销
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

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
    -- module_titles、basic_info_display、preview_config 统一存放在 content 中
    template VARCHAR(20) DEFAULT 'classic',
    revision INTEGER NOT NULL DEFAULT 1,   -- 乐观并发版本，每次写入递增
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user_updated ON resumes(user_id, updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_resumes_updated_at ON resumes(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_resumes_public_updated ON resumes(is_public, updated_at DESC, id DESC);

-- 简历历史快照：删除简历时级联清理，不能替代 resumes.revision 并发令牌
CREATE TABLE IF NOT EXISTS resume_versions (
    id TEXT PRIMARY KEY DEFAULT ...,
    resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('auto', 'manual', 'restore', 'application')),
    label VARCHAR(100),
    snapshot TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (resume_id, revision, source)
);
CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_created ON resume_versions(resume_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_resume_versions_auto_created ON resume_versions(resume_id, source, created_at DESC, id DESC);

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

-- OAuth 账号绑定表
CREATE TABLE IF NOT EXISTS user_oauth_accounts (
    id TEXT PRIMARY KEY DEFAULT ...,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,         -- 提供商：github
    provider_account_id VARCHAR(255) NOT NULL,  -- 第三方平台用户 ID
    provider_username VARCHAR(255),        -- 第三方平台用户名
    email VARCHAR(255),                    -- 第三方平台邮箱
    avatar_url TEXT,                       -- 第三方平台头像
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(provider, provider_account_id)
);
CREATE INDEX IF NOT EXISTS idx_user_oauth_user_id ON user_oauth_accounts(user_id);

-- 注册码表
CREATE TABLE IF NOT EXISTS registration_codes (
    id TEXT PRIMARY KEY DEFAULT ...,
    code_hash VARCHAR(64) NOT NULL,        -- 注册码 SHA-256 哈希
    label VARCHAR(100),                    -- 备注标签
    created_by TEXT REFERENCES users(id),  -- 创建者
    used_by_user_id TEXT REFERENCES users(id),  -- 使用者
    expires_at TEXT,                       -- 过期时间，NULL 表示永不过期
    disabled_at TEXT,                      -- 禁用时间，NULL 表示可用
    used_at TEXT,                          -- 使用时间
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_registration_codes_hash ON registration_codes(code_hash);
CREATE INDEX idx_registration_codes_created_at ON registration_codes(created_at DESC, id DESC);
CREATE INDEX idx_registration_codes_status ON registration_codes(used_at, disabled_at, expires_at, created_at DESC);
```

> 完整的建表 SQL 见 `src/lib/storage/schema.ts`。

## 版本化迁移

- 迁移定义位于 `src/lib/storage/migrations.ts`
- 每个版本在事务中执行，成功后才写入 `schema_migrations`
- `001_resume_revision_and_unique_codes` 为旧安装补充 `resumes.revision`，检查重复注册码哈希后建立唯一索引
- `002_revocable_auth_sessions` 创建服务端登录会话表及用户、过期时间索引；升级前签发且没有会话记录的 JWT 将失效
- `003_encrypt_totp_and_recovery_codes` 增加恢复码摘要列、扩展 PostgreSQL
  `otp_secret` 容量，并使用 AES-256-GCM 将历史明文 TOTP 密钥原位迁移为绑定
  用户 ID 的 `v1` 密文
- `004_consolidate_postgres_resume_config` 将旧 PostgreSQL 独立列
  `module_titles`、`basic_info_display`、`preview_config` 的非空数据合并到
  `content`；已有 `content` 键优先，完成后删除旧列，使双驱动恢复同一存储模型
- `005_resume_versions` 创建 `resume_versions`；SQLite 使用 JSON 文本、PostgreSQL
  使用 JSONB，来源约束、唯一键和列表索引保持相同语义
- `006_job_applications` 创建求职申请表及用户/状态/更新时间、用户/跟进时间索引；
  `resume_id` 和 `resume_version_id` 在简历或版本删除时均置空，用户删除级联清理申请
- `007_job_application_date_only` 将 PostgreSQL 旧的申请时间戳转换为 `DATE`，并固定按 UTC
  解释历史值，避免数据库会话时区使日历日期前后偏移
- 如果旧库存在重复 `code_hash`，迁移会明确失败，要求先人工核对；不会静默删除或合并数据
- SQLite 写事务使用独立连接和 `BEGIN IMMEDIATE`，并启用 WAL 与 5 秒 busy timeout

> 迁移 003 依赖生产环境中的 `TOTP_ENCRYPTION_KEY`。该密钥独立于
> `JWT_SECRET`，必须在备份恢复和所有副本间保持一致；直接更换会使已有 TOTP
> 密文无法解密。运行时仍可读取历史明文以支持滚动升级，但所有新写入和迁移后
> 数据均为密文。

## 表结构设计（PostgreSQL）

### users 用户表

存储用户账号信息和认证数据。

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),            -- GitHub-only 用户可为 NULL
    otp_secret VARCHAR(512),           -- AES-256-GCM 密文，NULL 表示未配置 OTP
    otp_recovery_codes JSONB NOT NULL DEFAULT '[]', -- 一次性恢复码 HMAC 摘要
    otp_enabled BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) NOT NULL DEFAULT 'user',  -- 用户角色：user / admin
    auth_provider INTEGER NOT NULL DEFAULT 1,  -- 登录方式位掩码：PASSWORD=1, GITHUB=2, OTHER=4
    disabled_at TIMESTAMP WITH TIME ZONE,  -- 禁用时间，NULL 表示正常
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at DESC, id DESC);
```

**字段说明:**
- `id`: 用户唯一标识，使用 UUID 避免 ID 猜测
- `username`: 登录用户名，唯一
- `password_hash`: bcrypt 加密后的密码，GitHub-only 用户可为 NULL
- `otp_secret`: TOTP 密钥的 `v1` AES-256-GCM 密文；AAD 包含用户 ID，密文不能
  在用户间交换复用
- `otp_recovery_codes`: 最多 10 个未消费恢复码的 HMAC-SHA256 摘要；登录消费
  使用旧 JSON 值作为条件更新，避免同一码被并发使用两次
- `otp_enabled`: 是否启用 OTP 二次验证
- `role`: 用户角色，`user`（普通用户）或 `admin`（管理员），新注册默认 `user`
- `auth_provider`: 登录方式位掩码，`1`=密码, `2`=GitHub, `4`=其他
- `disabled_at`: 禁用时间戳，NULL 表示账号正常

### auth_sessions 登录会话表

只保存 JWT 的 SHA-256 摘要及撤销状态。请求认证必须同时通过 JWT 签名校验和服务端会话校验，因此退出登录、修改密码、修改用户名或禁用账号后，旧凭证会立即失效。

```sql
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY,                        -- 同 JWT jti
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,     -- JWT SHA-256 摘要
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);
```

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
    template VARCHAR(20) DEFAULT 'classic',

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

    -- 简历内容（可以覆盖个人信息；模块标题、基本信息显示和预览配置也存放于此）
    content JSONB DEFAULT '{}',

    -- 公开相关
    is_public BOOLEAN DEFAULT FALSE,
    public_slug VARCHAR(50) UNIQUE,

    -- 模块排序
    modules_order JSONB DEFAULT '["basic_info", "education", "skills", "work_experience", "projects", "portfolio", "awards", "other_experience", "research", "summary"]',

    revision INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_user_updated ON resumes(user_id, updated_at DESC, id DESC);
CREATE INDEX idx_resumes_updated_at ON resumes(updated_at DESC, id DESC);
CREATE INDEX idx_resumes_public_updated ON resumes(is_public, updated_at DESC, id DESC);
CREATE INDEX idx_resumes_public_slug ON resumes(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX idx_resumes_template ON resumes(template);
```

`revision` 用于简历乐观并发控制。客户端更新时提交最近一次读取到的值，服务端使用 `WHERE ... AND revision = ?` 条件更新；版本过期时 API 返回 `409`。

SQLite 与 PostgreSQL 均以 `content.module_titles`、
`content.basic_info_display`、`content.preview_config` 为唯一存储位置。迁移 004
只在 PostgreSQL 发现历史独立列时执行数据归并和删列，新建数据库不会再创建
这些冗余列。

### resume_versions 简历版本表

版本记录是受控快照，不是 `resumes.revision` 的替代品。快照包含 `name`、
`template`、`modules_config`、`modules_order` 和 `content`；公开状态不在快照中，
所以恢复内容不会意外重新公开简历。

```sql
CREATE TABLE resume_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('auto', 'manual', 'restore', 'application')),
    label VARCHAR(100),
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (resume_id, revision, source)
);
CREATE INDEX idx_resume_versions_resume_created ON resume_versions(resume_id, created_at DESC, id DESC);
CREATE INDEX idx_resume_versions_auto_created ON resume_versions(resume_id, source, created_at DESC, id DESC);
```

自动快照至少间隔 10 分钟，每份简历只保留最近 30 条 `auto` 记录；自动清理不会
删除 `manual`、`restore`、`application`。手动版本每份最多 100 条，到达上限会明确
返回冲突。`(resume_id, revision, source)` 唯一键使同一逻辑快照幂等。恢复在一个
事务中校验 `expected_revision`、更新简历、递增 revision 并写入新的 `restore` 快照；
任何失败均会回滚，不会留下半恢复状态。创建手动版本也必须在同一事务中校验
`expected_revision`，以确保快照对应客户端刚成功保存的当前内容。版本列表只读取
元数据，SQLite 的 `created_at` 文本与 PostgreSQL 的 `TIMESTAMPTZ` 均在服务层转换为
ISO 8601 UTC 字符串后返回客户端。

### job_applications 求职申请表

申请记录使用稳定英文状态枚举：`wishlist`、`applied`、`screening`、`interview`、
`offer`、`rejected`、`withdrawn`；中文显示文案仅由客户端映射。`revision` 是申请本身的
乐观并发令牌，`status_changed_at` 只在状态实际变化时更新。申请不保存简历 JSON：
`resume_version_id` 指向实际投递快照，并在服务层通过 `resume_id -> resumes.user_id` 联表
校验所有权。`applied_at` 与 `next_action_at` 是 date-only 语义，两个驱动对外均返回
`YYYY-MM-DD` 或 `NULL`。只选简历时创建或复用 `source=application` 的当前快照；自动保留策略从不清理
该来源。删除简历或版本会将相关引用置空，删除用户则级联删除其申请。

```sql
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company VARCHAR(120) NOT NULL,
    position VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('wishlist', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn')),
    job_url TEXT, location VARCHAR(120), channel VARCHAR(80), salary VARCHAR(80), notes TEXT,
    applied_at DATE, next_action_at DATE,
    status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    resume_version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_applications_user_status_updated ON job_applications(user_id, status, updated_at DESC, id DESC);
CREATE INDEX idx_job_applications_next_action ON job_applications(user_id, next_action_at, id);
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

### user_oauth_accounts OAuth 绑定表

存储用户的第三方 OAuth 账号绑定关系。

```sql
CREATE TABLE user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,             -- 提供商：github
    provider_account_id VARCHAR(255) NOT NULL, -- 第三方平台用户 ID
    provider_username VARCHAR(255),            -- 第三方平台用户名
    email VARCHAR(255),                        -- 第三方平台邮箱
    avatar_url TEXT,                           -- 第三方平台头像
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

-- 索引
CREATE INDEX idx_user_oauth_user_id ON user_oauth_accounts(user_id);
```

**字段说明:**
- `provider`: OAuth 提供商标识，如 `github`
- `provider_account_id`: 第三方平台的用户唯一标识
- `provider_username`: 第三方平台的用户名
- `email`: 第三方平台的邮箱地址
- `avatar_url`: 第三方平台的头像 URL

### registration_codes 注册码表

存储邀请注册码，用于控制用户注册。

```sql
CREATE TABLE registration_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash VARCHAR(64) NOT NULL UNIQUE,   -- 注册码 SHA-256 哈希
    label VARCHAR(100),                      -- 备注标签
    created_by UUID REFERENCES users(id),    -- 创建者（管理员）
    used_by_user_id UUID REFERENCES users(id), -- 使用者
    expires_at TIMESTAMP WITH TIME ZONE,     -- 过期时间，NULL 表示永不过期
    disabled_at TIMESTAMP WITH TIME ZONE,    -- 禁用时间，NULL 表示可用
    used_at TIMESTAMP WITH TIME ZONE,        -- 使用时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_registration_codes_hash ON registration_codes(code_hash);
CREATE INDEX idx_registration_codes_created_at ON registration_codes(created_at DESC, id DESC);
CREATE INDEX idx_registration_codes_status ON registration_codes(used_at, disabled_at, expires_at, created_at DESC);
```

**字段说明:**
- `code_hash`: 注册码明文的 SHA-256 哈希，明文只在创建时返回一次
- `label`: 管理员备注，方便识别注册码用途
- `created_by`: 创建该注册码的管理员
- `used_by_user_id`: 使用该注册码注册的用户
- `expires_at`: 过期时间，NULL 表示永不过期
- `disabled_at`: 禁用时间，非 NULL 表示已禁用

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
  ├──── (N) auth_sessions
  │
  ├──── (N) resumes
  │       └──── (N) resume_versions
  │
  ├──── (N) mcp_keys
  │
  ├──── (N) user_oauth_accounts
  │
  └──── created (N) registration_codes
```

- 一个用户对应一份个人信息（1:1）
- 一个用户可以有多个登录会话，且每个会话都可独立撤销（1:N）
- 一个用户可以有多份简历（1:N）
- 一份简历可以有多个受限版本快照（1:N），并随简历级联删除
- 一个用户可以有多个 MCP Key（1:N）
- 一个用户可以绑定多个 OAuth 账号（1:N）
- 一个管理员可以创建多个注册码（1:N）
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

### 3. 模版系统扩展

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

无需手动执行迁移；已发布安装会按 `schema_migrations` 顺序补齐至迁移 005。

### PostgreSQL

PostgreSQL 使用相同的自动建表策略。首次启动时自动创建所有表和索引。
