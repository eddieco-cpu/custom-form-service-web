import { createApiClient } from './api-client'
import { decodeReceipt } from '../domain/api/decoders'
import { requireSubmittedReceipt } from '../domain/response-mapping'
import type { AnswerDefinition } from '../domain/answer'
import type { SubmitRequest } from '../domain/api/response'

export function responseService(baseUrl: string) {
  const request = createApiClient({ baseUrl })
  const decoded = (id: string, definition: AnswerDefinition, body?: SubmitRequest) => (value: unknown) => {
    const receipt = decodeReceipt(value)
    requireSubmittedReceipt(definition, receipt, id, body)
    return receipt
  }
  return {
    submit: (id: string, body: SubmitRequest, definition: AnswerDefinition, signal?: AbortSignal) => request({ path: `/forms/${encodeURIComponent(id)}/responses`, method: 'POST', body, signal, expectedStatus: 201, decode: decoded(id, definition, body) }),
    latest: (id: string, definition: AnswerDefinition, signal?: AbortSignal) => request({ path: `/forms/${encodeURIComponent(id)}/responses/me/latest`, method: 'GET', signal, expectedStatus: 200, decode: decoded(id, definition) }),
  }
}
