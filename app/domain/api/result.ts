import type { ApiError } from './error'
export type ApiResult<T> =
  | { readonly kind: 'success'; readonly status: number; readonly value: T }
  | { readonly kind: 'api-error'; readonly status: number; readonly error: ApiError }
  | { readonly kind: 'transport-error'; readonly reason: 'network' | 'timeout' | 'abort'; readonly sent: boolean }
  | { readonly kind: 'contract-error'; readonly status: number; readonly message: string; readonly sent: boolean }
  | { readonly kind: 'local-error'; readonly message: string; readonly sent: false }
export type Decoder<T> = (value: unknown) => T
