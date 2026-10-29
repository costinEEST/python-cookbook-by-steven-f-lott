from __future__ import annotations

import random
import re
from collections import Counter, defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from typing import ClassVar, NamedTuple, Protocol, TypedDict, cast

# Executable notes adapted from the user-saved HTML for Modern Python Cookbook,
# Chapter 8, "More Advanced Class Design." The saved chapter has recipes 8.1-8.7.

SUITS = ("♠", "♡", "♢", "♣")


class Card(NamedTuple):
    rank: int
    suit: str


# 8.1 Choosing between inheritance and composition - the "is-a" question
# --------------------------------------------------------------------------
class DeckWrapper:
    """Expose only deck operations around an owned list reference."""

    def __init__(self, cards: list[Card]) -> None:
        self.cards = cards
        self._deal_iterator = iter(cards)

    def shuffle(self, random_number: random.Random) -> None:
        random_number.shuffle(self.cards)
        self._deal_iterator = iter(self.cards)

    def deal(self) -> Card:
        return next(self._deal_iterator)


class DeckList(list[Card]):
    """A list specialization that deliberately exposes every list operation."""

    def shuffle(self, random_number: random.Random) -> None:
        random_number.shuffle(self)
        self._deal_iterator = iter(self)

    def deal(self) -> Card:
        return next(self._deal_iterator)


domain = [Card(rank, suit) for rank in range(1, 14) for suit in SUITS]
wrapped_deck = DeckWrapper(domain.copy())
extended_deck = DeckList(domain)
wrapped_deck.shuffle(random.Random(1))
extended_deck.shuffle(random.Random(1))
assert [wrapped_deck.deal() for _ in range(5)] == [
    extended_deck.deal() for _ in range(5)
]
assert isinstance(extended_deck, list) and not isinstance(wrapped_deck, list)
# Composition is the narrower "has-a" API; inheritance promises substitutability
# and inherits indexing, slicing, append(), and every other list feature. JS can
# also extend Array, but this is not merely shorthand for wiring old-style function
# prototypes: modern classes have built-in subclass construction, Symbol.species,
# super, strict construction, non-constructible methods, and private fields. A
# wrapper likewise prevents accidental collection access.


# 8.2 Separating concerns via multiple inheritance
# --------------------------------------------------
@dataclass(frozen=True)
class DisplayCard:
    rank: int
    suit: str

    def __str__(self) -> str:
        names = {1: "A", 11: "J", 12: "Q", 13: "K"}
        return f"{names.get(self.rank, str(self.rank))} {self.suit}"


class PointedCard(Protocol):
    @property
    def rank(self) -> int: ...

    def points(self) -> int: ...


class CribbagePoints:
    def points(self) -> int:
        return min(cast(PointedCard, self).rank, 10)


class CribbageCard(DisplayCard, CribbagePoints):
    pass


def score(card: PointedCard) -> int:
    return card.points()


cribbage_face = CribbageCard(12, "♡")
assert str(cribbage_face) == "Q ♡" and score(cribbage_face) == 10
assert CribbageCard.mro()[:3] == [CribbageCard, DisplayCard, CribbagePoints]
# The MRO linearizes multiple bases. Small mixins separate optional behavior;
# Protocol states the structural contract without requiring inheritance. TS uses
# interfaces for the contract and normally prefers explicit composition to mixins.


# 8.3 Leveraging Python's duck typing
# -------------------------------------
class Dice(Protocol):
    @property
    def dice(self) -> tuple[int, ...]: ...

    def roll(self) -> tuple[int, ...]: ...


class DirectDice:
    def __init__(self, seed: int) -> None:
        self._random = random.Random(seed)
        self.dice = (0, 0)

    def roll(self) -> tuple[int, ...]:
        self.dice = (self._random.randint(1, 6), self._random.randint(1, 6))
        return self.dice


class Die:
    def __init__(self, random_number: random.Random) -> None:
        self._random = random_number

    def roll(self) -> int:
        return self._random.randint(1, 6)


class ComposedDice:
    def __init__(self, seed: int) -> None:
        random_number = random.Random(seed)
        self._dice = [Die(random_number), Die(random_number)]
        self.dice = (0, 0)

    def roll(self) -> tuple[int, ...]:
        self.dice = tuple(die.roll() for die in self._dice)
        return self.dice


def rolls(dice: Dice, samples: int) -> list[tuple[int, ...]]:
    return [dice.roll() for _ in range(samples)]


assert rolls(DirectDice(1), 5) == rolls(ComposedDice(1), 5)
# Python decides compatibility from available behavior at runtime. Protocol adds
# static structural checking; it does not inject methods or perform validation.
# This is close to a TypeScript interface, which is also structural and erased.


# 8.4 Managing global and singleton objects
# --------------------------------------------
_global_counter: Counter[str] = Counter()


