// Run with Node 26 or newer: node chapter-07/basics-of-classes-and-objects.ts

import assert from "node:assert/strict";

// Executable TypeScript parallels for all 12 recipes in Modern Python Cookbook,
// Chapter 7. Python remains authoritative where JS object semantics differ.

// 7.1 Using a class to encapsulate data and processing
// -----------------------------------------------------
class DicePair {
  faces: [number, number] = [0, 0];
  private readonly nextFace: () => number;

  constructor(nextFace: () => number) {
    this.nextFace = nextFace;
  }

  roll(): void {
    this.faces = [this.nextFace(), this.nextFace()];
  }

  total(): number {
    return this.faces[0] + this.faces[1];
  }

  hardWay(): boolean {
    return this.faces[0] === this.faces[1];
  }

  easyWay(): boolean {
    return !this.hardWay();
  }
}

const deterministicFaces = [2, 5];
const dicePair = new DicePair(() => deterministicFaces.shift()!);
assert.equal(dicePair.roll(), undefined);
assert.deepEqual(dicePair.faces, [2, 5]);
assert.equal(dicePair.total(), 7);
assert.equal(dicePair.easyWay(), true);
// Python passes self explicitly. JS supplies this dynamically to an ordinary
// method, so extracting the method without binding it can lose its receiver.

// 7.2 Essential type hints for class definitions
// ------------------------------------------------
class DiceHand {
  static nextFace: () => number = () => 1;
  faces: number[] = [];
  rollNumber = 0;
  readonly numberOfDice: number;
  readonly sides: number;

  constructor(numberOfDice: number, sides = 6) {
    this.numberOfDice = numberOfDice;
    this.sides = sides;
  }

  toString(): string {
    return this.faces.map((face, index) => `${index}: ${face}`).join(", ");
  }

  total(): number {
    return this.faces.reduce((total, face) => total + face, 0);
  }

  average(): number {
    return this.total() / this.numberOfDice;
  }

  firstRoll(): number[] {
    this.rollNumber = 0;
    this.faces = Array.from({ length: this.numberOfDice }, () => DiceHand.nextFace());
    return this.faces;
  }

  reroll(positions: Iterable<number>): number[] {
    this.rollNumber += 1;
    for (const position of positions) this.faces[position] = DiceHand.nextFace();
    return this.faces;
  }
}

const diceHand = new DiceHand(3);
const firstFaces = diceHand.firstRoll();
assert.equal(firstFaces, diceHand.faces);
assert.equal(diceHand.reroll(new Set([0, 2])), diceHand.faces);
assert.equal(diceHand.rollNumber, 1);
// Iterable<number> mirrors collections.abc.Iterable[int]. Both languages erase
// these annotations; invalid runtime input is not rejected unless code validates it.

// 7.3 Designing classes with lots of processing
// ------------------------------------------------
class CounterStatistics {
  readonly mean: number;
  readonly standardDeviation: number;
  readonly rawCounter: Map<number, number>;

  constructor(rawCounter: Map<number, number>) {
    this.rawCounter = rawCounter;
    this.mean = this.computeMean();
    this.standardDeviation = this.computeStandardDeviation();
  }

  private computeMean(): number {
    let total = 0;
    let count = 0;
    for (const [value, frequency] of this.rawCounter) {
      total += value * frequency;
      count += frequency;
    }
    return total / count;
  }

  private computeStandardDeviation(): number {
    let squaredDifferenceTotal = 0;
    let count = 0;
    for (const [value, frequency] of this.rawCounter) {
      squaredDifferenceTotal += frequency * (value - this.mean) ** 2;
      count += frequency;
    }
    return Math.sqrt(squaredDifferenceTotal / (count - 1));
  }
}

