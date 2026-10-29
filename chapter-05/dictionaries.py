from __future__ import annotations

import csv
import re
from collections import Counter, defaultdict
from collections.abc import Callable, Iterable, Iterator
from copy import deepcopy
from datetime import date, datetime, time
from io import StringIO
from random import Random
from typing import NotRequired, TypedDict

# Executable notes adapted from the saved HTML for Modern Python Cookbook,
# Chapter 5, "Built-In Data Structures Part 2: Dictionaries."

LOG_TEXT = """\
[2019/11/12:08:09:10,123] INFO request-A path="/openapi.yaml" method=GET
[2019/11/12:08:09:10,234] INFO request-B path="/items?limit=x" method=GET
[2019/11/12:08:09:10,235] INFO request-B error="invalid query"
[2019/11/12:08:09:10,345] INFO request-A status="200" bytes="11234"
[2019/11/12:08:09:10,456] INFO request-B status="404" bytes="987"
[2019/11/12:08:09:10,567] INFO request-C path="/category/42" method=GET
"""
LOG_PATTERN = re.compile(r"\[(.*?)\] (\w+) (\S+) (.*)")
PARAMETER_PATTERN = re.compile(r'(\w+)=(".*?"|\w+)')
type LogRecord = tuple[str, str, str, str]


def parse_log(source: str) -> list[LogRecord]:
    records: list[LogRecord] = []
    for line in source.splitlines():
        match = LOG_PATTERN.fullmatch(line)
        assert match is not None
        records.append((match.group(1), match.group(2), match.group(3), match.group(4)))
    return records


log_records = parse_log(LOG_TEXT)


# 5.1 Creating dictionaries: inserting and updating
# ---------------------------------------------------
# A dict maps hashable keys to arbitrary values. It resembles a JS Map, though
# a Python object literal is also superficially similar to a string-keyed dict.
ratio_literal = {"num": 355, "den": 113}
assert dict([("num", 355), ("den", 113)]) == ratio_literal
assert dict(num=355, den=113) == ratio_literal

histogram: dict[str, int] = {}
for _, _, _, details in log_records:
    if details.startswith("path"):
        if details not in histogram:
            # Item assignment mutates histogram and, as a statement, returns no
            # value. Keys must be hashable; these string keys are immutable.
            histogram[details] = 0
        # += reads the immutable int, creates a new int, and stores its reference
        # back under the key; histogram itself is mutated.
        histogram[details] += 1

assert histogram == {
    'path="/openapi.yaml" method=GET': 1,
    'path="/items?limit=x" method=GET': 1,
    'path="/category/42" method=GET': 1,
}

# A dictionary comprehension returns a new dict without mutating its source.
parameter_maps = [
    {name: value for name, value in PARAMETER_PATTERN.findall(details)}
    for _, _, _, details in log_records
]
assert parameter_maps[0] == {"path": '"/openapi.yaml"', "method": "GET"}
assert parameter_maps[2] == {"error": '"invalid query"'}

# defaultdict calls its factory for a missing key. Looking up that key inserts
# the default into the mutable mapping before += replaces the integer value.
default_histogram: defaultdict[str, int] = defaultdict(int)
for details in (record[3] for record in log_records if record[3].startswith("path")):
    default_histogram[details] += 1
assert dict(default_histogram) == histogram

# Counter consumes the iterable and returns a new counting dictionary.
counter_histogram = Counter(
    record[3] for record in log_records if record[3].startswith("path")
)
assert counter_histogram == histogram


