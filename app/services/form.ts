import { createApiClient } from './api-client'
import { decodeFormDetail, decodeSummaryPage } from '../domain/api/decoders'
import type { FormStatus } from '../domain/api/form'

export interface FormsQuery { readonly page: number; readonly status?: FormStatus }
export function formsPath(query: FormsQuery): string {
  if (!Number.isSafeInteger(query.page) || query.page < 1) throw new Error('Invalid page')
  if (query.status !== undefined && !['draft', 'published', 'closed'].includes(query.status)) throw new Error('Invalid status')
  const params = new URLSearchParams({ page: String(query.page), pageSize: '10' })
  if (query.status !== undefined) params.set('status', query.status)
  return `/forms?${params}`
}
export function formService(baseUrl: string) {
  const request = createApiClient({ baseUrl })
  return {
    list: (query: FormsQuery, signal?: AbortSignal) => request({
      path: formsPath(query), method: 'GET', expectedStatus: 200, signal,
      decode: value => {
        const page = decodeSummaryPage(value)
        if (page.pagination.page !== query.page || page.pagination.pageSize !== 10) throw new Error('Unexpected pagination')
        return page
      },
    }),
    detail: (id: string, signal?: AbortSignal) => request({
      path: `/forms/${encodeURIComponent(id)}`, method: 'GET', expectedStatus: 200, signal,
      decode: value => {
        const form = decodeFormDetail(value)
        if (form.id.toLowerCase() !== id.toLowerCase()) throw new Error('Unexpected form ID')
        return form
      },
    }),
  }
}
