// Run with Node 26 or newer:
// node chapter-15/testing.ts

import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";

// TypeScript parallels for all ten Chapter 15 recipes use Node's stable built-in
// test runner. TypeScript has no standard doctest format or runtime type checks.

// 15.1 Using docstrings for testing
function binomial(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k) || n < 0 || k < 0 || k > n) {
    throw new RangeError("require integer values with 0 <= k <= n");
  }
  let result = 1;
  for (let index = 1; index <= k; index += 1)
    result = (result * (n - index + 1)) / index;
  return result;
}

class Summary {
  private readonly values: number[] = [];

  add(value: number): void {
    this.values.push(value);
  }

  get mean(): number {
    return this.values.reduce((total, value) => total + value, 0) / this.values.length;
  }

  get median(): number {
    const ordered = this.values.toSorted((left, right) => left - right);
    const middle = Math.floor(ordered.length / 2);
    if (ordered.length % 2 === 1) return ordered[middle] ?? Number.NaN;
    return ((ordered[middle - 1] ?? 0) + (ordered[middle] ?? 0)) / 2;
  }
}

test("binomial examples", () => {
  assert.equal(binomial(52, 5), 2_598_960);
  assert.deepEqual([binomial(52, 0), binomial(52, 52)], [1, 1]);
});
// JSDoc examples are documentation only. Keep executable examples in node:test,
// or use a separate documentation tool that explicitly supports tested snippets.

// 15.2 Testing functions that raise exceptions
test("invalid binomial arguments", () => {
  assert.throws(() => binomial(5, 52), {
    name: "RangeError",
    message: "require integer values with 0 <= k <= n",
  });
});
// Assert the exception contract, not its stack trace, source line, or object ID.

// 15.3 Handling common doctest issues
function uniqueLetters(text: string): Set<string> {
  return new Set(
    [...text.toLowerCase()].filter((character) => /[a-z]/.test(character)),
  );
}

function normalCumulativeProbability(value: number): number {
  // Abramowitz-Stegun approximation; scoped to this comparison example.
  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value) / Math.sqrt(2);
  const coefficient = 1 / (1 + 0.3275911 * absolute);
  const erf =
    sign *
    (1 -
      ((((1.061405429 * coefficient - 1.453152027) * coefficient + 1.421413741) *
        coefficient -
        0.284496736) *
        coefficient +
        0.254829592) *
        coefficient *
        Math.exp(-absolute * absolute));
  return (1 + erf) / 2;
}

test("normalize unstable representations", () => {
  assert.deepEqual([...uniqueLetters("The quick brown fox...")].toSorted(), [
    "b",
    "c",
    "e",
    "f",
    "h",
    "i",
    "k",
    "n",
    "o",
    "q",
    "r",
    "t",
    "u",
    "w",
    "x",
  ]);
  assert.ok(Math.abs(normalCumulativeProbability(1) - 0.8413) < 0.0001);
});

// 15.4 Unit testing with the unittest module
function populatedSummary(): Summary {
  const summary = new Summary();
  for (let value = 0; value <= 1_000; value += 1) summary.add(value);
  return summary;
}

describe("Summary", () => {
  test("mean", () => assert.equal(populatedSummary().mean, 500));
  test("median", () => assert.equal(populatedSummary().median, 500));
});
// describe() groups related tests; beforeEach() is the closest xUnit-style setup,
// although a small factory often makes ownership and freshness clearer.

// 15.5 Combining unittest and doctest tests
test("one runner collects every node:test case in this module", () => {
  assert.equal(typeof test, "function");
});
// Node has one built-in test model but no DocTestSuite/load_tests protocol.

// 15.6 Unit testing with the pytest module
test("a fixture-like factory creates fresh state", () => {
  const first = populatedSummary();
  const second = populatedSummary();
  assert.notEqual(first, second);
  assert.equal(first.mean, second.mean);
});
// pytest resolves fixture arguments by name. Node test setup uses factories,
// hooks, or values closed over by a suite; it does not inject named fixtures.

