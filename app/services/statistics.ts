import { createApiClient } from './api-client'
import { decodeStatistics } from '../domain/api/decoders'

export function statisticsService(baseUrl: string) {
  const request = createApiClient({ baseUrl })
  return {
    read: (id: string, signal?: AbortSignal) => request({
      path: `/forms/${encodeURIComponent(id)}/statistics`, method: 'GET', expectedStatus: 200, signal,
      decode: value => {
        const dto = decodeStatistics(value)
        if (dto.formId.toLowerCase() !== id.toLowerCase()) throw new Error('Unexpected statistics resource')
        return dto
      },
    }),
  }
}
