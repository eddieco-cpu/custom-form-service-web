// Storage guards mirror backend-ref/Validation/DefinitionNumber.cs, not a decimal precision policy.
export class ExactNumber {
  private constructor(
    readonly token: string,
    readonly sign: -1 | 0 | 1,
    readonly digits: string,
    readonly exponent: bigint,
  ) { Object.freeze(this) }

  static from(token: string): ExactNumber {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(token)) {
      throw new Error('Invalid JSON number')
    }
    const [mantissa = '', rawExponent = '0'] = token.split(/[eE]/)
    let exponent = BigInt(rawExponent)
    if (exponent < -1073741823n || exponent > 1073741823n) throw new Error('Number exceeds raw exponent capacity')
    const fraction = mantissa.includes('.') ? mantissa.length - mantissa.indexOf('.') - 1 : 0
    if (BigInt(fraction) - exponent > 16383n) throw new Error('Number exceeds fractional capacity')
    let digits = mantissa.replace(/^-/, '').replace('.', '').replace(/^0+/, '')
    exponent -= BigInt(fraction)
    if (!digits) return new ExactNumber(token, 0, '0', 0n)
    if (BigInt(digits.length) + exponent > 131072n) throw new Error('Number exceeds integral capacity')
    const trimmed = digits.replace(/0+$/, '')
    exponent += BigInt(digits.length - trimmed.length)
    digits = trimmed
    return new ExactNumber(token, token.startsWith('-') ? -1 : 1, digits, exponent)
  }

  compare(other: ExactNumber): -1 | 0 | 1 {
    if (this.sign !== other.sign) return this.sign < other.sign ? -1 : 1
    if (!this.sign) return 0
    const leftMagnitude = BigInt(this.digits.length) + this.exponent
    const rightMagnitude = BigInt(other.digits.length) + other.exponent
    if (leftMagnitude !== rightMagnitude) return (leftMagnitude < rightMagnitude ? -this.sign : this.sign) as -1 | 1
    for (let i = 0; i < Math.max(this.digits.length, other.digits.length); i++) {
      const left = this.digits[i] ?? '0'
      const right = other.digits[i] ?? '0'
      if (left !== right) return (left < right ? -this.sign : this.sign) as -1 | 1
    }
    return 0
  }

  equals(other: ExactNumber): boolean { return this.compare(other) === 0 }
  toString(): string { return this.token }
  valueOf(): never { throw new Error('ExactNumber cannot be implicitly converted') }
  toJSON(): never { throw new Error('Use stringifyExactJson for ExactNumber') }
}

export function exactInteger(value: unknown, min = 0, max = 2147483647): number {
  if (!(value instanceof ExactNumber) || !/^-?(?:0|[1-9]\d*)$/.test(value.token)) throw new Error('Expected JSON integer')
  const integer = BigInt(value.token)
  if (integer < BigInt(min) || integer > BigInt(max)) throw new Error('Integer out of range')
  return Number(integer) // Conversion only after the bounded integer check.
}

export function numberCandidate(raw: string): ExactNumber | undefined {
  return raw === '' ? undefined : ExactNumber.from(raw)
}

export function withinBounds(value: ExactNumber, min?: ExactNumber, max?: ExactNumber): boolean {
  return (!min || value.compare(min) >= 0) && (!max || value.compare(max) <= 0)
}
