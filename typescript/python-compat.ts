/**
 * Dependency-free helpers that reproduce Python semantics missing from JavaScript/TypeScript.
 */

/**
 * Computes the greatest common divisor using Euclid's algorithm.
 *
 * @example
 * greatestCommonDivisor(54n, 24n); // 6n
 *
 * @param left - The first integer.
 * @param right - The second integer.
 * @returns The largest non-negative integer that divides both inputs without a remainder.
 */
export function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Represents an exact fraction reduced to its simplest form.
 *
 * @example
 * new Rational(10n, 4n).toString(); // "5/2"
 */
export class Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;

  /** @param numerator - Integer above the fraction bar. @param denominator - Non-zero integer below it. */
  constructor(numerator: bigint, denominator = 1n) {
    if (denominator === 0n) {
      throw new RangeError("A rational denominator cannot be zero");
    }
    const sign = denominator < 0n ? -1n : 1n;
    const divisor = greatestCommonDivisor(numerator, denominator);
    this.numerator = (sign * numerator) / divisor;
    this.denominator = (sign * denominator) / divisor;
    Object.freeze(this);
  }

  /** @param value - Plain decimal text. @returns The exact reduced fraction. */
  static fromDecimal(value: string): Rational {
    const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value);
    if (match === null) {
      throw new SyntaxError(`Unsupported decimal rational: ${value}`);
    }
    const [, signText, whole, fraction = ""] = match;
    const sign = signText === "-" ? -1n : 1n;
    const denominator = 10n ** BigInt(fraction.length);
    return new Rational(sign * BigInt(`${whole}${fraction}`), denominator);
  }

  /** @param other - Multiplier. @returns The exact product. */
  multiply(other: Rational): Rational {
    return new Rational(
      this.numerator * other.numerator,
      this.denominator * other.denominator,
    );
  }

  /** @param other - Divisor. @returns The exact quotient. */
  divide(other: Rational): Rational {
    return new Rational(
      this.numerator * other.denominator,
      this.denominator * other.numerator,
    );
  }

  /** @returns The closest JavaScript binary floating-point number. */
  toNumber(): number {
    return Number(this.numerator) / Number(this.denominator);
  }

  /** @returns An integer or numerator/denominator string. */
  toString(): string {
    return this.denominator === 1n
      ? `${this.numerator}`
      : `${this.numerator}/${this.denominator}`;
  }
}

/** Rounding modes supported by {@link FixedDecimal.quantize}. */
export type DecimalRounding = "half-even" | "up";

/**
 * Stores a base-10 decimal as an integer coefficient and a decimal scale.
 *
 * @example
 * FixedDecimal.parse("0.10").add(FixedDecimal.parse("0.20")).toString(); // "0.30"
 */
export class FixedDecimal {
  readonly coefficient: bigint;
  readonly scale: number;

  /** @param coefficient - Decimal digits as an integer. @param scale - Fractional digit count. */
  constructor(coefficient: bigint, scale: number) {
    if (!Number.isInteger(scale) || scale < 0) {
      throw new RangeError("Decimal scale must be a non-negative integer");
    }
    this.coefficient = coefficient;
    this.scale = scale;
    Object.freeze(this);
  }

