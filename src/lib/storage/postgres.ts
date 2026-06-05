/**
 * PostgreSQL 存储适配器
 *
 * 使用 pg (node-postgres) 连接 PostgreSQL 数据库
 * 逻辑从原 src/lib/db.ts 迁移，保持完全兼容
 */

import { Pool } from 'pg'

/**
 * 全局连接池
 *
 * 使用 globalThis 缓存连接池，避免开发环境热重载时创建多个连接池
 * 生产环境不会有这个问题
 */
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
}

/**
 * 获取数据库连接池
 */
export function getPool(): Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // 连接池配置
      max: 10,                    // 最大连接数
      idleTimeoutMillis: 300000,  // 空闲连接超时（5分钟）
      connectionTimeoutMillis: 30000, // 连接超时（30秒）
    })

    // 错误处理
    globalForDb.pool.on('error', (err) => {
      console.error('数据库连接池错误:', err)
    })
  }

  return globalForDb.pool
}

/**
 * 执行查询
 *
 * @param text SQL 语句
 * @param params 参数
 * @returns 查询结果
 */
export async function query(text: string, params?: unknown[]) {
  const pool = getPool()
  const start = Date.now()
  const result = await pool.query(text, params)
  const duration = Date.now() - start

  // 开发环境打印慢查询
  if (process.env.NODE_ENV === 'development' && duration > 100) {
    console.log('慢查询:', { text, duration, rows: result.rowCount })
  }

  return result
}
