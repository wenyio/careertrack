import dayjs from 'dayjs'
import type {
  BasicInfoDisplayConfig,
  BasicInfoExtraField,
  BasicInfoIconName,
} from '@/types/resume'

function visibleFields(
  config: BasicInfoDisplayConfig | undefined,
): BasicInfoExtraField[] {
  return config?.visible_extra_fields || []
}

/**
 * Add one field without duplicating it and preserve unrelated display options.
 */
export function addVisibleBasicInfoField(
  config: BasicInfoDisplayConfig | undefined,
  field: BasicInfoExtraField,
): BasicInfoDisplayConfig {
  const currentFields = visibleFields(config)
  return {
    ...config,
    visible_extra_fields: currentFields.includes(field)
      ? currentFields
      : [...currentFields, field],
  }
}

/**
 * Hide one field without deleting its value or resetting options such as
 * `avatar_left`.
 */
export function removeVisibleBasicInfoField(
  config: BasicInfoDisplayConfig | undefined,
  field: BasicInfoExtraField,
): BasicInfoDisplayConfig {
  return {
    ...config,
    visible_extra_fields: visibleFields(config).filter(
      (visibleField) => visibleField !== field,
    ),
  }
}

/** Toggle an extra field's icon while preserving the rest of the config. */
export function toggleBasicInfoFieldIcon(
  config: BasicInfoDisplayConfig | undefined,
  field: BasicInfoExtraField,
  defaultIcon: BasicInfoIconName | undefined,
): BasicInfoDisplayConfig {
  const fieldIcons = { ...config?.field_icons }

  if (fieldIcons[field]) {
    delete fieldIcons[field]
  } else if (defaultIcon) {
    fieldIcons[field] = defaultIcon
  }

  return {
    ...config,
    visible_extra_fields: visibleFields(config),
    field_icons: fieldIcons,
  }
}

/**
 * Age zero means "not filled", while work_years zero is the valid graduate
 * option. Keeping this distinction in one place prevents import drift.
 */
export function hasBasicInfoExtraValue(
  field: BasicInfoExtraField,
  value: unknown,
): boolean {
  return value !== undefined
    && value !== null
    && value !== ''
    && !(field === 'age' && value === 0)
}

/** Calculate age on a specific date so the rule remains deterministic in tests. */
export function calculateAgeFromBirthday(
  birthday: string,
  referenceDate: string | Date = new Date(),
): number | undefined {
  const birth = dayjs(birthday)
  const reference = dayjs(referenceDate)
  if (!birth.isValid() || !reference.isValid()) return undefined

  let age = reference.year() - birth.year()
  if (
    reference.month() < birth.month()
    || (
      reference.month() === birth.month()
      && reference.date() < birth.date()
    )
  ) {
    age--
  }

  return age >= 0 && age < 150 ? age : undefined
}
