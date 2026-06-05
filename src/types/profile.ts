/**
 * 个人信息相关类型定义
 */

import type { DescriptionField } from './resume'

/** 求职意向 */
export interface JobIntention {
  current_status: string  // 当前状态：在职/离职/应届生等
  position: string        // 期望职位
  expected_city: string   // 期望工作地
  expected_salary: string // 期望薪资
}

/** 其他基本信息 */
export interface OtherInfo {
  education_level: string  // 最高学历
  website: string          // 个人网站
  wechat: string           // 微信号
  city: string             // 现居城市
  github: string           // GitHub
  age: number              // 年龄
  work_years: number       // 工作年限
  gender: string           // 性别
  height: string           // 身高
  weight: string           // 体重
  native_place: string     // 籍贯
  nation: string           // 民族
  political_status: string // 政治面貌
  marital_status: string   // 婚姻状况
  birthday: string         // 生日
}

/** 基本信息 */
export interface BasicInfo {
  name: string           // 姓名
  phone: string          // 电话
  email: string          // 邮箱
  avatar: string         // 头像 URL
  job_intention: JobIntention
  other: OtherInfo
}

/** 教育经历 */
export interface Education {
  id: string
  school: string        // 学校
  major: string         // 专业
  degree: string        // 学历
  start_date: string    // 开始时间
  end_date: string      // 结束时间
  degree_type: string   // 学历类型：全日制/非全日制
  college: string       // 学院
  city: string          // 所在城市
  description: DescriptionField   // 在校经历
}

/** 专业技能 */
export interface Skill {
  id: string
  name: string          // 技能名称
  description: DescriptionField   // 技能描述
}

/** 工作经历 */
export interface WorkExperience {
  id: string
  company: string       // 公司名称
  start_date: string    // 开始时间
  end_date: string      // 结束时间（null 表示至今）
  department: string    // 部门名称
  position: string      // 岗位名称
  city: string          // 工作城市
  description: DescriptionField   // 工作详情
}

/** 项目经历 */
export interface Project {
  id: string
  name: string          // 项目名称
  start_date: string    // 开始时间
  end_date: string      // 结束时间（null 表示至今）
  role: string          // 担任角色
  city: string          // 所在城市
  link: string          // 项目链接
  description: DescriptionField   // 项目详情
}

/** 个人作品 */
export interface Portfolio {
  id: string
  name: string          // 作品名称
  link: string          // 作品链接
  image: string         // 作品图片
  description: DescriptionField   // 作品详情
}

/** 荣誉奖项 */
export interface Award {
  id: string
  name: string          // 奖项名称
  date: string          // 获奖时间
  description: DescriptionField   // 奖项描述
}

/** 其他经历 */
export interface OtherExperience {
  id: string
  name: string          // 经历名称
  start_date: string    // 开始时间
  end_date: string      // 结束时间
  role: string          // 角色
  department: string    // 部门
  city: string          // 城市
  description: DescriptionField   // 详情
}

/** 研究经历 */
export interface Research {
  id: string
  name: string          // 项目名称
  start_date: string    // 开始时间
  end_date: string      // 结束时间
  role: string          // 角色
  department: string    // 部门
  city: string          // 城市
  description: DescriptionField   // 详情
}

/** 完整个人信息 */
export interface Profile {
  id: string
  user_id: string
  basic_info: BasicInfo
  education: Education[]
  skills: Skill[]
  work_experience: WorkExperience[]
  projects: Project[]
  portfolio: Portfolio[]
  awards: Award[]
  other_experience: OtherExperience[]
  research: Research[]
  summary: string       // 个人简介
  created_at: string
  updated_at: string
}

