import { describe, expect, it } from 'vitest'
import { PROFILE_IMPORT_CONFIG } from '@/config/profile-import'
import { buildExistingImportSignatures, isDuplicateImportItem } from '@/utils/profile-import'
import type { Skill } from '@/types/profile'

function skill(partial: Partial<Skill>): Skill {
  return {
    id: partial.id || 'skill-id',
    name: partial.name || '',
    description: partial.description || '',
  }
}

describe('profile import duplicate detection', () => {
  it('does not mark a profile skill as duplicate only because ids match', () => {
    const existing = buildExistingImportSignatures<Skill>(
      [{ id: 'profile-skill-1', name: '', description: '' }],
      PROFILE_IMPORT_CONFIG.skills,
    )

    expect(
      isDuplicateImportItem(
        skill({ id: 'profile-skill-1', name: 'React' }),
        PROFILE_IMPORT_CONFIG.skills,
        existing,
      ),
    ).toBe(false)
  })

  it('ignores blank skill names when building duplicate signatures', () => {
    const existing = buildExistingImportSignatures<Skill>(
      [{ id: 'blank-skill', name: '', description: '' }],
      PROFILE_IMPORT_CONFIG.skills,
    )

    expect(existing.size).toBe(0)
    expect(PROFILE_IMPORT_CONFIG.skills.getSignature(skill({ name: '' }))).toBe('')
  })

  it('matches skill duplicates by normalized name', () => {
    const existing = buildExistingImportSignatures<Skill>(
      [{ id: 'resume-skill-1', name: ' React ', description: '' }],
      PROFILE_IMPORT_CONFIG.skills,
    )

    expect(
      isDuplicateImportItem(
        skill({ id: 'profile-skill-1', name: 'react' }),
        PROFILE_IMPORT_CONFIG.skills,
        existing,
      ),
    ).toBe(true)
  })
})
