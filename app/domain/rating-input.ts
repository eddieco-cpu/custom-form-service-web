export type RatingAction = { readonly kind: 'score'; readonly score: number } | { readonly kind: 'clear' } | { readonly kind: 'focus' }
export function ratingInput(value: number | undefined, action: RatingAction, min: number, max: number, required = false, readonly = false): number | undefined {
  if (readonly || action.kind === 'focus') return value
  if (action.kind === 'clear') return required ? value : undefined
  return Number.isInteger(action.score) && action.score >= min && action.score <= max ? action.score : value
}
