/**
 * 共享 resolveOverrides 常量
 *
 * classic、minimal、modern、black-white 四个模板使用相同的求职意向解析配置。
 */

export const DEFAULT_INTENTION_RESOLVE_OVERRIDES = {
  intentionFields: ['current_status', 'position_label', 'expected_city', 'expected_salary'],
  showIntentionsWithoutPosition: true,
}
