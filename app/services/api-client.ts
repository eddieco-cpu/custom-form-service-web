import type { ApiResult, Decoder } from '../domain/api/result'
import { decodeError } from '../domain/api/decoders'
import { parseExactJson, stringifyExactJson } from '../utils/exact-json'
import type { ExactJson } from '../utils/exact-json'

export interface ApiRequest<T, Body = ExactJson> {
  readonly path: string; readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  readonly expectedStatus: 200 | 201 | 204; readonly decode: Decoder<T>
  readonly body?: Body; readonly signal?: AbortSignal
}
export interface ClientOptions {
  readonly baseUrl: string; readonly fetch?: typeof fetch; readonly timeoutMs?: number
}

export function createApiClient(options: ClientOptions) {
  const fetcher = options.fetch ?? globalThis.fetch
  const timeoutMs = options.timeoutMs ?? 30000
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid timeout')
  return async function request<T, Body = ExactJson>(input: ApiRequest<T, Body>): Promise<ApiResult<T>> {
    let body: string | undefined
    let url: string
    try {
      const base = new URL(`${options.baseUrl.replace(/\/$/, '')}/`)
      if (!input.path.startsWith('/') || input.path.startsWith('//') || input.path.includes('\\')) throw new Error('Invalid API path')
      url = new URL(input.path.slice(1), base).href
      if (new URL(url).origin !== base.origin || !url.startsWith(base.href)) throw new Error('API path outside configured base')
      if (input.method === 'GET' && input.body !== undefined) throw new Error('GET cannot have a body')
      body = input.body === undefined ? undefined : stringifyExactJson(input.body)
    }
    catch { return { kind: 'local-error', message: '無法建立合法的 API 請求，請檢查輸入。', sent: false } }
    if (input.signal?.aborted) return { kind: 'transport-error', reason: 'abort', sent: false }
    const controller = new AbortController()
    let sent = false
    let reason: 'network' | 'timeout' | 'abort' = 'network'
    let rejectAbort: (error: Error) => void = () => {}
    const cancelled = new Promise<never>((_resolve, reject) => { rejectAbort = reject })
    const abort = (cause: 'timeout' | 'abort') => {
      reason = cause; controller.abort(); rejectAbort(new Error(cause))
    }
    const externalAbort = () => abort('abort')
    input.signal?.addEventListener('abort', externalAbort, { once: true })
    const timer = setTimeout(() => abort('timeout'), timeoutMs)
    try {
      sent = true
      const exchange = (async (): Promise<ApiResult<T>> => {
        const response = await fetcher(url, {
          method: input.method, credentials: 'include', signal: controller.signal,
          ...(body === undefined ? {} : { body, headers: { 'Content-Type': 'application/json' } }),
        })
        if (response.status === 204 && input.expectedStatus === 204) {
          try { return { kind: 'success', status: 204, value: input.decode(undefined) } }
          catch { return { kind: 'contract-error', status: 204, message: 'API 回應無法依契約解讀。', sent: true } }
        }
        const text = await response.text()
        try {
          const json = parseExactJson(text)
          if (response.status === input.expectedStatus) return { kind: 'success', status: response.status, value: input.decode(json) }
          if (response.status >= 400) return { kind: 'api-error', status: response.status, error: decodeError(json) }
        }
        catch { /* Invalid payload is a local contract failure, never a fabricated API error. */ }
        return { kind: 'contract-error', status: response.status, message: 'API 回應無法依契約解讀。', sent: true }
      })()
      return await Promise.race([exchange, cancelled])
    }
    catch { return { kind: 'transport-error', reason, sent } }
    finally { clearTimeout(timer); input.signal?.removeEventListener('abort', externalAbort) }
  }
}
