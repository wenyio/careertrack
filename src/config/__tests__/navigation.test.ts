import { describe, expect, it } from 'vitest'
import { ACCOUNT_NAV_ITEMS, MAIN_NAV_ITEMS, USER_MENU_ITEMS } from '../navigation'

describe('navigation information architecture', () => {
  it('keeps high-frequency work areas in the main navigation', () => {
    expect(MAIN_NAV_ITEMS.map((item) => item.label)).toEqual([
      '我的简历',
      '求职进展',
      '个人信息',
      '管理后台',
    ])
  })

  it('keeps low-frequency configuration in the account menu', () => {
    expect(ACCOUNT_NAV_ITEMS.map((item) => item.label)).toEqual([
      '账号安全',
      'MCP 服务',
    ])
    expect(USER_MENU_ITEMS).toEqual(ACCOUNT_NAV_ITEMS)
  })

  it('uses /profile as the canonical personal information entry', () => {
    const profileItem = MAIN_NAV_ITEMS.find((item) => item.label === '个人信息')

    expect(profileItem?.href).toBe('/profile')
    expect(profileItem?.match?.('/profile')).toBe(true)
    expect(profileItem?.match?.('/settings/profile')).toBe(true)
  })
})
