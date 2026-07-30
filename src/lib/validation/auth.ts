import { z } from 'zod'

function requiredString(message: string) {
  return z.string({ error: message }).min(1, message)
}

const otpCodeSchema = z.string({ error: 'OTP 验证码格式错误' })
  .regex(/^\d{6}$/, 'OTP 验证码错误')

const recoveryCodeSchema = z.string({ error: '恢复码格式错误' })
  .trim()
  .regex(
    /^[A-Fa-f0-9]{4}(?:-?[A-Fa-f0-9]{4}){3}$/,
    '恢复码格式错误',
  )

export const loginBodySchema = z.object({
  username: requiredString('用户名和密码不能为空'),
  password: requiredString('用户名和密码不能为空'),
  otp_code: otpCodeSchema.optional(),
  recovery_code: recoveryCodeSchema.optional(),
}).refine(
  (value) => !(value.otp_code && value.recovery_code),
  { message: 'OTP 验证码和恢复码只能选择一种' },
)

export const registerBodySchema = z.object({
  username: requiredString('用户名和密码不能为空')
    .min(3, '用户名长度需要 3-50 个字符')
    .max(50, '用户名长度需要 3-50 个字符'),
  password: requiredString('用户名和密码不能为空')
    .min(10, '密码长度至少 10 个字符'),
  registration_code: requiredString('注册码不能为空'),
})

export const usernameBodySchema = z.object({
  username: requiredString('用户名不能为空')
    .trim()
    .min(3, '用户名长度需要 3-50 个字符')
    .max(50, '用户名长度需要 3-50 个字符')
    .regex(
      /^[a-zA-Z0-9_一-鿿]+$/,
      '用户名只能包含字母、数字、下划线和中文',
    ),
  current_password: z.string({ error: '当前密码格式错误' }).optional(),
})

export const passwordBodySchema = z.object({
  current_password: z.string({ error: '当前密码格式错误' }).optional(),
  new_password: requiredString('请输入新密码')
    .min(10, '新密码长度至少 10 个字符'),
})

export const setupOtpBodySchema = z.object({
  password: requiredString('请输入密码'),
})

export const verifyOtpBodySchema = z.object({
  code: otpCodeSchema,
})

const secondFactorCodeSchema = z.union([
  otpCodeSchema,
  recoveryCodeSchema,
], {
  error: '请输入有效的 OTP 验证码或恢复码',
})

export const disableOtpBodySchema = z.object({
  password: requiredString('请输入密码和 OTP 验证码'),
  code: secondFactorCodeSchema,
})

export const recoveryCodesBodySchema = z.object({
  password: requiredString('请输入密码和 OTP 验证码'),
  code: secondFactorCodeSchema,
})
