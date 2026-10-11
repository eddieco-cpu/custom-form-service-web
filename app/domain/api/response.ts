import type { ExactNumber } from '../../utils/exact-number'
// Receipt does not contain type; the Definition-aware mapper later distinguishes Rating from Number.
export type ReceiptValue = string | readonly string[] | ExactNumber
export interface AnswerDto { readonly questionId: string; readonly value: ReceiptValue }
export interface ReceiptDto { readonly id: string; readonly formId: string; readonly submittedAt: string; readonly answers: readonly AnswerDto[] }
export interface CountDto { readonly count: number }
export interface SubmitRequest { readonly answers: readonly { readonly questionId: string; readonly value: ReceiptValue | number }[] }
