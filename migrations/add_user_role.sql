-- 为 users 表添加角色字段
-- 可选值：user（普通用户）、admin（管理员）
-- 新注册用户默认为 user

ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';

-- 可通过以下 SQL 将指定用户设为管理员：
-- UPDATE users SET role = 'admin' WHERE username = 'your_admin_username';

-- 也可通过环境变量 ADMIN_USERNAME 在首次启动时自动设置（见 API 逻辑）
