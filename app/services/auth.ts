import { createApiClient } from './api-client'
import { decodeUser } from '../domain/api/decoders'
import type { LoginRequest, RegisterRequest } from '../domain/api/user'
export function authService(baseUrl: string) {
  const request = createApiClient({ baseUrl })
  return {
    login: (body: LoginRequest) => request({ path: '/auth/login', method: 'POST', expectedStatus: 200, body, decode: decodeUser }),
    register: (body: RegisterRequest) => request({ path: '/auth/register', method: 'POST', expectedStatus: 201, body, decode: decodeUser }),
    logout: () => request({ path: '/auth/logout', method: 'POST', expectedStatus: 204, decode: () => undefined }),
  }
}
