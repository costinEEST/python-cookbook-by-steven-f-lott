// Run with Node 26 or newer: node chapter-09/functional-programming-features.ts

import assert from "node:assert/strict";

// Executable TypeScript parallels for all nine recipes in Modern Python Cookbook,
// Chapter 9. Python remains authoritative for Python iterator details.

interface RawLog {
  readonly date: string;
  readonly level: string;
  readonly module: string;
  readonly message: string;
}

interface DatedLog extends Omit<RawLog, "date"> {
  readonly date: Date;
}

const logPattern =
  /^\[(?<date>.*?)]\s+(?<level>\w+)\s+in\s+(?<module>.+?):\s+(?<message>.+)$/;

// 9.1 Writing generator functions with the yield statement
// ----------------------------------------------------------
function* parseLineIter(source: Iterable<string>): Generator<RawLog> {
  for (const line of source) {
    const groups = logPattern.exec(line)?.groups;
    if (groups === undefined) continue;
    const { date, level, module, message } = groups;
    if (
      date !== undefined &&
      level !== undefined &&
      module !== undefined &&
      message !== undefined
    )
      yield { date, level, module, message };
  }
}

function parseDate(item: RawLog): DatedLog {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}),(\d{3})$/.exec(
    item.date,
  );
  if (match === null) throw new SyntaxError(`invalid log date: ${item.date}`);
  const values = match.slice(1).map(Number);
  const [year, month, day, hour, minute, second, milliseconds] = values;
  if (
    [year, month, day, hour, minute, second, milliseconds].some(
      (value) => value === undefined,
    )
  )
    throw new SyntaxError(`invalid log date: ${item.date}`);
  return {
    ...item,
    date: new Date(
      Date.UTC(year!, month! - 1, day!, hour!, minute!, second!, milliseconds!),
    ),
  };
}

const logLines = [
  "[2016-04-24 11:05:01,462] INFO in module1: Sample Message One",
  "not a log record",
  "[2016-04-24 11:06:02,624] DEBUG in module2: Debugging",
  "[2016-04-24 11:07:03,246] WARNING in module1: Check failed",
];
const rawLogs = parseLineIter(logLines);
assert.equal(rawLogs[Symbol.iterator](), rawLogs);
assert.equal(rawLogs.next().value?.level, "INFO");
assert.deepEqual(
  [...rawLogs].map((item) => item.level),
  ["DEBUG", "WARNING"],
);
assert.deepEqual([...rawLogs], []);
// JS generators are demand-driven and one-shot like Python generators. Completion
// is represented by IteratorResult.done rather than Python's StopIteration.

// 9.2 Applying transformations to a collection
// ----------------------------------------------
function* mapIter<T, U>(transform: (item: T) => U, source: Iterable<T>): Generator<U> {
  for (const item of source) yield transform(item);
}

const sourceLogs = [...parseLineIter(logLines)];
const expectedDates = [
  "2016-04-24T11:05:01.462Z",
  "2016-04-24T11:06:02.624Z",
  "2016-04-24T11:07:03.246Z",
];
assert.deepEqual(
  [...mapIter(parseDate, sourceLogs)].map((item) => item.date.toISOString()),
  expectedDates,
);
assert.deepEqual(
  sourceLogs.map(parseDate).map((item) => item.date.toISOString()),
  expectedDates,
);
// Array.map() is eager, unlike Python map(). mapIter() preserves lazy semantics.

// 9.3 Using stacked generator expressions
// -----------------------------------------
type RawRow = string[];
interface CombinedRow {
  readonly date: string;
  readonly engineOnTime: string;
  readonly engineOnFuelHeight: string;
  readonly filler1: string;
  readonly engineOffTime: string;
  readonly engineOffFuelHeight: string;
  readonly filler2: string;
  readonly otherNotes: string;
  readonly filler3: string;
}

interface DatetimeRow {
  readonly date: Date;
  readonly engineOn: Date;
  readonly engineOnFuelHeight: number;
  readonly engineOff: Date;
  readonly engineOffFuelHeight: number;
  readonly otherNotes: string;
}

