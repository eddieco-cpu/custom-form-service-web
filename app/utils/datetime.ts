export interface ExactInstant { readonly originalIso: string; readonly ticks: bigint }
const ticksPerSecond = 10000000n
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', calendar: 'gregory', numberingSystem: 'latn',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

function calendarSecond(year: number, month: number, day: number, hour: number, minute: number, second: number): bigint {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > (days[month - 1] ?? 0) || hour > 23 || minute > 59 || second > 59) throw new Error('Invalid datetime')
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(hour, minute, second, 0)
  return BigInt(date.getTime() / 1000)
}

export function parseInstant(iso: string): ExactInstant {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(iso)
  if (!match) throw new Error('Invalid ISO datetime or precision')
  const seconds = calendarSecond(...match.slice(1, 7).map(Number) as [number, number, number, number, number, number])
  const offsetHour = Number(match[10] ?? 0)
  const offsetMinute = Number(match[11] ?? 0)
  if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) throw new Error('Invalid offset')
  const offset = BigInt((offsetHour * 60 + offsetMinute) * 60 * (match[9] === '-' ? -1 : 1))
  const utc = seconds - offset
  if (utc < calendarSecond(1, 1, 1, 0, 0, 0) || utc > calendarSecond(9999, 12, 31, 23, 59, 59)) throw new Error('Datetime out of range')
  return Object.freeze({ originalIso: iso, ticks: utc * ticksPerSecond + BigInt((match[7] ?? '').padEnd(7, '0')) })
}

function wholeSecond(instant: ExactInstant): bigint {
  const quotient = instant.ticks / ticksPerSecond
  return instant.ticks < 0n && instant.ticks % ticksPerSecond !== 0n ? quotient - 1n : quotient
}

export function formatTaipei(instant: ExactInstant | string): string {
  const value = typeof instant === 'string' ? parseInstant(instant) : instant
  const parts = Object.fromEntries(formatter.formatToParts(new Date(Number(wholeSecond(value)) * 1000)).map(part => [part.type, part.value]))
  return `${(parts.year ?? '').padStart(4, '0')}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

export function taipeiToUtc(input: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(input)
  if (!match) throw new Error('Complete Taipei date and time required')
  const local = calendarSecond(...match.slice(1).map(Number) as [number, number, number, number, number, number])
  let utc = local - 8n * 3600n
  const expected = input.replace('T', ' ')
  // Resolve Intl's actual zone offset, including historical offsets; never use local OS timezone.
  for (let i = 0; i < 3; i++) {
    const displayed = formatTaipei({ originalIso: '', ticks: utc * ticksPerSecond })
    if (displayed === expected) {
      const result = new Date(Number(utc) * 1000).toISOString().replace('.000Z', 'Z')
      parseInstant(result)
      return result
    }
    const actual = displayed.split(/[- :]/).map(Number) as [number, number, number, number, number, number]
    utc += local - calendarSecond(...actual)
  }
  throw new Error('Local time does not exist in Asia/Taipei')
}

export interface DeadlineBaseline { readonly original: ExactInstant | null; readonly visible: string }
export const deadlineBaseline = (iso: string | null): DeadlineBaseline => Object.freeze({ original: iso === null ? null : parseInstant(iso), visible: iso === null ? '' : formatTaipei(iso) })
export function deadlineCandidate(baseline: DeadlineBaseline, visible: string): { readonly changed: boolean; readonly value: string | null } {
  if (visible === baseline.visible) return { changed: false, value: baseline.original?.originalIso ?? null }
  if (visible === '') return { changed: baseline.original !== null, value: null }
  const value = taipeiToUtc(visible)
  const changed = baseline.original?.ticks !== parseInstant(value).ticks
  return { changed, value: changed ? value : baseline.original?.originalIso ?? value }
}
