-- 为 resumes 表添加 modules_order 和 template 列
-- 执行前请先备份数据库

-- 1. 添加 modules_order 列（JSONB 数组，存储模块排序）
ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS modules_order JSONB DEFAULT '["basic_info","summary","education","work_experience","projects","skills","awards","portfolio","research","other_experience"]'::jsonb;

-- 2. 添加 template 列（模板 ID）
ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS template VARCHAR(20) DEFAULT 'classic';

-- 3. 为已有记录填充默认值（如果列是新增的，DEFAULT 会自动填充，但显式更新更安全）
UPDATE resumes
SET modules_order = '["basic_info","summary","education","work_experience","projects","skills","awards","portfolio","research","other_experience"]'::jsonb
WHERE modules_order IS NULL;

UPDATE resumes
SET template = 'classic'
WHERE template IS NULL;

-- 4. 添加索引（可选，template 列可能用于筛选）
CREATE INDEX IF NOT EXISTS idx_resumes_template ON resumes(template);