// 15.7 Combining pytest and doctest tests
test("test discovery and examples share the same executable module", () => {
  assert.equal(binomial(6, 2), 15);
});
// `node --test chapter-15/testing.ts` provides discovery/reporting, while direct
// `node chapter-15/testing.ts` also registers and runs these cases.

// 15.8 Testing things that involve dates or times
type Clock = () => Date;

function serializeAtTime(payload: unknown, clock: Clock): readonly [string, string] {
  const now = clock();
  const digits = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return [`extract_${digits}.json`, JSON.stringify(payload, undefined, 2)];
}

test("inject a fixed clock", () => {
  const clock = mock.fn<Clock>(() => new Date("2017-09-10T11:12:13Z"));
  const [name, body] = serializeAtTime({ primes: [2, 3, 5, 7] }, clock);
  assert.equal(name, "extract_20170910111213.json");
  assert.deepEqual(JSON.parse(body), { primes: [2, 3, 5, 7] });
  assert.equal(clock.mock.callCount(), 1);
});
// Node's MockTimers can control Date and timers. Injecting a clock remains a
// smaller framework-independent boundary when only the current instant matters.

// 15.9 Testing things that involve randomness
type Choose = (population: readonly number[]) => number;

function resample(
  population: readonly number[],
  size: number,
  choose: Choose,
): number[] {
  return Array.from({ length: size }, () => choose(population));
}

test("inject deterministic choices", () => {
  const expected = [23, 29, 31, 37, 41, 43, 47, 53];
  let index = 0;
  const choose = mock.fn<Choose>(() => expected[index++] ?? Number.NaN);
  const population = [2, 3, 5, 7, 11, 13, 17, 19];
  assert.deepEqual(resample(population, 8, choose), expected);
  assert.equal(choose.mock.callCount(), 8);
  assert.ok(choose.mock.calls.every((record) => record.arguments[0] === population));
});

// 15.10 Mocking external resources
type Writer = (path: string, content: string) => void;

class MemoryFiles {
  readonly files: Map<string, string>;

  constructor(initial: Readonly<Record<string, string>>) {
    this.files = new Map(Object.entries(initial));
  }

  replaceAtomically(target: string, content: string, writer: Writer): void {
    const temporary = `${target}.new`;
    const previous = this.files.get(target);
    try {
      writer(temporary, content);
      const replacement = this.files.get(temporary);
      if (replacement === undefined) throw new Error("temporary file missing");
      this.files.set(target, replacement);
      this.files.delete(temporary);
    } catch (error) {
      if (previous !== undefined) this.files.set(target, previous);
      this.files.delete(temporary);
      throw error;
    }
  }
}

test("successful replacement tracks the writer call", () => {
  const storage = new MemoryFiles({ "important.csv": "original" });
  const writer = mock.fn<Writer>((path, content) => storage.files.set(path, content));
  storage.replaceAtomically("important.csv", "replacement", writer);
  assert.equal(storage.files.get("important.csv"), "replacement");
  assert.equal(writer.mock.callCount(), 1);
  assert.deepEqual(writer.mock.calls[0]?.arguments, [
    "important.csv.new",
    "replacement",
  ]);
});

for (const failure of [new Error("disk full"), new TypeError("serializer")]) {
  test(`failed write preserves original: ${failure.constructor.name}`, () => {
    const storage = new MemoryFiles({ "important.csv": "original" });
    const writer: Writer = (path) => {
      storage.files.set(path, "partial");
      throw failure;
    };
    assert.throws(
      () => storage.replaceAtomically("important.csv", "replacement", writer),
      failure,
    );
    assert.equal(storage.files.get("important.csv"), "original");
    assert.equal(storage.files.has("important.csv.new"), false);
  });
}
// Use isolated real resources for the happy path and mocks for failures that are
// unsafe or difficult to reproduce. Node's MockTracker restores method mocks and
// records calls; observable behavior should remain the primary assertion target.
