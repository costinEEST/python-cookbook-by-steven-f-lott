// Run with Node 26 or newer: node chapter-05/dictionaries.ts

import assert from "node:assert/strict";

// Executable TypeScript parallels for Modern Python Cookbook, Chapter 5.

const LOG_TEXT = `[2019/11/12:08:09:10,123] INFO request-A path="/openapi.yaml" method=GET
[2019/11/12:08:09:10,234] INFO request-B path="/items?limit=x" method=GET
[2019/11/12:08:09:10,235] INFO request-B error="invalid query"
[2019/11/12:08:09:10,345] INFO request-A status="200" bytes="11234"
[2019/11/12:08:09:10,456] INFO request-B status="404" bytes="987"
[2019/11/12:08:09:10,567] INFO request-C path="/category/42" method=GET`;
const LOG_PATTERN = /^\[(.*?)\] (\w+) (\S+) (.*)$/;
const PARAMETER_PATTERN = /(\w+)=(".*?"|\w+)/g;
type LogRecord = readonly [
  timestamp: string,
  level: string,
  requestId: string,
  details: string,
];

function parseLog(source: string): LogRecord[] {
  return source.split("\n").map((line) => {
    const match = LOG_PATTERN.exec(line);
    if (match === null) throw new SyntaxError(`Invalid log line: ${line}`);
    const [, timestamp, level, requestId, details] = match;
    if (
      timestamp === undefined ||
      level === undefined ||
      requestId === undefined ||
      details === undefined
    )
      throw new SyntaxError(`Incomplete log line: ${line}`);
    return [timestamp, level, requestId, details];
  });
}

const logRecords = parseLog(LOG_TEXT);

// 5.1 Creating dictionaries: inserting and updating
// ---------------------------------------------------
// Map accepts keys of any identity. A Python dict instead requires hashable
// keys; plain JS objects are restricted to string and symbol property keys.
const ratioLiteral = { num: 355, den: 113 };
assert.deepEqual(
  Object.fromEntries([
    ["num", 355],
    ["den", 113],
  ]),
  ratioLiteral,
);

const histogram = new Map<string, number>();
for (const [, , , details] of logRecords) {
  if (details.startsWith("path")) {
    // set() mutates and returns the Map, unlike Python item assignment.
    histogram.set(details, (histogram.get(details) ?? 0) + 1);
  }
}
assert.deepEqual(Object.fromEntries(histogram), {
  'path="/openapi.yaml" method=GET': 1,
  'path="/items?limit=x" method=GET': 1,
  'path="/category/42" method=GET': 1,
});

const parameterMaps = logRecords.map(([, , , details]) =>
  Object.fromEntries(
    [...details.matchAll(PARAMETER_PATTERN)].map((match) => [match[1], match[2]]),
  ),
);
assert.deepEqual(parameterMaps[0], { path: '"/openapi.yaml"', method: "GET" });
assert.deepEqual(parameterMaps[2], { error: '"invalid query"' });

// JS has no built-in defaultdict or Counter. Map.get() plus ?? supplies a
// default without inserting it; set() performs the mutation explicitly.
const counterHistogram = new Map<string, number>();
for (const [, , , details] of logRecords.filter((record) =>
  record[3].startsWith("path"),
)) {
  counterHistogram.set(details, (counterHistogram.get(details) ?? 0) + 1);
}
assert.deepEqual(counterHistogram, histogram);

// Sorting a dictionary representation by value
// ----------------------------------------------
// Object.entries() creates [key, value] pairs. toSorted() returns a new array,
// while its comparator orders pairs by index 1, the value. The source object is
// unchanged. This parallels sorted(xs.items(), key=lambda item: item[1]).
const xs = { a: 4, b: 3, c: 2, d: 1 };
const itemsByValue = Object.entries(xs).toSorted((left, right) => left[1] - right[1]);
assert.deepEqual(itemsByValue, [
  ["d", 1],
  ["c", 2],
  ["b", 3],
  ["a", 4],
]);
assert.deepEqual(xs, { a: 4, b: 3, c: 2, d: 1 });

// ECMAScript sorting is stable too, so equal values retain entry order.
const scores = { first: 2, second: 1, third: 2 };
assert.deepEqual(
  Object.entries(scores).toSorted((left, right) => left[1] - right[1]),
  [
    ["second", 1],
    ["first", 2],
    ["third", 2],
  ],
);

// 5.2 Shrinking dictionaries: pop() and del
// --------------------------------------------
function requestBatches(source: readonly string[]): LogRecord[][] {
  const requests = new Map<string, LogRecord[]>();
  const completed: LogRecord[][] = [];
  for (const line of source) {
    const record = parseLog(line)[0];
    if (record === undefined) continue;
    const requestId = record[2];
    let group = requests.get(requestId);
    if (group === undefined) {
      group = [];
      requests.set(requestId, group);
    }
    // push() mutates the shared group and returns its new length.
    group.push(record);
    if (record[3].startsWith("status")) {
      completed.push(group);
      // delete() mutates the Map and returns whether the key existed.
      assert.equal(requests.delete(requestId), true);
    }
  }
  return completed;
}

const batches = requestBatches(LOG_TEXT.split("\n"));
assert.deepEqual(
  batches.map((batch) => batch[0]?.[2]),
  ["request-A", "request-B"],
);
assert.deepEqual(
  batches.map((batch) => batch.length),
  [2, 3],
);

