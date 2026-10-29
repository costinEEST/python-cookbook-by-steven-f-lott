from __future__ import annotations

import re
from collections import Counter
from collections.abc import Iterable
from copy import deepcopy
from enum import StrEnum

# Executable notes adapted from the saved HTML for Modern Python Cookbook,
# Chapter 4, "Built-In Data Structures Part 1: Lists and Sets."

# 4.1 Choosing a data structure
# -------------------------------
# A set emphasizes membership and uniqueness; a list emphasizes order and
# position; a tuple is a fixed, immutable sequence; a dict maps keys to values.
# JS has Array, Set, and Map, but Python set members and dict keys must be
# hashable. A tuple can be hashable; a Python list never is.
yes = {"yes", "y"}
no = {"no", "n"}
# Set union does not mutate either operand; it returns a new set.
assert "YES".lower() in yes | no

month_names = [
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
]
assert month_names[8] == "Sep"
assert month_names.index("Feb") == 1

# Mutable values cannot be set members, while an immutable tuple can be.
coordinates = {(35, -76), (36, -75)}
assert (35, -76) in coordinates


# 4.2 Building lists: literals, appending, and comprehensions
# ------------------------------------------------------------
# Python list.append(), extend(), and insert() mutate and return None. JS
# Array.push() differs: it returns the new length.
file_records = [("a.csv", 260), ("b.csv", 45), ("c.csv", 225)]
file_sizes: list[int] = []
for _, size in file_records:
    assert file_sizes.append(size) is None

assert file_sizes == [260, 45, 225]
assert [size for _, size in file_records] == file_sizes
assert sum(file_sizes) == 530
assert min(file_sizes) == 45
assert max(file_sizes) == 260
assert file_sizes.index(min(file_sizes)) == 1

# A comprehension returns a new list without mutating its source. Array.map()
# and Array.filter() are the closest JS APIs, though comprehensions can nest loops.
sieve = [True for _ in range(30)]
# Indexed assignment mutates the existing list; assignment is a statement and
# therefore does not return a value.
sieve[0] = sieve[1] = False
for candidate in range(2, len(sieve)):
    if sieve[candidate]:
        for multiple in range(candidate * 2, len(sieve), candidate):
            sieve[multiple] = False
primes = [value for value, is_prime in enumerate(sieve) if is_prime]
assert primes == [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]

more_primes = [31, 37]
# + returns a new list and leaves both operands unchanged.
combined_primes = primes + more_primes
# extend() and insert() mutate more_primes and return None.
assert more_primes.extend([41, 43]) is None
assert more_primes.insert(0, 29) is None
assert combined_primes[-2:] == [31, 37]
assert more_primes == [29, 31, 37, 41, 43]


# 4.3 Slicing and dicing a list
# ------------------------------
# Python slices use half-open [start:stop:step] ranges. Reading a slice returns
# a shallow copy without mutating the source. JS slice() has no step argument.
log_rows = [
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
]
head, tail = log_rows[:4], log_rows[4:]
assert len(head) == 4
paired_rows = list(zip(tail[0::3], tail[1::3], strict=True))
combined_rows = [start + stop for start, stop in paired_rows]
assert combined_rows[0] == [
    "10/25/13",
    "08:24:00 AM",
    "29",
    "",
    "01:15:00 PM",
    "27",
]

# Clarification beyond the chapter: Python's language model is names bound to
# objects, not values divided by the language into "stack values" and "heap
# values." In CPython, lists and their elements are objects in managed heap
# memory; a local name lives in an execution frame and holds a reference to an
# object. Exact stack/heap details are implementation-specific.
#
# Reading a slice or calling list.copy() creates a new outer list. Both are
# shallow copies: they copy references to the same nested row objects.
tail_copy = tail[:]
assert tail_copy is not tail
assert tail_copy[0] is tail[0]

tail_alias = tail
assert tail_alias is tail  # Assignment binds another name; it copies no list.

# Mutating a shared nested row is visible through the source and shallow copy.
original_cell = tail[0][0]
tail_copy[0][0] = "changed through shallow copy"
assert tail[0][0] == "changed through shallow copy"
tail[0][0] = original_cell

# deepcopy() recursively creates a new outer list and nested row lists for this
# object graph. Mutating the deep copy therefore leaves tail unchanged.
tail_deep_copy = deepcopy(tail)
assert tail_deep_copy is not tail
assert tail_deep_copy[0] is not tail[0]
tail_deep_copy[0][0] = "changed only in deep copy"
assert tail[0][0] == original_cell


