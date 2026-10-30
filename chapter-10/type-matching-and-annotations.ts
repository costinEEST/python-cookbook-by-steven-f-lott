// Run with Node 26 or newer: node chapter-10/type-matching-and-annotations.ts

import assert from "node:assert/strict";

// Executable TypeScript parallels for all six recipes in Modern Python Cookbook,
// Chapter 10. Python remains authoritative for match and Pydantic semantics.

interface Referenced {
  readonly kind: "referenced";
  readonly datafile: string;
  readonly recipes: readonly string[];
}
type Content = string | Referenced;

// 10.1 Designing with type hints
// --------------------------------
function classifyFiles(
  datafiles: Iterable<string>,
  references: ReadonlyMap<string, readonly string[]>,
): Content[] {
  return [...datafiles].map((datafile) => {
    const recipes = references.get(datafile);
    return recipes === undefined
      ? datafile
      : { kind: "referenced", datafile, recipes: [...recipes] };
  });
}

const classified = classifyFiles(
  ["unused.csv", "used.json"],
  new Map([["used.json", ["chapter-11/reader.ts"]]]),
);
assert.equal(typeof classified[0], "string");
assert.equal(typeof classified[1], "object");
// Both languages erase these declarations. The discriminant exists because a TS
// interface cannot be tested with instanceof and has no Python-style class pattern.

// 10.2 Using the built-in type matching functions
// -------------------------------------------------
function isReferenced(item: Content): item is Referenced {
  return typeof item !== "string" && item.kind === "referenced";
}

function analyzeWithGuards(source: Iterable<Content>): [string[], Referenced[]] {
  const deleted: string[] = [];
  const kept: Referenced[] = [];
  for (const item of source) {
    if (typeof item === "string") deleted.push(item);
    else if (isReferenced(item)) kept.push(item);
  }
  return [deleted, kept];
}

const [deleted, kept] = analyzeWithGuards(classified);
assert.deepEqual(deleted, ["unused.csv"]);
assert.deepEqual(
  kept.map((item) => item.datafile),
  ["used.json"],
);
// instanceof works for JS classes, like Python isinstance(), but structural values
// require typeof/property/discriminant checks. A type predicate informs the checker.

// 10.3 Using the match statement
// --------------------------------
function analyzeStructurally(source: Iterable<Content>): [string[], Referenced[]] {
  const removed: string[] = [];
  const retained: Referenced[] = [];
  for (const item of source) {
    if (typeof item === "string") removed.push(item);
    else if (item.recipes.length === 1)
      retained.push(item); // Specific case first.
    else retained.push(item); // General Referenced case.
  }
  return [removed, retained];
}

assert.deepEqual(analyzeStructurally(classified), [deleted, kept]);
// Python match checks and destructures in one construct. TypeScript uses explicit
// ordered guards; destructuring alone does not validate an unknown runtime shape.

// 10.4 Handling type conversions
// --------------------------------
interface MappedPoint {
  readonly lat: number;
  readonly lon: number;
}
type Point = readonly [number, number] | string | MappedPoint;

function finiteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new TypeError(`not a finite number: ${String(value)}`);
}

function parsePoint(item: Point): readonly [number, number] {
  if (typeof item === "string") {
    const parts = item.split(",");
    if (parts.length !== 2) throw new TypeError(`not a coordinate pair: ${item}`);
    return [finiteNumber(parts[0]), finiteNumber(parts[1])];
  }
  if (Array.isArray(item)) return [finiteNumber(item[0]), finiteNumber(item[1])];
  const mapped = item as MappedPoint;
  return [finiteNumber(mapped.lat), finiteNumber(mapped.lon)];
}

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radius: number,
): number {
  const radians = (degrees: number): number => (degrees * Math.PI) / 180;
  const phi1 = radians(lat1);
  const phi2 = radians(lat2);
  const deltaPhi = radians(lat2 - lat1);
  const deltaLambda = radians(lon2 - lon1);
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distance(first: Point, second: Point, radius = 6372.8): number {
  const [lat1, lon1] = parsePoint(first);
  const [lat2, lon2] = parsePoint(second);
  return haversine(lat1, lon1, lat2, lon2, radius);
}

const expectedDistance = 2887.26;
assert.ok(
  Math.abs(distance([36.12, -86.67], "33.94,-118.40") - expectedDistance) < 0.01,
);
assert.ok(
  Math.abs(distance({ lat: 36.12, lon: -86.67 }, [33.94, -118.4]) - expectedDistance) <
    0.01,
);
// Number("") is 0, unlike Python float(""); finiteNumber closes that semantic gap.

// 10.5 Implementing stricter type checks (Pydantic comparison)
// -------------------------------------------------------------
type Level = "DEBUG" | "INFO" | "WARNING" | "ERROR";
interface LogData {
  readonly date: Date;
  readonly level: Level;
  readonly module: string;
  readonly message: string;
}

const levels: readonly string[] = ["DEBUG", "INFO", "WARNING", "ERROR"];

function validateLogData(value: unknown): LogData {
  if (typeof value !== "object" || value === null)
    throw new TypeError("log must be an object");
  const row = value as Record<string, unknown>;
  const date = new Date(String(row.date));
  if (Number.isNaN(date.valueOf())) throw new TypeError("invalid date");
  if (typeof row.level !== "string" || !levels.includes(row.level))
    throw new TypeError("invalid level");
  if (typeof row.module !== "string" || !/^\w+$/.test(row.module))
    throw new TypeError("invalid module");
  if (typeof row.message !== "string") throw new TypeError("invalid message");
  return { date, level: row.level as Level, module: row.module, message: row.message };
}

const log = validateLogData({
  date: "2016-06-15T17:57:54.715Z",
  level: "INFO",
  module: "ch10",
  message: "Sample message",
});
assert.equal(log.level, "INFO");
assert.equal(log.date.toISOString(), "2016-06-15T17:57:54.715Z");
// An interface cannot validate unknown input or emit a schema. Pydantic can because
// BaseModel interprets Python annotations at runtime; TS needs code or a schema library.

// 10.6 Including run-time valid value checks
// --------------------------------------------
interface HighTide {
  readonly date: Date;
  readonly time: string;
  readonly prediction: number;
  readonly highLow: "H";
}

function validateHighTide(row: Readonly<Record<string, unknown>>): HighTide {
  const dateText = String(row.Date);
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(dateText)) throw new TypeError("invalid date");
  const date = new Date(`${dateText.replaceAll("/", "-")}T00:00:00Z`);
  const time = String(row.Time);
  if (time < "10:00" || time > "17:00") throw new RangeError("outside daylight");
  const prediction = finiteNumber(row.Pred);
  if (prediction < 1.5) throw new RangeError("tide is too low");
  if (row["High/Low"] !== "H") throw new RangeError("low tide rejected");
  return { date, time, prediction, highLow: "H" };
}

const highTide = validateHighTide({
  Date: "2024/04/07",
  Time: "15:42",
  Pred: "1.55",
  "High/Low": "H",
});
assert.equal(highTide.date.toISOString(), "2024-04-07T00:00:00.000Z");
assert.equal(highTide.highLow, "H");
assert.throws(
  () =>
    validateHighTide({
      Date: "2024/04/07",
      Time: "08:00",
      Pred: "1.2",
      "High/Low": "L",
    }),
  RangeError,
);
// Explicit runtime checks provide the conversion and domain narrowing that a TS
// annotation cannot. This parallels Pydantic Field and validator behavior.

console.log("Chapter 10 TypeScript examples passed.");
