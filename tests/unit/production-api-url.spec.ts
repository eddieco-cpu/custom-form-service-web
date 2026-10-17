import { describe, expect, it } from 'vitest'
import { assertProductionApiBaseUrl } from '../../server/utils/production-api-url'

describe('production API URL configuration', () => {
  it.each([
    'https://api.example.test/api/v1',
    'https://backend-example.up.railway.app/api/v1',
    'https://api.example.test:8443/api/v1/',
    'https://127.api.example.test/api/v1',
  ])('accepts a public HTTPS API URL: %s', value => {
    expect(() => assertProductionApiBaseUrl(value)).not.toThrow()
  })

  it.each([
    undefined, null, '', '/api/v1', 'not-a-url',
    'http://api.example.test/api/v1',
    'https://localhost/api/v1', 'https://app.localhost/api/v1',
    'https://localhost./api/v1',
    'https://127.0.0.1/api/v1', 'https://127.1/api/v1',
    'https://0.0.0.0/api/v1', 'https://[::1]/api/v1',
    'https://[::]/api/v1', 'https://[::ffff:127.0.0.1]/api/v1',
    'https://api.example.test/api/v1?mode=test',
    'https://api.example.test/api/v1#test',
    'https://api.example.test/api/v1?', 'https://api.example.test/api/v1#',
    ' https://api.example.test/api/v1',
  ])('rejects missing, insecure or ambiguous configuration: %s', value => {
    expect(() => assertProductionApiBaseUrl(value)).toThrow('NUXT_PUBLIC_API_BASE_URL')
  })

  it('does not expose supplied URL credentials in an error', () => {
    const supplied = new URL('https://api.example.test/api/v1')
    supplied.username = 'synthetic-user'
    supplied.password = crypto.randomUUID()
    expect(() => assertProductionApiBaseUrl(supplied.href)).toThrow('NUXT_PUBLIC_API_BASE_URL')
    try {
      assertProductionApiBaseUrl(supplied.href)
      expect.unreachable('credential-bearing URL must be rejected')
    }
    catch (error) {
      expect(String(error)).not.toContain(supplied.username)
      expect(String(error)).not.toContain(supplied.password)
      expect(String(error)).not.toContain(supplied.href)
    }
  })
})
