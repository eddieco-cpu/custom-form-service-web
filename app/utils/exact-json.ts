import { isLosslessNumber, LosslessNumber, parse, stringify } from 'lossless-json'
import { ExactNumber } from './exact-number'

export type ExactJson = null | boolean | string | number | ExactNumber | readonly ExactJson[] | { readonly [key: string]: ExactJson | undefined }

export function parseExactJson(text: string): unknown {
  return parse(text, (_key, value: unknown) => isLosslessNumber(value) ? ExactNumber.from(value.value) : value)
}

// Explicit traversal prevents class/BigInt coercion and catches accidentally rounded native numbers.
function wireValue(value: unknown, seen: Set<object>): unknown {
  if (value instanceof ExactNumber) return new LosslessNumber(value.token)
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('Native JSON numbers must be safe integers; use ExactNumber')
    return value
  }
  if (typeof value !== 'object' || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new Error('Expected a JSON value')
  }
  if (seen.has(value)) throw new Error('Cyclic JSON value')
  seen.add(value)
  const result = Array.isArray(value)
    ? value.map(item => { if (item === undefined) throw new Error('Undefined array item'); return wireValue(item, seen) })
    : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, wireValue(item, seen)]))
  seen.delete(value)
  return result
}

// Runtime validation also supports typed Request interfaces without requiring an index signature.
export function stringifyExactJson(value: unknown): string {
  const text = stringify(wireValue(value, new Set()))
  if (text === undefined) throw new Error('Missing JSON body')
  return text
}

export function cloneExact<T>(value: T): T {
  if (value instanceof ExactNumber || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(cloneExact) as T
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error('Snapshot must contain plain data')
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneExact(item)])) as T
}
