import { describe, expect, it } from 'vitest'
import { displayNameSchema, registerSchema } from '../../app/domain/auth-input'
import { loadEditor } from '../../app/domain/editor'
import { validateDraft } from '../../app/domain/definition-validation'
import { form } from '../fixtures/f5/payloads'

// Fixed limits from FE05 §5 / BE01. These add the boundary points absent from
// the historic suite; UI/API evidence remains in the separate F10 live run.
describe('F10 U02 independent Code Point boundary vectors', () => {
  it.each([[99, true], [100, true], [101, false]] as const)('displayName %i CP => %s', (length, valid) => {
    expect(displayNameSchema.safeParse(`\u0085${'😀'.repeat(length)}\u3000`).success).toBe(valid)
  })
  it.each([[199, true], [200, true], [201, false]] as const)('Form title %i CP => %s', (length, valid) => {
    const definition = loadEditor(form()).definition
    definition.title = '😀'.repeat(length)
    expect(validateDraft(definition).kind === 'valid').toBe(valid)
  })
  it.each([[254, true], [255, true], [256, false]] as const)('Option value %i CP => %s', (length, valid) => {
    const definition = loadEditor(form()).definition
    definition.questions[2]!.options[0] = { ...definition.questions[2]!.options[0]!, value: '😀'.repeat(length) }
    expect(validateDraft(definition).kind === 'valid').toBe(valid)
  })
  it.each([[254, true], [255, false]] as const)('Email candidate %i CP => %s', (length, valid) => {
    const email = `${'測'.repeat(length - 13)}@example.test`
    expect([...email]).toHaveLength(length)
    expect(registerSchema.safeParse({ displayName: '合成', email, password: 'P'.repeat(10) }).success).toBe(valid)
  })
  it.each([[9, false], [10, true], [128, true], [129, false]] as const)('untrimmed password %i CP => %s', (length, valid) => {
    const password = ` ${'😀'.repeat(length - 2)} `
    expect(registerSchema.safeParse({ displayName: '合成', email: 'fixture@example.test', password }).success).toBe(valid)
  })
})