const binnedData = new Map([
  [7, 3],
  [10, 2],
  [13, 1],
]);
const eagerStatistics = new CounterStatistics(binnedData);
assert.equal(eagerStatistics.mean, 9);
assert.equal(eagerStatistics.standardDeviation, Math.sqrt(6));
binnedData.set(16, 1);
assert.equal(eagerStatistics.mean, 9); // Eager results are stale after mutation.

// 7.4 Using typing.NamedTuple for immutable objects
// ---------------------------------------------------
type Card = Readonly<{ rank: number; suit: string }>;

function cardPoints(card: Card): number {
  return card.rank < 10 ? card.rank : 10;
}

const eightHearts: Card = Object.freeze({ rank: 8, suit: "♡" });
assert.equal(cardPoints(eightHearts), 8);
// readonly is static and Object.freeze() is shallow runtime protection. Unlike a
// Python NamedTuple, this object has no positional access, ordering, value equality,
// or value-based Map/Set hashing. Those behaviors need explicit implementations.

// 7.5 Using dataclasses for mutable objects
// -------------------------------------------
class CribbageHand {
  readonly cards: Card[];

  constructor(cards: Card[]) {
    this.cards = cards;
  }

  toCrib(first: Card, second: Card): void {
    for (const card of [first, second]) {
      const index = this.cards.findIndex(
        (candidate) => candidate.rank === card.rank && candidate.suit === card.suit,
      );
      if (index === -1) throw new RangeError("card is not in the hand");
      this.cards.splice(index, 1);
    }
  }
}

class Deck {
  static readonly suits = ["♣", "♢", "♡", "♠"] as const;
  readonly cards: Card[];

  constructor() {
    this.cards = Deck.suits.flatMap((suit) =>
      Array.from({ length: 13 }, (_, index) => ({ rank: index + 1, suit })),
    );
  }
}

const mutableHand = new CribbageHand([
  { rank: 3, suit: "♢" },
  { rank: 6, suit: "♠" },
  { rank: 7, suit: "♢" },
  { rank: 1, suit: "♠" },
]);
assert.equal(
  mutableHand.toCrib({ rank: 3, suit: "♢" }, { rank: 1, suit: "♠" }),
  undefined,
);
assert.deepEqual(mutableHand.cards, [
  { rank: 6, suit: "♠" },
  { rank: 7, suit: "♢" },
]);
assert.equal(new Deck().cards.length, 52);
// @dataclass would generate construction, repr, and value equality. A TS class or
// interface generates none of those automatically. Both versions retain the caller's
// array/list reference; toCrib mutates that same collection and returns nothing.

// 7.6 Using frozen dataclasses for immutable objects
// ---------------------------------------------------
type FrozenCard = Readonly<{ rank: number; suit: string }>;
type FrozenHand = Readonly<{ cards: FrozenCard[] }>;

function makeFrozenHand(cards: FrozenCard[] = []): FrozenHand {
  return Object.freeze({ cards });
}

const firstEmptyHand = makeFrozenHand();
const secondEmptyHand = makeFrozenHand();
assert.notEqual(firstEmptyHand.cards, secondEmptyHand.cards);
firstEmptyHand.cards.push(eightHearts);
assert.deepEqual(firstEmptyHand.cards, [eightHearts]);
// Like frozen=True, freezing the outer object is shallow. The nested array remains
// mutable. The default expression creates a new array for every call, paralleling
// dataclasses.field(default_factory=list).

// 7.7 Optimizing small objects with __slots__
// ----------------------------------------------
class Cribbage {
  readonly players: [string, string];
  dealer: string;
  opponent: string;

  constructor(first: string, second: string) {
    this.players = [first, second];
    this.dealer = first;
    this.opponent = second;
    Object.seal(this);
  }

  newDeal(): void {
    [this.dealer, this.opponent] = [this.opponent, this.dealer];
  }
}

