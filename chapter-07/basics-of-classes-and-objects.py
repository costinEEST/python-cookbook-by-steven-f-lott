from __future__ import annotations

import csv
import math
import random
from collections import ChainMap, Counter, defaultdict, deque
from collections.abc import Callable, Iterable
from dataclasses import asdict, dataclass, field
from io import StringIO
from types import TracebackType
from typing import ClassVar, NamedTuple

# Executable notes adapted from the saved HTML for Modern Python Cookbook,
# Chapter 7, "Basics of Classes and Objects." The source contains recipes
# 7.1-7.12. Randomness is injected or seeded, and file examples use memory.


# 7.1 Using a class to encapsulate data and processing
# -----------------------------------------------------
class DicePair:
    """Keep one responsibility: the state and behavior of two dice."""

    def __init__(self, random_number: random.Random) -> None:
        self.faces = (0, 0)
        self._random = random_number

    def roll(self) -> None:
        """Mutate faces; like most Python mutators, return None."""
        self.faces = (self._random.randint(1, 6), self._random.randint(1, 6))

    def total(self) -> int:
        return sum(self.faces)

    def hardway(self) -> bool:
        return self.faces[0] == self.faces[1]

    def easyway(self) -> bool:
        return not self.hardway()


dice_pair = DicePair(random.Random(1))
assert dice_pair.roll() is None
assert dice_pair.faces == (2, 5)
assert dice_pair.total() == 7 and dice_pair.easyway()
# Python's self is explicit in every instance method. JavaScript's this is
# implicit, dynamically bound for ordinary functions, and can be lost as a callback.
# The SOLID prompt is useful here: model a narrow responsibility, not every rule
# of the game that happens to use dice.


# 7.2 Essential type hints for class definitions
# ------------------------------------------------
class DiceHand:
    random_number: ClassVar[random.Random] = random.Random(7)

    def __init__(self, number_of_dice: int, sides: int = 6) -> None:
        self.number_of_dice = number_of_dice
        self.sides = sides
        self.faces: list[int] = []
        self.roll_number = 0

    def __str__(self) -> str:
        return ", ".join(f"{index}: {face}" for index, face in enumerate(self.faces))

    def total(self) -> int:
        return sum(self.faces)

    def average(self) -> float:
        return self.total() / self.number_of_dice

    def first_roll(self) -> list[int]:
        self.roll_number = 0
        self.faces = [
            self.random_number.randint(1, self.sides)
            for _ in range(self.number_of_dice)
        ]
        return self.faces

    def reroll(self, positions: Iterable[int]) -> list[int]:
        self.roll_number += 1
        for position in positions:
            self.faces[position] = self.random_number.randint(1, self.sides)
        return self.faces


dice_hand = DiceHand(3)
first_faces = dice_hand.first_roll()
assert first_faces is dice_hand.faces and len(first_faces) == 3
assert dice_hand.reroll((0, 2)) is dice_hand.faces
assert dice_hand.roll_number == 1 and isinstance(dice_hand.average(), float)
# Iterable[int] states the protocol reroll needs, rather than over-constraining
# callers to set[int]. Python annotations and TypeScript types are both checked
# statically and erased at runtime; neither validates constructor input by itself.


# 7.3 Designing classes with lots of processing
# ------------------------------------------------
class CounterStatistics:
    """Eagerly compute statistics over binned data stored in another object."""

    def __init__(self, raw_counter: Counter[int]) -> None:
        self.raw_counter = raw_counter
        self.mean = self.compute_mean()
        self.standard_deviation = self.compute_standard_deviation()

    def compute_mean(self) -> float:
        count = self.raw_counter.total()
        return (
            sum(value * frequency for value, frequency in self.raw_counter.items())
            / count
        )

    def compute_standard_deviation(self) -> float:
        count = self.raw_counter.total()
        variance = sum(
            frequency * (value - self.mean) ** 2
            for value, frequency in self.raw_counter.items()
        ) / (count - 1)
        return math.sqrt(variance)


