// Run with Node 23.6 or newer: node chapter-04/lists-and-sets.ts

import assert from "node:assert/strict";

import {
  floorDivisionWithRemainder,
  setDifference,
  setIntersection,
  setSymmetricDifference,
  setUnion,
} from "../typescript/python-compat.ts";

// Executable TypeScript parallels for Modern Python Cookbook, Chapter 4.

// 4.1 Choosing a data structure
// -------------------------------
// Set emphasizes membership and uniqueness; Array emphasizes order and index;
// Map associates keys with values. Unlike Python, JS Set accepts mutable values
// and compares object members by identity.
const yes = new Set(["yes", "y"]);
const no = new Set(["no", "n"]);
assert.ok(new Set([...yes, ...no]).has("YES".toLowerCase()));

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
assert.equal(monthNames[8], "Sep");
assert.equal(monthNames.indexOf("Feb"), 1);

const mutableCoordinate = [35, -76];
const coordinates = new Set([mutableCoordinate]);
assert.ok(coordinates.has(mutableCoordinate));
assert.ok(!coordinates.has([35, -76]));

// 4.2 Building lists: literals, appending, and comprehensions
// ------------------------------------------------------------
// Array.push() mutates like Python list.append(), but returns the new length.
const fileRecords: readonly (readonly [string, number])[] = [
  ["a.csv", 260],
  ["b.csv", 45],
  ["c.csv", 225],
];
const fileSizes: number[] = [];
for (const [, size] of fileRecords) fileSizes.push(size);
assert.deepEqual(fileSizes, [260, 45, 225]);
assert.deepEqual(
  fileRecords.map(([, size]) => size),
  fileSizes,
);
assert.equal(
  fileSizes.reduce((total, size) => total + size, 0),
  530,
);
assert.equal(Math.min(...fileSizes), 45);
assert.equal(fileSizes.indexOf(Math.min(...fileSizes)), 1);

// Array.from(), map(), and filter() cover common comprehension cases. Nested
// comprehensions generally require flatMap() or explicit loops.
const sieve = Array.from({ length: 30 }, () => true);
sieve[0] = sieve[1] = false;
for (let candidate = 2; candidate < sieve.length; candidate += 1) {
  if (sieve[candidate]) {
    for (let multiple = candidate * 2; multiple < sieve.length; multiple += candidate) {
      sieve[multiple] = false;
    }
  }
}
const primes = sieve.flatMap((isPrime, value) => (isPrime ? [value] : []));
assert.deepEqual(primes, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);

const morePrimes = [31, 37];
const combinedPrimes = [...primes, ...morePrimes];
morePrimes.push(41, 43);
morePrimes.splice(0, 0, 29);
assert.deepEqual(combinedPrimes.slice(-2), [31, 37]);
assert.deepEqual(morePrimes, [29, 31, 37, 41, 43]);

// 4.3 Slicing and dicing a list
// ------------------------------
// Array.slice() uses Python-like half-open bounds but does not accept a step.
const logRows: string[][] = [
  ["date", "engine on", "fuel height"],
  ["", "", ""],
  ["", "", ""],
  ["", "", ""],
  ["10/25/13", "08:24:00 AM", "29"],
  ["", "01:15:00 PM", "27"],
  ["", "calm", ""],
  ["10/26/13", "09:12:00 AM", "27"],
  ["", "06:25:00 PM", "22"],
  ["", "choppy", ""],
];
const head = logRows.slice(0, 4);
const tail = logRows.slice(4);
assert.equal(head.length, 4);
const combinedRows: string[][] = [];
for (let index = 0; index < tail.length; index += 3) {
  const start = tail[index];
  const stop = tail[index + 1];
  if (start === undefined || stop === undefined)
    throw new Error("Incomplete row group");
  combinedRows.push([...start, ...stop]);
}
assert.deepEqual(combinedRows[0], [
  "10/25/13",
  "08:24:00 AM",
  "29",
  "",
  "01:15:00 PM",
  "27",
]);
const tailCopy = tail.slice();
assert.notEqual(tailCopy, tail);
assert.equal(tailCopy[0], tail[0]);

// 4.4 Shrinking lists: deleting, removing, and popping
// -----------------------------------------------------
// splice() is the closest JS operation to del, remove(), pop(index), and slice
// assignment. It mutates and returns the removed values.
const mutableRows = logRows.map((row) => row.slice());
mutableRows.splice(0, 4);
assert.equal(mutableRows[0]?.[0], "10/25/13");

const row = combinedRows[0]?.slice();
if (row === undefined) throw new Error("Expected a combined row");
const emptyPosition = row.indexOf("");
assert.deepEqual(row.splice(emptyPosition, 1), [""]);
assert.equal(row.length, 5);

const fibonacciLike = [1, 1, 2, 3, 5, 8, 10, 13, 21, 34, 36, 55];
const oddValues = fibonacciLike.filter((value) => value % 2 !== 0);
assert.deepEqual(oddValues, [1, 1, 3, 5, 13, 21, 55]);

// 4.5 Writing list-related type hints
// ------------------------------------
// These aliases are erased at runtime, as Python hints are. readonly tuples add
// static protection; ordinary JavaScript arrays remain mutable at runtime.
type IntegerRGB = readonly [red: number, green: number, blue: number];
type FloatRGB = readonly [red: number, green: number, blue: number];
type NumericRGB = IntegerRGB | FloatRGB;
type NamedRGB = readonly [name: string, color: NumericRGB];
type ColorCode = readonly [name: string, code: string];

function hexify(red: number, green: number, blue: number): string {
  const color = (Math.trunc(red) << 16) | (Math.trunc(green) << 8) | Math.trunc(blue);
  return `#${color.toString(16).toUpperCase().padStart(6, "0")}`;
}

