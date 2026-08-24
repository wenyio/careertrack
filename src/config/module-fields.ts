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
  labelKey?: string
  kind: FieldKind
  placeholder?: string
  placeholderKey?: string
  span?: FieldSpan
  options?: readonly { value: string; label: string }[]
  /** 是否支持在预览中隐藏（简历编辑模式下显示隐藏开关） */
  hideable?: boolean
}

/** 教育经历字段 */
export const EDUCATION_FIELDS: ModuleFieldConfig[] = [
  { field: 'school', label: '学校', labelKey: 'fields.school', kind: 'input', placeholder: '请输入学校名称', placeholderKey: 'fields.schoolPlaceholder' },
  { field: 'major', label: '专业', labelKey: 'fields.major', kind: 'input', placeholder: '请输入专业', placeholderKey: 'fields.majorPlaceholder' },
  { field: 'degree', label: '学历', labelKey: 'fields.degree', kind: 'input', placeholder: '请输入学历', placeholderKey: 'fields.degreePlaceholder', hideable: true },
  { field: 'degree_type', label: '学历类型', labelKey: 'fields.degreeType', kind: 'input', placeholder: '例如：全日制', placeholderKey: 'fields.degreeTypePlaceholder', span: 'normal', hideable: true },
  { field: 'college', label: '学院', labelKey: 'fields.college', kind: 'input', placeholder: '请输入学院', placeholderKey: 'fields.collegePlaceholder', hideable: true },
  { field: 'city', label: '所在城市', labelKey: 'fields.educationCity', kind: 'input', placeholder: '请输入所在城市', placeholderKey: 'fields.cityPlaceholder', hideable: true },
  { field: 'start_date', label: '在读时间', labelKey: 'fields.educationTime', kind: 'dateRange', span: 'wide' },
  { field: 'description', label: '在校经历', labelKey: 'fields.educationDescription', kind: 'richText', placeholder: '请输入在校经历、社团活动等...', placeholderKey: 'fields.educationDescriptionPlaceholder', span: 'full' },
]

/** 工作经历字段 */
export const WORK_EXPERIENCE_FIELDS: ModuleFieldConfig[] = [
  { field: 'company', label: '公司名称', labelKey: 'fields.company', kind: 'input', placeholder: '请输入公司名称', placeholderKey: 'fields.companyPlaceholder' },
  { field: 'position', label: '岗位名称', labelKey: 'fields.position', kind: 'input', placeholder: '请输入岗位名称', placeholderKey: 'fields.positionPlaceholder', hideable: true },
  { field: 'department', label: '部门名称', labelKey: 'fields.department', kind: 'input', placeholder: '请输入部门名称', placeholderKey: 'fields.departmentPlaceholder', hideable: true },
  { field: 'city', label: '工作城市', labelKey: 'fields.workCity', kind: 'input', placeholder: '请输入工作城市', placeholderKey: 'fields.cityPlaceholder', hideable: true },
  { field: 'start_date', label: '工作时间', labelKey: 'fields.workTime', kind: 'dateRange', span: 'wide' },
  { field: 'description', label: '工作详情', labelKey: 'fields.workDescription', kind: 'richText', placeholder: '请描述工作内容、职责和成就...', placeholderKey: 'fields.workDescriptionPlaceholder', span: 'full' },
]

/** 项目经历字段 */
export const PROJECT_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '项目名称', labelKey: 'fields.projectName', kind: 'input', placeholder: '请输入项目名称', placeholderKey: 'fields.projectNamePlaceholder' },
  { field: 'role', label: '担任角色', labelKey: 'fields.projectRole', kind: 'input', placeholder: '请输入担任角色', placeholderKey: 'fields.projectRolePlaceholder', hideable: true },
  { field: 'city', label: '所在城市', labelKey: 'fields.educationCity', kind: 'input', placeholder: '请输入所在城市', placeholderKey: 'fields.cityPlaceholder', hideable: true },
  { field: 'link', label: '项目链接', labelKey: 'fields.projectLink', kind: 'input', placeholder: '请输入项目链接', placeholderKey: 'fields.projectLinkPlaceholder', hideable: true },
  { field: 'start_date', label: '项目时间', labelKey: 'fields.projectTime', kind: 'dateRange', span: 'wide' },
  { field: 'description', label: '项目详情', labelKey: 'fields.projectDescription', kind: 'richText', placeholder: '请描述项目内容、技术栈和成果...', placeholderKey: 'fields.projectDescriptionPlaceholder', span: 'full' },
]

