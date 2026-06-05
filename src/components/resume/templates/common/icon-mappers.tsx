/**
 * 图标映射函数
 *
 * 按 field/icon 名映射联系信息、额外字段、求职意向的图标。
 */

import type { ReactNode } from 'react'
import {
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  WechatOutlined,
  GithubOutlined,
  HomeOutlined,
  UserOutlined,
  AimOutlined,
  PayCircleOutlined,
  HistoryOutlined,
  LinkOutlined,
  TagOutlined,
  ManOutlined,
  WomanOutlined,
} from '@ant-design/icons'

/** 按 field 名映射联系信息图标 */
export function getContactIcon(field: string): ReactNode {
  switch (field) {
    case 'phone': return <PhoneOutlined />
    case 'email': return <MailOutlined />
    case 'wechat': return <WechatOutlined />
    case 'city': return <HomeOutlined />
    case 'github': return <GithubOutlined />
    case 'website': return <EnvironmentOutlined />
    default: return <span>•</span>
  }
}

/** 按 field 名映射额外字段图标 */
export function getExtraFieldIcon(field: string, value: string): ReactNode {
  switch (field) {
    case 'education_level': return <UserOutlined />
    case 'age': return <UserOutlined />
    case 'work_years': return <HistoryOutlined />
    case 'gender': return value === '男' ? <ManOutlined /> : <WomanOutlined />
    case 'wechat': return <WechatOutlined />
    case 'city': return <HomeOutlined />
    case 'github': return <GithubOutlined />
    case 'website': return <LinkOutlined />
    default: return <TagOutlined />
  }
}

/** 按图标名映射求职意向图标 */
export function getIntentionIcon(icon: string): ReactNode {
  switch (icon) {
    case 'tag': return <TagOutlined />
    case 'user': return <UserOutlined />
    case 'aim': return <AimOutlined />
    case 'environment': return <EnvironmentOutlined />
    case 'payCircle': return <PayCircleOutlined />
    default: return <TagOutlined />
  }
}
