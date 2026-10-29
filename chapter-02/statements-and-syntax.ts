// Run with Node 26 or newer: node chapter-02/statements-and-syntax.ts

import assert from "node:assert/strict";

import { decomposeBinaryFloat } from "../typescript/python-compat.ts";

// 2.1 Writing Python script and module files – syntax basics
// ----------------------------------------------------------
// TypeScript modules use imports/exports and package.json supplies runtime
// metadata. UTF-8 source is equally useful, but indentation is not syntax.
const scriptTemplate = [
  "#!/usr/bin/env python3",
  '"""Calculate an approximation of pi."""',
  "",
  "π = 355 / 113",
  "print(π)",
].join("\n");
assert.ok(scriptTemplate.includes("π"));
assert.deepEqual(
  new TextDecoder().decode(new TextEncoder().encode(scriptTemplate)),
  scriptTemplate,
);

// 2.2 Writing long lines of code
// -------------------------------
// JS/TS permits physical line breaks in grouped expressions. Unlike Python,
// adjacent string literals are not concatenated, so use +, join(), or a
// template literal.
const exampleValueOneLine =
  ((63 / 25) * (17 + 15 * Math.sqrt(5))) / (7 + 15 * Math.sqrt(5));
const exampleValueGrouped =
  (63 / 25) * ((17 + 15 * Math.sqrt(5)) / (7 + 15 * Math.sqrt(5)));
const commonTerm = 15 * Math.sqrt(5);
const scale = 63 / 25;
const numerator = 17 + commonTerm;
const denominator = 7 + commonTerm;
const exampleValueNamed = (scale * numerator) / denominator;

const [mantissaFraction, exponent] = decomposeBinaryFloat(exampleValueOneLine);
const mantissaWhole = Math.trunc(mantissaFraction * 2 ** 53);
const messageText =
  "the internal representation " +
  "is " +
  String(mantissaWhole) +
  "/2**53*2**" +
  String(exponent);
assert.equal(exampleValueGrouped, exampleValueOneLine);
assert.equal(exampleValueNamed, exampleValueOneLine);
assert.equal(messageText, "the internal representation is 7074237752514592/2**53*2**2");

// 2.3 Including descriptions and documentation
// ----------------------------------------------
// Python docstrings are runtime values. JSDoc is stripped at runtime but gives
// TypeScript-aware editors structured documentation and API information.
const scriptDocumentation = [
  "Download and decode the current marine warning.",
  "SYNOPSIS",
  "DESCRIPTION",
  "FILES",
  "EXAMPLES",
].join("\n");
const libraryDocumentation = [
  "Provide parsing helpers for marine warnings.",
  "DESCRIPTION",
  "MODULE CONTENTS",
  "EXAMPLES",
].join("\n");
for (const heading of ["SYNOPSIS", "DESCRIPTION", "FILES", "EXAMPLES"]) {
  assert.ok(scriptDocumentation.includes(heading));
}
for (const heading of ["DESCRIPTION", "MODULE CONTENTS", "EXAMPLES"]) {
  assert.ok(libraryDocumentation.includes(heading));
}

// 2.4 Writing better docstrings with RST markup
// ----------------------------------------------
// RST is Python documentation markup rather than a TS language feature. This
// mirrors its headings, literal block, directive, and inline markup as text.
const rstDocumentation = [
  "Marine Warning Parser",
  "=====================",
  "",
  "Usage",
  "-----",
  "",
  "Call the parser with decoded text::",
  "",
  "    warning = parse_warning(document)",
  "",
  ".. important::",
  "   Decode bytes before parsing.",
  "",
  "Use *UTF-8*, **validation**, and pass " +
    String.fromCharCode(96).repeat(2) +
    "str" +
    String.fromCharCode(96).repeat(2) +
    ".",
].join("\n");
assert.ok(rstDocumentation.includes("Marine Warning Parser\n====================="));
assert.ok(rstDocumentation.includes("::\n\n    warning"));
assert.ok(rstDocumentation.includes(".. important::"));
assert.ok(rstDocumentation.includes("*UTF-8*"));
assert.ok(rstDocumentation.includes("**validation**"));

// 2.5 Designing complex if...elif chains
// -----------------------------------------
// An ordered if/else-if chain has the same runtime shape. A defensive final
// throw exposes missing cases; discriminated unions can add static exhaustiveness.
type CrapsResult =
  | Readonly<{ outcome: "craps" | "winner"; point: null }>
  | Readonly<{ outcome: "point"; point: number }>;

function classifyComeOutRoll(total: number): CrapsResult {
  if ([2, 3, 12].includes(total)) return { outcome: "craps", point: null };
  if ([7, 11].includes(total)) return { outcome: "winner", point: null };
  if ([4, 5, 6, 8, 9, 10].includes(total)) return { outcome: "point", point: total };
  throw new RangeError("Design problem: impossible dice total " + String(total));
}