def count(key: str, increment: int = 1) -> None:
    _global_counter[key] += increment


def counts() -> list[tuple[str, int]]:
    return _global_counter.most_common()


class EventCounter:
    _class_counter: ClassVar[Counter[str]] = Counter()

    @classmethod
    def count(cls, key: str, increment: int = 1) -> None:
        cls._class_counter[key] += increment

    @classmethod
    def counts(cls) -> list[tuple[str, int]]:
        return cls._class_counter.most_common()


count("input", 2)
EventCounter.count("input", 2)
assert counts() == EventCounter.counts() == [("input", 2)]
# Imported modules and class objects are single shared runtime objects. This makes
# focused registries convenient but hides dependencies and complicates isolation.
# ES modules and JS static fields can share state similarly; injection is clearer
# whenever callers need independent lifetimes or tests need isolated state.


# 8.5 Using more complex structures - maps of lists
# ---------------------------------------------------
class Event(NamedTuple):
    timestamp: str
    level: str
    module: str
    message: str

    @staticmethod
    def from_line(line: str) -> Event | None:
        match = re.fullmatch(
            r"\[(?P<timestamp>.*?)]\s+(?P<level>\w+)\s+in\s+"
            r"(?P<module>\w+):\s+(?P<message>.*)",
            line,
        )
        if match is None:
            return None
        return Event(**match.groupdict())


type Summary = defaultdict[str, list[Event]]


def summarize(events: Iterable[Event]) -> Summary:
    result: Summary = defaultdict(list)
    for event in events:
        result[event.module].append(event)
    return result


class ModuleEvents(dict[str, list[Event]]):
    def __missing__(self, key: str) -> list[Event]:
        missing: list[Event] = []
        self[key] = missing
        return missing


log_lines = [
    "[2016-04-24 11:05:01,462] INFO in module1: Sample Message One",
    "[2016-04-24 11:06:02,624] DEBUG in module2: Debugging",
    "[2016-04-24 11:07:03,246] WARNING in module1: Check failed",
]
parsed_events = [event for line in log_lines if (event := Event.from_line(line))]
summary = summarize(parsed_events)
assert [event.level for event in summary["module1"]] == ["INFO", "WARNING"]
custom_summary = ModuleEvents()
assert custom_summary["new"] == [] and "new" in custom_summary
# Accessing a missing defaultdict key mutates the mapping by installing a fresh
# list. append() then mutates that list and returns None. JS Map has no missing-key
# hook, so TS must get-or-create the array explicitly.


# 8.6 Creating a class that has orderable objects
# -------------------------------------------------
@dataclass(frozen=True)
class OrderableCard:
    rank: int
    suit: str

    def _key(self) -> tuple[int, str]:
        return (self.rank, self.suit)

    def __lt__(self, other: OrderableCard) -> bool:
        return self._key() < other._key()

    def __le__(self, other: OrderableCard) -> bool:
        return self._key() <= other._key()

    def __gt__(self, other: OrderableCard) -> bool:
        return self._key() > other._key()

    def __ge__(self, other: OrderableCard) -> bool:
        return self._key() >= other._key()


unordered_cards = [OrderableCard(10, "♠"), OrderableCard(9, "♡"), OrderableCard(9, "♣")]
assert sorted(unordered_cards) == [
    OrderableCard(9, "♡"),
    OrderableCard(9, "♣"),
    OrderableCard(10, "♠"),
]
# Rich comparisons dispatch to special methods such as __lt__. Tuple comparison
# supplies lexicographic ordering. @dataclass(order=True) or functools.total_ordering
# can generate boilerplate; JS sort() instead receives an explicit comparator.


# 8.7 Deleting from a list of complicated objects
# --------------------------------------------------
class Song(TypedDict):
    title: str
    writers: list[str]
    time: str


def incremental_delete(songs: list[Song], writer: str) -> None:
    index = 0
    while index != len(songs):
        if writer in songs[index]["writers"]:
            del songs[index]
        else:
            index += 1


songs: list[Song] = [
    {"title": "Eruption", "writers": ["Emerson"], "time": "2:43"},
    {"title": "Stones of Years", "writers": ["Emerson", "Lake"], "time": "3:43"},
    {"title": "Mass", "writers": ["Emerson", "Lake"], "time": "3:09"},
    {"title": "Battlefield", "writers": ["Lake"], "time": "3:57"},
]
incremental_delete(songs, "Lake")
assert [song["title"] for song in songs] == ["Eruption"]
original_songs = songs
filtered_songs = [song for song in original_songs if "Lake" not in song["writers"]]
assert filtered_songs is not original_songs and filtered_songs[0] is original_songs[0]
# del mutates the original list and returns no value. Do not advance after deletion:
# the next item just shifted into the same index. A comprehension creates a new
# outer list but shares retained song dictionaries. JS splice() has the same index
# shift; filter() likewise returns a shallow new array.
