import { describe, expect, it } from 'vitest'
import { buildInitialContentFromProfile } from '@/lib/services/resume'

describe('resume service profile initialization', () => {
  it('copies only one self evaluation into resume summary', () => {
    const content = buildInitialContentFromProfile({
      basic_info: { name: '张三' },
      self_evaluations: [
        { id: 'eval-1', title: '技术岗位', description: '面向技术岗位' },
        { id: 'eval-2', title: '产品岗位', description: '面向产品岗位' },
      ],
      summary: '旧版简介',
    })

    expect(content).toMatchObject({
      basic_info: { name: '张三' },
      summary: '面向技术岗位',
    })
    expect(content.self_evaluations).toBeUndefined()
  })
})
