/**
 * 导航路由归属判断纯函数
 *
 * 用于 AppLayout 及其他导航组件，消除字符串模糊匹配。
 */

/** /auth/* 认证页（登录、注册、迁移、OAuth 回调） */
export function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth/')
}

/** /admin/* 后台管理页 */
export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin')
}

/** /settings/* 设置页 */
export function isSettingsRoute(pathname: string): boolean {
  return pathname === '/settings' || pathname.startsWith('/settings/')
}

/** /resumes 简历列表（精确匹配，不含子路由） */
export function isResumeListRoute(pathname: string): boolean {
  return pathname === '/resumes'
}

/** /resumes/[id]/edit 简历编辑器 */
export function isResumeEditorRoute(pathname: string): boolean {
  return /^\/resumes\/[^/]+\/edit$/.test(pathname)
}

/** /resume/* 公开简历页（注意：不含 /resumes） */
export function isPublicResumeRoute(pathname: string): boolean {
  return pathname.startsWith('/resume/')
}

/** 是否使用游客 Header（未登录 + 简历列表或简历子路由） */
export function shouldUseGuestHeader(pathname: string, isAuthenticated: boolean): boolean {
  if (isAuthenticated) return false
  return pathname === '/resumes' || pathname.startsWith('/resumes/')
}

/**
 * 是否隐藏全局应用导航
 *
 * 隐藏导航的路由：认证页、简历编辑器、公开简历页
 * 不隐藏导航的路由：/resumes 列表、/settings/*、/admin/*
 */
export function shouldHideAppNavigation(pathname: string): boolean {
  return isAuthRoute(pathname)
    || isResumeEditorRoute(pathname)
    || isPublicResumeRoute(pathname)
}

/** 导航模式 */
export type NavigationMode = 'none' | 'guest' | 'full'

/**
 * 获取当前页面的导航模式
 *
 * - 'none': 不显示任何全局导航（认证页、编辑器、公开简历）
 * - 'guest': 显示游客 Header（未登录 + 简历相关页）
 * - 'full': 显示完整全局导航
 */
export function getAppNavigationMode(
  pathname: string,
  isAuthenticated: boolean,
): NavigationMode {
  if (shouldHideAppNavigation(pathname)) return 'none'
  if (shouldUseGuestHeader(pathname, isAuthenticated)) return 'guest'
  return 'full'
}
