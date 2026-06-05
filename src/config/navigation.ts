/**
 * 导航项集中配置
 *
 * 桌面主导航、移动端 Drawer、用户菜单、设置页导航、后台侧栏
 * 统一从此处派生，避免重复定义。
 */

import {
  UserOutlined,
  SafetyOutlined,
  DashboardOutlined,
  ApiOutlined,
  TeamOutlined,
  FileTextOutlined,
  KeyOutlined,
} from '@ant-design/icons'

/** 通用导航项 */
export interface NavItem {
  key: string
  label: string
  href: string
  icon?: React.ComponentType
  /** 需要的角色，不设置则对所有登录用户可见 */
  roles?: Array<'admin'>
  /** active 匹配规则 */
  match?: (pathname: string) => boolean
}

// ─── 主导航（桌面 Header 中部 tabs + 移动端 Drawer） ───

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    key: '/resumes',
    label: '我的简历',
    href: '/resumes',
    match: (p) => p.startsWith('/resumes') && !p.includes('/edit'),
  },
  {
    key: '/admin',
    label: '管理后台',
    href: '/admin',
    roles: ['admin'],
    match: (p) => p.startsWith('/admin'),
  },
]

// ─── 设置一级导航（全局 Header 设置模式 tabs） ───

export const SETTINGS_NAV_ITEMS: NavItem[] = [
  {
    key: '/settings/profile',
    label: '个人信息',
    href: '/settings/profile',
    match: (p) => p === '/settings/profile',
  },
  {
    key: '/settings/security',
    label: '账号安全',
    href: '/settings/security',
    match: (p) => p === '/settings/security',
  },
  {
    key: '/settings/mcp',
    label: 'MCP 服务',
    href: '/settings/mcp',
    match: (p) => p === '/settings/mcp',
  },
]

// ─── 后台侧栏导航 ───

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    key: '/admin',
    label: '概览',
    href: '/admin',
    icon: DashboardOutlined,
    match: (p) => p === '/admin',
  },
  {
    key: '/admin/users',
    label: '用户管理',
    href: '/admin/users',
    icon: TeamOutlined,
    match: (p) => p.startsWith('/admin/users'),
  },
  {
    key: '/admin/resumes',
    label: '简历管理',
    href: '/admin/resumes',
    icon: FileTextOutlined,
    match: (p) => p.startsWith('/admin/resumes'),
  },
  {
    key: '/admin/registration-codes',
    label: '注册码管理',
    href: '/admin/registration-codes',
    icon: KeyOutlined,
    match: (p) => p.startsWith('/admin/registration-codes'),
  },
]

// ─── 用户下拉菜单（不含退出登录，退出登录由 AppLayout 单独处理） ───

export const USER_MENU_ITEMS: NavItem[] = [
  {
    key: '/admin',
    label: '管理后台',
    href: '/admin',
    icon: DashboardOutlined,
    roles: ['admin'],
  },
  {
    key: '/settings/profile',
    label: '个人信息',
    href: '/settings/profile',
    icon: UserOutlined,
  },
  {
    key: '/settings/security',
    label: '账号安全',
    href: '/settings/security',
    icon: SafetyOutlined,
  },
  {
    key: '/settings/mcp',
    label: 'MCP 服务',
    href: '/settings/mcp',
    icon: ApiOutlined,
  },
]