const game = new Cribbage("one", "two");
game.newDeal();
assert.deepEqual([game.dealer, game.opponent], ["two", "one"]);
assert.equal(Object.isSealed(game), true);
// Object.seal() approximates the "no new attributes" part of __slots__, but does
// not use a Python-style compact slotted layout. TS field declarations alone have
// no runtime shape restriction.
// Python metaclasses can customize namespace creation through __prepare__() or
// __new__(); JavaScript Proxy/meta-programming tools do not directly model that hook.

// 7.8 Using more sophisticated collections
// -------------------------------------------
class Queue<T> {
  #head = 0;
  readonly #items: T[] = [];

  push(value: T): void {
    this.#items.push(value);
  }

  shift(): T | undefined {
    const value = this.#items[this.#head];
    if (value !== undefined) this.#head += 1;
    return value;
  }
}

const queue = new Queue<string>();
assert.equal(queue.push("first"), undefined);
queue.push("second");
assert.equal(queue.shift(), "first");

const grouped = new Map<string, number[]>();
const odd = grouped.get("odd") ?? [];
odd.push(1);
grouped.set("odd", odd);
const counts = new Map<string, number>();
for (const character of "mississippi")
  counts.set(character, (counts.get(character) ?? 0) + 1);
assert.deepEqual(grouped.get("odd"), [1]);
assert.equal(counts.get("i"), 4);
// JS has no core defaultdict, Counter, or ChainMap. Explicit Map logic is clear;
// Queue avoids Array.shift()'s O(n) reindexing for a long-lived FIFO.
// If input cannot fit in memory, stream it and retain only relevant groups. That
// map/reduce shape can later move from one process to workers or multiple hosts.

// 7.9 Extending a built-in collection - a list that does statistics
// -------------------------------------------------------------------
class StatisticsArray extends Array<number> {
  total(): number {
    return this.reduce((sum, value) => sum + value, 0);
  }

  mean(): number {
    return this.total() / this.length;
  }

  variance(): number {
    const sumOfSquares = this.reduce((sum, value) => sum + value ** 2, 0);
    return (sumOfSquares - this.total() ** 2 / this.length) / (this.length - 1);
  }

  standardDeviation(): number {
    return Math.sqrt(this.variance());
  }
}

const statistics = new StatisticsArray(14, 6, 4, 12, 7, 5);
const extension = new StatisticsArray(10, 8, 13, 9, 11);
assert.equal(statistics.push(...extension), 11); // Mutates and returns the new length.
assert.equal(statistics.mean(), 9);
assert.equal(statistics.variance(), 11);
// Python list.extend() returns None; JS Array.push() returns the new length. Both
// mutate the receiver. Subclassing couples statistics to this storage representation.
// A Python MutableMapping subclass must implement five core special methods. The
// closest TS contract is an interface, but interfaces cannot require runtime behavior.

// 7.10 Using properties for lazy attributes
// --------------------------------------------
class LazyCounterStatistics {
  readonly rawCounter: Map<number, number>;

  constructor(rawCounter: Map<number, number>) {
    this.rawCounter = rawCounter;
  }

  get count(): number {
    return [...this.rawCounter.values()].reduce((sum, frequency) => sum + frequency, 0);
  }

  get total(): number {
    let total = 0;
    for (const [value, frequency] of this.rawCounter) total += value * frequency;
    return total;
  }

  get mean(): number {
    return this.total / this.count;
  }

  get variance(): number {
    let sumOfSquares = 0;
    for (const [value, frequency] of this.rawCounter)
      sumOfSquares += frequency * value ** 2;
    return (sumOfSquares - this.total ** 2 / this.count) / (this.count - 1);
  }

  get standardDeviation(): number {
    return Math.sqrt(this.variance);
  }
}

const liveData = new Map([
  [7, 3],
  [10, 2],
  [13, 1],
]);
const lazyStatistics = new LazyCounterStatistics(liveData);
assert.equal(lazyStatistics.mean, 9);
liveData.set(15, 1);
assert.equal(lazyStatistics.mean, 69 / 7);
// JS get accessors are a close runtime analogue of Python @property. Memoizing
// either implementation requires invalidation when the aliased source mutates.

