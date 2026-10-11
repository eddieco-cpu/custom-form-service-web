import { describe, expect, it } from 'vitest'
import { z } from 'zod'

// Tooling fixture only; this is not a product validation schema.
const fixture = z.object({ label: z.string(), enabled: z.boolean() })

describe('Zod / Vitest tooling smoke', () => {
  it('parses a typed synthetic fixture and reports the invalid field path', () => {
    expect(fixture.parse({ label: 'F1 工程測資', enabled: true })).toEqual({
      label: 'F1 工程測資', enabled: true,
    })
    const invalid = fixture.safeParse({ label: 'F1 工程測資', enabled: 'yes' })
    expect(invalid.success).toBe(false)
    if (!invalid.success) expect(invalid.error.issues[0]?.path).toEqual(['enabled'])
  })
})