  /** @param value - Plain decimal text. @returns Its exact representation. */
  static parse(value: string): FixedDecimal {
    const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value);
    if (match === null) {
      throw new SyntaxError(`Unsupported decimal: ${value}`);
    }
    const [, signText, whole, fraction = ""] = match;
    const sign = signText === "-" ? -1n : 1n;
    return new FixedDecimal(sign * BigInt(`${whole}${fraction}`), fraction.length);
  }

  /** @param value - A finite number. @returns Its exact IEEE-754 value as a decimal. */
  static fromNumberExact(value: number): FixedDecimal {
    if (!Number.isFinite(value)) {
      throw new RangeError("Only finite numbers can become exact decimals");
    }
    if (Object.is(value, 0) || Object.is(value, -0)) {
      return new FixedDecimal(0n, 0);
    }
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, value, false);
    const bits = view.getBigUint64(0, false);
    const negative = bits >> 63n === 1n;
    const exponentBits = Number((bits >> 52n) & 0x7ffn);
    const fractionBits = bits & ((1n << 52n) - 1n);
    const significand = exponentBits === 0 ? fractionBits : (1n << 52n) | fractionBits;
    const binaryExponent = exponentBits === 0 ? -1022 - 52 : exponentBits - 1023 - 52;
    const sign = negative ? -1n : 1n;
    if (binaryExponent >= 0) {
      return new FixedDecimal(sign * significand * 2n ** BigInt(binaryExponent), 0);
    }
    const scale = -binaryExponent;
    return new FixedDecimal(sign * significand * 5n ** BigInt(scale), scale);
  }

  /** @param divisor - Non-zero divisor with a finite decimal result. @returns The exact quotient. */
  divideByInteger(divisor: bigint): FixedDecimal {
    if (divisor === 0n) {
      throw new RangeError("Division by zero");
    }
    let coefficient = this.coefficient;
    let scale = this.scale;
    while (coefficient % divisor !== 0n) {
      coefficient *= 10n;
      scale += 1;
      if (scale > this.scale + 32) {
        throw new RangeError("Decimal expansion is not finite");
      }
    }
    return new FixedDecimal(coefficient / divisor, scale);
  }

  /** @param other - Addend. @returns The exact sum. */
  add(other: FixedDecimal): FixedDecimal {
    const scale = Math.max(this.scale, other.scale);
    const left = this.coefficient * 10n ** BigInt(scale - this.scale);
    const right = other.coefficient * 10n ** BigInt(scale - other.scale);
    return new FixedDecimal(left + right, scale);
  }

  /** @param other - Multiplier. @returns The exact product. */
  multiply(other: FixedDecimal): FixedDecimal {
    return new FixedDecimal(
      this.coefficient * other.coefficient,
      this.scale + other.scale,
    );
  }

  /** @param scale - Fractional digits to retain. @param rounding - Rounding rule. @returns The rounded decimal. */
  quantize(scale: number, rounding: DecimalRounding): FixedDecimal {
    if (scale >= this.scale) {
      return new FixedDecimal(
        this.coefficient * 10n ** BigInt(scale - this.scale),
        scale,
      );
    }
    const divisor = 10n ** BigInt(this.scale - scale);
    let quotient = this.coefficient / divisor;
    const remainder = this.coefficient % divisor;
    const magnitude = remainder < 0n ? -remainder : remainder;
    const direction = this.coefficient < 0n ? -1n : 1n;
    const shouldRound =
      rounding === "up"
        ? magnitude !== 0n
        : magnitude * 2n > divisor ||
          (magnitude * 2n === divisor && quotient % 2n !== 0n);
    if (shouldRound) {
      quotient += direction;
    }
    return new FixedDecimal(quotient, scale);
  }

  /** @returns Fixed-point text preserving the decimal scale. */
  toString(): string {
    const sign = this.coefficient < 0n ? "-" : "";
    const digits = `${this.coefficient < 0n ? -this.coefficient : this.coefficient}`;
    if (this.scale === 0) {
      return `${sign}${digits}`;
    }
    const padded = digits.padStart(this.scale + 1, "0");
    return `${sign}${padded.slice(0, -this.scale)}.${padded.slice(-this.scale)}`;
  }
}

/**
 * @param left - First number to compare.
 * @param right - Second number to compare.
 * @param relativeTolerance - Maximum difference relative to the larger magnitude.
 * @returns Whether the numbers are close enough.
 */
export function isClose(
  left: number,
  right: number,
  relativeTolerance = 1e-9,
): boolean {
  return (
    Math.abs(left - right) <=
    relativeTolerance * Math.max(Math.abs(left), Math.abs(right))
  );
}

/**
 * @example
 * sumWithFloatingPointCompensation([1e16, 1, -1e16]); // 1
 *
 * @param values - Binary floating-point values to add.
 * @returns A compensated sum that reduces cancellation error, corresponding to Python's
 * `math.fsum()`.
 */
export function sumWithFloatingPointCompensation(values: readonly number[]): number {
  let sum = 0;
  let correction = 0;
  for (const value of values) {
    const next = sum + value;
    correction +=
      Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum;
    sum = next;
  }
  return sum + correction;
}

/**
 * @example
 * decomposeBinaryFloat(8); // [0.5, 4], because 0.5 * 2 ** 4 === 8
 *
 * @param value - Number to decompose.
 * @returns A normalized mantissa and base-2 exponent, like Python's `math.frexp`.
 */
export function decomposeBinaryFloat(
  value: number,
): readonly [mantissa: number, exponent: number] {
  if (value === 0 || !Number.isFinite(value)) {
    return [value, 0];
  }
  const exponent = Math.floor(Math.log2(Math.abs(value))) + 1;
  return [value / 2 ** exponent, exponent];
}

/**
 * @example
 * composeBinaryFloat(0.5, 4); // 8
 *
 * @param mantissa - Fractional component.
 * @param exponent - Power of two.
 * @returns The recombined number, like Python's `math.ldexp`.
 */
