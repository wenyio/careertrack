const MIN_PRODUCTION_SECRET_LENGTH = 32

const KNOWN_WEAK_SECRETS = new Set([
  'change-me-in-production',
  'dev-only-default-secret',
  'careertrack-preview-secret',
  'secret',
  'password',
])

const warnedSecrets = new Set<string>()

export function validateProductionSecret(name: string, value: string): void {
  if (value.length < MIN_PRODUCTION_SECRET_LENGTH) {
    throw new Error(`[security] ${name} 长度至少需要 ${MIN_PRODUCTION_SECRET_LENGTH} 个字符`)
  }
  if (KNOWN_WEAK_SECRETS.has(value.toLowerCase())) {
    throw new Error(`[security] ${name} 使用了已知弱默认值`)
  }
}

/**
 * Read a signing secret and fail closed in production.
 *
 * Development keeps an explicit fallback so a fresh checkout remains usable,
 * but the fallback is never accepted when NODE_ENV=production.
 */
export function getSigningSecret(
  name: 'JWT_SECRET' | 'MCP_PREVIEW_SECRET',
  developmentFallback: string,
): string {
  const value = process.env[name]?.trim()

  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[security] ${name} 未设置，生产环境拒绝启动`)
    }
    if (!warnedSecrets.has(name)) {
      console.warn(`[security] ${name} 未设置，仅使用开发环境临时密钥`)
      warnedSecrets.add(name)
    }
    return developmentFallback
  }

  if (process.env.NODE_ENV === 'production') {
    validateProductionSecret(name, value)
  }

  return value
}
