/**
 * 认证工具模块
 *
 * 提供 JWT、密码哈希、TOTP 功能
 */

import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { generateSecret, verifySync, generateURI } from 'otplib'

/**
 * JWT 密钥
 *
 * 生产环境必须通过 JWT_SECRET 环境变量配置，缺失时直接抛错阻止启动。
 * 开发环境使用 fallback 值并输出警告。
 */
function getJwtSecret(): Uint8Array {
  const envSecret = process.env.JWT_SECRET
  if (!envSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[auth] JWT_SECRET 环境变量未设置，生产环境不允许使用默认密钥')
    }
    console.warn('[auth] JWT_SECRET 未设置，使用开发默认值。生产环境请务必配置此变量。')
  }
  const secret = envSecret || 'dev-only-default-secret'
  return new TextEncoder().encode(secret)
}

/**
 * JWT Claims
 */
interface JwtClaims {
  sub: string    // 用户 ID
  username: string
  auth_provider?: number
}

/**
 * 生成 JWT Token
 *
 * @param userId 用户 ID
 * @param username 用户名
 * @param authProvider 认证来源 bitmask
 * @returns JWT Token
 */
export async function generateToken(userId: string, username: string, authProvider?: number): Promise<string> {
  const payload: Record<string, unknown> = { sub: userId, username }
  if (authProvider !== undefined) {
    payload.auth_provider = authProvider
  }
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJwtSecret())

  return token
}

/**
 * 验证 JWT Token
 *
 * @param token JWT Token
 * @returns Claims 或 null
 */
export async function verifyToken(token: string): Promise<JwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload as unknown as JwtClaims
  } catch (error) {
    // 区分 token 过期（预期）和配置错误（需要关注）
    if (error instanceof Error && error.message.includes('expired')) {
      console.warn('[auth] Token expired:', error.message)
    } else {
      console.error('[auth] Token verification failed:', error)
    }
    return null
  }
}

/**
 * 哈希密码
 *
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * 验证密码
 *
 * @param password 明文密码
 * @param hash 哈希值
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * 生成 TOTP 密钥
 *
 * @returns Base32 编码的密钥
 */
export function generateTotpSecret(): string {
  return generateSecret()
}

/**
 * 验证 TOTP 验证码
 *
 * @param code 验证码
 * @param secret 密钥
 * @returns 是否有效
 */
export function verifyTotp(code: string, secret: string): boolean {
  const result = verifySync({ token: code, secret })
  return result.valid
}

/**
 * 生成 OTP URI（用于生成二维码）
 *
 * @param username 用户名
 * @param secret 密钥
 * @returns OTP URI
 */
export function generateOtpUri(username: string, secret: string): string {
  return generateURI({
    label: username,
    issuer: 'CareerTrack',
    secret,
  })
}
