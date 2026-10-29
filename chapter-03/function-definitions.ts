// Run with Node 26 or newer: node chapter-03/function-definitions.ts

import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import { makeNamedTuple } from "../typescript/python-compat.ts";

// 3.1 Function parameters and type hints
// ---------------------------------------
// TypeScript types are erased like Python hints, but TS narrows unions during
// static analysis. Neither language coerces values merely because of a hint.
type RGBTuple = readonly [red: number, green: number, blue: number];
type HSLTuple = readonly [hue: number, saturation: number, lightness: number];
interface RGBFields {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

const HEXADECIMAL_RADIX = 16;
const BITS_PER_COLOR_CHANNEL = 8;
const GREEN_CHANNEL_SHIFT = BITS_PER_COLOR_CHANNEL;
const RED_CHANNEL_SHIFT = BITS_PER_COLOR_CHANNEL * 2;
const BYTE_MASK = 0xff; // Hexadecimal 0xFF is decimal 255: eight 1 bits.
const SAMPLE_RED_HEX = 0xc62d42; // Hexadecimal 0xC62D42 is decimal 12,987,714.

function hexToRgb(hexadecimal: number | string): RGBTuple {
  const value =
    typeof hexadecimal === "string"
      ? Number.parseInt(hexadecimal.replace(/^#/, ""), HEXADECIMAL_RADIX)
      : hexadecimal;
  // Right shift moves the selected 8-bit channel to the low end; bitwise AND
  // with BYTE_MASK then clears every bit except those lowest eight bits.
  return [
    (value >> RED_CHANNEL_SHIFT) & BYTE_MASK,
    (value >> GREEN_CHANNEL_SHIFT) & BYTE_MASK,
    value & BYTE_MASK,
  ];
}

assert.deepEqual(hexToRgb("#C62D42"), [198, 45, 66]);
assert.deepEqual(hexToRgb("C62D42"), [198, 45, 66]);
assert.deepEqual(hexToRgb(SAMPLE_RED_HEX), [198, 45, 66]);

function rgbTupleToHsl(color: RGBTuple): HSLTuple {
  const red = color[0] / 255;
  const green = color[1] / 255;
  const blue = color[2] / 255;
  const lightness = (Math.max(red, green, blue) + Math.min(red, green, blue)) / 2;
  return [0, 0, lightness];
}

const [red, green, blue] = hexToRgb("C62D42");
const namedRgb = makeNamedTuple<RGBTuple, RGBFields>([red, green, blue], {
  red: 0,
  green: 1,
  blue: 2,
});
assert.deepEqual(Array.from(namedRgb), [198, 45, 66]);
assert.deepEqual(
  { red: namedRgb.red, green: namedRgb.green, blue: namedRgb.blue },
  { red: 198, green: 45, blue: 66 },
);
assert.deepEqual(rgbTupleToHsl([128, 128, 128]), [0, 0, 128 / 255]);

// 3.2 Designing functions with optional parameters
// ------------------------------------------------
// A TS default also makes a parameter optional. Unlike Python, JS call sites
// cannot name arguments, so an options object is preferable as APIs grow.
function rollDice(rollOne: () => number, count = 2): readonly number[] {
  return Array.from({ length: count }, rollOne);
}

const deterministicRolls = [3, 2, 4, 6, 1, 1, 5, 1];
let nextRoll = 0;
const rollOne = (): number => deterministicRolls[nextRoll++] ?? 1;
const crapsRoll = rollDice(rollOne);
const zonkRoll = rollDice(rollOne, 6);
assert.deepEqual(crapsRoll, [3, 2]);
assert.deepEqual(zonkRoll, [4, 6, 1, 1, 5, 1]);

const craps = (roller: () => number): readonly number[] => rollDice(roller, 2);
const zonk = (roller: () => number): readonly number[] => rollDice(roller, 6);
assert.deepEqual(
  craps(() => 4),
  [4, 4],
);
assert.deepEqual(
  zonk(() => 5),
  [5, 5, 5, 5, 5, 5],
);

// 3.3 Using super-flexible keyword parameters
// ------------------------------------------------
// A typed options object is the JS/TS equivalent of Python keyword arguments.
// Its declared keys catch misspellings without an unrestricted rest object.
interface RateTimeDistance {
  readonly distance: number | null;
  readonly rate: number | null;
  readonly time: number | null;
}

type RateTimeDistanceInput = Partial<{
  readonly distance: number;
  readonly rate: number;
  readonly time: number;
}>;

function solveRateTimeDistance(input: RateTimeDistanceInput): RateTimeDistance {
  let { distance = null, rate = null, time = null } = input;
  if (distance === null && rate !== null && time !== null) distance = rate * time;
  else if (rate === null && distance !== null && time !== null) rate = distance / time;
  else if (time === null && distance !== null && rate !== null) time = distance / rate;
  else throw new TypeError("Exactly one value must be unknown");
  return { distance, rate, time };
}

const journey = solveRateTimeDistance({ distance: 31.2, rate: 6 });
assert.deepEqual(journey, { distance: 31.2, rate: 6, time: 5.2 });
assert.equal(
  "At " +
    journey.rate +
    "kt, it takes " +
    journey.time +
    "hrs to cover " +
    journey.distance +
    "nm",
  "At 6kt, it takes 5.2hrs to cover 31.2nm",
);

function solveRateTimeDistanceKeywords(
  keywords: Record<string, number>,
): RateTimeDistance {
  const allowed = new Set(["distance", "rate", "time"]);
  const unexpected = Object.keys(keywords).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new TypeError("Invalid keyword parameter: " + unexpected.sort().join(", "));
  }
  return solveRateTimeDistance(keywords);
}

assert.deepEqual(solveRateTimeDistanceKeywords({ distance: 31.2, rate: 6 }), journey);
assert.throws(
  () => solveRateTimeDistanceKeywords({ distnace: 31.2, rate: 6 }),
  /distnace/,
);

// 3.4 Forcing keyword-only arguments with the * separator
// --------------------------------------------------------
function windChillTemperature(temperatureC: number, windKph: number): number {
  if (windKph < 4.8 || temperatureC > 10) {
    throw new RangeError(
      "wind speed must be at least 4.8 kph and temperature at most 10C",
    );
  }
  return (
    13.12 +
    0.6215 * temperatureC -
    11.37 * windKph ** 0.16 +
    0.3965 * temperatureC * windKph ** 0.16
  );
}

interface WindChillTableOptions {
  readonly startTemperature: number;
  readonly stopTemperature: number;
  readonly temperatureStep: number;
  readonly startWind: number;
  readonly stopWind: number;
  readonly windStep: number;
}

function integerRange(start: number, stop: number, step: number): number[] {
  const result: number[] = [];
  for (let value = start; step > 0 ? value < stop : value > stop; value += step) {
    result.push(value);
  }
  return result;
}

function createWindChillTable(options: WindChillTableOptions): string {
  const temperatures = integerRange(
    options.startTemperature,
    options.stopTemperature,
    options.temperatureStep,
  );
  const rows: (string | number)[][] = [["", ...temperatures]];
  for (
    let wind = options.startWind;
    wind < options.stopWind;
    wind += options.windStep
  ) {
    rows.push([
      wind,
      ...temperatures.map((temperature) => windChillTemperature(temperature, wind)),
    ]);
  }
  return rows.map((row) => row.join(",")).join("\n") + "\n";
}

// An options object provides JS/TS keyword-like clarity. Runtime JS still has
// one positional argument; TypeScript checks the property names statically.
const windTable = createWindChillTable({
  startTemperature: 0,
  stopTemperature: -11,
  temperatureStep: -5,
  startWind: 5,
  stopWind: 11,
  windStep: 5,
});
assert.equal(windTable.split("\n")[0], ",0,-5,-10");

// 3.5 Defining position-only parameters with the / separator
// -----------------------------------------------------------
// JavaScript arguments are always positional: parameter identifiers cannot be
// used at a call site. Python's / makes that restriction explicit in its API.
function fahrenheitFromCelsius(celsius: number): number {
  return 32 + (9 * celsius) / 5;
}

function celsiusFromFahrenheit(fahrenheit: number, truncate = false): number {
  const celsius = (5 * (fahrenheit - 32)) / 9;
  return truncate ? Math.round(celsius) : celsius;
}

assert.equal(fahrenheitFromCelsius(100), 212);
assert.equal(celsiusFromFahrenheit(72), 22.22222222222222);
assert.equal(celsiusFromFahrenheit(72, true), 22);

// 3.6 Picking an order for parameters based on partial functions
// ----------------------------------------------------------------
const NAUTICAL_MILES_RADIUS = 3440;
const KILOMETERS_RADIUS = 6372;
type Coordinates = readonly [number, number, number, number];

function haversineDistance(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
  radius: number,
): number {
  const radians = (degrees: number): number => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(latitude2 - latitude1);
  const longitudeDelta = radians(longitude2 - longitude1);
  const latitude1Radians = radians(latitude1);
  const latitude2Radians = radians(latitude2);
  const chord = Math.sqrt(
    Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(latitude1Radians) *
        Math.cos(latitude2Radians) *
        Math.sin(longitudeDelta / 2) ** 2,
  );
  return radius * 2 * Math.asin(chord);
}

// JS has Function.bind(), but a closure is clearer when binding the rightmost
// argument. Python functools.partial can bind a keyword-only argument directly.
const withRadius =
  (radius: number) =>
  (...coordinates: Coordinates): number =>
    haversineDistance(...coordinates, radius);

const nauticalHaversine = withRadius(NAUTICAL_MILES_RADIUS);
const kilometerHaversine = withRadius(KILOMETERS_RADIUS);
const coordinates: Coordinates = [36.12, -86.67, 33.94, -118.4];
assert.equal(Number(kilometerHaversine(...coordinates).toFixed(2)), 2886.9);
assert.equal(Number(nauticalHaversine(...coordinates).toFixed(2)), 1558.53);

function radiusFirstHaversine(radius: number, ...points: Coordinates): number {
  return haversineDistance(...points, radius);
}

const nauticalHaversineBound = radiusFirstHaversine.bind(null, NAUTICAL_MILES_RADIUS);
assert.equal(nauticalHaversineBound(...coordinates), nauticalHaversine(...coordinates));

// 3.7 Writing clear documentation strings with RST markup
// --------------------------------------------------------
/**
 * Computes wind-chill temperature from metric inputs.
 *
 * @param temperatureC - Air temperature in degrees Celsius.
 * @param windKph - Wind speed in kilometers per hour.
 * @returns The apparent temperature in degrees Celsius.
 * @throws RangeError when the formula is used outside its valid input range.
 * @example
 * documentedWindChill(-10, 25); // approximately -18.8 C
 */
function documentedWindChill(temperatureC: number, windKph: number): number {
  return windChillTemperature(temperatureC, windKph);
}

assert.equal(Number(documentedWindChill(-10, 25).toFixed(1)), -18.8);

// Python stores docstrings at runtime and Sphinx understands RST roles such as
// :param: and :raises:. JSDoc is normally tooling metadata and is not retained.

// 3.8 Designing recursive functions around Python's stack limits
// ----------------------------------------------------------------
function recursiveFactorial(number: number): bigint {
  if (number < 0) throw new RangeError("factorial requires a non-negative integer");
  if (number === 0) return 1n;
  return BigInt(number) * recursiveFactorial(number - 1);
}

function iterativeFactorial(number: number): bigint {
  if (number < 0) throw new RangeError("factorial requires a non-negative integer");
  let result = 1n;
  for (let value = 1; value <= number; value += 1) result *= BigInt(value);
  return result;
}

assert.equal(recursiveFactorial(5), 120n);
assert.ok(iterativeFactorial(1000) > 0n);

const fibonacciCache = new Map<number, bigint>();
function cachedFibonacci(number: number): bigint {
  const known = fibonacciCache.get(number);
  if (known !== undefined) return known;
  const result =
    number < 2 ? 1n : cachedFibonacci(number - 1) + cachedFibonacci(number - 2);
  fibonacciCache.set(number, result);
  return result;
}

function* fibonacciNumbers(): Generator<bigint, never, void> {
  let previous = 1n;
  let current = 1n;
  yield previous;
  while (true) {
    yield current;
    [previous, current] = [current, previous + current];
  }
}

function iterativeFibonacci(number: number): bigint {
  let index = 0;
  for (const value of fibonacciNumbers()) {
    if (index === number) return value;
    index += 1;
  }
  throw new Error("The infinite iterator cannot be exhausted");
}

assert.equal(cachedFibonacci(10), 89n);
assert.equal(iterativeFibonacci(10), 89n);

// 3.9 Writing testable scripts with the script-library switch
// ------------------------------------------------------------
interface Waypoint {
  readonly lat: number;
  readonly lon: number;
}

function waypointDistances(waypoints: readonly Waypoint[]): readonly number[] {
  const distances: number[] = [];
  for (let index = 1; index < waypoints.length; index += 1) {
    const start = waypoints[index - 1];
    const point = waypoints[index];
    if (start === undefined || point === undefined)
      throw new Error("Invalid waypoint index");
    distances.push(nauticalHaversine(start.lat, start.lon, point.lat, point.lon));
  }
  return distances;
}

function main(): void {
  const distances = waypointDistances([
    { lat: 36.12, lon: -86.67 },
    { lat: 33.94, lon: -118.4 },
  ]);
  assert.deepEqual(
    distances.map((distance) => Number(distance.toFixed(2))),
    [1558.53],
  );
}

// Comparing the module URL with the CLI entry path is the stable Node equivalent
// of Python's guard. Node 26 also has import.meta.main, but its API stability is
// still early-development, so these long-lived notes retain the stable form.
if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