const inventory = new Map([
  ["first", 1],
  ["second", 2],
]);
const removedFirst = inventory.get("first");
assert.equal(inventory.delete("first"), true);
assert.equal(removedFirst, 1);
assert.equal(inventory.delete("missing"), false);

// 5.3 Writing dictionary-related type hints
// -------------------------------------------
// Record<string, string> is homogeneous. An interface describes fixed property
// names with heterogeneous types; like TypedDict, it is erased at runtime.
interface History {
  readonly date: string;
  readonly startTime: string;
  readonly startFuel: number;
  readonly endTime: string;
  readonly endFuel: number;
}

interface FlexibleHistory {
  readonly date: string;
  readonly startTime?: string;
  readonly startFuel?: number;
  readonly endTime?: string;
  readonly endFuel?: number;
}

const csvRows: readonly Record<string, string>[] = [
  {
    date: "10/25/13",
    "engine on": "08:24:00",
    "fuel height on": "29",
    "engine off": "13:15:00",
    "fuel height off": "27",
  },
];

function makeHistory(source: readonly Record<string, string>[]): History[] {
  return source.map((row) => {
    const raw = {
      date: row.date,
      startTime: row["engine on"],
      startFuel: row["fuel height on"],
      endTime: row["engine off"],
      endFuel: row["fuel height off"],
    };
    if (
      raw.date === undefined ||
      raw.startTime === undefined ||
      raw.startFuel === undefined ||
      raw.endTime === undefined ||
      raw.endFuel === undefined
    )
      throw new TypeError("Missing history field");
    return {
      date: raw.date,
      startTime: raw.startTime,
      startFuel: Number(raw.startFuel),
      endTime: raw.endTime,
      endFuel: Number(raw.endFuel),
    };
  });
}

assert.deepEqual(makeHistory(csvRows)[0], {
  date: "10/25/13",
  startTime: "08:24:00",
  startFuel: 29,
  endTime: "13:15:00",
  endFuel: 27,
});
const partialHistory: FlexibleHistory = { date: "10/29/13" };
assert.equal(partialHistory.endTime, undefined);

// 5.4 Understanding variables, references, and assignment
// ---------------------------------------------------------
// JS assignment also shares object references. Arrays are mutable objects;
// primitive numbers are immutable values. JS has no immutable tuple runtime.
const mutable = [1, 1, 2, 3, 5, 8];
const mutableAlias = mutable;
mutable.push(mutable.at(-2)! + mutable.at(-1)!);
assert.equal(mutableAlias, mutable);
assert.deepEqual(mutableAlias, [1, 1, 2, 3, 5, 8, 13]);

const immutable = Object.freeze([5, 8, 13, 21] as const);
const immutableAlias = immutable;
const extendedImmutable = Object.freeze([...immutable, 34]);
assert.equal(immutableAlias, immutable);
assert.notEqual(extendedImmutable, immutableAlias);
assert.deepEqual(immutableAlias, [5, 8, 13, 21]);

let number = 355;
const originalNumber = number;
number += 113;
assert.equal(number, 468);
assert.equal(originalNumber, 355);

// 5.5 Making shallow and deep copies of objects
// -----------------------------------------------
const someDictionary = { a: [1, 1, 2, 3] };
const shallowCopy = { ...someDictionary };
assert.notEqual(shallowCopy, someDictionary);
assert.equal(shallowCopy.a, someDictionary.a);
someDictionary.a.push(5);
assert.deepEqual(shallowCopy, { a: [1, 1, 2, 3, 5] });

// structuredClone() is the platform deep-copy analogue for supported data
// types. It recursively copies this object graph, so nested arrays are distinct.
const deepCopy = structuredClone(someDictionary);
assert.notEqual(deepCopy.a, someDictionary.a);
someDictionary.a.push(8);
assert.deepEqual(deepCopy, { a: [1, 1, 2, 3, 5] });
assert.deepEqual(someDictionary, { a: [1, 1, 2, 3, 5, 8] });

// 5.6 Avoiding mutable default parameter values
// -----------------------------------------------
// Python evaluates a default expression once at function definition. JS
// evaluates parameter default expressions on every omitted call, so this is safe.
function safeJavaScriptDefault(summary: number[] = []): number[] {
  summary.push(1);
  return summary;
}
const firstSafeDefault = safeJavaScriptDefault();
const secondSafeDefault = safeJavaScriptDefault();
assert.notEqual(firstSafeDefault, secondSafeDefault);
assert.deepEqual(firstSafeDefault, [1]);
assert.deepEqual(secondSafeDefault, [1]);

// Closing over one collection reproduces Python's bad shared-default outcome.
const sharedBadSummary: number[] = [];
function gatherStatsBad(): number[] {
  sharedBadSummary.push(1);
  return sharedBadSummary;
}
assert.equal(gatherStatsBad(), gatherStatsBad());
assert.deepEqual(sharedBadSummary, [1, 1]);

function createSummary<T>(factory: (values: Iterable<number>) => T): T {
  return factory([7, 4, 5, 8]);
}
const summaryList = createSummary((values) => [...values]);
const summaryCounts = createSummary((values) => {
  const result = new Map<number, number>();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
});
assert.deepEqual(summaryList, [7, 4, 5, 8]);
assert.deepEqual(
  summaryCounts,
  new Map([
    [7, 1],
    [4, 1],
    [5, 1],
    [8, 1],
  ]),
);
