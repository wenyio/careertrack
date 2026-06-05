/**
 * 认证相关类型定义
 */

/** 登录请求 */
export interface LoginRequest {
  username: string
  password: string
  otp_code?: string  // 可选，如果启用了 OTP 则必填
}

/** 注册请求 */
export interface RegisterRequest {
  username: string
  password: string
  registration_code: string
}

/** 登录响应 */
export interface LoginResponse {
  token: string
  user: User
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

/** 禁用 OTP 请求 */
export interface DisableOtpRequest {
  password: string
  code: string
}

/** OAuth 绑定账号 */
export interface OAuthAccount {
  id: string
  provider: string
  provider_username: string | null
  avatar_url: string | null
  created_at: string
}