const allDiceTotals = new Set<number>();
// Python range(1, 7) lazily yields 1 through 6 without allocating a list.
// JS/TS has no range object, so a traditional for loop is the closest
// equivalent. Array.from({ length: 6 }, (_, index) => index + 1) is appropriate
// only when the values must be materialized as an array.
for (let left = 1; left <= 6; left += 1) {
  for (let right = 1; right <= 6; right += 1) allDiceTotals.add(left + right);
}
assert.deepEqual(
  [...allDiceTotals].sort((a, b) => a - b),
  [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
);
assert.deepEqual(classifyComeOutRoll(2), { outcome: "craps", point: null });
assert.deepEqual(classifyComeOutRoll(7), { outcome: "winner", point: null });
assert.deepEqual(classifyComeOutRoll(8), { outcome: "point", point: 8 });
assert.throws(() => classifyComeOutRoll(13), RangeError);

// 2.6 Saving intermediate results with the := “walrus” operator
// --------------------------------------------------------------
// JavaScript assignment already is an expression. Parenthesize it in a
// condition to make the side effect conspicuous and avoid confusing it with ==.
const threshold = 0.000_000_001;
let seriesTotal = 0;
let term = 0;
let n = 0;
for (; n < 20_000; n += 1) {
  if ((term = (1 / (2 * n + 1)) ** 2) >= threshold) seriesTotal += term;
  else break;
}
assert.equal(n, 15_811);
assert.ok(term < threshold);
assert.ok(seriesTotal > 1);

const data = [11, 13, 17, 19, 23, 29] as const;
let runningTotal = 0;
const runningSums = data.map((value) => (runningTotal = runningTotal + value));
assert.equal(runningTotal, 112);
assert.deepEqual(runningSums, [11, 24, 41, 60, 83, 112]);

// 2.7 Avoiding a potential problem with break statements
// -------------------------------------------------------
// JS/TS has no loop-else clause. Explicit nullable state makes both loop
// postconditions visible: found a separator, or exhausted the input.
function splitProperty(text: string): readonly [string | null, string | null] {
  let separatorPosition: number | null = null;
  for (let position = 0; position < text.length; position += 1) {
    const character = text[position];
    if (character === "=" || character === ":") {
      separatorPosition = position;
      break;
    }
  }
  if (separatorPosition === null) return text ? [text, null] : [null, null];
  return [text.slice(0, separatorPosition), text.slice(separatorPosition + 1)];
}

assert.deepEqual(splitProperty("some_name = the_value"), ["some_name ", " the_value"]);
assert.deepEqual(splitProperty("name_only"), ["name_only", null]);
assert.deepEqual(splitProperty(""), [null, null]);
assert.deepEqual(splitProperty("name:value=rest"), ["name", "value=rest"]);

// 2.8 Leveraging exception matching rules
// ----------------------------------------
// JS has one catch block. Narrow unknown from the most specific Error subclass
// to the most general, mirroring ordered Python except clauses.
class FileNotFoundError extends Error {}

function copyWithMissingParentRecovery(
  copyOperation: () => string,
  createParent: () => void,
): string {
  try {
    return copyOperation();
  } catch (error: unknown) {
    if (error instanceof FileNotFoundError) {
      createParent();
      return copyOperation();
    }
    if (error instanceof Error) return "copy error: " + error.message;
    throw error;
  }
}

// Python requires a global declaration before assigning to a module binding
// from a function. JS/TS resolves variables lexically: the callbacks below
// close over this outer let binding and can assign to it without another keyword.
let parentExists = false;
const simulatedCopy = (): string => {
  if (!parentExists) throw new FileNotFoundError("missing target directory");
  return "copied";
};
assert.equal(
  copyWithMissingParentRecovery(simulatedCopy, () => {
    parentExists = true;
  }),
  "copied",
);
assert.equal(parentExists, true);

// 2.9 Avoiding a potential problem with an except: clause
// -------------------------------------------------------
// JavaScript can throw any value. TypeScript types catch variables as unknown;
// recover from understood Error objects and rethrow everything else.
function recoverApplicationError(operation: () => string): string {
  try {
    return operation();
  } catch (error: unknown) {
    if (error instanceof Error) return "recovered: " + error.message;
    throw error;
  }
}
assert.equal(
  recoverApplicationError(() => {
    throw new Error("bad");
  }),
  "recovered: bad",
);
assert.throws(() =>
  recoverApplicationError(() => {
    throw "not an Error";
  }),
);

// 2.10 Concealing an exception root cause
// ----------------------------------------
// Error options can expose a useful cause. Omitting cause is the JS equivalent
// of Python's raise-from-None display behavior.
class MyAppError extends Error {}

function translateTypeError(): never {
  try {
    throw new TypeError("implementation detail");
  } catch (error: unknown) {
    if (error instanceof TypeError) throw new MyAppError("Some Known Problem");
    throw error;
  }
}
assert.throws(translateTypeError, (error: unknown) => {
  assert.ok(error instanceof MyAppError);
  assert.equal(error.message, "Some Known Problem");
  assert.equal("cause" in error, false);
  return true;
});

// 2.11 Managing a context using the with statement
// -------------------------------------------------
// ECMAScript explicit resource management gives using the same normal/exceptional
// scope-exit guarantee as Python with. A resource opts in with Symbol.dispose.
class CsvBuffer {
  closed = false;
  readonly rows: string[] = [];

  write(row: readonly (string | number)[]): void {
    if (this.closed) throw new Error("resource is closed");
    this.rows.push(row.join(","));
  }

  close(): void {
    this.closed = true;
  }

  [Symbol.dispose](): void {
    this.close();
  }

  toString(): string {
    return this.rows.join("\n") + "\n";
  }
}

const target = new CsvBuffer();
let writtenCsv = "";
assert.throws(() => {
  using targetFile = target;
  targetFile.write(["column", "data", "heading"]);
  targetFile.write([2, 3, 5]);
  targetFile.write([7, 11, 13]);
  targetFile.write([17, 19, 23]);
  writtenCsv = targetFile.toString();
  throw new Error("Testing");
}, /Testing/);
assert.equal(target.closed, true);
assert.equal(writtenCsv, "column,data,heading\n2,3,5\n7,11,13\n17,19,23\n");

console.log("Classified dice totals: " + String(allDiceTotals.size));
console.log("Series stopped at n=" + n.toLocaleString("en-US"));
console.log("Property split: ('name', 'value')");
console.log("Context resource closed: True");
