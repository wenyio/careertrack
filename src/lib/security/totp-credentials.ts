import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { getTotpEncryptionSecret } from '@/lib/security/secrets'

const ENCRYPTION_VERSION = 'v1'
const TOTP_AAD_PREFIX = 'careertrack:totp'
const RECOVERY_CODE_COUNT = 10
const RECOVERY_CODE_HEX_LENGTH = 16

function credentialKey(purpose: string): Buffer {
  return createHmac('sha256', getTotpEncryptionSecret())
    .update(`careertrack:credential-key:v1:${purpose}`)
    .digest()
}

function encryptionKey(): Buffer {
  return credentialKey('totp-aes-256-gcm')
}

function recoveryCodeKey(): Buffer {
  return credentialKey('recovery-code-hmac')
}

function totpAad(userId: string): Buffer {
  return Buffer.from(`${TOTP_AAD_PREFIX}:${ENCRYPTION_VERSION}:${userId}`)
}

export function isEncryptedTotpSecret(value: string): boolean {
  return value.startsWith(`${ENCRYPTION_VERSION}:`)
}

/**
 * Encrypt a Base32 TOTP secret with AES-256-GCM.
 *
 * The user ID is authenticated as AAD, so swapping ciphertexts between user
 * rows causes decryption to fail instead of silently moving a second factor.
 */
export function encryptTotpSecret(secret: string, userId: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  cipher.setAAD(totpAad(userId))
  const ciphertext = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    ENCRYPTION_VERSION,
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    tag.toString('base64url'),
  ].join(':')
}

/**
 * Decrypt an encrypted TOTP secret.
 *
 * Plain Base32 values remain readable during rolling upgrades. Migration 003
 * rewrites them, and all new writes are encrypted.
 */
export function decryptTotpSecret(value: string, userId: string): string {
  if (!isEncryptedTotpSecret(value)) return value

  const [version, ivText, ciphertextText, tagText, extra] = value.split(':')
  if (
    version !== ENCRYPTION_VERSION
    || !ivText
    || !ciphertextText
    || !tagText
    || extra !== undefined
  ) {
    throw new Error('[security] OTP 密钥密文格式无效')
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivText, 'base64url'),
    )
    decipher.setAAD(totpAad(userId))
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new Error('[security] OTP 密钥无法解密')
  }
}

function normalizeRecoveryCode(code: string): string {
  return code.replace(/-/g, '').trim().toUpperCase()
}

function recoveryCodeHash(code: string, userId: string): string {
  // Recovery digests use a domain-separated key, never the AES key itself.
  return createHmac('sha256', recoveryCodeKey())
    .update(`careertrack:recovery:v1:${userId}:${normalizeRecoveryCode(code)}`)
    .digest('hex')
}

/** Generate high-entropy one-time codes suitable for offline storage. */
export function generateRecoveryCodes(
  count = RECOVERY_CODE_COUNT,
): string[] {
  return Array.from({ length: count }, () => {
    const compact = randomBytes(RECOVERY_CODE_HEX_LENGTH / 2)
      .toString('hex')
      .toUpperCase()
    return compact.match(/.{1,4}/g)?.join('-') || compact
  })
}

export function hashRecoveryCodes(
  codes: string[],
  userId: string,
): string[] {
  return codes.map((code) => recoveryCodeHash(code, userId))
}

/** Return the matching stored digest without exposing timing differences. */
export function matchingRecoveryCodeHash(
  code: string,
  storedHashes: string[],
  userId: string,
): string | null {
  const candidate = Buffer.from(recoveryCodeHash(code, userId), 'hex')
  let match: string | null = null

  for (const storedHash of storedHashes) {
    if (!/^[a-f0-9]{64}$/i.test(storedHash)) continue
    const stored = Buffer.from(storedHash, 'hex')
    if (stored.length === candidate.length && timingSafeEqual(stored, candidate)) {
      match = storedHash
    }
  }
  return match
}
