/**
 * 认证来源位定义
 *
 * 使用 bitmask 表示用户的认证来源组合
 */
export const AUTH_PROVIDER = {
  PASSWORD: 1, // 二进制 001
  GITHUB: 2,   // 二进制 010
  OTHER: 4,    // 二进制 100，预留未来 provider
} as const

/**
 * 认证来源名称映射
 */
export const AUTH_PROVIDER_LABELS: Record<number, string> = {
  [AUTH_PROVIDER.PASSWORD]: '账号密码',
  [AUTH_PROVIDER.GITHUB]: 'GitHub',
  [AUTH_PROVIDER.PASSWORD | AUTH_PROVIDER.GITHUB]: '账号密码 + GitHub',
}
