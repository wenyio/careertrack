/**
 * 项目常量定义
 *
 * 集中管理枚举值、配置项等，避免魔法字符串
 */

/** 当前状态选项 */
export const CURRENT_STATUS_OPTIONS = [
  { value: '在职', label: '在职', labelKey: 'basicInfo.employed' },
  { value: '在职-考虑机会', label: '在职-考虑机会', labelKey: 'basicInfo.employedOpen' },
  { value: '离职', label: '离职', labelKey: 'basicInfo.unemployed' },
  { value: '应届生', label: '应届生', labelKey: 'resume.freshGraduate' },
  { value: '在校生', label: '在校生', labelKey: 'basicInfo.student' },
] as const

/** 期望薪资选项 */
export const SALARY_OPTIONS = [
  { value: '5-10K', label: '5-10K' },
  { value: '10-15K', label: '10-15K' },
  { value: '15-20K', label: '15-20K' },
  { value: '20-30K', label: '20-30K' },
  { value: '30-50K', label: '30-50K' },
  { value: '50K+', label: '50K+' },
] as const

/** 学历选项 */
export const EDUCATION_LEVEL_OPTIONS = [
  { value: '博士', label: '博士', labelKey: 'basicInfo.doctor' },
  { value: '硕士', label: '硕士', labelKey: 'basicInfo.master' },
  { value: '本科', label: '本科', labelKey: 'basicInfo.bachelor' },
  { value: '大专', label: '大专', labelKey: 'basicInfo.juniorCollege' },
  { value: '高中', label: '高中', labelKey: 'basicInfo.highSchool' },
] as const

/** 工作年限选项 */
export const WORK_YEARS_OPTIONS = [
  { value: 0, label: '应届生', labelKey: 'resume.freshGraduate' },
  { value: 1, label: '1年' },
  { value: 2, label: '2年' },
  { value: 3, label: '3年' },
  { value: 5, label: '5年' },
  { value: 10, label: '10年+', labelKey: 'resume.yearsPlus' },
] as const

/** 性别选项 */
export const GENDER_OPTIONS = [
  { value: '男', label: '男', labelKey: 'basicInfo.male' },
  { value: '女', label: '女', labelKey: 'basicInfo.female' },
] as const

/** Cookie 配置 */

/** 自动保存延迟（毫秒） */
export const AUTO_SAVE_DELAY = 3000

/** 请求超时时间（毫秒） */
export const REQUEST_TIMEOUT = 30000

/** 简历名称最大长度（前后端共享） */
export const MAX_RESUME_NAME_LENGTH = 50

/**
 * A4 预览的统一像素尺寸。
 *
 * 编辑器、公开页、缩略图和打印都基于同一个 96 DPI 布局坐标系；集中定义可避免
 * 分页阈值与实际渲染尺寸因局部修改而漂移。
 */
export const A4_PAGE_WIDTH_PX = 794
export const A4_PAGE_HEIGHT_PX = 1123
export const A4_PAGE_RATIO = A4_PAGE_HEIGHT_PX / A4_PAGE_WIDTH_PX