function toCombinedRow(values: readonly string[]): CombinedRow {
  if (values.length !== 9) throw new RangeError("a combined row needs nine cells");
  const [
    date,
    engineOnTime,
    engineOnFuelHeight,
    filler1,
    engineOffTime,
    engineOffFuelHeight,
    filler2,
    otherNotes,
    filler3,
  ] = values;
  if (
    [
      date,
      engineOnTime,
      engineOnFuelHeight,
      filler1,
      engineOffTime,
      engineOffFuelHeight,
      filler2,
      otherNotes,
      filler3,
    ].some((value) => value === undefined)
  )
    throw new RangeError("a combined row is incomplete");
  return {
    date: date!,
    engineOnTime: engineOnTime!,
    engineOnFuelHeight: engineOnFuelHeight!,
    filler1: filler1!,
    engineOffTime: engineOffTime!,
    engineOffFuelHeight: engineOffFuelHeight!,
    filler2: filler2!,
    otherNotes: otherNotes!,
    filler3: filler3!,
  };
}

function* rowMerge(source: Iterable<RawRow>): Generator<CombinedRow> {
  let cluster: string[] = [];
  for (const row of source) {
    if (!row.some(Boolean)) continue;
    if (row[0]) {
      if (cluster.length === 9) yield toCombinedRow(cluster);
      cluster = [...row]; // New outer array; strings are immutable.
    } else cluster.push(...row); // Mutates cluster; push returns the new length.
  }
  if (cluster.length === 9) yield toCombinedRow(cluster);
}

function parseClock(dateText: string, timeText: string): Date {
  const date = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(dateText);
  const time = /^(\d{2}):(\d{2}):(\d{2}) (AM|PM)$/.exec(timeText);
  if (date === null || time === null) throw new SyntaxError("invalid date or time");
  const month = Number(date[1]);
  const day = Number(date[2]);
  const year = 2000 + Number(date[3]);
  let hour = Number(time[1]) % 12;
  if (time[4] === "PM") hour += 12;
  return new Date(
    Date.UTC(year, month - 1, day, hour, Number(time[2]), Number(time[3])),
  );
}

function convertDatetime(row: CombinedRow): DatetimeRow {
  return {
    date: parseClock(row.date, "12:00:00 AM"),
    engineOn: parseClock(row.date, row.engineOnTime),
    engineOnFuelHeight: Number(row.engineOnFuelHeight),
    engineOff: parseClock(row.date, row.engineOffTime),
    engineOffFuelHeight: Number(row.engineOffFuelHeight),
    otherNotes: row.otherNotes,
  };
}

const rawRows = [
  ["date", "engine on", "fuel"],
  ["", "engine off", "fuel"],
  ["", "notes", ""],
  ["04/24/16", "11:05:00 AM", "29.0"],
  ["", "12:35:00 PM", "27.5"],
  ["", "calm", ""],
  ["", "", ""],
  ["04/25/16", "09:00:00 AM", "27.5"],
  ["", "10:00:00 AM", "26.5"],
  ["", "windy", ""],
];

function* filterIter<T>(
  predicate: (item: T) => boolean,
  source: Iterable<T>,
): Generator<T> {
  for (const item of source) if (predicate(item)) yield item;
}

const legs = [
  ...mapIter(
    convertDatetime,
    filterIter((row) => row.date !== "date", rowMerge(rawRows)),
  ),
];
assert.deepEqual(
  legs.map((row) => row.otherNotes),
  ["calm", "windy"],
);
assert.deepEqual(
  legs.map((row) => (row.engineOff.getTime() - row.engineOn.getTime()) / 1000),
  [5400, 3600],
);

// 9.4 Picking a subset - three ways to filter
// ---------------------------------------------
const passNonDate = (row: CombinedRow): boolean => row.date !== "date";
const allMerged = [...rowMerge(rawRows)];
assert.deepEqual(
  [...filterIter(passNonDate, allMerged)],
  allMerged.filter(passNonDate),
);
const validNumber = (text: string): boolean =>
  text.trim() !== "" && Number.isFinite(Number(text));
assert.deepEqual(["3.14", "missing", "-2"].filter(validNumber), ["3.14", "-2"]);
// Array.filter() is eager; filterIter() parallels Python's lazy filter().

// 9.5 Summarizing a collection - how to reduce
// ---------------------------------------------
const numbers = [2, 3, 4];
assert.equal(
  numbers.reduce((total, value) => total + value, 0),
  9,
);
assert.equal(
  numbers.reduce((product, value) => product * value, 1),
  24,
);
assert.equal([false, true, false].some(Boolean), true);
assert.equal([true, false].every(Boolean), false);
assert.equal(
  [].reduce((total: number, value: number) => total + value, 0),
  0,
);
assert.throws(() => ([] as number[]).reduce((left, right) => left + right), TypeError);
// Explicit identity values make empty reductions meaningful in both languages.

