-- MCP Key 表
-- 用于存储 MCP API Key 的哈希值，明文 Key 只在创建时返回一次

CREATE TABLE IF NOT EXISTS mcp_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prefix VARCHAR(20) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'read_write',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_mcp_keys_user_id ON mcp_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_keys_hash ON mcp_keys(hash);
