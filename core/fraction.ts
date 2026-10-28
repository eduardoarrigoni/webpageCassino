/** Fração exata (numerador e denominador inteiros), para as contas teóricas. */
export class Fraction {
  readonly num: bigint;
  readonly den: bigint;

  constructor(num: bigint, den: bigint = 1n) {
    if (den === 0n) throw new RangeError('Denominador zero');
    if (den < 0n) {
      num = -num;
      den = -den;
    }
    const g = gcd(num < 0n ? -num : num, den);
    this.num = num / g;
    this.den = den / g;
  }

  static of(num: number | bigint, den: number | bigint = 1): Fraction {
    return new Fraction(BigInt(num), BigInt(den));
  }

  /** Converte um número decimal finito (ex.: 5.5) em fração exata, a partir da sua escrita decimal. */
  static fromDecimal(x: number): Fraction {
    if (!Number.isFinite(x)) throw new RangeError(`Valor não finito: ${x}`);
    const [mantissa = '0', exp = '0'] = x.toString().toLowerCase().split('e');
    const [int = '0', frac = ''] = mantissa.split('.');
    const e = Number(exp) - frac.length;
    const digits = BigInt(int + frac);
    return e >= 0 ? new Fraction(digits * 10n ** BigInt(e)) : new Fraction(digits, 10n ** BigInt(-e));
  }

  add(o: Fraction): Fraction {
    return new Fraction(this.num * o.den + o.num * this.den, this.den * o.den);
  }
  sub(o: Fraction): Fraction {
    return new Fraction(this.num * o.den - o.num * this.den, this.den * o.den);
  }
  mul(o: Fraction): Fraction {
    return new Fraction(this.num * o.num, this.den * o.den);
  }
  div(o: Fraction): Fraction {
    return new Fraction(this.num * o.den, this.den * o.num);
  }
  equals(o: Fraction): boolean {
    return this.num === o.num && this.den === o.den;
  }
  toNumber(): number {
    return Number(this.num) / Number(this.den);
  }
  toString(): string {
    return this.den === 1n ? `${this.num}` : `${this.num}/${this.den}`;
  }
}

function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a === 0n ? 1n : a;
}
