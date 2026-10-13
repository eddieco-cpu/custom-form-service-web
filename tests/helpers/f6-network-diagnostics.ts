// Case expectations are declared before requests run. Observations never create allowances.
export type NetworkFailure = { method: string; url: string } & (
  { kind: 'response'; status: number } | { kind: 'requestfailed'; reason: string }
)
export type ExpectedFailure = NetworkFailure & { count: number; diagnostic?: string; diagnosticCount: number }
export interface Diagnostic { text: string; url: string }

function sameFailure(a: NetworkFailure, b: NetworkFailure): boolean {
  return a.method === b.method && a.url === b.url && a.kind === b.kind
    && (a.kind === 'response' ? b.kind === 'response' && a.status === b.status : b.kind === 'requestfailed' && a.reason === b.reason)
}

export function verifyNetworkDiagnostics(expected: readonly ExpectedFailure[], actual: readonly NetworkFailure[], diagnostics: readonly Diagnostic[]): string[] {
  const issues: string[] = [], remaining = [...actual], unmatched = [...diagnostics]
  for (const item of expected) {
    const events = remaining.filter(event => sameFailure(item, event))
    if (events.length !== item.count) issues.push(`Expected ${item.count} ${JSON.stringify(item)}; observed ${events.length}`)
    for (const event of events) remaining.splice(remaining.indexOf(event), 1)
    // A matching diagnostic also needs an observed request matching the declared method/outcome.
    const paired = item.diagnostic ? unmatched.filter(message => message.url === item.url && message.text === item.diagnostic) : []
    if (paired.length !== item.diagnosticCount || paired.length > events.length) issues.push(`Diagnostic count for ${item.method} ${item.url}: expected ${item.diagnosticCount}; observed ${paired.length}; matching requests ${events.length}`)
    for (const message of paired) unmatched.splice(unmatched.indexOf(message), 1)
  }
  for (const event of remaining) issues.push(`Unexpected request outcome ${JSON.stringify(event)}`)
  for (const message of unmatched) issues.push(`Unexpected diagnostic ${JSON.stringify(message)}`)
  return issues
}

const statusText: Record<number, string> = { 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 500: 'Internal Server Error' }
export function expectedHttp(method: string, url: string, status: number, count: number): ExpectedFailure {
  if (!statusText[status]) throw new Error(`Declare the exact diagnostic for status ${status}`)
  return { kind: 'response', method, url, status, count, diagnostic: `Failed to load resource: the server responded with a status of ${status} (${statusText[status]})`, diagnosticCount: count }
}
export function expectedNetwork(method: string, url: string, reason: string, count: number, diagnosticCount: number): ExpectedFailure {
  return { kind: 'requestfailed', method, url, reason, count, diagnostic: diagnosticCount ? `Failed to load resource: ${reason}` : undefined, diagnosticCount }
}
