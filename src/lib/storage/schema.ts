/**
 * SQLite 数据库 Schema
 *
 * 使用 CREATE TABLE IF NOT EXISTS 实现首次启动自动建表
 * 字段类型映射：UUID → TEXT，JSONB → TEXT，BOOLEAN → INTEGER，TIMESTAMP → TEXT
 */

export const SCHEMA_SQL = `
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    otp_secret VARCHAR(100),
    otp_enabled INTEGER DEFAULT 0,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    auth_provider INTEGER NOT NULL DEFAULT 1,
    disabled_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 个人信息表
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    basic_info TEXT DEFAULT '{}',
    education TEXT DEFAULT '[]',
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

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 简历表
CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT '未命名简历',
    modules_config TEXT DEFAULT '{"basic_info":true,"education":true,"skills":true,"work_experience":true,"projects":true,"portfolio":false,"awards":false,"other_experience":false,"research":false,"summary":false}',
    content TEXT DEFAULT '{}',
    is_public INTEGER DEFAULT 0,
    public_slug VARCHAR(50) UNIQUE,
    modules_order TEXT DEFAULT '["basic_info","summary","education","work_experience","projects","skills","awards","portfolio","research","other_experience"]',
    template VARCHAR(20) DEFAULT 'classic',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_template ON resumes(template);

-- MCP Key 表
CREATE TABLE IF NOT EXISTS mcp_keys (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
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

-- OAuth 绑定表
CREATE TABLE IF NOT EXISTS user_oauth_accounts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    provider_username VARCHAR(255),
    email VARCHAR(255),
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_user_id ON user_oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_provider ON user_oauth_accounts(provider, provider_account_id);

-- 注册码表
CREATE TABLE IF NOT EXISTS registration_codes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))),
    code_hash VARCHAR(64) NOT NULL,
    label VARCHAR(255),
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    used_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    expires_at TEXT,
    disabled_at TEXT,
    used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_registration_codes_hash ON registration_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_registration_codes_created_by ON registration_codes(created_by);
`;

/**
 * PostgreSQL Schema
 *
 * 使用 CREATE TABLE IF NOT EXISTS 实现首次启动自动建表
 * 与 SQLite 版本结构一致，使用 PostgreSQL 原生类型
 */
export const PG_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    otp_secret VARCHAR(100),
    otp_enabled BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    auth_provider INTEGER NOT NULL DEFAULT 1,
    disabled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    basic_info JSONB DEFAULT '{}',
    education JSONB DEFAULT '[]',
    skills JSONB DEFAULT '[]',
    work_experience JSONB DEFAULT '[]',
    projects JSONB DEFAULT '[]',
    portfolio JSONB DEFAULT '[]',
    awards JSONB DEFAULT '[]',
    other_experience JSONB DEFAULT '[]',
    research JSONB DEFAULT '[]',
    summary TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT '未命名简历',
    modules_config JSONB DEFAULT '{"basic_info":true,"education":true,"skills":true,"work_experience":true,"projects":true,"portfolio":false,"awards":false,"other_experience":false,"research":false,"summary":false}',
    content JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT FALSE,
    public_slug VARCHAR(50) UNIQUE,
    modules_order JSONB DEFAULT '["basic_info","summary","education","work_experience","projects","skills","awards","portfolio","research","other_experience"]',
    module_titles JSONB DEFAULT '{}',
    basic_info_display JSONB DEFAULT '{}',
    preview_config JSONB DEFAULT '{}',
    template VARCHAR(20) DEFAULT 'classic',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_public_slug ON resumes(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resumes_template ON resumes(template);

CREATE TABLE IF NOT EXISTS mcp_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prefix VARCHAR(20) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'read_write',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mcp_keys_user_id ON mcp_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_keys_hash ON mcp_keys(hash);

CREATE TABLE IF NOT EXISTS user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    provider_username VARCHAR(255),
    email VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_user_id ON user_oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_provider ON user_oauth_accounts(provider, provider_account_id);

CREATE TABLE IF NOT EXISTS registration_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash VARCHAR(64) NOT NULL,
    label VARCHAR(255),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registration_codes_hash ON registration_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_registration_codes_created_by ON registration_codes(created_by);
`;
