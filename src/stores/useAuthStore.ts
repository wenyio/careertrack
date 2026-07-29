/**
 * 认证状态管理
 *
 * 使用 Zustand 管理客户端认证状态
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/auth'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  sessionReady: boolean

  setUser: (user: User | null) => void
  updateUser: (user: Partial<User>) => void
  loginSuccess: (user: User) => void
  logout: () => void
  setSessionReady: (ready: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      sessionReady: false,

      setUser: (user) => set({ user }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      loginSuccess: (user) =>
        set({
          user,
          isAuthenticated: true,
          sessionReady: true,
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          sessionReady: true,
        }),
      setSessionReady: (sessionReady) => set({ sessionReady }),
    }),
    {
      name: 'auth-storage',
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AuthState> & { token?: string }
        delete state.token
        return state as AuthState
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
