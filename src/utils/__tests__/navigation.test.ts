import { describe, it, expect } from 'vitest'
import {
  isAuthRoute,
  isAdminRoute,
  isSettingsRoute,
  isResumeListRoute,
  isResumeEditorRoute,
  isPublicResumeRoute,
  shouldUseGuestHeader,
  shouldHideAppNavigation,
  getAppNavigationMode,
} from '../navigation'

describe('isAuthRoute', () => {
  it('matches /auth/login', () => expect(isAuthRoute('/auth/login')).toBe(true))
  it('matches /auth/register', () => expect(isAuthRoute('/auth/register')).toBe(true))
  it('matches /auth/migrate', () => expect(isAuthRoute('/auth/migrate')).toBe(true))
  it('matches /auth/oauth/callback', () => expect(isAuthRoute('/auth/oauth/callback')).toBe(true))
  it('rejects /resumes', () => expect(isAuthRoute('/resumes')).toBe(false))
  it('rejects /admin', () => expect(isAuthRoute('/admin')).toBe(false))
  it('rejects root /', () => expect(isAuthRoute('/')).toBe(false))
})

describe('isAdminRoute', () => {
  it('matches /admin', () => expect(isAdminRoute('/admin')).toBe(true))
  it('matches /admin/users', () => expect(isAdminRoute('/admin/users')).toBe(true))
  it('matches /admin/resumes', () => expect(isAdminRoute('/admin/resumes')).toBe(true))
  it('matches /admin/registration-codes', () => expect(isAdminRoute('/admin/registration-codes')).toBe(true))
  it('rejects /resumes', () => expect(isAdminRoute('/resumes')).toBe(false))
  it('rejects /auth/admin', () => expect(isAdminRoute('/auth/admin')).toBe(false))
})

describe('isSettingsRoute', () => {
  it('matches /settings/profile', () => expect(isSettingsRoute('/settings/profile')).toBe(true))
  it('matches /settings/security', () => expect(isSettingsRoute('/settings/security')).toBe(true))
  it('matches /settings/mcp', () => expect(isSettingsRoute('/settings/mcp')).toBe(true))
  it('matches /settings/avatar-tool', () => expect(isSettingsRoute('/settings/avatar-tool')).toBe(true))
  it('rejects /resumes', () => expect(isSettingsRoute('/resumes')).toBe(false))
  it('rejects /settingsx', () => expect(isSettingsRoute('/settingsx')).toBe(false))
})

describe('isResumeListRoute', () => {
  it('matches /resumes', () => expect(isResumeListRoute('/resumes')).toBe(true))
  it('rejects /resumes/123', () => expect(isResumeListRoute('/resumes/123')).toBe(false))
  it('rejects /resumes/123/edit', () => expect(isResumeListRoute('/resumes/123/edit')).toBe(false))
  it('rejects /', () => expect(isResumeListRoute('/')).toBe(false))
})

describe('isResumeEditorRoute', () => {
  it('matches /resumes/abc123/edit', () => expect(isResumeEditorRoute('/resumes/abc123/edit')).toBe(true))
  it('matches /resumes/guest-1/edit', () => expect(isResumeEditorRoute('/resumes/guest-1/edit')).toBe(true))
  it('rejects /resumes', () => expect(isResumeEditorRoute('/resumes')).toBe(false))
  it('rejects /resumes/123', () => expect(isResumeEditorRoute('/resumes/123')).toBe(false))
  it('rejects /resumes/123/edit/extra', () => expect(isResumeEditorRoute('/resumes/123/edit/extra')).toBe(false))
  it('rejects /admin/resumes/123/edit', () => expect(isResumeEditorRoute('/admin/resumes/123/edit')).toBe(false))
})

describe('isPublicResumeRoute', () => {
  it('matches /resume/some-slug', () => expect(isPublicResumeRoute('/resume/some-slug')).toBe(true))
  it('matches /resume/preview/123', () => expect(isPublicResumeRoute('/resume/preview/123')).toBe(true))
  it('rejects /resumes', () => expect(isPublicResumeRoute('/resumes')).toBe(false))
  it('rejects /resumes/123/edit', () => expect(isPublicResumeRoute('/resumes/123/edit')).toBe(false))
})

describe('shouldUseGuestHeader', () => {
  it('returns true for /resumes when not authenticated', () => {
    expect(shouldUseGuestHeader('/resumes', false)).toBe(true)
  })
  it('returns true for /resumes/123 when not authenticated', () => {
    expect(shouldUseGuestHeader('/resumes/123', false)).toBe(true)
  })
  it('returns false for /resumes when authenticated', () => {
    expect(shouldUseGuestHeader('/resumes', true)).toBe(false)
  })
  it('returns false for /settings/profile when not authenticated', () => {
    expect(shouldUseGuestHeader('/settings/profile', false)).toBe(false)
  })
  it('returns false for /admin when not authenticated', () => {
    expect(shouldUseGuestHeader('/admin', false)).toBe(false)
  })
})

describe('shouldHideAppNavigation', () => {
  it('hides for /auth/login', () => expect(shouldHideAppNavigation('/auth/login')).toBe(true))
  it('hides for /auth/oauth/callback', () => expect(shouldHideAppNavigation('/auth/oauth/callback')).toBe(true))
  it('hides for /resumes/abc/edit', () => expect(shouldHideAppNavigation('/resumes/abc/edit')).toBe(true))
  it('hides for /resume/some-slug', () => expect(shouldHideAppNavigation('/resume/some-slug')).toBe(true))
  it('hides for /resume/preview/123', () => expect(shouldHideAppNavigation('/resume/preview/123')).toBe(true))
  it('does NOT hide for /resumes', () => expect(shouldHideAppNavigation('/resumes')).toBe(false))
  it('does NOT hide for /settings/profile', () => expect(shouldHideAppNavigation('/settings/profile')).toBe(false))
  it('does NOT hide for /admin', () => expect(shouldHideAppNavigation('/admin')).toBe(false))
})

describe('getAppNavigationMode', () => {
  it('returns none for auth routes', () => {
    expect(getAppNavigationMode('/auth/login', false)).toBe('none')
    expect(getAppNavigationMode('/auth/register', true)).toBe('none')
    expect(getAppNavigationMode('/auth/oauth/callback', false)).toBe('none')
  })
  it('returns none for editor routes', () => {
    expect(getAppNavigationMode('/resumes/abc/edit', true)).toBe('none')
    expect(getAppNavigationMode('/resumes/guest-1/edit', false)).toBe('none')
  })
  it('returns none for public resume routes', () => {
    expect(getAppNavigationMode('/resume/some-slug', false)).toBe('none')
    expect(getAppNavigationMode('/resume/preview/123', true)).toBe('none')
  })
  it('returns guest for /resumes when not authenticated', () => {
    expect(getAppNavigationMode('/resumes', false)).toBe('guest')
  })
  it('returns full for /resumes when authenticated', () => {
    expect(getAppNavigationMode('/resumes', true)).toBe('full')
  })
  it('returns full for /settings/* when authenticated', () => {
    expect(getAppNavigationMode('/settings/profile', true)).toBe('full')
    expect(getAppNavigationMode('/settings/security', true)).toBe('full')
    expect(getAppNavigationMode('/settings/mcp', true)).toBe('full')
  })
  it('returns full for /admin when authenticated', () => {
    expect(getAppNavigationMode('/admin', true)).toBe('full')
    expect(getAppNavigationMode('/admin/users', true)).toBe('full')
  })
})
