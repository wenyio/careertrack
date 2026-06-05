/**
 * buildResumeSavePayload 单元测试
 *
 * 验证简历保存 payload 生成逻辑：
 * - 完全来自 store，不隐式 merge profile
 * - preview_config 归一化
 * - 保留简历独有配置
 */

import { describe, it, expect } from 'vitest'
import { buildResumeSavePayload, mergeResumeContentWithProfile } from '../resume-preview'
import type { ResumeContent, ModulesConfig, ResumeModuleType, ResumeTemplateId } from '@/types/resume'
import type { Profile } from '@/types/profile'

const DEFAULT_MODULES_CONFIG: ModulesConfig = {
  basic_info: true,
  education: true,
  skills: true,
  work_experience: true,
  projects: true,
  portfolio: false,
  awards: true,
  other_experience: false,
  research: false,
  summary: true,
}

const DEFAULT_MODULES_ORDER: ResumeModuleType[] = [
  'basic_info', 'summary', 'education', 'skills', 'work_experience', 'projects', 'awards', 'portfolio', 'research', 'other_experience',
]

function makeStore(content: ResumeContent, overrides?: Partial<{
  resumeName: string
  modulesConfig: ModulesConfig
  modulesOrder: ResumeModuleType[]
  template: ResumeTemplateId
}>) {
  return {
    resumeName: overrides?.resumeName ?? '测试简历',
    modulesConfig: overrides?.modulesConfig ?? DEFAULT_MODULES_CONFIG,
    modulesOrder: overrides?.modulesOrder ?? DEFAULT_MODULES_ORDER,
    content,
    template: (overrides?.template ?? 'classic') as ResumeTemplateId,
  }
}

const SAMPLE_PROFILE: Profile = {
  basic_info: {
    name: '张三',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    job_intention: { position: '前端工程师' },
  },
  education: [{ id: 'edu-1', school: '清华大学', major: '计算机' }],
  skills: [{ id: 'sk-1', name: 'JavaScript' }],
  work_experience: [{ id: 'we-1', company: '字节跳动' }],
  projects: [],
  portfolio: [],
  awards: [],
  other_experience: [],
  research: [],
  summary: '我是张三',
}

describe('buildResumeSavePayload', () => {
  it('不带 profile 时保持 content 不变', () => {
    const content: ResumeContent = {
      basic_info: { name: '李四', phone: '13900139000' },
      education: [{ id: 'edu-2', school: '北京大学' }],
    }
    const payload = buildResumeSavePayload(makeStore(content), '原名称')

    expect(payload.name).toBe('测试简历')
    expect(payload.content.basic_info).toEqual({ name: '李四', phone: '13900139000' })
    expect(payload.content.education).toEqual([{ id: 'edu-2', school: '北京大学' }])
  })

  it('即使 content 字段为空也不从 profile 隐式 merge', () => {
    const content: ResumeContent = {
      basic_info: {},
      education: [],
      skills: [],
    }
    const payload = buildResumeSavePayload(makeStore(content))

    // 空值应保持原样，不应被 profile 数据填充
    expect(payload.content.basic_info).toEqual({})
    expect(payload.content.education).toEqual([])
    expect(payload.content.skills).toEqual([])
  })

  it('preview_config 归一化为合法默认值', () => {
    const content: ResumeContent = {
      basic_info: { name: '测试' },
      preview_config: { fontSize: 16, lineHeight: 1.8 },
    }
    const payload = buildResumeSavePayload(makeStore(content))

    expect(payload.content.preview_config).toEqual({ fontSize: 16, lineHeight: 1.8 })
  })

  it('preview_config 缺失时使用默认值', () => {
    const content: ResumeContent = {
      basic_info: { name: '测试' },
    }
    const payload = buildResumeSavePayload(makeStore(content))

    expect(payload.content.preview_config).toEqual({ fontSize: 14, lineHeight: 1.5 })
  })

  it('保留 basic_info_display 和 module_titles', () => {
    const content: ResumeContent = {
      basic_info: { name: '测试' },
      basic_info_display: {
        contact_fields: ['phone', 'email'],
        visible_extra_fields: ['city'],
      },
      module_titles: { education: '学习经历' },
    }
    const payload = buildResumeSavePayload(makeStore(content))

    expect(payload.content.basic_info_display).toEqual({
      contact_fields: ['phone', 'email'],
      visible_extra_fields: ['city'],
    })
    expect(payload.content.module_titles).toEqual({ education: '学习经历' })
  })

  it('resumeName 为空时 fallback 到 fallbackName', () => {
    const content: ResumeContent = { basic_info: {} }
    const store = makeStore(content)
    store.resumeName = ''
    const payload = buildResumeSavePayload(store, '原始名称')

    expect(payload.name).toBe('原始名称')
  })

  it('resumeName 和 fallbackName 都为空时使用默认名', () => {
    const content: ResumeContent = { basic_info: {} }
    const store = makeStore(content)
    store.resumeName = ''
    const payload = buildResumeSavePayload(store)

    expect(payload.name).toBe('未命名简历')
  })

  it('modules_config 和 modules_order 原样传递', () => {
    const content: ResumeContent = { basic_info: {} }
    const payload = buildResumeSavePayload(makeStore(content))

    expect(payload.modules_config).toBe(DEFAULT_MODULES_CONFIG)
    expect(payload.modules_order).toBe(DEFAULT_MODULES_ORDER)
  })

  it('template 原样传递', () => {
    const content: ResumeContent = { basic_info: {} }
    const payload = buildResumeSavePayload(makeStore(content, { template: 'modern' }))

    expect(payload.template).toBe('modern')
  })
})