/** 个人作品字段 */
export const PORTFOLIO_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '作品名称', labelKey: 'fields.portfolioName', kind: 'input', placeholder: '请输入作品名称', placeholderKey: 'fields.portfolioNamePlaceholder' },
  { field: 'link', label: '作品链接', labelKey: 'fields.portfolioLink', kind: 'input', placeholder: '请输入作品链接', placeholderKey: 'fields.portfolioLinkPlaceholder', hideable: true },
  { field: 'image', label: '作品图片', labelKey: 'fields.portfolioImage', kind: 'input', placeholder: '请输入图片 URL', placeholderKey: 'fields.portfolioImagePlaceholder', hideable: true },
  { field: 'description', label: '作品详情', labelKey: 'fields.portfolioDescription', kind: 'richText', placeholder: '请描述作品...', placeholderKey: 'fields.portfolioDescriptionPlaceholder', span: 'full' },
]

/** 荣誉奖项字段 */
export const AWARD_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '奖项名称', labelKey: 'fields.awardName', kind: 'input', placeholder: '请输入奖项名称', placeholderKey: 'fields.awardNamePlaceholder' },
  { field: 'date', label: '获奖时间', labelKey: 'fields.awardDate', kind: 'month', placeholder: '请选择获奖时间', placeholderKey: 'fields.awardDatePlaceholder' },
  { field: 'description', label: '奖项描述', labelKey: 'fields.awardDescription', kind: 'richText', placeholder: '请描述奖项...', placeholderKey: 'fields.awardDescriptionPlaceholder', span: 'full' },
]

/** 其他经历字段 */
export const OTHER_EXPERIENCE_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '经历名称', labelKey: 'fields.experienceName', kind: 'input', placeholder: '请输入经历名称', placeholderKey: 'fields.experienceNamePlaceholder' },
  { field: 'role', label: '角色', labelKey: 'fields.role', kind: 'input', placeholder: '请输入角色', placeholderKey: 'fields.rolePlaceholder', hideable: true },
  { field: 'department', label: '部门', labelKey: 'fields.department', kind: 'input', placeholder: '请输入部门名称', placeholderKey: 'fields.departmentPlaceholder', hideable: true },
  { field: 'city', label: '城市', labelKey: 'fields.city', kind: 'input', placeholder: '请输入城市', placeholderKey: 'fields.cityPlaceholder', hideable: true },
  { field: 'start_date', label: '时间', labelKey: 'fields.time', kind: 'dateRange', span: 'wide' },
  { field: 'description', label: '详情', labelKey: 'fields.details', kind: 'richText', placeholder: '请描述经历...', placeholderKey: 'fields.detailsPlaceholder', span: 'full' },
]

/** 研究经历字段 */
export const RESEARCH_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '项目名称', labelKey: 'fields.projectName', kind: 'input', placeholder: '请输入研究项目名称', placeholderKey: 'fields.researchNamePlaceholder' },
  { field: 'role', label: '角色', labelKey: 'fields.role', kind: 'input', placeholder: '请输入角色', placeholderKey: 'fields.rolePlaceholder', hideable: true },
  { field: 'department', label: '部门', labelKey: 'fields.department', kind: 'input', placeholder: '请输入部门名称', placeholderKey: 'fields.departmentPlaceholder', hideable: true },
  { field: 'city', label: '城市', labelKey: 'fields.city', kind: 'input', placeholder: '请输入城市', placeholderKey: 'fields.cityPlaceholder', hideable: true },
  { field: 'start_date', label: '时间', labelKey: 'fields.time', kind: 'dateRange', span: 'wide' },
  { field: 'description', label: '详情', labelKey: 'fields.details', kind: 'richText', placeholder: '请描述研究内容和成果...', placeholderKey: 'fields.researchDescriptionPlaceholder', span: 'full' },
]

/** 专业技能字段 */
export const SKILLS_FIELDS: ModuleFieldConfig[] = [
  { field: 'name', label: '技能名称', labelKey: 'fields.skillName', kind: 'input', placeholder: '例如：JavaScript、React', placeholderKey: 'fields.skillNamePlaceholder', hideable: true },
  { field: 'description', label: '技能描述', labelKey: 'fields.skillDescription', kind: 'richText', placeholder: '请描述您的技能水平和使用经验...', placeholderKey: 'fields.skillDescriptionPlaceholder', span: 'full' },
]
