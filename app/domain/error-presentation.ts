import type { ApiResult } from './api/result'
import type { ErrorDetail } from './api/error'
import { isKnownErrorCode } from './api/error'
import { isUnknownWrite } from './operation-state'

export type ErrorContext = 'read' | 'action' | 'bootstrap' | 'login' | 'register' | 'latest' | 'statistics'
export interface ErrorPresentation {
  readonly kind: 'auth' | 'bootstrap-auth' | 'credentials' | 'disabled' | 'not-found' | 'no-response' | 'not-available' | 'access-denied' | 'validation' | 'conflict' | 'unknown-result' | 'read-failure' | 'generic'
  readonly placement: 'page' | 'dialog'; readonly message: string; readonly details: readonly ErrorDetail[]; readonly knownCode: boolean
}
export function presentError(result: Exclude<ApiResult<unknown>, { kind: 'success' }>, context: ErrorContext): ErrorPresentation {
  const placement = ['read', 'bootstrap', 'statistics'].includes(context) ? 'page' : 'dialog'
  const base = { placement, details: result.kind === 'api-error' ? result.error.details ?? [] : [], knownCode: result.kind === 'api-error' && isKnownErrorCode(result.error.code) } as const
  if (context !== 'read' && context !== 'statistics' && context !== 'bootstrap' && isUnknownWrite(result)) return { ...base, kind: 'unknown-result', message: '未能確認操作結果，操作可能已完成。請主動核對後再操作。' }
  if (result.kind !== 'api-error' || result.status >= 500) return { ...base, kind: placement === 'page' ? 'read-failure' : 'generic', message: placement === 'page' ? '載入失敗，請手動重試。' : '操作未完成，請檢查輸入或稍後手動重試。' }
  const code = result.error.code
  if (context === 'login' && code === 'AUTH_INVALID_CREDENTIALS') return { ...base, kind: 'credentials', message: 'Email 或密碼不正確。' }
  if (code === 'AUTH_USER_DISABLED') return { ...base, kind: 'disabled', message: '帳號已停用。' }
  if (['AUTH_REQUIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_EXPIRED'].includes(code)) return { ...base, kind: context === 'bootstrap' ? 'bootstrap-auth' : 'auth', message: '需要有效登入身分。' }
  if (context === 'latest' && code === 'RESPONSE_NOT_FOUND') return { ...base, kind: 'no-response', message: '您從未填答過' }
  if (code === 'FORM_NOT_FOUND') return { ...base, kind: 'not-found', message: '找不到表單' }
  if (context === 'statistics' && code === 'FORM_STATISTICS_NOT_AVAILABLE') return { ...base, kind: 'not-available', message: '統計尚未開放' }
  if (code === 'STATISTICS_ACCESS_DENIED' || code === 'FORM_ACCESS_DENIED') return { ...base, kind: 'access-denied', message: '您沒有執行此操作的權限。' }
  if (['VALIDATION_ERROR', 'FORM_DEFINITION_INVALID', 'FORM_NOT_PUBLISHABLE', 'USER_EMAIL_ALREADY_EXISTS'].includes(code)) return { ...base, kind: 'validation', message: result.error.message }
  return { ...base, kind: result.status === 409 ? 'conflict' : 'generic', message: result.error.message }
}

export interface ErrorPathMap { readonly namespace: 'delta' | 'publish' | 'answer'; readonly paths: Readonly<Record<string, string>> }
export interface LocatedDetail { readonly detail: ErrorDetail; readonly namespace: ErrorPathMap['namespace']; readonly targetKey?: string; readonly suffix?: string }
export function locateDetails(details: readonly ErrorDetail[], map: ErrorPathMap): readonly LocatedDetail[] {
  const paths = Object.keys(map.paths).sort((a, b) => b.length - a.length)
  return details.map(detail => {
    const path = paths.find(path => detail.path === path || detail.path.startsWith(`${path}.`) || detail.path.startsWith(`${path}[`))
    return { detail, namespace: map.namespace, ...(path === undefined ? {} : { targetKey: map.paths[path], suffix: detail.path.slice(path.length) }) }
  })
}
