import type { ArrayModuleImportConfig } from '@/config/profile-import'

function normalizeSignature(signature: string): string {
  return signature.trim()
}

export function buildExistingImportSignatures<T>(
  items: Partial<T>[],
  importConfig?: ArrayModuleImportConfig<T>,
): Set<string> {
  const signatures = new Set<string>()
  if (!importConfig) return signatures

  for (const item of items) {
    const signature = normalizeSignature(importConfig.getSignature(item as T))
    if (signature) signatures.add(signature)
  }

  return signatures
}

export function isDuplicateImportItem<T>(
  item: T,
  importConfig: ArrayModuleImportConfig<T>,
  existingSignatures: Set<string>,
): boolean {
  const signature = normalizeSignature(importConfig.getSignature(item))
  return Boolean(signature && existingSignatures.has(signature))
}
