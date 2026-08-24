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

  it('copies only one profile job intention into resume basic info', () => {
    const content = buildInitialContentFromProfile({
      basic_info: {
        name: '张三',
        job_intention: {
          position: '旧岗位',
          expected_city: '杭州',
        },
      },
      job_intentions: [
        {
          id: 'job-1',
          title: '技术岗位',
          current_status: '在职',
          position: '前端工程师',
          expected_city: '上海',
          expected_salary: '30-40K',
        },
        {
          id: 'job-2',
          title: '产品岗位',
          current_status: '离职',
          position: '产品经理',
          expected_city: '北京',
          expected_salary: '25-35K',
        },
      ],
    })

    expect(content).toMatchObject({
      basic_info: {
        name: '张三',
        job_intention: {
          current_status: '在职',
          position: '前端工程师',
          expected_city: '上海',
          expected_salary: '30-40K',
        },
      },
    })
    expect(content.job_intentions).toBeUndefined()
  })
})
