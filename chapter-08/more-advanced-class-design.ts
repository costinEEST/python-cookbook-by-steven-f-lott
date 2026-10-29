// Run with Node 26 or newer: node chapter-08/more-advanced-class-design.ts

import assert from "node:assert/strict";

// Executable TypeScript parallels for all seven recipes in Modern Python Cookbook,
// Chapter 8. Python remains authoritative where object protocols differ.

interface Card {
  readonly rank: number;
  readonly suit: string;
}

const suits = ["♠", "♡", "♢", "♣"] as const;

// 8.1 Choosing between inheritance and composition - the "is-a" question
// --------------------------------------------------------------------------
class DeckWrapper {
  #dealIndex = 0;
  readonly cards: Card[];

  constructor(cards: Card[]) {
    this.cards = cards;
  }

  shuffle(): void {
    this.cards.reverse(); // Deterministic stand-in; mutates this.cards.
    this.#dealIndex = 0;
  }

  deal(): Card {
    const card = this.cards[this.#dealIndex++];
    if (card === undefined) throw new RangeError("deck is exhausted");
    return card;
  }
}

class DeckArray extends Array<Card> {
  #dealIndex = 0;

  shuffle(): void {
    this.reverse();
    this.#dealIndex = 0;
  }

  deal(): Card {
    const card = this[this.#dealIndex++];
    if (card === undefined) throw new RangeError("deck is exhausted");
    return card;
  }
}

const domain = Array.from({ length: 13 }, (_, rank) =>
  suits.map((suit) => ({ rank: rank + 1, suit })),
).flat();
const wrappedDeck = new DeckWrapper([...domain]);
const extendedDeck = new DeckArray(...domain);
wrappedDeck.shuffle();
extendedDeck.shuffle();
assert.deepEqual(
  Array.from({ length: 5 }, () => wrappedDeck.deal()),
  Array.from({ length: 5 }, () => extendedDeck.deal()),
);
assert.equal(extendedDeck instanceof Array, true);
assert.equal(wrappedDeck instanceof Array, false);
const slicedDeck = extendedDeck.slice(0, 2);
assert.equal(slicedDeck instanceof DeckArray, true);
assert.equal(DeckArray[Symbol.species], DeckArray);
assert.equal(
  Object.getOwnPropertyDescriptor(DeckArray.prototype, "deal")?.enumerable,
  false,
);
assert.throws(() => Reflect.apply(DeckArray, undefined, []), TypeError);
assert.throws(() => Reflect.construct(extendedDeck.deal, []), TypeError);
// Composition exposes a narrow has-a API. Extending Array makes an is-a promise
// and inherits indexing plus every mutator, just like Python's list subclass.
// Clarification from Andrea Giammarchi's "JS classes are not just syntactic sugar":
// modern classes also integrate with built-in subclass allocation and Symbol.species.
// They must be called with new, and their prototype methods are non-enumerable and
// non-constructible. The #dealIndex field is runtime-private, not a TS-only modifier.

// 8.2 Separating concerns via multiple inheritance
// --------------------------------------------------
interface PointedCard extends Card {
  points(): number;
}

class CribbageCard implements PointedCard {
  readonly rank: number;
  readonly suit: string;

  constructor(rank: number, suit: string) {
    this.rank = rank;
    this.suit = suit;
  }

  points(): number {
    return Math.min(this.rank, 10);
  }

  toString(): string {
    const name = new Map([
      [1, "A"],
      [11, "J"],
      [12, "Q"],
      [13, "K"],
    ]).get(this.rank);
    return `${name ?? this.rank} ${this.suit}`;
  }
}

const cribbageFace = new CribbageCard(12, "♡");
assert.equal(cribbageFace.toString(), "Q ♡");
assert.equal(cribbageFace.points(), 10);
// TypeScript interfaces express the structural contract but add no runtime
// behavior. JS lacks native multiple class inheritance; composition or narrowly
// scoped mixin functions are usually clearer than emulating Python's MRO.

// 8.3 Leveraging Python's duck typing
// -------------------------------------
interface Dice {
  readonly dice: readonly number[];
  roll(): readonly number[];
}

class DirectDice implements Dice {
  dice: readonly number[] = [0, 0];
  readonly #faces: Iterator<number>;

  constructor(faces: Iterable<number>) {
    this.#faces = faces[Symbol.iterator]();
  }

  roll(): readonly number[] {
    this.dice = [this.#faces.next().value ?? 1, this.#faces.next().value ?? 1];
    return this.dice;
  }
}

class ComposedDice implements Dice {
  dice: readonly number[] = [0, 0];
  readonly #dice: [() => number, () => number];

  constructor(faces: Iterable<number>) {
    const iterator = faces[Symbol.iterator]();
    const die = (): number => iterator.next().value ?? 1;
    this.#dice = [die, die];
  }