export function composeBinaryFloat(mantissa: number, exponent: number): number {
  return mantissa * 2 ** exponent;
}

/** A minimal immutable complex-number value. */
export type Complex = Readonly<{ real: number; imaginary: number }>;

/** @param value - Real input. @returns Its real or purely imaginary square root. */
export function sqrtComplex(value: number): Complex {
  return value < 0
    ? { real: 0, imaginary: Math.sqrt(-value) }
    : { real: Math.sqrt(value), imaginary: 0 };
}

/**
 * @example
 * floorDivisionWithRemainder(-5, 2); // [-3, 1]
 *
 * @param dividend - Number being divided.
 * @param divisor - Non-zero divisor.
 * @returns A floor quotient and remainder, corresponding to Python's `divmod()`.
 * @throws {RangeError} If the divisor is zero.
 */
export function floorDivisionWithRemainder(
  dividend: number,
  divisor: number,
): readonly [quotient: number, remainder: number] {
  if (divisor === 0) {
    throw new RangeError("Division by zero");
  }
  const quotient = Math.floor(dividend / divisor);
  return [quotient, dividend - quotient * divisor];
}

/** @param dividend - Number being divided. @param divisor - Non-zero divisor. @returns The Python-style floor quotient. */
export function floorDivision(dividend: number, divisor: number): number {
  return floorDivisionWithRemainder(dividend, divisor)[0];
}

/** @param totalSeconds - Duration to split. @returns Hours, minutes, and seconds. */
export function splitSeconds(totalSeconds: number): readonly [number, number, number] {
  const [hours, remainingSeconds] = floorDivisionWithRemainder(totalSeconds, 60 * 60);
  const [minutes, seconds] = floorDivisionWithRemainder(remainingSeconds, 60);
  return [hours, minutes, seconds];
}

/** @param value - Number to round. @param digits - Decimal places to retain. @returns The rounded number. */
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** @param pattern - Regular expression to apply. @param value - Entire string to test. @returns The match or `null`. */
export function fullMatch(pattern: RegExp, value: string): RegExpExecArray | null {
  const flags = pattern.flags.replace(/[gy]/g, "");
  return new RegExp(`^(?:${pattern.source})$`, flags).exec(value);
}

/**
 * @example
 * compileVerbose(" \\d+  # one or more digits").test("42"); // true
 *
 * @param source - Pattern with insignificant whitespace and `#` comments.
 * @returns The compiled regular expression.
 */
export function compileVerbose(source: string): RegExp {
  let compact = "";
  let escaped = false;
  let inCharacterClass = false;
  let inComment = false;
  for (const character of source) {
    if (inComment) {
      if (character === "\n") inComment = false;
      continue;
    }
    if (escaped) {
      compact += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      compact += character;
      escaped = true;
      continue;
    }
    if (character === "[") inCharacterClass = true;
    if (character === "]") inCharacterClass = false;
    if (!inCharacterClass && character === "#") {
      inComment = true;
      continue;
    }
    if (!inCharacterClass && /\s/.test(character)) continue;
    compact += character;
  }
  return new RegExp(compact);
}

/** @param value - Integer to format. @param specification - Supported Python format specifier. @returns Formatted text. */
export function formatInteger(value: number, specification: string): string {
  if (specification === "b") return value.toString(2);
  if (specification === "#o") return `0o${value.toString(8)}`;
  if (specification === "#06x") return `0x${value.toString(16).padStart(4, "0")}`;
  if (specification === "+4d")
    return `${value >= 0 ? "+" : "-"}${Math.abs(value)}`.padStart(4);
  throw new SyntaxError(`Unsupported integer format: ${specification}`);
}

/** @param value - Number to format. @param width - Minimum field width. @param precision - Fractional digits. @returns Fixed-point text. */
export function formatFloat(value: number, width: number, precision: number): string {
  return value.toFixed(precision).padStart(width);
}

/** @param value - Ratio where `1` means 100%. @param precision - Fractional digits. @returns Percentage text. */
export function formatPercent(value: number, precision: number): string {
  return `${(value * 100).toFixed(precision)}%`;
}

/** @param codePoint - Unicode scalar value. @returns Its character. */
export function formatCharacter(codePoint: number): string {
  return String.fromCodePoint(codePoint);
}

/** @param value - Text to center. @param width - Target width. @param fill - Padding character. @returns Centered text. */
export function center(value: string, width: number, fill: string): string {
  const padding = Math.max(0, width - value.length);
  const left = Math.floor(padding / 2);
  return `${fill.repeat(left)}${value}${fill.repeat(padding - left)}`;
}

