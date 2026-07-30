import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MODULES_CONFIG,
  DEFAULT_MODULES_ORDER,
} from '@/types/resume'
import { buildResumeEditorInitialData } from '@/utils/resume-editor'

describe('buildResumeEditorInitialData', () => {
  it('为缺失的旧数据补齐编辑器默认值', () => {
    const result = buildResumeEditorInitialData({
      id: 'resume-1',
      name: '',
      modules_config: null,
      modules_order: null,
      content: null,
      template: null,
    })

    expect(result).toEqual({
      id: 'resume-1',
      name: '未命名简历',
      modulesConfig: DEFAULT_MODULES_CONFIG,
      modulesOrder: DEFAULT_MODULES_ORDER,
      content: { basic_info: {} },
      template: 'classic',
    })
    expect(result.modulesConfig).not.toBe(DEFAULT_MODULES_CONFIG)
    expect(result.modulesOrder).not.toBe(DEFAULT_MODULES_ORDER)
  })

  it('保留数据源内容并强制启用基本信息模块', () => {
    const modulesConfig = {
      ...DEFAULT_MODULES_CONFIG,
      basic_info: false,
      projects: true,
    }
    const modulesOrder = [...DEFAULT_MODULES_ORDER].reverse()
    const result = buildResumeEditorInitialData({
      id: 'resume-2',
      name: '项目简历',
      modules_config: modulesConfig,
      modules_order: modulesOrder,
      content: {
        basic_info: { name: '张三' },
        module_titles: { projects: '代表项目' },
      },
      template: 'modern',
    })

    expect(result.modulesConfig).toEqual({
      ...modulesConfig,
      basic_info: true,
    })
    expect(result.modulesOrder).toEqual(modulesOrder)
    expect(result.modulesOrder).not.toBe(modulesOrder)
    expect(result.content).toEqual({
      basic_info: { name: '张三' },
      module_titles: { projects: '代表项目' },
    })
    expect(result.template).toBe('modern')
  })
})
