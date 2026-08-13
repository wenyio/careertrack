import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BaseResumePreview } from '@/components/resume/templates/base-resume-renderer'
import type {
  ModulesConfig,
  ResumeContent,
  ResumeModuleType,
} from '@/types/resume'

const summaryOnlyConfig: ModulesConfig = {
  basic_info: true,
  education: false,
  skills: false,
  work_experience: false,
  projects: false,
  portfolio: false,
  awards: false,
  other_experience: false,
  research: false,
  summary: true,
}

const summaryOnlyOrder: ResumeModuleType[] = ['basic_info', 'summary']

describe('resume templates', () => {
  it('renders the enabled summary in the black-white template', () => {
    const content: ResumeContent = {
      basic_info: { name: '张三' },
      summary: '专注于前端工程与用户体验。',
    }

    const html = renderToStaticMarkup(createElement(BaseResumePreview, {
      content,
      modulesConfig: summaryOnlyConfig,
      modulesOrder: summaryOnlyOrder,
      template: 'black-white',
    }))

    expect(html).toContain('自我评价')
    expect(html).toContain('专注于前端工程与用户体验。')
  })

  it('does not render present for education with unfilled dates', () => {
    const content: ResumeContent = {
      basic_info: { name: '张三' },
      education: [{
        id: 'education-1',
        school: '示例大学',
        start_date: '',
        end_date: null,
      }],
    }
    const modulesConfig: ModulesConfig = {
      ...summaryOnlyConfig,
      education: true,
      summary: false,
    }

    const html = renderToStaticMarkup(createElement(BaseResumePreview, {
      content,
      modulesConfig,
      modulesOrder: ['basic_info', 'education'],
      template: 'black-white',
    }))

    expect(html).toContain('示例大学')
    expect(html).not.toContain('至今')
  })

  it('renders black-white compact education with major after school', () => {
    const content: ResumeContent = {
      basic_info: { name: '张三' },
      education: [{
        id: 'education-1',
        school: '示例大学',
        major: '计算机科学',
        degree: '本科',
        degree_type: '全日制',
        college: '信息学院',
        city: '北京',
        start_date: '2016-09',
        end_date: '2020-06',
      }],
      template_settings: {
        black_white: {
          education_compact: true,
        },
      },
    }
    const modulesConfig: ModulesConfig = {
      ...summaryOnlyConfig,
      education: true,
      summary: false,
    }

    const html = renderToStaticMarkup(createElement(BaseResumePreview, {
      content,
      modulesConfig,
      modulesOrder: ['basic_info', 'education'],
      template: 'black-white',
    }))

    expect(html).toMatch(/示例大学[\s\S]*计算机科学/)
    expect(html).toMatch(/示例大学[\s\S]*本科/)
    expect(html).toMatch(/示例大学[\s\S]*全日制/)
    expect(html).toMatch(/示例大学[\s\S]*信息学院/)
    expect(html).toMatch(/示例大学[\s\S]*北京/)
    expect(html).toContain('2016-09 ~ 2020-06')
  })

  it('renders black-white compact work and projects inline metadata', () => {
    const content: ResumeContent = {
      basic_info: { name: '张三' },
      work_experience: [{
        id: 'work-1',
        company: '示例科技',
        position: '前端工程师',
        department: '增长团队',
        city: '上海',
        start_date: '2021-01',
        end_date: null,
      }],
      projects: [{
        id: 'project-1',
        name: '增长平台',
        role: '负责人',
        city: '杭州',
        link: 'https://example.com/project',
        start_date: '2022-03',
        end_date: '2022-12',
      }],
      template_settings: {
        black_white: {
          work_experience_compact: true,
          projects_compact: true,
        },
      },
    }
    const modulesConfig: ModulesConfig = {
      ...summaryOnlyConfig,
      work_experience: true,
      projects: true,
      summary: false,
    }

    const html = renderToStaticMarkup(createElement(BaseResumePreview, {
      content,
      modulesConfig,
      modulesOrder: ['basic_info', 'work_experience', 'projects'],
      template: 'black-white',
    }))

    expect(html).toMatch(/示例科技[\s\S]*前端工程师/)
    expect(html).toMatch(/示例科技[\s\S]*增长团队/)
    expect(html).toMatch(/示例科技[\s\S]*上海/)
    expect(html).toMatch(/增长平台[\s\S]*负责人/)
    expect(html).toMatch(/增长平台[\s\S]*杭州/)
    expect(html).toContain('https://example.com/project')
  })
})