/** @param expressions - Mapping from expression text to evaluated value. @returns Python debug f-string-style text. */
export function debugExpressions(
  expressions: Readonly<Record<string, unknown>>,
): string {
  return Object.entries(expressions)
    .map(([expression, value]) => `${expression}=${String(value)}`)
    .join(" ");
}

/** Input shape for the chapter's fixed-width weather row. */
export type WeatherData = Readonly<{
  id: string;
  location: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
}>;

/** @param data - Weather values to display. @returns One fixed-width report row. */
export function formatWeather(data: WeatherData): string {
  return `${data.id.padEnd(3)} : ${data.location.padEnd(19)} : ${String(data.maxTemp).padStart(3)} / ${String(data.minTemp).padStart(3)} / ${formatFloat(data.precipitation, 5, 2)}`;
}

/** Characters corresponding to Python's `string.whitespace`. */
export const ASCII_WHITESPACE = " \t\n\r\v\f";
/** Characters corresponding to Python's `string.punctuation`. */
export const ASCII_PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

const UNICODE_CHARACTERS_BY_OFFICIAL_NAME = Object.freeze({
  // U+1F004 is MAHJONG TILE RED DRAGON (🀄). Braced escapes support code points above U+FFFF.
  "MAHJONG TILE RED DRAGON": "\u{1f004}",
});

/**
 * @example
 * unicodeByName("MAHJONG TILE RED DRAGON"); // "🀄"
 *
 * @param name - Supported official Unicode name.
 * @returns Its character.
 */
export function unicodeByName(
  name: keyof typeof UNICODE_CHARACTERS_BY_OFFICIAL_NAME,
): string {
  return UNICODE_CHARACTERS_BY_OFFICIAL_NAME[name];
}

/** @param value - Text to encode. @returns Strict 7-bit ASCII bytes. @throws {TypeError} For non-ASCII input. */
export function encodeAscii(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code > 0x7f) {
      throw new TypeError(`ASCII cannot encode U+${code.toString(16).toUpperCase()}`);
    }
    bytes[index] = code;
  }
  return bytes;
}

/**
 * @example
 * formatPythonBytes(Uint8Array.of(0x41, 0x0a)); // "b'A\\x0a'"
 *
 * @param bytes - Bytes to display.
 * @returns A Python-style bytes literal.
 */
export function formatPythonBytes(bytes: Uint8Array): string {
  const firstPrintableAscii = 0x20; // SPACE
  const lastPrintableAscii = 0x7e; // TILDE (~)
  const apostrophe = 0x27; // Must be escaped inside the generated single-quoted literal.
  const backslash = 0x5c; // Starts an escape sequence, so it must also be escaped.
  let content = "";
  for (const byte of bytes) {
    content +=
      byte >= firstPrintableAscii &&
      byte <= lastPrintableAscii &&
      byte !== apostrophe &&
      byte !== backslash
        ? String.fromCharCode(byte)
        : `\\x${byte.toString(16).padStart(2, "0")}`;
  }
  return `b'${content}'`;
}

/** @param items - Tuple members in order. @returns A frozen array that models a Python tuple. */
export function frozenTuple<const T extends readonly unknown[]>(
  ...items: T
): Readonly<T> {
  return Object.freeze(items);
}

/** @param items - Values to search. @param target - Value to count. @returns Number of matches using `Object.is`. */
export function count<T>(items: readonly T[], target: T): number {
  return items.reduce((total, item) => total + Number(Object.is(item, target)), 0);
}

/**
 * @example
 * const point = makeNamedTuple<[number, number], { x: number; y: number }>(
 *   [3, 4],
 *   { x: 0, y: 1 },
 * );
 * point.x === point[0]; // true
 *
 * @param values - Positional tuple values.
 * @param fieldIndexes - Mapping from field names to tuple indexes.
 * @returns A frozen tuple-like array with named read-only fields.
 */
export function makeNamedTuple<T extends readonly unknown[], R extends object>(
  values: T,
  fieldIndexes: Readonly<Record<keyof R & string, number>>,
): Readonly<T> & Readonly<R> {
  const tuple = [...values] as unknown[] & Record<string, unknown>;
  for (const name of Object.keys(fieldIndexes) as Array<keyof R & string>) {
    const index = fieldIndexes[name];
    if (index === undefined) {
      throw new RangeError(`Missing tuple index for ${name}`);
    }
    Object.defineProperty(tuple, name, {
      enumerable: true,
      value: values[index],
    });
  }
  return Object.freeze(tuple) as Readonly<T> & Readonly<R>;
}
