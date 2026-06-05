/**
 * 主题状态管理
 *
 * 预留扩展，当前只支持浅色主题
 */

import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
}

export const useThemeStore = create<ThemeState>()(() => ({
  isDark: false,
}))