  roll(): readonly number[] {
    this.dice = this.#dice.map((die) => die());
    return this.dice;
  }
}

function rolls(dice: Dice, samples: number): readonly (readonly number[])[] {
  return Array.from({ length: samples }, () => dice.roll());
}

const faces = [1, 3, 1, 4, 4, 4, 6, 4, 2, 1];
assert.deepEqual(rolls(new DirectDice(faces), 5), rolls(new ComposedDice(faces), 5));
// Both languages accept compatible shapes without a nominal base class. Python's
// runtime lookup is duck typing; a Python Protocol and TS interface add erased,
// static structural checks.

// 8.4 Managing global and singleton objects
// --------------------------------------------
const globalCounter = new Map<string, number>();

function count(key: string, increment = 1): void {
  globalCounter.set(key, (globalCounter.get(key) ?? 0) + increment);
}

class EventCounter {
  static readonly #counter = new Map<string, number>();

  static count(key: string, increment = 1): void {
    this.#counter.set(key, (this.#counter.get(key) ?? 0) + increment);
  }

  static counts(): readonly (readonly [string, number])[] {
    return [...this.#counter];
  }
}

count("input", 2);
EventCounter.count("input", 2);
assert.deepEqual([...globalCounter], EventCounter.counts());
// ES modules are evaluated once per module graph and static fields live on the
// shared class object. As in Python, hidden globals should stay narrowly focused;
// inject ordinary state when independent lifetimes and test isolation matter.

// 8.5 Using more complex structures - maps of lists
// ---------------------------------------------------
interface LogEvent {
  readonly timestamp: string;
  readonly level: string;
  readonly module: string;
  readonly message: string;
}

function eventFromLine(line: string): LogEvent | undefined {
  const match =
    /^\[(?<timestamp>.*?)]\s+(?<level>\w+)\s+in\s+(?<module>\w+):\s+(?<message>.*)$/.exec(
      line,
    );
  const groups = match?.groups;
  if (groups === undefined) return undefined;
  const { timestamp, level, module, message } = groups;
  if ([timestamp, level, module, message].some((value) => value === undefined))
    return undefined;
  return { timestamp: timestamp!, level: level!, module: module!, message: message! };
}

function summarize(events: Iterable<LogEvent>): Map<string, LogEvent[]> {
  const result = new Map<string, LogEvent[]>();
  for (const event of events) {
    const group = result.get(event.module) ?? [];
    group.push(event); // Mutates group; push returns its new length.
    result.set(event.module, group);
  }
  return result;
}

const logLines = [
  "[2016-04-24 11:05:01,462] INFO in module1: Sample Message One",
  "[2016-04-24 11:06:02,624] DEBUG in module2: Debugging",
  "[2016-04-24 11:07:03,246] WARNING in module1: Check failed",
];
const parsedEvents = logLines.map(eventFromLine).filter((event) => event !== undefined);
const summary = summarize(parsedEvents);
assert.deepEqual(
  summary.get("module1")?.map((event) => event.level),
  ["INFO", "WARNING"],
);
// Python defaultdict(list) creates and installs a missing list on access. Map has
// no missing-key hook, so get-or-create is explicit. In both versions the group
// array/list is mutated; creating the map does not clone event objects.

// 8.6 Creating a class that has orderable objects
// -------------------------------------------------
function compareCards(left: Card, right: Card): number {
  return left.rank - right.rank || left.suit.localeCompare(right.suit);
}

const unorderedCards: Card[] = [
  { rank: 10, suit: "♠" },
  { rank: 9, suit: "♡" },
  { rank: 9, suit: "♣" },
];
assert.deepEqual(unorderedCards.toSorted(compareCards), [
  { rank: 9, suit: "♡" },
  { rank: 9, suit: "♣" },
  { rank: 10, suit: "♠" },
]);
// Python operators dispatch to __lt__, __le__, and related special methods. JS
// has no customizable relational protocol; Array sorting takes a comparator.

// 8.7 Deleting from a list of complicated objects
// --------------------------------------------------
interface Song {
  readonly title: string;
  readonly writers: string[];
  readonly time: string;
}

function incrementalDelete(songs: Song[], writer: string): void {
  let index = 0;
  while (index !== songs.length) {
    if (songs[index]?.writers.includes(writer)) songs.splice(index, 1);
    else index += 1;
  }
}

const songs: Song[] = [
  { title: "Eruption", writers: ["Emerson"], time: "2:43" },
  { title: "Stones of Years", writers: ["Emerson", "Lake"], time: "3:43" },
  { title: "Mass", writers: ["Emerson", "Lake"], time: "3:09" },
  { title: "Battlefield", writers: ["Lake"], time: "3:57" },
];
incrementalDelete(songs, "Lake");
assert.deepEqual(
  songs.map((song) => song.title),
  ["Eruption"],
);
const filteredSongs = songs.filter((song) => !song.writers.includes("Lake"));
assert.notEqual(filteredSongs, songs);
assert.equal(filteredSongs[0], songs[0]);
// splice() mutates the original and returns removed items, unlike Python del,
// which is a statement. Do not advance after deletion because the next item shifts
// into the same index. filter() returns a new outer array with shared song objects.
