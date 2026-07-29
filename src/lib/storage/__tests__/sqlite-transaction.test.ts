import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { transaction } from '@/lib/storage/sqlite'

describe('SQLite transaction serialization', () => {
  let directory: string
  let previousDatabasePath: string | undefined

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'careertrack-sqlite-'))
    previousDatabasePath = process.env.SQLITE_DB_PATH
    process.env.SQLITE_DB_PATH = join(directory, 'transaction.db')
  })

  afterEach(() => {
    if (previousDatabasePath === undefined) {
      delete process.env.SQLITE_DB_PATH
    } else {
      process.env.SQLITE_DB_PATH = previousDatabasePath
    }
    rmSync(directory, { recursive: true, force: true })
  })

  it('queues concurrent async writers instead of timing out with SQLITE_BUSY', async () => {
    const createUser = (username: string) => transaction(async (query) => {
      await query(
        'INSERT INTO users (username, auth_provider) VALUES ($1, $2)',
        [username, 1],
      )
      // Force the transaction to yield while it still owns the write lock.
      await Promise.resolve()
    })

    await expect(Promise.all([
      createUser('concurrent-user-a'),
      createUser('concurrent-user-b'),
    ])).resolves.toEqual([undefined, undefined])

    const result = await transaction((query) =>
      query<{ count: number }>('SELECT COUNT(*) AS count FROM users'),
    )
    expect(result.rows[0].count).toBe(2)
  })
})