# 4.4 Shrinking lists: deleting, removing, and popping
# -----------------------------------------------------
mutable_rows = [row.copy() for row in log_rows]
# del mutates mutable_rows in place. It is a statement, so it returns no value.
del mutable_rows[:4]
assert mutable_rows[0][0] == "10/25/13"

row = combined_rows[0].copy()
# remove() mutates row, removes the first equal value, and returns None.
assert row.remove("") is None
assert len(row) == 5

row = combined_rows[0].copy()
empty_position = row.index("")
# pop() is unusual: it mutates row and returns the removed item.
assert row.pop(empty_position) == ""
assert len(row) == 5

row = combined_rows[0].copy()
# Slice assignment mutates row in place. Replacing one item with an empty list
# contracts it; assignment is a statement and returns no value.
row[3:4] = []
assert len(row) == 5

# Mutating a list while iterating over it can skip shifted values. Filter into
# a new list, iterate over a copy, use an explicit index, or traverse backward.
fibonacci_like = [1, 1, 2, 3, 5, 8, 10, 13, 21, 34, 36, 55]
odd_values = [value for value in fibonacci_like if value % 2]
assert odd_values == [1, 1, 3, 5, 13, 21, 55]


# 4.5 Writing list-related type hints
# ------------------------------------
# Like TypeScript annotations, Python hints are checked statically and do not
# enforce values at runtime. Named aliases keep nested collection types legible.
type IntegerRGB = tuple[int, int, int]
type FloatRGB = tuple[float, float, float]
type NumericRGB = IntegerRGB | FloatRGB
type NamedRGB = tuple[str, NumericRGB]
type ColorCode = tuple[str, str]

BITS_PER_COLOR_CHANNEL = 8
GREEN_CHANNEL_SHIFT = BITS_PER_COLOR_CHANNEL
RED_CHANNEL_SHIFT = BITS_PER_COLOR_CHANNEL * 2


def hexify(red: float, green: float, blue: float) -> str:
    """Convert three numeric channels to a six-digit RGB color code."""
    # Each channel occupies eight bits. Shift red left by 16 bits into the high
    # byte and green left by 8 bits into the middle byte; blue stays in the low
    # byte. Bitwise OR merges the three non-overlapping channel bit patterns.
    packed_color = (
        int(red) << RED_CHANNEL_SHIFT | int(green) << GREEN_CHANNEL_SHIFT | int(blue)
    )
    # 06X renders that integer as six uppercase hexadecimal digits; formatting
    # creates a new string and does not mutate packed_color.
    return f"#{packed_color:06X}"


def source_to_hex(source: list[NamedRGB]) -> list[ColorCode]:
    # The comprehension returns a new list; source and its nested tuples remain
    # unchanged. The tuples are immutable runtime objects.
    return [(name, hexify(*color)) for name, color in source]


color_scheme: list[NamedRGB] = [
    ("Brick Red", (198, 45, 66)),
    ("color1", (198.0, 100.5, 45.0)),
]
assert source_to_hex(color_scheme) == [
    ("Brick Red", "#C62D42"),
    ("color1", "#C6642D"),
]


# 4.6 Reversing a copy of a list
# --------------------------------
# Python reverse() mutates and returns None. JS Array.reverse() also mutates but
# returns the array; modern JS toReversed() instead creates a copy.
timestamp_seconds = 8_063_599
fields: list[int] = []
remaining = timestamp_seconds
for base in (60, 60, 24, 7):
    remaining, field = divmod(remaining, base)
    assert fields.append(field) is None  # Mutates fields and returns None.
assert fields.append(remaining) is None
assert fields == [19, 53, 7, 2, 13]

reversed_in_place = fields.copy()
assert reversed_in_place.reverse() is None
assert reversed_in_place == [13, 2, 7, 53, 19]
assert fields[::-1] == reversed_in_place
assert list(reversed(fields)) == reversed_in_place
assert fields == [19, 53, 7, 2, 13]


