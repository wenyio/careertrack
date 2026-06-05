/**
 * 模块默认值与空条目工厂
 *
 * 集中管理各模块的空条目结构，供编辑器"新增条目"和"导入初始化"使用。
 */

import type { ResumeModuleType } from '@/types/resume'
import { generateId } from '@/utils/format'

/** 支持数组条目的模块类型 */
export const ARRAY_MODULES: ResumeModuleType[] = ['education', 'skills', 'work_experience', 'projects', 'portfolio', 'awards', 'other_experience', 'research']

/** 根据模块类型创建空条目 */
export function createEmptyItem(module: ResumeModuleType): Record<string, unknown> {
  const id = generateId()
  switch (module) {
    case 'education':
      return { id, school: '', major: '', degree: '', start_date: '', end_date: '', degree_type: '全日制', college: '', city: '', description: '' }
    case 'skills':
      return { id, name: '', description: '' }
    case 'work_experience':
      return { id, company: '', department: '', position: '', city: '', start_date: '', end_date: '', description: '' }
    case 'projects':
      return { id, name: '', role: '', city: '', link: '', start_date: '', end_date: '', description: '' }
    case 'portfolio':
      return { id, name: '', link: '', image: '', description: '' }
    case 'awards':
      return { id, name: '', date: '', description: '' }
    case 'other_experience':
      return { id, name: '', role: '', department: '', city: '', start_date: '', end_date: '', description: '' }
    case 'research':
      return { id, name: '', role: '', department: '', city: '', start_date: '', end_date: '', description: '' }
    default:
      return { id }
  }
}