binned_data = Counter({7: 3, 10: 2, 13: 1})
eager_statistics = CounterStatistics(binned_data)
assert eager_statistics.mean == 9.0
assert math.isclose(eager_statistics.standard_deviation, math.sqrt(6.0))
binned_data[16] = 1
assert eager_statistics.mean == 9.0  # The eager snapshot is now stale.
# Composition keeps processing reusable, but exposing a mutable Counter means a
# client must rebuild the eager wrapper after mutation. TypeScript has the same
# aliasing issue when a class retains a Map supplied by its caller.


# 7.4 Using typing.NamedTuple for immutable objects
# ---------------------------------------------------
class Card(NamedTuple):
    rank: int
    suit: str

    def points(self) -> int:
        return self.rank if self.rank < 10 else 10


eight_hearts = Card(8, "♡")
assert eight_hearts.rank == eight_hearts[0] == eight_hearts.points()
assert sorted([Card(10, "♣"), eight_hearts])[0] == eight_hearts
assert {eight_hearts: "card"}[Card(8, "♡")] == "card"
# NamedTuple is a tuple at runtime: ordered, immutable, indexable, and hashable
# when its values are hashable. A TypeScript readonly tuple is only statically
# readonly and does not gain named attributes, value equality, or value hashing.


# 7.5 Using dataclasses for mutable objects
# -------------------------------------------
@dataclass
class CribbageHand:
    cards: list[Card]

    def to_crib(self, first: Card, second: Card) -> None:
        self.cards.remove(first)
        self.cards.remove(second)


@dataclass(init=False)
class Deck:
    suits: ClassVar[tuple[str, ...]] = ("♣", "♢", "♡", "♠")
    cards: list[Card]

    def __init__(self) -> None:
        self.cards = [Card(rank, suit) for suit in self.suits for rank in range(1, 14)]

    def shuffle(self, random_number: random.Random) -> None:
        random_number.shuffle(self.cards)


mutable_hand = CribbageHand([Card(3, "♢"), Card(6, "♠"), Card(7, "♢"), Card(1, "♠")])
assert mutable_hand.to_crib(Card(3, "♢"), Card(1, "♠")) is None
assert mutable_hand.cards == [Card(6, "♠"), Card(7, "♢")]
assert len(Deck().cards) == 52
# @dataclass generates __init__, __repr__, and value equality by default, but it
# does not clone arguments: mutable_hand.cards aliases the list passed by its caller.
# TypeScript interfaces generate no runtime constructor or equality behavior.


# 7.6 Using frozen dataclasses for immutable objects
# ---------------------------------------------------
@dataclass(frozen=True, order=True)
class FrozenCard:
    rank: int
    suit: str


@dataclass(frozen=True)
class FrozenHand:
    cards: list[FrozenCard] = field(default_factory=list)


frozen_card = FrozenCard(8, "♡")
assert frozen_card < FrozenCard(9, "♣")
first_empty_hand = FrozenHand()
second_empty_hand = FrozenHand()
assert first_empty_hand.cards is not second_empty_hand.cards
first_empty_hand.cards.append(frozen_card)
assert first_empty_hand.cards == [frozen_card]
# frozen=True prevents rebinding fields; it does not recursively freeze objects
# inside them. default_factory creates a fresh list per instance. This is like
# TypeScript readonly being shallow, except Python enforces the field assignment
# restriction at runtime and TypeScript normally enforces readonly only statically.


# 7.7 Optimizing small objects with __slots__
# ----------------------------------------------
@dataclass
class Player:
    name: str
    score: int = 0


class Cribbage:
    __slots__ = ("crib", "dealer", "deck", "opponent", "players")

    def __init__(self, deck: Deck, first: Player, second: Player) -> None:
        self.deck = deck
        self.players = [first, second]
        self.dealer, self.opponent = self.players
        self.crib = CribbageHand([])

    def new_deal(self) -> None:
        self.players.reverse()
        self.dealer, self.opponent = self.players
        self.crib = CribbageHand([])


