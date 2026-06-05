/**
 * PostgreSQL 存储适配器
 *
 * 使用 pg (node-postgres) 连接 PostgreSQL 数据库
 * 首次连接时自动建表（CREATE TABLE IF NOT EXISTS）
 */

import { Pool } from 'pg'
import { PG_SCHEMA_SQL } from './schema'

/**
 * 全局连接池
 *
 * 使用 globalThis 缓存连接池，避免开发环境热重载时创建多个连接池
 * 生产环境不会有这个问题
 */
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
  schemaInitialized: boolean
}

/**
 * 初始化数据库 Schema
 * 首次连接时执行 CREATE TABLE IF NOT EXISTS
 */
async function initSchema(pool: Pool): Promise<void> {
  if (globalForDb.schemaInitialized) return
  try {
    await pool.query(PG_SCHEMA_SQL)
    globalForDb.schemaInitialized = true
  } catch (error) {
    // 数据库不存在等错误不阻塞，后续请求会重试
    console.warn('[postgres] Schema 初始化失败（可能数据库尚未就绪）:', error instanceof Error ? error.message : error)
  }
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

    // 自动建表（异步，不阻塞启动）
    initSchema(globalForDb.pool)
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
