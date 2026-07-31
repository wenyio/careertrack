/**
 * PostgreSQL 存储适配器
 *
 * 使用 pg (node-postgres) 连接 PostgreSQL 数据库
 * 首次查询时自动建库、建表
 */

import { Client, Pool, types } from 'pg'
import { PG_SCHEMA_SQL } from './schema'
import type { DatabaseQuery } from './types'

// node-postgres normally parses DATE (OID 1082) into a JavaScript Date. That
// silently applies the server process timezone before application code sees it.
// Date-only fields are calendar values, so keep PostgreSQL's YYYY-MM-DD text.
types.setTypeParser(1082, (value) => value)

/**
 * 全局状态
 *
 * 使用 globalThis 缓存，避免开发环境热重载时重复创建
 */
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
  initPromise: Promise<Pool> | undefined
}

function configuredDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) {
    throw new Error('[postgres] STORAGE_DRIVER=postgres 时必须设置 DATABASE_URL')
  }
  return connectionString
}

function createPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 300000,
    connectionTimeoutMillis: 30000,
  })
  pool.on('error', (error) => {
    console.error('数据库连接池错误:', error)
  })
  return pool
}

function postgresErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined
  }
  return typeof error.code === 'string' ? error.code : undefined
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`
}

/**
 * Create a missing target database through one short-lived maintenance
 * connection. Existing databases take the normal path and allocate only the
 * application pool.
 */
async function createMissingDatabase(connectionString: string): Promise<void> {
  const targetUrl = new URL(connectionString)
  const databaseName = decodeURIComponent(targetUrl.pathname.slice(1))
  if (!databaseName || databaseName === 'postgres') {
    throw new Error('[postgres] 目标数据库不存在且无法自动确定数据库名')
  }

  const maintenanceUrl = new URL(targetUrl)
  maintenanceUrl.pathname = '/postgres'
  const client = new Client({
    connectionString: maintenanceUrl.toString(),
    connectionTimeoutMillis: 10000,
  })

  await client.connect()
  try {
    console.log(`[postgres] 数据库 "${databaseName}" 不存在，尝试自动创建...`)
    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`)
    console.log(`[postgres] 数据库 "${databaseName}" 已创建`)
  } catch (error) {
    // Another replica may have created it after our first connection attempt.
    if (postgresErrorCode(error) !== '42P04') throw error
  } finally {
    await client.end()
  }
}

async function initializeSchema(pool: Pool): Promise<void> {
  await pool.query(PG_SCHEMA_SQL)
  console.log('[postgres] Schema 初始化完成')
}

/**
 * 完整初始化流程：建库 → 连接池 → 建表
 * 返回可用的连接池，Promise 只执行一次
 */
function ensureInitialized(): Promise<Pool> {
  if (!globalForDb.initPromise) {
    globalForDb.initPromise = (async () => {
      const connectionString = configuredDatabaseUrl()
      let pool = createPool(connectionString)

      try {
        await initializeSchema(pool)
      } catch (error) {
        await pool.end().catch(() => undefined)
        if (postgresErrorCode(error) !== '3D000') throw error

        await createMissingDatabase(connectionString)
        pool = createPool(connectionString)
        try {
          await initializeSchema(pool)
        } catch (retryError) {
          await pool.end().catch(() => undefined)
          throw retryError
        }
      }

      globalForDb.pool = pool
      return pool
    })().catch((error) => {
      globalForDb.pool = undefined
      globalForDb.initPromise = undefined
      throw error
    })
  }
  return globalForDb.initPromise
}

/** 等待一次性初始化完成并返回正式应用连接池。 */
export async function getPool(): Promise<Pool> {
  return ensureInitialized()
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

export async function transaction<T>(
  callback: (query: DatabaseQuery) => Promise<T>,
): Promise<T> {
  const pool = await ensureInitialized()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const transactionQuery: DatabaseQuery = async (text, params) => {
      const result = await client.query(text, params)
      return {
        rows: result.rows,
        rowCount: result.rowCount,
      }
    }
    const result = await callback(transactionQuery)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