// 7.11 Creating contexts and context managers
// ----------------------------------------------
type Point = readonly [latitude: number, longitude: number];

function haversine(first: Point, second: Point, radius: number): number {
  const radians = (degrees: number): number => (degrees * Math.PI) / 180;
  const [latitude1, longitude1] = first.map(radians) as [number, number];
  const [latitude2, longitude2] = second.map(radians) as [number, number];
  const latitudeDelta = latitude2 - latitude1;
  const longitudeDelta = longitude2 - longitude1;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return radius * 2 * Math.asin(Math.sqrt(a));
}

class Distance implements Disposable {
  exited = false;
  readonly radius: number;

  constructor(radius: number) {
    this.radius = radius;
  }

  calculate(first: Point, second: Point): number {
    return haversine(first, second, this.radius);
  }

  [Symbol.dispose](): void {
    this.exited = true;
  }
}

let distanceContext: Distance;
let distance: number;
{
  using scopedDistance = (distanceContext = new Distance(3440.1));
  distance = scopedDistance.calculate([38.9784, -76.4922], [36.8443, -76.2922]);
}
assert.equal(distanceContext.exited, true);
assert.equal(Math.round(distance * 100) / 100, 128.48);
// Node 26's using invokes Symbol.dispose at scope exit. Python __enter__ can return
// a different value and __exit__ can inspect or suppress exceptions; disposal has
// no equivalent suppression return value.
// Python __exit__ may also translate a low-level exception into a domain error.
// Symbol.dispose cannot inspect the exception that caused its scope to unwind.

// 7.12 Managing multiple contexts with multiple resources
// ---------------------------------------------------------
interface RoutePoint {
  readonly latitude: number;
  readonly longitude: number;
}
interface Leg {
  readonly start: RoutePoint;
  readonly end: RoutePoint;
  readonly distance: number;
}

class LegMaker implements Disposable {
  #lastPoint: RoutePoint | undefined;
  exited = false;
  readonly radius: number;

  constructor(radius = 3440.1) {
    this.radius = radius;
  }

  waypoint(nextPoint: RoutePoint): Leg | undefined {
    const start = this.#lastPoint;
    this.#lastPoint = nextPoint;
    if (start === undefined) return undefined;
    return {
      start,
      end: nextPoint,
      distance: Math.round(
        haversine(
          [start.latitude, start.longitude],
          [nextPoint.latitude, nextPoint.longitude],
          this.radius,
        ),
      ),
    };
  }

  [Symbol.dispose](): void {
    this.exited = true;
  }
}

class CsvBuffer implements Disposable {
  readonly rows: string[] = [];
  exited = false;

  write(fields: readonly (number | string)[]): void {
    this.rows.push(fields.join(","));
  }

  [Symbol.dispose](): void {
    this.exited = true;
  }
}

function makeRouteCsv(points: Iterable<RoutePoint>): string {
  using legMaker = new LegMaker();
  using output = new CsvBuffer();
  output.write([
    "start_latitude",
    "start_longitude",
    "end_latitude",
    "end_longitude",
    "distance",
  ]);
  for (const point of points) {
    const leg = legMaker.waypoint(point);
    if (leg !== undefined)
      output.write([
        leg.start.latitude,
        leg.start.longitude,
        leg.end.latitude,
        leg.end.longitude,
        leg.distance,
      ]);
  }
  return output.rows.join("\n");
}

const routeCsv = makeRouteCsv([
  { latitude: 38.9784, longitude: -76.4922 },
  { latitude: 36.8443, longitude: -76.2922 },
]);
assert.equal(routeCsv.split("\n")[1]?.endsWith(",128"), true);
// Multiple using declarations dispose in reverse declaration order, paralleling
// compound Python with cleanup. CsvBuffer keeps this tour side-effect-free; a real
// file or compressed-output resource can implement the same Disposable boundary.
