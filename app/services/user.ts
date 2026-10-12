import { createApiClient } from './api-client'
import { decodeUser } from '../domain/api/decoders'
import type { ProfileRequest } from '../domain/api/user'
export function userService(baseUrl: string) {
  const request = createApiClient({ baseUrl })
  return {
    me: () => request({ path: '/users/me', method: 'GET', expectedStatus: 200, decode: decodeUser }),
    update: (body: ProfileRequest) => request({ path: '/users/me', method: 'PATCH', expectedStatus: 200, body, decode: decodeUser }),
  }
}
