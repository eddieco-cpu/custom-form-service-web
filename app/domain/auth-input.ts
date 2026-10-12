import { z } from 'zod'
import { codePointLength, emailCandidate, trimWhiteSpace } from '../utils/unicode'
import type { LoginRequest, RegisterRequest, ProfileRequest } from './api/user'

export const displayNameSchema = z.string().refine(value => {
  const length = codePointLength(trimWhiteSpace(value))
  return length > 0 && length <= 100
}, '姓名須為 1～100 個字元')
export const loginSchema = z.object({
  email: z.string().refine(value => trimWhiteSpace(value).length > 0, '請輸入 Email'),
  password: z.string().refine(value => value.length > 0, '請輸入密碼'),
})
export const registerSchema = z.object({
  displayName: displayNameSchema,
  email: z.string().refine(value => {
    const candidate = trimWhiteSpace(value)
    return candidate.includes('@') && codePointLength(candidate) <= 254
  }, '請輸入包含 @ 且不超過 254 個字元的 Email'),
  password: z.string().refine(value => codePointLength(value) >= 10 && codePointLength(value) <= 128, '密碼須為 10～128 個字元（保留空白）'),
})
export const profileSchema = z.object({ displayName: displayNameSchema })
export function loginRequest(input: LoginRequest): LoginRequest { return { email: emailCandidate(input.email), password: input.password } }
export function registerRequest(input: RegisterRequest): RegisterRequest { return { ...loginRequest(input), displayName: trimWhiteSpace(input.displayName) } }
export function profileRequest(input: ProfileRequest): ProfileRequest { return { displayName: trimWhiteSpace(input.displayName) } }
export function profileDirty(raw: string, baseline: string): boolean { return trimWhiteSpace(raw) !== baseline }