# 5.2 Shrinking dictionaries: pop() and del
# --------------------------------------------
def request_batches(source: Iterable[str]) -> Iterator[list[LogRecord]]:
    """Yield completed request groups while retaining incomplete requests."""
    requests: defaultdict[str, list[LogRecord]] = defaultdict(list)
    for line in source:
        match = LOG_PATTERN.fullmatch(line)
        if match is None:
            continue
        record: LogRecord = (
            match.group(1),
            match.group(2),
            match.group(3),
            match.group(4),
        )
        request_id = record[2]
        # defaultdict may insert a new list; append() mutates it and returns None.
        assert requests[request_id].append(record) is None
        if record[3].startswith("status"):
            completed = requests[request_id]
            # del mutates requests and returns no value. The completed local name
            # keeps the list alive after its dictionary binding is removed.
            del requests[request_id]
            yield completed


batches = list(request_batches(LOG_TEXT.splitlines()))
assert [batch[0][2] for batch in batches] == ["request-A", "request-B"]
assert [len(batch) for batch in batches] == [2, 3]

# pop() mutates a dict and returns the removed value. A supplied default is
# returned for an absent key; popitem() removes and returns the newest pair.
inventory = {"first": 1, "second": 2}
assert inventory.pop("first") == 1
assert inventory.pop("missing", 0) == 0
assert inventory.popitem() == ("second", 2)
assert inventory == {}


# 5.3 Writing dictionary-related type hints
# -------------------------------------------
# dict[str, str] is homogeneous. TypedDict describes a fixed set of string keys
# with heterogeneous value types; like TypeScript interfaces, it is erased and
# provides no runtime validation.
CSV_TEXT = """\
date,engine on,fuel height on,engine off,fuel height off
10/25/13,08:24:00,29,13:15:00,27
10/26/13,09:12:00,27,18:25:00,22
10/28/13,13:21:00,22,06:25:00,14
"""


class History(TypedDict):
    date: date
    start_time: time
    start_fuel: float
    end_time: time
    end_fuel: float


class FlexibleHistory(TypedDict):
    date: date
    start_time: NotRequired[time]
    start_fuel: NotRequired[float]
    end_time: NotRequired[time]
    end_fuel: NotRequired[float]


def read_fuel_use(source: str) -> list[dict[str, str]]:
    return list(csv.DictReader(StringIO(source)))


def make_history(source: Iterable[dict[str, str]]) -> Iterator[History]:
    for row in source:
        yield History(
            date=datetime.strptime(row["date"], "%m/%d/%y").date(),
            start_time=datetime.strptime(row["engine on"], "%H:%M:%S").time(),
            start_fuel=float(row["fuel height on"]),
            end_time=datetime.strptime(row["engine off"], "%H:%M:%S").time(),
            end_fuel=float(row["fuel height off"]),
        )


history = list(make_history(read_fuel_use(CSV_TEXT)))
assert history[0] == {
    "date": date(2013, 10, 25),
    "start_time": time(8, 24),
    "start_fuel": 29.0,
    "end_time": time(13, 15),
    "end_fuel": 27.0,
}
partial_history: FlexibleHistory = {"date": date(2013, 10, 29)}
assert "end_time" not in partial_history


# 5.4 Understanding variables, references, and assignment
# ---------------------------------------------------------
# Python assignment binds names to objects; it does not copy object data. In
# CPython, objects generally live in managed heap memory and local names hold
# references in execution frames, but exact memory placement is implementation-specific.
mutable = [1, 1, 2, 3, 5, 8]
immutable = (5, 8, 13, 21)
mutable_alias = mutable
immutable_alias = immutable
assert mutable_alias is mutable
assert immutable_alias is immutable

# list.__iadd__ mutates and returns the same list, so both names see the change.
mutable += [mutable[-2] + mutable[-1]]
assert mutable_alias is mutable
assert mutable_alias == [1, 1, 2, 3, 5, 8, 13]

# tuple has no in-place mutation. += creates a new tuple and rebinds only the
# immutable name; immutable_alias remains bound to the original tuple.
immutable += (immutable[-2] + immutable[-1],)
assert immutable == (5, 8, 13, 21, 34)
assert immutable_alias == (5, 8, 13, 21)
assert immutable_alias is not immutable

