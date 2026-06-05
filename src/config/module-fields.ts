/**
 * 模块字段元数据
 *
 * 定义各数组模块的字段配置，用于生成表单和预览。
 * 不覆盖 BasicInfo 和 Summary（它们有特殊逻辑）。
 */

export type FieldKind = 'input' | 'select' | 'dateRange' | 'month' | 'richText'
export type FieldSpan = 'normal' | 'wide' | 'full'

export interface ModuleFieldConfig {
  field: string
  label: string
  kind: FieldKind
  placeholder?: string
  span?: FieldSpan
  options?: readonly { value: string; label: string }[]
  /** 是否支持在预览中隐藏（简历编辑模式下显示隐藏开关） */
  hideable?: boolean
}

/** 教育经历字段 */
export const EDUCATION_FIELDS: ModuleFieldConfig[] = [
  { field: 'school', label: '学校', kind: 'input', placeholder: '请输入学校名称' },
  { field: 'major', label: '专业', kind: 'input', placeholder: '请输入专业' },
  { field: 'degree', label: '学历', kind: 'input', placeholder: '请输入学历', hideable: true },
  { field: 'degree_type', label: '学历类型', kind: 'input', placeholder: '例如：全日制', span: 'normal', hideable: true },
  { field: 'college', label: '学院', kind: 'input', placeholder: '请输入学院', hideable: true },
  { field: 'city', label: '所在城市', kind: 'input', placeholder: '请输入所在城市', hideable: true },
  { field: 'start_date', label: '在读时间', kind: 'dateRange', span: 'wide' },
  { field: 'description', label: '在校经历', kind: 'richText', placeholder: '请输入在校经历、社团活动等...', span: 'full' },
]

/** 工作经历字段 */
export const WORK_EXPERIENCE_FIELDS: ModuleFieldConfig[] = [
  { field: 'company', label: '公司名称', kind: 'input', placeholder: '请输入公司名称' },
  { field: 'position', label: '岗位名称', kind: 'input', placeholder: '请输入岗位名称', hideable: true },
  { field: 'department', label: '部门名称', kind: 'input', placeholder: '请输入部门名称', hideable: true },
  { field: 'city', label: '工作城市', kind: 'input', placeholder: '请输入工作城市', hideable: true },
  { field: 'start_date', label: '工作时间', kind: 'dateRange', span: 'wide' },
  { field: 'description', label: '工作详情', kind: 'richText', placeholder: '请描述工作内容、职责和成就...', span: 'full' },
]

/** 项目经历字段 */
export const PROJECT_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '项目名称', kind: 'input', placeholder: '请输入项目名称' },
  { field: 'role', label: '担任角色', kind: 'input', placeholder: '请输入担任角色', hideable: true },
  { field: 'city', label: '所在城市', kind: 'input', placeholder: '请输入所在城市', hideable: true },
  { field: 'link', label: '项目链接', kind: 'input', placeholder: '请输入项目链接', hideable: true },
  { field: 'start_date', label: '项目时间', kind: 'dateRange', span: 'wide' },
  { field: 'description', label: '项目详情', kind: 'richText', placeholder: '请描述项目内容、技术栈和成果...', span: 'full' },
]

/** 个人作品字段 */
export const PORTFOLIO_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '作品名称', kind: 'input', placeholder: '请输入作品名称' },
  { field: 'link', label: '作品链接', kind: 'input', placeholder: '请输入作品链接', hideable: true },
  { field: 'image', label: '作品图片', kind: 'input', placeholder: '请输入图片 URL', hideable: true },
  { field: 'description', label: '作品详情', kind: 'richText', placeholder: '请描述作品...', span: 'full' },
]

/** 荣誉奖项字段 */
export const AWARD_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '奖项名称', kind: 'input', placeholder: '请输入奖项名称' },
  { field: 'date', label: '获奖时间', kind: 'month', placeholder: '请选择获奖时间' },
  { field: 'description', label: '奖项描述', kind: 'richText', placeholder: '请描述奖项...', span: 'full' },
]

/** 其他经历字段 */
export const OTHER_EXPERIENCE_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '经历名称', kind: 'input', placeholder: '请输入经历名称' },
  { field: 'role', label: '角色', kind: 'input', placeholder: '请输入角色', hideable: true },
  { field: 'department', label: '部门', kind: 'input', placeholder: '请输入部门名称', hideable: true },
  { field: 'city', label: '城市', kind: 'input', placeholder: '请输入城市', hideable: true },
  { field: 'start_date', label: '时间', kind: 'dateRange', span: 'wide' },
  { field: 'description', label: '详情', kind: 'richText', placeholder: '请描述经历...', span: 'full' },
]

/** 研究经历字段 */
export const RESEARCH_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '项目名称', kind: 'input', placeholder: '请输入研究项目名称' },
  { field: 'role', label: '角色', kind: 'input', placeholder: '请输入角色', hideable: true },
  { field: 'department', label: '部门', kind: 'input', placeholder: '请输入部门名称', hideable: true },
  { field: 'city', label: '城市', kind: 'input', placeholder: '请输入城市', hideable: true },
  { field: 'start_date', label: '时间', kind: 'dateRange', span: 'wide' },
  { field: 'description', label: '详情', kind: 'richText', placeholder: '请描述研究内容和成果...', span: 'full' },
]

/** 专业技能字段 */
export const SKILLS_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '技能名称', kind: 'input', placeholder: '例如：JavaScript、React' },
  { field: 'description', label: '技能描述', kind: 'richText', placeholder: '请描述您的技能水平和使用经验...', span: 'full' },
]