describe('mergeResumeContentWithProfile（对比测试）', () => {
  it('空字段用 profile 兜底（undefined 字段）', () => {
    const content: ResumeContent = { basic_info: {} }
    const merged = mergeResumeContentWithProfile(content, SAMPLE_PROFILE)

    // basic_info 为空对象 → 用 profile 兜底
    expect(merged.basic_info).toEqual(SAMPLE_PROFILE.basic_info)
    // education 为 undefined → 用 profile 兜底
    expect(merged.education).toEqual(SAMPLE_PROFILE.education)
    expect(merged.summary).toBe('我是张三')
  })

  it('空数组字段不被 profile 兜底（[] 是 truthy）', () => {
    const content: ResumeContent = { basic_info: {}, education: [], summary: '' }
    const merged = mergeResumeContentWithProfile(content, SAMPLE_PROFILE)

    // [] 是 truthy，不会触发 fallback
    expect(merged.education).toEqual([])
    // '' 是 falsy，会触发 fallback
    expect(merged.summary).toBe('我是张三')
  })

  it('有值字段不被 profile 覆盖', () => {
    const content: ResumeContent = {
      basic_info: { name: '李四' },
      education: [{ id: 'edu-mine', school: '浙大' }],
      summary: '我是李四',
    }
    const merged = mergeResumeContentWithProfile(content, SAMPLE_PROFILE)

    expect(merged.basic_info).toEqual({ name: '李四' })
    expect(merged.education).toEqual([{ id: 'edu-mine', school: '浙大' }])
    expect(merged.summary).toBe('我是李四')
  })

  it('buildResumeSavePayload 不执行 mergeResumeContentWithProfile 的行为', () => {
    // 证明 buildResumeSavePayload 不会像 merge 那样用 profile 填充 undefined 字段
    const content: ResumeContent = { basic_info: {} }
    const storePayload = buildResumeSavePayload(makeStore(content))
    const mergedPreview = mergeResumeContentWithProfile(content, SAMPLE_PROFILE)

    // buildResumeSavePayload 保持原始值（空对象）
    expect(storePayload.content.basic_info).toEqual({})
    expect(storePayload.content.education).toBeUndefined()

    // mergeResumeContentWithProfile 会用 profile 填充 undefined 字段
    expect(mergedPreview.basic_info).toEqual(SAMPLE_PROFILE.basic_info)
    expect(mergedPreview.education).toEqual(SAMPLE_PROFILE.education)
  })
})