# Integers are immutable too: += creates 468 and rebinds number.
number = 355
original_number = number
number += 113
assert number == 468 and original_number == 355


# 5.5 Making shallow and deep copies of objects
# -----------------------------------------------
some_dict = {"a": [1, 1, 2, 3]}
shallow_copy = some_dict.copy()
assert shallow_copy is not some_dict
assert shallow_copy["a"] is some_dict["a"]
# append() mutates the shared nested list and returns None, so both outer dicts
# observe the change even though the dictionaries themselves are distinct.
assert some_dict["a"].append(5) is None
assert shallow_copy == {"a": [1, 1, 2, 3, 5]}

deep_copy = deepcopy(some_dict)
assert deep_copy is not some_dict
assert deep_copy["a"] is not some_dict["a"]
assert some_dict["a"].append(8) is None
assert deep_copy == {"a": [1, 1, 2, 3, 5]}
assert some_dict == {"a": [1, 1, 2, 3, 5, 8]}

# dict(), copy(), and a comprehension all make shallow copies. Immutable keys
# may safely be shared; nested mutable values still alias the originals.
assert dict(some_dict)["a"] is some_dict["a"]
assert {key: value for key, value in some_dict.items()}["a"] is some_dict["a"]


# 5.6 Avoiding mutable default parameter values
# -----------------------------------------------
def dice_totals(number_of_dice: int, samples: int, random: Random) -> Iterator[int]:
    for _ in range(samples):
        yield sum(random.randint(1, 6) for _ in range(number_of_dice))


# This named object makes the intentionally bad shared default visible while
# keeping lint diagnostics clean. Python evaluates defaults once at def time.
SHARED_BAD_SUMMARY: Counter[int] = Counter()


def gather_stats_bad(
    number_of_dice: int,
    samples: int = 12,
    summary: Counter[int] = SHARED_BAD_SUMMARY,
) -> Counter[int]:
    # update() mutates and returns None; omitted calls reuse the same Counter.
    assert summary.update(dice_totals(number_of_dice, samples, Random(1))) is None
    return summary


first_bad = gather_stats_bad(2)
first_bad_snapshot = first_bad.copy()
second_bad = gather_stats_bad(2)
assert first_bad is second_bad
assert second_bad == Counter(
    {total: count * 2 for total, count in first_bad_snapshot.items()}
)


def gather_stats_good(
    number_of_dice: int,
    samples: int = 12,
    summary: Counter[int] | None = None,
) -> Counter[int]:
    # None is immutable. Each omitted call creates a fresh mutable Counter;
    # an explicitly supplied Counter is intentionally mutated and returned.
    if summary is None:
        summary = Counter()
    assert summary.update(dice_totals(number_of_dice, samples, Random(1))) is None
    return summary


first_good = gather_stats_good(2)
second_good = gather_stats_good(2)
assert first_good == second_good
assert first_good is not second_good


def update_stats(
    number_of_dice: int, summary: Counter[int], samples: int = 12
) -> Counter[int]:
    assert summary.update(dice_totals(number_of_dice, samples, Random(1))) is None
    return summary


def create_stats(number_of_dice: int, samples: int = 12) -> Counter[int]:
    return update_stats(number_of_dice, Counter(), samples)


type SummaryFactory = Callable[[Iterable[int]], object]


def gather_stats_flexible(
    number_of_dice: int,
    samples: int = 12,
    summary_factory: SummaryFactory = Counter,
) -> object:
    # The default is an immutable callable reference. Calling the factory makes
    # a fresh result object on every invocation.
    return summary_factory(dice_totals(number_of_dice, samples, Random(1)))


assert create_stats(2) == first_good
assert gather_stats_flexible(2) == first_good
assert gather_stats_flexible(2, summary_factory=list) == [
    7,
    4,
    5,
    8,
    10,
    3,
    5,
    8,
    6,
    10,
    9,
    7,
]
