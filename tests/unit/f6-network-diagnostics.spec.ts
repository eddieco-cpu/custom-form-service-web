import { describe, expect, it } from 'vitest'
import { expectedHttp, expectedNetwork, verifyNetworkDiagnostics } from '../helpers/f6-network-diagnostics'
import type { Diagnostic, NetworkFailure } from '../helpers/f6-network-diagnostics'
const url = 'http://localhost:5000/api/v1/forms/synthetic'
const http: NetworkFailure = { kind: 'response', method: 'PATCH', url, status: 404 }
const diagnostic: Diagnostic = { url, text: 'Failed to load resource: the server responded with a status of 404 (Not Found)' }
const failure: NetworkFailure = { kind: 'requestfailed', method: 'PATCH', url, reason: 'net::ERR_FAILED' }
const failedDiagnostic = { url, text: 'Failed to load resource: net::ERR_FAILED' }
describe('F6-R2 declared request/diagnostic pairing', () => {
  it('allows only exact expected HTTP and network outcomes/diagnostics', () => {
    expect(verifyNetworkDiagnostics([expectedHttp('PATCH', url, 404, 1)], [http], [diagnostic])).toEqual([])
    expect(verifyNetworkDiagnostics([expectedNetwork('PATCH', url, 'net::ERR_FAILED', 1, 1)], [failure], [failedDiagnostic])).toEqual([])
  })
  it('rejects unrelated resource 404 even when console matches its actual response', () => {
    const otherUrl = 'http://localhost:3000/unrelated.png'
    expect(verifyNetworkDiagnostics([], [{ ...http, method: 'GET', url: otherUrl }], [{ ...diagnostic, url: otherUrl }])).not.toEqual([])
  })
  it('rejects unexpected requestfailed even when console matches the actual failure', () => {
    expect(verifyNetworkDiagnostics([], [failure], [failedDiagnostic])).not.toEqual([])
  })
  for (const [name, actual] of [
    ['method', { ...http, method: 'GET' }], ['URL', { ...http, url: `${url}?unexpected=1` }], ['status', { ...http, status: 500 }],
  ] as const) it(`rejects wrong ${name}`, () => {
    expect(verifyNetworkDiagnostics([expectedHttp('PATCH', url, 404, 1)], [actual], [diagnostic])).not.toEqual([])
  })
  it('rejects wrong failure reason', () => {
    expect(verifyNetworkDiagnostics([expectedNetwork('PATCH', url, 'net::ERR_FAILED', 1, 1)], [{ ...failure, reason: 'net::ERR_ABORTED' }], [failedDiagnostic])).not.toEqual([])
  })
  it('rejects missing or extra requests and duplicate diagnostics', () => {
    const expected = [expectedHttp('PATCH', url, 404, 1)]
    expect(verifyNetworkDiagnostics(expected, [], [diagnostic])).not.toEqual([])
    expect(verifyNetworkDiagnostics(expected, [http, http], [diagnostic])).not.toEqual([])
    expect(verifyNetworkDiagnostics(expected, [http], [diagnostic, diagnostic])).not.toEqual([])
    expect(verifyNetworkDiagnostics(expected, [http], [])).not.toEqual([])
  })
  it('counts repeated intentional failures exactly', () => {
    expect(verifyNetworkDiagnostics([expectedHttp('PATCH', url, 404, 2)], [http, http], [diagnostic, diagnostic])).toEqual([])
  })
  it('allows an explicitly expected cancellation without console diagnostic', () => {
    const expected = [expectedNetwork('GET', url, 'net::ERR_ABORTED', 1, 0)]
    expect(verifyNetworkDiagnostics(expected, [{ ...failure, method: 'GET', reason: 'net::ERR_ABORTED' }], [])).toEqual([])
    expect(verifyNetworkDiagnostics(expected, [{ ...failure, method: 'GET', reason: 'net::ERR_ABORTED' }], [failedDiagnostic])).not.toEqual([])
  })
  it('does not allow Vue warning, different diagnostic or a diagnostic without its request', () => {
    expect(verifyNetworkDiagnostics([expectedHttp('PATCH', url, 404, 1)], [http], [{ url, text: '[Vue warn] example' }])).not.toEqual([])
    expect(verifyNetworkDiagnostics([expectedHttp('PATCH', url, 404, 1)], [], [diagnostic])).not.toEqual([])
  })
})