// 9.6 Combining map and reduce transformations
// ---------------------------------------------
interface Leg {
  readonly travelHours: number;
  readonly fuelChange: number;
}
const cleanLegs: readonly Leg[] = legs.map((row) => ({
  travelHours: (row.engineOff.getTime() - row.engineOn.getTime()) / 3_600_000,
  fuelChange: row.engineOnFuelHeight - row.engineOffFuelHeight,
}));
const rates = cleanLegs.map((leg) => leg.fuelChange / leg.travelHours);
assert.deepEqual(rates, [1, 1]);
const rateIterator = rates.values();
assert.equal(
  [...rateIterator].reduce((total, rate) => total + rate, 0),
  2,
);
assert.deepEqual([...rateIterator], []);
// Cache a concrete array when several summaries need separate iterations.

// 9.7 Implementing "there exists" processing
// --------------------------------------------
function* findFirst<T>(
  predicate: (item: T) => boolean,
  source: Iterable<T>,
): Generator<T> {
  for (const item of source)
    if (predicate(item)) {
      yield item;
      return;
    }
}

function prime(number: number): boolean {
  if (!Number.isInteger(number) || number < 2) return false;
  const candidates = Array.from(
    { length: Math.max(0, Math.floor(Math.sqrt(number)) - 1) },
    (_, index) => index + 2,
  );
  return (
    findFirst((divisor) => number % divisor === 0, candidates).next().done === true
  );
}
assert.deepEqual(
  Array.from({ length: 18 }, (_, index) => index + 2).filter(prime),
  [2, 3, 5, 7, 11, 13, 17, 19],
);
const visited: number[] = [];
assert.equal(
  Array.from({ length: 10 }, (_, index) => index).some((value) => {
    visited.push(value);
    return value === 4;
  }),
  true,
);
assert.deepEqual(visited, [0, 1, 2, 3, 4]);

// 9.8 Creating a partial function
// ---------------------------------
function standardize(mean: number, standardDeviation: number, value: number): number {
  return (value - mean) / standardDeviation;
}
const zScore = standardize.bind(undefined, 12, 2);
assert.deepEqual([10, 12, 14].map(zScore), [-1, 0, 1]);
let capturedName = 10;
const lateBound = (value: number): number => value + capturedName;
const capturedValue = (
  (offset) =>
  (value: number): number =>
    value + offset
)(capturedName);
capturedName = 20;
assert.equal(lateBound(1), 21);
assert.equal(capturedValue(1), 11);
// bind() stores supplied argument values; closures resolve captured bindings later.

// 9.9 Recursive generator functions with yield from
// --------------------------------------------------
type JsonScalar = null | string | number | boolean;
type JsonDocument =
  JsonScalar | { readonly [key: string]: JsonDocument } | readonly JsonDocument[];
type NodeId = string | number;

function isJsonArray(node: JsonDocument): node is readonly JsonDocument[] {
  return Array.isArray(node);
}

function* findValue(
  value: JsonScalar,
  node: JsonDocument,
  path: readonly NodeId[] = [],
): Generator<readonly NodeId[]> {
  if (isJsonArray(node)) {
    for (const [index, item] of node.entries())
      yield* findValue(value, item, [...path, index]);
  } else if (node !== null && typeof node === "object") {
    for (const key of Object.keys(node).toSorted())
      yield* findValue(value, node[key]!, [...path, key]);
  } else if (node === value) yield path;
}

const document: JsonDocument = {
  field: "value1",
  field2: "value",
  array: [{ array_item_key1: "value" }, { array_item_key2: "other" }],
  object: { attribute1: "value", attribute2: "value2" },
};
assert.deepEqual(
  [...findValue("value", document)],
  [["array", 0, "array_item_key1"], ["field2"], ["object", "attribute1"]],
);

function* factorIter(number: number): Generator<number> {
  for (let divisor = 2; divisor <= Math.floor(Math.sqrt(number)); divisor += 1) {
    if (number % divisor === 0) {
      yield divisor;
      yield* factorIter(number / divisor);
      return;
    }
  }
  yield number;
}
assert.deepEqual([...factorIter(384)], [2, 2, 2, 2, 2, 2, 2, 3]);
// JavaScript yield* is the direct analogue of Python yield from for delegation.
