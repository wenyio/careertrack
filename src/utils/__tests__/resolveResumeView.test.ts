/**
 * resolveResumeView 单元测试
 *
 * 验证：
 * - 默认不 fallback profile（fallbackProfile=false）
 * - 显式 fallbackProfile=true 时合并 profile
 * - intentions 使用结构化数组
 */

import { describe, it, expect } from 'vitest'
import { resolveResumeView } from '../resolve-resume-view'
import type { ResumeContent, ModulesConfig, ResumeModuleType } from '@/types/resume'
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

const SAMPLE_PROFILE: Profile = {
  basic_info: {
    name: '张三',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    job_intention: { position: '前端工程师', expected_city: '北京', expected_salary: '20k-30k' },
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

describe('resolveResumeView', () => {
  it('默认不 fallback profile，空 content 保持空', () => {
    const content: ResumeContent = { basic_info: {} }
    const vm = resolveResumeView(content, SAMPLE_PROFILE, DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER)

    // basic_info 为空，不应从 profile 合并
    expect(vm.basicInfo.displayName).toBe('您的姓名')
    // 无模块内容
    expect(vm.modules).toEqual([])
    expect(vm.summary).toBeUndefined()
  })

  it('显式 fallbackProfile=true 时合并 profile', () => {
    const content: ResumeContent = { basic_info: {} }
    const vm = resolveResumeView(content, SAMPLE_PROFILE, DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER, undefined, { fallbackProfile: true })

    // basic_info 应从 profile 合并
    expect(vm.basicInfo.displayName).toBe('张三')
    // 应有模块内容
    expect(vm.modules.length).toBeGreaterThan(0)
    expect(vm.summary).toBe('我是张三')
  })

  it('content 有值时不被 profile 覆盖', () => {
    const content: ResumeContent = {
      basic_info: { name: '李四' },
      summary: '我是李四',
    }
    const vm = resolveResumeView(content, SAMPLE_PROFILE, DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER)

    expect(vm.basicInfo.displayName).toBe('李四')
    expect(vm.summary).toBe('我是李四')
  })

  it('intentions 使用结构化数组', () => {
    const content: ResumeContent = {
      basic_info: {
        name: '测试',
        job_intention: { position: '前端工程师', expected_city: '北京', expected_salary: '20k-30k' },
      },
    }
    const vm = resolveResumeView(content, undefined, DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER)

    expect(vm.basicInfo.intentions).toBeInstanceOf(Array)
    expect(vm.basicInfo.intentions.length).toBeGreaterThan(0)
    // 每个 intention 应有 field、value、icon
    for (const item of vm.basicInfo.intentions) {
      expect(item).toHaveProperty('field')
      expect(item).toHaveProperty('value')
      expect(item).toHaveProperty('icon')
    }
    // position 应使用 aim 图标
    const positionItem = vm.basicInfo.intentions.find((i) => i.field === 'position_label')
    expect(positionItem?.icon).toBe('aim')
  })

  it('无 job_intention 时 intentions 为空', () => {
    const content: ResumeContent = {
      basic_info: { name: '测试' },
    }
    const vm = resolveResumeView(content, undefined, DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER)

    expect(vm.basicInfo.intentions).toEqual([])
  })

  it('black-white 模板包含 current_status 意向', () => {
    const content: ResumeContent = {
      basic_info: {
        name: '测试',
        job_intention: { current_status: '在职', position: '前端工程师', expected_city: '北京' },
      },
    }
    const vm = resolveResumeView(content, undefined, DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER, 'black-white')

    expect(vm.basicInfo.intentions.length).toBe(3)
    expect(vm.basicInfo.intentions[0].field).toBe('current_status')
    expect(vm.basicInfo.intentions[0].icon).toBe('tag')
    expect(vm.basicInfo.intentions[1].field).toBe('position_label')
    expect(vm.basicInfo.intentions[1].icon).toBe('aim')
    expect(vm.basicInfo.intentions[2].field).toBe('expected_city')
    expect(vm.basicInfo.intentions[2].icon).toBe('environment')
  })

  it('current_status 缺失时 position_label 不错位，图标仍为 aim', () => {
    const content: ResumeContent = {
      basic_info: {
        name: '测试',
        job_intention: { position: '前端工程师', expected_city: '北京' },
      },
    }
    const vm = resolveResumeView(content, undefined, DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER, 'black-white')

    // current_status 缺失，position_label 应排第一
    expect(vm.basicInfo.intentions.length).toBe(2)
    expect(vm.basicInfo.intentions[0].field).toBe('position_label')
    expect(vm.basicInfo.intentions[0].icon).toBe('aim')
    expect(vm.basicInfo.intentions[0].value).toBe('期望职位：前端工程师')
    expect(vm.basicInfo.intentions[1].field).toBe('expected_city')
    expect(vm.basicInfo.intentions[1].icon).toBe('environment')
  })

  it('非 black-white 模板没有 position 时不显示意向', () => {
    const content: ResumeContent = {
      basic_info: {
        name: '测试',
        job_intention: { current_status: '在职', expected_city: '北京' },
      },
    }
    const vm = resolveResumeView(content, undefined, DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER)

    expect(vm.basicInfo.intentions).toEqual([])
  })
})
