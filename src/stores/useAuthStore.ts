/**
 * 认证状态管理
 *
 * 使用 Zustand 管理客户端认证状态
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/auth'

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean

  setToken: (token: string | null) => void
  setUser: (user: User | null) => void
  updateUser: (user: Partial<User>) => void
  loginSuccess: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setToken: (token) =>
        set({
          token,
          isAuthenticated: !!token,
        }),

      setUser: (user) => set({ user }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      loginSuccess: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),

      logout: () => {
        // 清除 cookie
        if (typeof window !== 'undefined') {
          document.cookie = 'token=; path=/; max-age=0'
        }
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
