export const knownErrorCodes = [
  'AUTH_REQUIRED', 'AUTH_INVALID_CREDENTIALS', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED', 'AUTH_USER_DISABLED',
  'USER_EMAIL_ALREADY_EXISTS', 'AUTH_ACCOUNT_CONFLICT', 'VALIDATION_ERROR', 'FORM_DEFINITION_INVALID', 'FORM_NOT_PUBLISHABLE',
  'FORM_NOT_FOUND', 'FORM_ACCESS_DENIED', 'FORM_NOT_EDITABLE', 'FORM_ALREADY_PUBLISHED', 'FORM_ALREADY_CLOSED',
  'FORM_INVALID_STATE_TRANSITION', 'FORM_NOT_SUBMITTABLE', 'SUBMISSION_DEADLINE_EXCEEDED', 'RESPONSE_ALREADY_SUBMITTED',
  'RESPONSE_NOT_FOUND', 'FORM_STATISTICS_NOT_AVAILABLE', 'STATISTICS_ACCESS_DENIED', 'INTERNAL_SERVER_ERROR',
] as const
export type KnownErrorCode = typeof knownErrorCodes[number]
export interface ErrorDetail { readonly path: string; readonly code: string; readonly message: string }
export interface ApiError { readonly code: string; readonly message: string; readonly details?: readonly ErrorDetail[] }
export function isKnownErrorCode(code: string): code is KnownErrorCode { return (knownErrorCodes as readonly string[]).includes(code) }
