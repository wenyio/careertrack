import { describe, expect, it } from 'vitest'
import {
  addVisibleBasicInfoField,
  calculateAgeFromBirthday,
  hasBasicInfoExtraValue,
  removeVisibleBasicInfoField,
  toggleBasicInfoFieldIcon,
} from '@/utils/basic-info-display'
import type { BasicInfoDisplayConfig } from '@/types/resume'

describe('basic info display config updates', () => {
  const config: BasicInfoDisplayConfig = {
    visible_extra_fields: ['city', 'github'],
    field_icons: { city: 'home' },
    avatar_left: true,
  }

  it('adds a field once and preserves unrelated display options', () => {
    const added = addVisibleBasicInfoField(config, 'wechat')
    const duplicate = addVisibleBasicInfoField(added, 'wechat')

    expect(duplicate).toEqual({
      visible_extra_fields: ['city', 'github', 'wechat'],
      field_icons: { city: 'home' },
      avatar_left: true,
    })
  })

  it('removes only the requested field and preserves avatar placement', () => {
    expect(removeVisibleBasicInfoField(config, 'city')).toEqual({
      visible_extra_fields: ['github'],
      field_icons: { city: 'home' },
      avatar_left: true,
    })
  })

  it('toggles one icon without changing visible fields or avatar placement', () => {
    const hidden = toggleBasicInfoFieldIcon(config, 'city', 'home')
    const restored = toggleBasicInfoFieldIcon(hidden, 'city', 'home')

    expect(hidden).toEqual({
      visible_extra_fields: ['city', 'github'],
      field_icons: {},
      avatar_left: true,
    })
    expect(restored.field_icons).toEqual({ city: 'home' })
    expect(restored.avatar_left).toBe(true)
  })
})

describe('basic info extra values', () => {
  it('treats age zero as empty but keeps zero work years importable', () => {
    expect(hasBasicInfoExtraValue('age', 0)).toBe(false)
    expect(hasBasicInfoExtraValue('work_years', 0)).toBe(true)
    expect(hasBasicInfoExtraValue('city', '')).toBe(false)
    expect(hasBasicInfoExtraValue('city', '上海')).toBe(true)
  })

  it('calculates age around the birthday boundary', () => {
    expect(calculateAgeFromBirthday('2000-07-30', '2026-07-29')).toBe(25)
    expect(calculateAgeFromBirthday('2000-07-30', '2026-07-30')).toBe(26)
  })

  it('rejects future and implausibly old birthdays', () => {
    expect(calculateAgeFromBirthday('2030-01-01', '2026-07-30')).toBeUndefined()
    expect(calculateAgeFromBirthday('1800-01-01', '2026-07-30')).toBeUndefined()
  })
})