game = Cribbage(Deck(), Player("one"), Player("two"))
assert not hasattr(game, "__dict__")
game.new_deal()
assert (game.dealer.name, game.opponent.name) == ("two", "one")
extra_attribute = "extra"
try:
    setattr(game, extra_attribute, True)
except AttributeError:
    pass
else:
    raise AssertionError("slots must reject undeclared attributes")
# __slots__ is a runtime layout choice: it removes the usual per-instance
# attribute dictionary and may save memory across many instances. A TypeScript
# class's declared fields do not constrain JavaScript object shape at runtime.
# Metaclasses can customize class namespace creation via __prepare__() or __new__(),
# but that advanced mechanism is broader and more invasive than declaring slots.


# 7.8 Using more sophisticated collections
# -------------------------------------------
queue = deque(["first", "second"])
queue.append("third")  # Mutates queue and returns None.
assert queue.popleft() == "first"  # Mutates queue and returns the removed item.

grouped: defaultdict[str, list[int]] = defaultdict(list)
grouped["odd"].append(1)
counts = Counter("mississippi")
settings = ChainMap({"color": "blue"}, {"color": "gray", "retries": 3})
assert grouped == {"odd": [1]}
assert counts.most_common(1) == [("i", 4)]
assert settings["color"] == "blue" and settings["retries"] == 3
# deque gives efficient FIFO operations at both ends; defaultdict creates a
# missing value; Counter is a multiset; ChainMap searches mappings in order.
# JavaScript Array.shift() is O(n); Map needs explicit default/count/overlay logic.
# For data too large to materialize, stream and retain only relevant groups. The
# same map/reduce shape can later move from one process to workers or many hosts.


# 7.9 Extending a built-in collection - a list that does statistics
# -------------------------------------------------------------------
class StatisticsList(list[float]):
    def total(self) -> float:
        return sum(self)

    def mean(self) -> float:
        return self.total() / len(self)

    def variance(self) -> float:
        return (sum(value**2 for value in self) - self.total() ** 2 / len(self)) / (
            len(self) - 1
        )

    def standard_deviation(self) -> float:
        return math.sqrt(self.variance())


statistics = StatisticsList([14, 6, 4, 12, 7, 5])
extension = StatisticsList([10, 8, 13, 9, 11])
assert statistics.extend(extension) is None  # statistics mutates; extension does not.
assert statistics.mean() == 9.0 and statistics.variance() == 11.0
# Inheritance makes this usable anywhere a list[float] is expected, but couples
# the algorithm to one storage type. Composition in 7.3 works with other storage.
# JavaScript can subclass Array, though standalone functions often compose better.
# Starting from collections.abc.MutableMapping instead would require concrete
# __getitem__, __setitem__, __delitem__, __iter__, and __len__ implementations.


# 7.10 Using properties for lazy attributes
# --------------------------------------------
class LazyCounterStatistics:
    def __init__(self, raw_counter: Counter[int]) -> None:
        self.raw_counter = raw_counter

    @property
    def count(self) -> int:
        return self.raw_counter.total()

    @property
    def total(self) -> float:
        return sum(value * frequency for value, frequency in self.raw_counter.items())

    @property
    def mean(self) -> float:
        return self.total / self.count

    @property
    def variance(self) -> float:
        total_of_squares = sum(
            frequency * value**2 for value, frequency in self.raw_counter.items()
        )
        return (total_of_squares - self.total**2 / self.count) / (self.count - 1)

    @property
    def standard_deviation(self) -> float:
        return math.sqrt(self.variance)


live_data = Counter({7: 3, 10: 2, 13: 1})
lazy_statistics = LazyCounterStatistics(live_data)
assert lazy_statistics.mean == 9.0
live_data[15] = 1
assert lazy_statistics.mean == 69 / 7
# @property preserves attribute syntax while computing on demand. A JavaScript
# get accessor has the same runtime shape. Caching avoids repeat work but requires
# invalidation whenever aliased mutable source data changes.


