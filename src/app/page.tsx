/**
 * 首页
 *
 * 作为应用的入口，统一跳转到 /resumes：
 * - 已登录用户由 /resumes 显示服务端简历
 * - 未登录用户由 /resumes 显示游客本地简历
 *
 * 注意：这是一个 Server Component
 */

import { redirect } from 'next/navigation'

export default async function HomePage() {
  redirect('/resumes')
}
