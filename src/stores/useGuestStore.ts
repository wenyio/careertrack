/**
 * 游客模式状态管理
 *
 * 使用 Zustand + persist 记录游客模式状态。
 * 存储在 localStorage key 'guest-mode'。
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GuestState {
  isGuest: boolean
  enterGuestMode: () => void
  exitGuestMode: () => void
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      isGuest: false,

      enterGuestMode: () => {
        set({ isGuest: true })
      },

      exitGuestMode: () => {
        set({ isGuest: false })
      },
    }),
    {
      name: 'guest-mode',
    },
  ),
)
