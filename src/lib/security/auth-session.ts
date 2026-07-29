import { createHash, randomUUID } from 'node:crypto'
import { generateToken, verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import type { DatabaseQuery } from '@/lib/storage/types'
import {
  AUTH_SESSION_MAX_AGE_SECONDS,
  getSessionToken,
} from './session'

interface SessionUser {
  id: string
  username: string
  otp_enabled: boolean
  role: string
  auth_provider: number
  disabled_at: string | null
}

interface SessionSubject {
  id: string
  username: string
  auth_provider?: number
}

export interface AuthSession {
  id: string
  user: SessionUser
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function issueAuthSession(
  user: SessionSubject,
  database: DatabaseQuery = query,
): Promise<string> {
  const sessionId = randomUUID()
  const token = await generateToken(
    user.id,
    user.username,
    user.auth_provider,
    sessionId,
  )
  const expiresAt = new Date(
    Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000,
  ).toISOString()

  // 会话最长只有 24 小时。签发时顺带清理自然过期记录，避免额外定时任务。
  await database(
    'DELETE FROM auth_sessions WHERE expires_at <= $1',
    [new Date().toISOString()],
  )

  // 只持久化不可逆摘要；数据库内容本身不能被当作 Bearer 凭证重放。
  await database(
    `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, user.id, hashSessionToken(token), expiresAt],
  )

  return token
}

export async function resolveAuthSessionToken(
  token: string,
  database: DatabaseQuery = query,
): Promise<AuthSession | null> {
  const claims = await verifyToken(token)
  if (!claims?.sub || !claims.jti) return null

  const result = await database<SessionUser & { session_id: string }>(
    `SELECT
       s.id AS session_id,
       u.id,
       u.username,
       u.otp_enabled,
       u.role,
       u.auth_provider,
       u.disabled_at
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1
       AND s.user_id = $2
       AND s.token_hash = $3
       AND s.revoked_at IS NULL
       AND s.expires_at > $4`,
    [
      claims.jti,
      claims.sub,
      hashSessionToken(token),
      new Date().toISOString(),
    ],
  )
  if (result.rows.length === 0) return null

  const { session_id, ...user } = result.rows[0]
  return { id: session_id, user }
}

export async function resolveRequestAuthSession(
  request: Request,
  database: DatabaseQuery = query,
): Promise<AuthSession | null> {
  const token = getSessionToken(request)
  if (!token) return null
  return resolveAuthSessionToken(token, database)
}

export async function revokeAuthSessionToken(
  token: string,
  database: DatabaseQuery = query,
): Promise<void> {
  await database(
    `UPDATE auth_sessions
     SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashSessionToken(token)],
  )
}

export async function revokeAllAuthSessions(
  userId: string,
  database: DatabaseQuery = query,
): Promise<void> {
  await database(
    `UPDATE auth_sessions
     SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  )
}
