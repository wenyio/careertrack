-- 新增认证来源、用户禁用、OAuth 绑定、注册码
--
-- 1. users 表扩展：password_hash nullable、auth_provider bitmask、disabled_at
-- 2. user_oauth_accounts 表：OAuth 第三方绑定
-- 3. registration_codes 表：一次性注册码

-- ========== users 表扩展 ==========

-- password_hash 改为 nullable（GitHub-only 用户无密码）
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 认证来源 bitmask：1=密码, 2=GitHub, 4=预留
ALTER TABLE users ADD COLUMN auth_provider INTEGER NOT NULL DEFAULT 1;

-- 管理员禁用用户时间戳
ALTER TABLE users ADD COLUMN disabled_at TIMESTAMP WITH TIME ZONE;

-- ========== OAuth 绑定表 ==========

CREATE TABLE IF NOT EXISTS user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    provider_username VARCHAR(255),
    email VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_user_id ON user_oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_provider ON user_oauth_accounts(provider, provider_account_id);

-- ========== 注册码表 ==========

CREATE TABLE IF NOT EXISTS registration_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash VARCHAR(64) NOT NULL,
    label VARCHAR(255),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    disabled_at TIMESTAMP WITH TIME ZONE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registration_codes_hash ON registration_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_registration_codes_created_by ON registration_codes(created_by);