function sourceToHex(source: readonly NamedRGB[]): ColorCode[] {
  return source.map(([name, color]) => [name, hexify(color[0], color[1], color[2])]);
}

const colorScheme: NamedRGB[] = [
  ["Brick Red", [198, 45, 66]],
  ["color1", [198, 100.5, 45]],
];
assert.deepEqual(sourceToHex(colorScheme), [
  ["Brick Red", "#C62D42"],
  ["color1", "#C6642D"],
]);

// 4.6 Reversing a copy of a list
// --------------------------------
// reverse() mutates and returns the array, unlike Python reverse(), which returns
// None. toReversed() is the direct modern JS operation for a reversed copy.
let remaining = 8_063_599;
const fields: number[] = [];
for (const base of [60, 60, 24, 7]) {
  const [quotient, field] = floorDivisionWithRemainder(remaining, base);
  remaining = quotient;
  fields.push(field);
}
fields.push(remaining);
assert.deepEqual(fields, [19, 53, 7, 2, 13]);
assert.deepEqual(fields.toReversed(), [13, 2, 7, 53, 19]);
const reversedInPlace = fields.slice();
assert.equal(reversedInPlace.reverse(), reversedInPlace);
assert.deepEqual(reversedInPlace, fields.toReversed());
assert.deepEqual(fields, [19, 53, 7, 2, 13]);

// 4.7 Building sets: literals, adding, comprehensions, and operators
// -------------------------------------------------------------------
// JS lacks set-comprehension syntax. Set preserves insertion order, unlike the
// deliberately unspecified presentation order of a Python set.
const importDetails: readonly (readonly [string, readonly string[]])[] = [
  ["chapter_a.py", ["pathlib", "typing"]],
  ["chapter_b.py", ["pathlib", "argparse"]],
];
const allImports = new Set<string>();
for (const [, importedNames] of importDetails) {
  for (const name of importedNames) allImports.add(name);
}
const names = new Set(importDetails.flatMap(([, importedNames]) => importedNames));
assert.deepEqual(allImports, names);
assert.deepEqual(allImports, new Set(["pathlib", "typing", "argparse"]));

const collection = new Set([1]);
const union = setUnion(collection, new Set([3]));
assert.deepEqual(union, new Set([1, 3]));
assert.deepEqual(collection, new Set([1]));
collection.add(3).add(4);
assert.deepEqual(setIntersection(collection, new Set([3, 5])), new Set([3]));
assert.deepEqual(
  setSymmetricDifference(collection, new Set([3, 5])),
  new Set([1, 4, 5]),
);
assert.deepEqual(setDifference(collection, new Set([1, 4])), new Set([3]));

// 4.8 Shrinking sets: remove(), pop(), and difference
// ----------------------------------------------------
const log = "IP: 111.222.111.222; placeholders IP: 1.2.3.4 and IP: 0.0.0.0";
const matches = new Set(log.match(/IP: \d+\.\d+\.\d+\.\d+/g) ?? []);
const ignored = new Set(["IP: 0.0.0.0", "IP: 1.2.3.4"]);
const expectedMatches = new Set(["IP: 111.222.111.222"]);
assert.deepEqual(setDifference(matches, ignored), expectedMatches);

const validMatches = new Set(matches);
for (const item of ignored) validMatches.delete(item);
assert.deepEqual(validMatches, expectedMatches);
assert.equal(validMatches.delete("IP: 111.222.111.222"), true);
// Python remove() raises KeyError; JS delete() reports absence with false.
assert.equal(validMatches.delete("missing"), false);

// JS Set has no pop(): iteration order makes a manual first-item removal
// deterministic, whereas Python set.pop() is arbitrary.
const toPop = new Set(["a", "b"]);
const popped = toPop.values().next().value;
if (popped === undefined) throw new Error("Expected a set member");
toPop.delete(popped);
assert.equal(toPop.size, 1);

// 4.9 Writing set-related type hints
// -----------------------------------
const DIE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"] as const;
type Die = (typeof DIE_FACES)[number];

function setsEqual<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function evaluateZonkSix(hand: readonly Die[]): string {
  if (hand.length !== 6) throw new RangeError("Only six-die hands are supported");
  const unique = new Set(hand);
  const smallStraights = [new Set(DIE_FACES.slice(0, -1)), new Set(DIE_FACES.slice(1))];
  if (unique.size === 6) return "large straight";
  if (
    unique.size === 5 &&
    smallStraights.some((straight) => setsEqual(unique, straight))
  )
    return "small straight";
  if (unique.size === 2) return "three of a kind";
  if (unique.size === 1) return "six of a kind";
  if (unique.size === 3 || unique.size === 4) {
    const counts = new Map<Die, number>();
    for (const die of hand) counts.set(die, (counts.get(die) ?? 0) + 1);
    const frequencies = new Set(counts.values());
    if (frequencies.has(3) || frequencies.has(4)) return "three of a kind";
    if (unique.has("⚀")) return "ace";
  }
  return "Zonk!";
}

assert.equal(evaluateZonkSix(DIE_FACES), "large straight");
assert.equal(evaluateZonkSix(["⚀", "⚁", "⚂", "⚃", "⚄", "⚀"]), "small straight");
assert.equal(evaluateZonkSix(["⚅", "⚅", "⚅", "⚅", "⚅", "⚅"]), "six of a kind");
assert.equal(evaluateZonkSix(["⚂", "⚂", "⚂", "⚃", "⚄", "⚅"]), "three of a kind");
assert.equal(evaluateZonkSix(["⚀", "⚀", "⚁", "⚁", "⚂", "⚃"]), "ace");
