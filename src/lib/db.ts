/**
 * 数据库连接模块
 *
 * 根据 STORAGE_DRIVER 环境变量自动选择 SQLite 或 PostgreSQL。
 * 所有 API Routes 通过 query() 函数访问数据库，无需感知底层实现。
 *
 * - 默认使用 SQLite（本地文件 .careertrack/careertrack.db）
 * - 设置 STORAGE_DRIVER=postgres + DATABASE_URL 可切换为 PostgreSQL
 * - 仅设置 DATABASE_URL 时自动使用 PostgreSQL（向后兼容）
 */

export { query } from './storage'
