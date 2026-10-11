import { z } from 'zod'

// Unicode White_Space intentionally includes TAB–CR; this is not an accidental control character.
// eslint-disable-next-line no-control-regex
const edgeWhitespace = /^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g
export const trimWhiteSpace = (value: string): string => value.replace(edgeWhitespace, '')
export const codePointLength = (value: string): number => [...value].length
export const descriptionCandidate = (value: string): string | null => trimWhiteSpace(value) || null
export const optionalTextCandidate = (value: string): string | undefined => trimWhiteSpace(value) || undefined
export const passwordCandidate = (value: string): string => value
export function emailCandidate(value: string): string {
  const trimmed = trimWhiteSpace(value)
  // The ASCII contract includes all code points U+0000–U+007F.
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7f]*$/.test(trimmed) ? trimmed.toLowerCase() : trimmed
}

export function codePointSchema(min: number, max: number, trim = true) {
  return z.string().transform(value => trim ? trimWhiteSpace(value) : value)
    .refine(value => codePointLength(value) >= min && codePointLength(value) <= max, { message: `長度須為 ${min}～${max} 個字元` })
}
