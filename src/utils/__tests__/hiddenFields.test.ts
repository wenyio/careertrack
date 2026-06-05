/**
 * 字段隐藏功能测试
 *
 * 验证：
 * - isFieldHiddenOnItem 正确判断隐藏状态
 * - MODULE_RENDERERS subtitle 过滤隐藏字段
 * - 隐藏字段值仍保留在 raw item 中
 */

import { describe, it, expect } from 'vitest'
import { isFieldHiddenOnItem, toggleHiddenFieldOnItem, MODULE_RENDERERS } from '../resume-preview'

describe('isFieldHiddenOnItem', () => {
  it('无 _hidden_fields 时返回 false', () => {
    expect(isFieldHiddenOnItem({ city: '北京' }, 'city')).toBe(false)
  })

  it('空数组时返回 false', () => {
    expect(isFieldHiddenOnItem({ city: '北京', _hidden_fields: [] }, 'city')).toBe(false)
  })

  it('字段在隐藏列表中返回 true', () => {
    expect(isFieldHiddenOnItem({ city: '北京', _hidden_fields: ['city'] }, 'city')).toBe(true)
  })

  it('字段不在隐藏列表中返回 false', () => {
    expect(isFieldHiddenOnItem({ city: '北京', _hidden_fields: ['role'] }, 'city')).toBe(false)
  })

  it('item 为 null/undefined 时返回 false', () => {
    expect(isFieldHiddenOnItem(null, 'city')).toBe(false)
    expect(isFieldHiddenOnItem(undefined, 'city')).toBe(false)
  })

  it('_hidden_fields 不是数组时返回 false', () => {
    expect(isFieldHiddenOnItem({ city: '北京', _hidden_fields: 'city' }, 'city')).toBe(false)
  })
})

describe('toggleHiddenFieldOnItem', () => {
  it('无 _hidden_fields 时添加隐藏字段', () => {
    const item = { id: '1', city: '北京' }
    const result = toggleHiddenFieldOnItem(item, 'city')
    expect(result._hidden_fields).toEqual(['city'])
    expect(isFieldHiddenOnItem(result, 'city')).toBe(true)
    // 原对象不变
    expect(item._hidden_fields).toBeUndefined()
  })

  it('字段已隐藏时移除', () => {
    const item = { id: '1', city: '北京', _hidden_fields: ['city'] }
    const result = toggleHiddenFieldOnItem(item, 'city')
    expect(result._hidden_fields).toBeUndefined()
    expect(isFieldHiddenOnItem(result, 'city')).toBe(false)
  })

  it('移除后如果列表为空，删除 _hidden_fields', () => {
    const item = { id: '1', city: '北京', _hidden_fields: ['city'] }
    const result = toggleHiddenFieldOnItem(item, 'city')
    expect('_hidden_fields' in result).toBe(false)
  })

  it('添加时不影响已有的其他隐藏字段', () => {
    const item = { id: '1', city: '北京', role: '负责人', _hidden_fields: ['role'] }
    const result = toggleHiddenFieldOnItem(item, 'city')
    expect(result._hidden_fields).toEqual(['role', 'city'])
    expect(isFieldHiddenOnItem(result, 'role')).toBe(true)
    expect(isFieldHiddenOnItem(result, 'city')).toBe(true)
  })

  it('移除时不影响已有的其他隐藏字段', () => {
    const item = { id: '1', city: '北京', role: '负责人', _hidden_fields: ['role', 'city'] }
    const result = toggleHiddenFieldOnItem(item, 'city')
    expect(result._hidden_fields).toEqual(['role'])
    expect(isFieldHiddenOnItem(result, 'role')).toBe(true)
    expect(isFieldHiddenOnItem(result, 'city')).toBe(false)
  })

  it('不修改原对象', () => {
    const item = { id: '1', city: '北京' }
    toggleHiddenFieldOnItem(item, 'city')
    expect(item._hidden_fields).toBeUndefined()
  })
})

describe('MODULE_RENDERERS education subtitle 隐藏字段', () => {
  const eduRenderer = MODULE_RENDERERS.education!
  const getContent = (edu: Record<string, unknown>) => ({ education: [edu] }) as Parameters<typeof eduRenderer.getItems>[0]

  it('所有字段可见时 subtitle 包含全部', () => {
    const item = { id: '1', school: '清华', major: '计算机', degree: '本科', degree_type: '全日制', college: '计算机学院', city: '北京' }
    const subtitle = eduRenderer.getSubtitle!(item)
    expect(subtitle).toBe('计算机 · 本科 · 全日制 · 计算机学院 · 北京')
  })

  it('city 隐藏后 subtitle 不含 city，但值仍在 item 中', () => {
    const item = { id: '1', major: '计算机', degree: '本科', city: '北京', _hidden_fields: ['city'] }
    const subtitle = eduRenderer.getSubtitle!(item)
    expect(subtitle).toBe('计算机 · 本科')
    // 值仍保留
    expect(item.city).toBe('北京')
  })

  it('degree 隐藏后 subtitle 不含 degree', () => {
    const item = { id: '1', major: '计算机', degree: '本科', city: '北京', _hidden_fields: ['degree'] }
    const subtitle = eduRenderer.getSubtitle!(item)
    expect(subtitle).toBe('计算机 · 北京')
  })

  it('多个字段隐藏后只显示未隐藏的', () => {
    const item = { id: '1', major: '计算机', degree: '本科', college: '计算机学院', city: '北京', _hidden_fields: ['degree', 'city'] }
    const subtitle = eduRenderer.getSubtitle!(item)
    expect(subtitle).toBe('计算机 · 计算机学院')
  })

  it('所有字段隐藏后 subtitle 为 undefined', () => {
    const item = { id: '1', major: '计算机', degree: '本科', _hidden_fields: ['major', 'degree'] }
    const subtitle = eduRenderer.getSubtitle!(item)
    expect(subtitle).toBeUndefined()
  })

  it('getItems 仍返回完整数据', () => {
    const content = getContent({ id: '1', major: '计算机', city: '北京', _hidden_fields: ['city'] })
    const items = eduRenderer.getItems(content)
    expect(items[0].city).toBe('北京')
  })
})

describe('MODULE_RENDERERS work_experience subtitle 隐藏字段', () => {
  const weRenderer = MODULE_RENDERERS.work_experience!

  it('position 隐藏后 subtitle 不含 position', () => {
    const item = { id: '1', company: '字节', position: '前端', department: '技术部', city: '北京', _hidden_fields: ['position'] }
    const subtitle = weRenderer.getSubtitle!(item)
    expect(subtitle).toBe('技术部 · 北京')
  })
})

describe('MODULE_RENDERERS projects subtitle 隐藏字段', () => {
  const projRenderer = MODULE_RENDERERS.projects!

  it('role 和 city 隐藏后 subtitle 为 undefined', () => {
    const item = { id: '1', name: '项目', role: '负责人', city: '北京', _hidden_fields: ['role', 'city'] }
    const subtitle = projRenderer.getSubtitle!(item)
    expect(subtitle).toBeUndefined()
  })
})
