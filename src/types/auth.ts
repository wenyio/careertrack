/**
 * 认证相关类型定义
 */

/** 登录请求 */
export interface LoginRequest {
  username: string
  password: string
  otp_code?: string
  recovery_code?: string
}

/** 注册请求 */
export interface RegisterRequest {
  username: string
  password: string
  registration_code: string
}

/** 登录响应 */
export interface LoginResponse {
  user: User
  recovery_code_used?: boolean
  recovery_codes_remaining?: number
}

/** 用户角色 */
type UserRole = 'user' | 'admin'

/** 用户信息 */
export interface User {
  id: string
  username: string
  otp_enabled: boolean
  role: UserRole
  auth_provider: number
  disabled_at?: string | null
}

/** 修改用户名请求 */
export interface ChangeUsernameRequest {
  username: string
  current_password?: string
}

/** OTP 设置响应 */
export interface SetupOtpResponse {
  secret: string
  qr_code_url: string
}

/** OTP 验证请求 */
export interface VerifyOtpRequest {
  code: string
}

/** OTP 启用成功后仅返回一次的恢复码 */
export interface VerifyOtpResponse {
  success: boolean
  recovery_codes: string[]
}

/** 禁用 OTP 请求 */
export interface DisableOtpRequest {
  password: string
  code: string
}

/** 重新生成 OTP 恢复码请求 */
export interface RecoveryCodesRequest {
  password: string
  code: string
}

/** 新恢复码仅在生成时返回一次 */
export interface RecoveryCodesResponse {
  recovery_codes: string[]
}

/** OAuth 绑定账号 */
export interface OAuthAccount {
  id: string
  provider: string
  provider_username: string | null
  avatar_url: string | null
  created_at: string
}
