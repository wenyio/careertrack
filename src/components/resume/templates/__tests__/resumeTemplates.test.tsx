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

    expect(html).toContain('个人简介')
    expect(html).toContain('专注于前端工程与用户体验。')
  })
})
