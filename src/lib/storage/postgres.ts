/**
 * PostgreSQL 存储适配器
 *
 * 使用 pg (node-postgres) 连接 PostgreSQL 数据库
 * 首次查询时自动建库、建表
 */

import { Pool } from 'pg'
import { PG_SCHEMA_SQL } from './schema'

/**
 * 全局状态
 *
 * 使用 globalThis 缓存，避免开发环境热重载时重复创建
 */
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
  initPromise: Promise<Pool> | undefined
}

/**
 * 确保数据库存在
 * 如果目标数据库不存在，连接到默认 postgres 库并创建
 */
async function ensureDatabase(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) return

  const url = new URL(connectionString)
  const dbName = url.pathname.slice(1)
  if (!dbName || dbName === 'postgres') return

  try {
    const testPool = new Pool({ connectionString, connectionTimeoutMillis: 5000 })
    await testPool.query('SELECT 1')
    await testPool.end()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('does not exist')) {
      console.log(`[postgres] 数据库 "${dbName}" 不存在，尝试自动创建...`)
      const defaultUrl = new URL(connectionString)
      defaultUrl.pathname = '/postgres'
      const defaultPool = new Pool({ connectionString: defaultUrl.toString(), connectionTimeoutMillis: 10000 })
      try {
        await defaultPool.query(`CREATE DATABASE "${dbName}"`)
        console.log(`[postgres] 数据库 "${dbName}" 已创建`)
      } catch (createErr) {
        console.warn('[postgres] 创建数据库失败:', createErr instanceof Error ? createErr.message : createErr)
      } finally {
        await defaultPool.end()
      }
    }
  }
}

/**
 * 完整初始化流程：建库 → 连接池 → 建表
 * 返回可用的连接池，Promise 只执行一次
 */
function ensureInitialized(): Promise<Pool> {
  if (!globalForDb.initPromise) {
    globalForDb.initPromise = (async () => {
      // 1. 确保数据库存在
      await ensureDatabase()

      // 2. 创建连接池
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 300000,
        connectionTimeoutMillis: 30000,
      })
      pool.on('error', (err) => {
        console.error('数据库连接池错误:', err)
      })
      globalForDb.pool = pool

      // 3. 建表
      await pool.query(PG_SCHEMA_SQL)
      console.log('[postgres] Schema 初始化完成')

      return pool
    })().catch(err => {
      globalForDb.initPromise = undefined
      throw err
    })
  }
  return globalForDb.initPromise
}

/**
 * 获取数据库连接池（同步）
 * 如果尚未初始化，会触发异步初始化并返回临时池
 */
export function getPool(): Pool {
  if (!globalForDb.pool) {
    // 触发初始化（异步）
    ensureInitialized().catch(err => {
      console.error('[postgres] 初始化失败:', err instanceof Error ? err.message : err)
    })
    // 创建临时池（初始化完成后会被替换）
    globalForDb.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 300000,
      connectionTimeoutMillis: 30000,
    })
  }
  return globalForDb.pool
}

/**
 * 执行查询
 * 等待初始化完成后再执行，确保数据库和表已就绪
 */
export async function query(text: string, params?: unknown[]) {
  const pool = await ensureInitialized()

  const start = Date.now()
  const result = await pool.query(text, params)
  const duration = Date.now() - start

  if (process.env.NODE_ENV === 'development' && duration > 100) {
    console.log('慢查询:', { text, duration, rows: result.rowCount })
  }

  return result
}