# 4.7 Building sets: literals, adding, comprehensions, and operators
# -------------------------------------------------------------------
# {} is an empty dict, so set() creates an empty set. Both Python and JS sets
# preserve uniqueness, but Python's order is intentionally not an API promise.
import_details = [
    ("chapter_a.py", ["pathlib", "typing"]),
    ("chapter_b.py", ["pathlib", "argparse"]),
]
all_imports: set[str] = set()
for _, imported_names in import_details:
    for name in imported_names:
        # add() mutates the set and returns None, even for an existing member.
        assert all_imports.add(name) is None

names = {name for _, imported_names in import_details for name in imported_names}
assert all_imports == names == {"pathlib", "typing", "argparse"}

collection = {1}
# union() and the binary set operators return new sets without mutating operands.
assert collection.union({3}) == {1, 3}
assert collection == {1}
# |= is augmented assignment: it mutates this set in place and has no value.
collection |= {3}
# update() also mutates collection and returns None.
assert collection.update({4}) is None
assert collection == {1, 3, 4}
assert collection & {3, 5} == {3}
assert collection ^ {3, 5} == {1, 4, 5}
assert collection - {1, 4} == {3}

# Hash collisions do not imply equality: a set still keeps distinct values.
collision_left = 7
collision_right = collision_left + 2**61 - 1
assert hash(collision_left) == hash(collision_right)
assert len({collision_left, collision_right}) == 2


# 4.8 Shrinking sets: remove(), pop(), and difference
# ----------------------------------------------------
log = "IP: 111.222.111.222; placeholders IP: 1.2.3.4 and IP: 0.0.0.0"
matches = set(re.findall(r"IP: \d+\.\d+\.\d+\.\d+", log))
ignored = {"IP: 0.0.0.0", "IP: 1.2.3.4"}
expected_matches = {"IP: 111.222.111.222"}
assert matches - ignored == expected_matches
assert matches.difference(ignored) == expected_matches

valid_matches = matches.copy()
# set.copy() creates a distinct shallow set. These elements are immutable
# strings, so sharing references to them is safe; mutating valid_matches does
# not add or remove members from matches.
assert valid_matches is not matches
# difference_update() mutates valid_matches and returns None; difference() and
# subtraction above returned new sets and left matches unchanged.
assert valid_matches.difference_update(ignored) is None
assert valid_matches == expected_matches
assert matches == expected_matches | ignored
# remove() mutates the set, returns None, and raises KeyError when absent.
assert valid_matches.remove("IP: 111.222.111.222") is None
assert not valid_matches
try:
    valid_matches.remove("missing")
except KeyError:
    pass
else:  # pragma: no cover
    raise AssertionError("set.remove() must reject a missing value")

# pop() mutates the set and returns an arbitrary removed member. Assert
# membership, not a particular order.
to_pop = {"a", "b"}
popped = to_pop.pop()
assert popped in {"a", "b"} and len(to_pop) == 1


# 4.9 Writing set-related type hints
# -----------------------------------
class Die(StrEnum):
    ONE = "⚀"
    TWO = "⚁"
    THREE = "⚂"
    FOUR = "⚃"
    FIVE = "⚄"
    SIX = "⚅"


def evaluate_zonk_six(hand: Iterable[Die]) -> str:
    """Classify the set and frequency patterns in a six-die hand."""
    dice = tuple(hand)
    if len(dice) != 6:
        raise ValueError("Only six-die hands are supported")
    unique: set[Die] = set(dice)
    faces = list(Die)
    small_straights = [set(faces[:-1]), set(faces[1:])]
    if len(unique) == 6:
        return "large straight"
    if len(unique) == 5 and unique in small_straights:
        return "small straight"
    if len(unique) == 2:
        return "three of a kind"
    if len(unique) == 1:
        return "six of a kind"
    if len(unique) in {3, 4}:
        frequencies: set[int] = set(Counter(dice).values())
        if 3 in frequencies or 4 in frequencies:
            return "three of a kind"
        if Die.ONE in unique:
            return "ace"
    return "Zonk!"


assert evaluate_zonk_six(tuple(Die)) == "large straight"
assert evaluate_zonk_six([*list(Die)[:-1], Die.ONE]) == "small straight"
assert evaluate_zonk_six([Die.SIX] * 6) == "six of a kind"
assert evaluate_zonk_six([Die.THREE] * 3 + [Die.FOUR, Die.FIVE, Die.SIX]) == (
    "three of a kind"
)
assert evaluate_zonk_six([Die.ONE, Die.ONE, Die.TWO, Die.TWO, Die.THREE, Die.FOUR]) == (
    "ace"
)
