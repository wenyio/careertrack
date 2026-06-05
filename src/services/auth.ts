/**
 * 认证相关 API 服务
 *
 * 处理用户登录、注册、OTP 设置等认证相关请求
 */

import api from './api'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ChangeUsernameRequest,
  SetupOtpResponse,
  VerifyOtpRequest,
  DisableOtpRequest,
  OAuthAccount,
} from '@/types/auth'

/**
 * 用户登录
 *
 * @param credentials 登录凭证（用户名、密码、可选 OTP 验证码）
 * @returns 登录响应，包含 token 和用户信息
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', credentials)
  return response.data
}

/**
 * 用户注册
 *
 * @param data 注册数据（用户名、密码）
 * @returns 登录响应，包含 token 和用户信息
 */
export async function register(data: RegisterRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/register', data)
  return response.data
}

/**
 * 修改密码
 *
 * 有密码的用户需要提供 current_password。
 * GitHub-only 用户（无密码）直接设置 new_password 即可。
 *
 * @param data 包含可选的当前密码和新密码
 */
export async function changePassword(data: { current_password?: string; new_password: string }): Promise<void> {
  await api.put('/auth/password', data)
}

/**
 * 修改用户名
 *
 * @param data 包含新用户名和可选的当前密码
 * @returns 新的 token 和用户信息
 */
export async function changeUsername(data: ChangeUsernameRequest): Promise<LoginResponse> {
  const response = await api.put<LoginResponse>('/auth/username', data)
  return response.data
}

/**
 * 启用 OTP 二次验证
 *
 * 流程：
 * 1. 调用此接口获取 OTP secret 和二维码 URL
 * 2. 用户使用 Google Authenticator 扫描二维码
 * 3. 用户输入验证码调用 verifyOtp 完成启用
 *
 * @param password 用户密码（验证身份）
 * @returns OTP secret 和二维码 URL
 */
export async function setupOtp(password: string): Promise<SetupOtpResponse> {
  const response = await api.post<SetupOtpResponse>('/auth/setup-otp', { password })
  return response.data
}

/**
 * 验证 OTP 并完成启用
 *
 * @param data 包含 6 位 OTP 验证码
 */
export async function verifyOtp(data: VerifyOtpRequest): Promise<void> {
  await api.post('/auth/verify-otp', data)
}

/**
 * 禁用 OTP 二次验证
 *
 * @param data 包含密码和 OTP 验证码
 */
export async function disableOtp(data: DisableOtpRequest): Promise<void> {
  await api.delete('/auth/disable-otp', { data })
}

/**
 * 获取当前用户信息
 *
 * @returns 用户信息
 */
export async function getCurrentUser() {
  const response = await api.get('/auth/me')
  return response.data
}

/**
 * 获取当前用户的 OAuth 绑定列表
 */
export async function getOAuthAccounts(): Promise<OAuthAccount[]> {
  const response = await api.get<OAuthAccount[]>('/auth/oauth-accounts')
  return response.data
}

/**
 * 解绑 OAuth 账号
 *
 * @param id 绑定记录 ID
 */
export async function unbindOAuthAccount(id: string): Promise<void> {
  await api.delete(`/auth/oauth-accounts/${id}`)
}
