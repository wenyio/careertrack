/**
 * 导航项集中配置
 *
 * 桌面主导航、移动端 Drawer、用户菜单、后台侧栏
 * 统一从此处派生，避免重复定义。
 */

import {
  UserOutlined,
  SafetyOutlined,
  DashboardOutlined,
  ApiOutlined,
  TeamOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  KeyOutlined,
} from '@ant-design/icons'

/** 通用导航项 */
export interface NavItem {
  key: string
  label: string
  labelKey?: string
  href: string
  icon?: React.ComponentType
  /** 需要的角色，不设置则对所有登录用户可见 */
  roles?: Array<'admin'>
  /** active 匹配规则 */
  match?: (pathname: string) => boolean
}

// ─── 主导航（高频工作区：桌面 Header 中部 tabs + 移动端 Drawer） ───

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    key: '/resumes',
    label: '我的简历',
    labelKey: 'nav.resumes',
    href: '/resumes',
    match: (p) => p.startsWith('/resumes') && !p.includes('/edit'),
  },
  {
    key: '/applications',
    label: '求职进展',
    labelKey: 'nav.applications',
    href: '/applications',
    icon: FundProjectionScreenOutlined,
    match: (p) => p.startsWith('/applications'),
  },
  {
    key: '/profile',
    label: '个人信息',
    labelKey: 'nav.profile',
    href: '/profile',
    icon: UserOutlined,
    match: (p) => p === '/profile' || p === '/settings/profile',
  },
  {
    key: '/admin',
    label: '管理后台',
    labelKey: 'nav.admin',
    href: '/admin',
    roles: ['admin'],
    match: (p) => p.startsWith('/admin'),
  },
]

// ─── 账号菜单导航（低频配置：头像下拉 + 移动端 Drawer） ───

export const ACCOUNT_NAV_ITEMS: NavItem[] = [
  {
    key: '/settings/security',
    label: '账号安全',
    labelKey: 'nav.security',
    href: '/settings/security',
    icon: SafetyOutlined,
    match: (p) => p === '/settings/security',
  },
  {
    key: '/settings/mcp',
    label: 'MCP 服务',
    labelKey: 'nav.mcp',
    href: '/settings/mcp',
    icon: ApiOutlined,
    match: (p) => p === '/settings/mcp',
  },
]

// ─── 后台侧栏导航 ───

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    key: '/admin',
    label: '概览',
    labelKey: 'nav.overview',
    href: '/admin',
    icon: DashboardOutlined,
    match: (p) => p === '/admin',
  },
  {
    key: '/admin/users',
    label: '用户管理',
    labelKey: 'nav.users',
    href: '/admin/users',
    icon: TeamOutlined,
    match: (p) => p.startsWith('/admin/users'),
  },
  {
    key: '/admin/resumes',
    label: '简历管理',
    labelKey: 'nav.adminResumes',
    href: '/admin/resumes',
    icon: FileTextOutlined,
    match: (p) => p.startsWith('/admin/resumes'),
  },
  {
    key: '/admin/registration-codes',
    label: '注册码管理',
    labelKey: 'nav.registrationCodes',
    href: '/admin/registration-codes',
    icon: KeyOutlined,
    match: (p) => p.startsWith('/admin/registration-codes'),
  },
]

// ─── 用户下拉菜单（不含退出登录，退出登录由 AppLayout 单独处理） ───

export const USER_MENU_ITEMS: NavItem[] = [
  ...ACCOUNT_NAV_ITEMS,
]