# 7.11 Creating contexts and context managers
# ----------------------------------------------
type Point = tuple[float, float]


def haversine(first: Point, second: Point, radius: float) -> float:
    latitude_1, longitude_1, latitude_2, longitude_2 = map(
        math.radians, (*first, *second)
    )
    latitude_delta = latitude_2 - latitude_1
    longitude_delta = longitude_2 - longitude_1
    a = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(latitude_1)
        * math.cos(latitude_2)
        * math.sin(longitude_delta / 2) ** 2
    )
    return radius * 2 * math.asin(math.sqrt(a))


class Distance:
    def __init__(self, radius: float) -> None:
        self.radius = radius
        self.exited = False

    def __enter__(self) -> Callable[[Point, Point], float]:
        return self.calculate

    def __exit__(
        self,
        exception_type: type[BaseException] | None,
        exception: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.exited = True

    def calculate(self, first: Point, second: Point) -> float:
        return haversine(first, second, self.radius)


distance_context = Distance(3440.1)
with distance_context as nautical_miles:
    distance = nautical_miles((38.9784, -76.4922), (36.8443, -76.2922))
assert distance_context.exited and round(distance, 2) == 128.48
# __enter__ may return self or another useful value. __exit__ always runs and can
# release resources; returning a truthy value would suppress an exception. Node
# 26's using statement calls Symbol.dispose at scope exit but has no suppression hook.
# __exit__ can also inspect the exception triple and raise a clearer domain error;
# doing so translates the original failure rather than suppressing it.


# 7.12 Managing multiple contexts with multiple resources
# ---------------------------------------------------------
@dataclass(frozen=True)
class RoutePoint:
    latitude: float
    longitude: float


@dataclass
class Leg:
    start: RoutePoint
    end: RoutePoint
    distance: float = field(init=False)


class LegMaker:
    def __init__(self, radius: float = 3440.1) -> None:
        self.radius = radius
        self.last_point: RoutePoint | None = None

    def __enter__(self) -> LegMaker:
        return self

    def __exit__(
        self,
        exception_type: type[BaseException] | None,
        exception: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        return None

    def waypoint(self, next_point: RoutePoint) -> Leg | None:
        if self.last_point is None:
            self.last_point = next_point
            return None
        leg = Leg(self.last_point, next_point)
        leg.distance = round(
            haversine(
                (leg.start.latitude, leg.start.longitude),
                (leg.end.latitude, leg.end.longitude),
                self.radius,
            )
        )
        self.last_point = next_point
        return leg


def flatten_leg(leg: Leg) -> dict[str, float]:
    structure = asdict(leg)
    start = structure["start"]
    end = structure["end"]
    assert isinstance(start, dict) and isinstance(end, dict)
    return {
        "start_latitude": float(start["latitude"]),
        "start_longitude": float(start["longitude"]),
        "end_latitude": float(end["latitude"]),
        "end_longitude": float(end["longitude"]),
        "distance": float(structure["distance"]),
    }


def make_route_csv(points: Iterable[RoutePoint]) -> str:
    output = StringIO()
    headers = [
        "start_latitude",
        "start_longitude",
        "end_latitude",
        "end_longitude",
        "distance",
    ]
    with LegMaker() as leg_maker, output:
        writer = csv.DictWriter(output, headers)
        writer.writeheader()
        for point in points:
            leg = leg_maker.waypoint(point)
            if leg is not None:
                writer.writerow(flatten_leg(leg))
        result = output.getvalue()
    return result


route_csv = make_route_csv(
    [RoutePoint(38.9784, -76.4922), RoutePoint(36.8443, -76.2922)]
)
assert route_csv.splitlines()[1].endswith(",128.0")
# A compound with enters left-to-right and exits right-to-left, so every acquired
# resource is finalized. In-memory text keeps this example side-effect-free; a
# Path.open() or bz2.open() context can be substituted without changing the loop.
