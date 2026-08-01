/**
 * 单条简历内容同步到个人信息
 *
 * POST /api/profile/sync-entry
 */

import { withAuth, error, success } from '@/lib/api'
import { parseJsonBody } from '@/lib/api-validation'
import { profileEntrySyncBodySchema } from '@/lib/validation/business'
import {
  addProfileEntryFromResume,
  replaceProfileEntryFromResume,
} from '@/lib/services/profile'

export async function POST(request: Request) {
  return withAuth(request, async (user) => {
    const parsedBody = await parseJsonBody(request, profileEntrySyncBodySchema)
    if (!parsedBody.success) return parsedBody.response

    const { field, mode, target_id, entry } = parsedBody.data

    try {
      const profile = mode === 'create'
        ? await addProfileEntryFromResume(user.id, field, entry)
        : await replaceProfileEntryFromResume(user.id, field, target_id || '', entry)

      return success(profile)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '同步失败'
      if (message.startsWith('未找到')) return error(message, 404)
      if (message.includes('并发修改')) return error(message, 409)
      return error(message)
    }
  })
}
