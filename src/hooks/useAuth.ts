/**
 * 认证相关 Hooks
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { App } from 'antd'
import { login as loginApi, setupOtp as setupOtpApi, verifyOtp as verifyOtpApi, disableOtp as disableOtpApi, changeUsername as changeUsernameApi, getOAuthAccounts as getOAuthAccountsApi, unbindOAuthAccount as unbindOAuthAccountApi } from '@/services/auth'
import { useAuthStore } from '@/stores/useAuthStore'
import { queryClient } from '@/lib/query-client'
import { COOKIE_MAX_AGE } from '@/constants'
import { AUTH_PROVIDER } from '@/constants/auth'
import type { LoginRequest, ChangeUsernameRequest } from '@/types/auth'

/**
 * 登录 Hook
 */
export function useLogin() {
  const { loginSuccess } = useAuthStore()
  const router = useRouter()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (credentials: LoginRequest) => loginApi(credentials),
    onSuccess: (data) => {
      loginSuccess(data.token, data.user)
      message.success('登录成功')
      router.push('/resumes')
    },
    // 不在 onError 中显示通用错误，让调用方处理特定错误（如 OTP_REQUIRED）
  })
}

/**
 * 登出 Hook
 */
export function useLogout() {
  const { logout } = useAuthStore()
  const router = useRouter()
  const { message } = App.useApp()

  return () => {
    queryClient.clear()
    logout()
    router.push('/auth/login')
    message.success('已退出登录')
  }
}

/**
 * 启用 OTP Hook
 */
export function useSetupOtp() {
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (password: string) => setupOtpApi(password),
    onError: (error: Error) => {
      message.error(error.message || '启用 OTP 失败')
    },
  })
}

/**
 * 验证 OTP Hook
 */
export function useVerifyOtp() {
  const { updateUser } = useAuthStore()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (code: string) => verifyOtpApi({ code }),
    onSuccess: () => {
      // 更新本地用户状态
      updateUser({ otp_enabled: true })
      message.success('OTP 启用成功')
    },
    onError: (error: Error) => {
      message.error(error.message || 'OTP 验证失败')
    },
  })
}

/**
 * 禁用 OTP Hook
 */
export function useDisableOtp() {
  const { updateUser } = useAuthStore()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (data: { password: string; code: string }) => disableOtpApi(data),
    onSuccess: () => {
      // 更新本地用户状态
      updateUser({ otp_enabled: false })
      message.success('OTP 已禁用')
    },
    onError: (error: Error) => {
      message.error(error.message || '禁用 OTP 失败')
    },
  })
}

/**
 * 修改用户名 Hook
 */
export function useChangeUsername() {
  const { loginSuccess } = useAuthStore()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (data: ChangeUsernameRequest) => changeUsernameApi(data),
    onSuccess: (data) => {
      // 更新本地 token 和 user
      loginSuccess(data.token, data.user)
      // 刷新 cookie
      if (typeof window !== 'undefined') {
        document.cookie = `token=${data.token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
      }
      message.success('用户名修改成功')
    },
    onError: (error: Error) => {
      message.error(error.message || '修改用户名失败')
    },
  })
}

/**
 * 查询当前用户的 OAuth 绑定列表
 */
export function useOAuthAccounts() {
  return useQuery({
    queryKey: ['auth', 'oauth-accounts'],
    queryFn: getOAuthAccountsApi,
  })
}

/**
 * 解绑 OAuth 账号
 */
export function useUnbindOAuthAccount() {
  const { updateUser } = useAuthStore()
  const { user } = useAuthStore.getState()
  const { message } = App.useApp()

  return useMutation({
    mutationFn: (id: string) => unbindOAuthAccountApi(id),
    onSuccess: () => {
      // 更新本地 auth_provider：去掉 GITHUB 位
      if (user) {
        updateUser({ auth_provider: user.auth_provider & ~AUTH_PROVIDER.GITHUB })
      }
      queryClient.invalidateQueries({ queryKey: ['auth', 'oauth-accounts'] })
      message.success('已解绑 GitHub 账号')
    },
    onError: (error: Error) => {
      message.error(error.message || '解绑失败')
    },
  })
}
