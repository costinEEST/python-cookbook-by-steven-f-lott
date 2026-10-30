from __future__ import annotations

import math
import re
import statistics
from collections import Counter
from collections.abc import Callable, Iterable, Iterator
from dataclasses import dataclass
from datetime import datetime
from functools import partial, reduce
from operator import mul
from typing import NamedTuple

# Executable notes adapted from the user-saved HTML for Modern Python Cookbook,
# Chapter 9, "Functional Programming Features." The saved chapter has recipes
# 9.1-9.9. Examples use in-memory data so the tour stays deterministic.


class RawLog(NamedTuple):
    date: str
    level: str
    module: str
    message: str


class DatedLog(NamedTuple):
    date: datetime
    level: str
    module: str
    message: str


LOG_PATTERN = re.compile(
    r"\[(?P<date>.*?)]\s+(?P<level>\w+)\s+in\s+"
    r"(?P<module>.+?):\s+(?P<message>.+)"
)


# 9.1 Writing generator functions with the yield statement
# ----------------------------------------------------------
def parse_line_iter(source: Iterable[str]) -> Iterator[RawLog]:
    """Lazily parse matching log lines and silently reject other lines."""
    for line in source:
        if match := LOG_PATTERN.fullmatch(line):
            yield RawLog(**match.groupdict())


def parse_date(item: RawLog) -> DatedLog:
    return DatedLog(
        datetime.strptime(item.date, "%Y-%m-%d %H:%M:%S,%f"),
        item.level,
        item.module,
        item.message,
    )


log_lines = [
    "[2016-04-24 11:05:01,462] INFO in module1: Sample Message One",
    "not a log record",
    "[2016-04-24 11:06:02,624] DEBUG in module2: Debugging",
    "[2016-04-24 11:07:03,246] WARNING in module1: Check failed",
]
raw_logs = parse_line_iter(log_lines)
assert iter(raw_logs) is raw_logs
first_log = next(raw_logs)
assert first_log.level == "INFO"
assert [item.level for item in raw_logs] == ["DEBUG", "WARNING"]
assert list(raw_logs) == []  # An iterator is consumed once.
# Calling a generator creates an iterator without running its body. Each next()
# resumes at yield; exhaustion raises StopIteration, which for loops absorb. JS
# generator functions and Generator objects have almost the same demand-driven
# behavior, though JS reports {done: true} instead of exposing StopIteration.


# 9.2 Applying transformations to a collection
# ----------------------------------------------
def parse_date_iter(source: Iterable[RawLog]) -> Iterator[DatedLog]:
    for item in source:
        yield parse_date(item)


source_logs = list(parse_line_iter(log_lines))
with_yield = parse_date_iter(source_logs)
with_expression = (parse_date(item) for item in source_logs)
with_map = map(parse_date, source_logs)
expected_dates = [
    datetime(2016, 4, 24, 11, 5, 1, 462000),
    datetime(2016, 4, 24, 11, 6, 2, 624000),
    datetime(2016, 4, 24, 11, 7, 3, 246000),
]
assert [item.date for item in with_yield] == expected_dates
assert [item.date for item in with_expression] == expected_dates
assert [item.date for item in with_map] == expected_dates
# All three forms are lazy. Python map() returns an iterator; JavaScript Array.map()
# eagerly creates an array, so the TypeScript sibling uses generator helpers.


# 9.3 Using stacked generator expressions
# -----------------------------------------
class CombinedRow(NamedTuple):
    date: str
    engine_on_time: str
    engine_on_fuel_height: str
    filler_1: str
    engine_off_time: str
    engine_off_fuel_height: str
    filler_2: str
    other_notes: str
    filler_3: str


class DatetimeRow(NamedTuple):
    date: datetime
    engine_on: datetime
    engine_on_fuel_height: float
    engine_off: datetime
    engine_off_fuel_height: float
    other_notes: str


def row_merge(source: Iterable[list[str]]) -> Iterator[CombinedRow]:
    cluster: list[str] = []
    for row in source:
        if not any(row):
            continue
        if row[0]:
            if len(cluster) == 9:
                yield CombinedRow(*cluster)
            cluster = row.copy()  # New outer list; string values are immutable.
        else:
            cluster.extend(row)  # Mutates cluster and returns None.
    if len(cluster) == 9:
        yield CombinedRow(*cluster)


def convert_datetime(row: CombinedRow) -> DatetimeRow:
    date = datetime.strptime(row.date, "%m/%d/%y")
    start_time = datetime.strptime(row.engine_on_time, "%I:%M:%S %p").time()
    end_time = datetime.strptime(row.engine_off_time, "%I:%M:%S %p").time()
    return DatetimeRow(
        date,
        datetime.combine(date.date(), start_time),
        float(row.engine_on_fuel_height),
        datetime.combine(date.date(), end_time),
        float(row.engine_off_fuel_height),
        row.other_notes,
    )


raw_rows = [
    ["date", "engine on", "fuel"],
    ["", "engine off", "fuel"],
    ["", "notes", ""],
    ["04/24/16", "11:05:00 AM", "29.0"],
    ["", "12:35:00 PM", "27.5"],
    ["", "calm", ""],
    ["", "", ""],
    ["04/25/16", "09:00:00 AM", "27.5"],
    ["", "10:00:00 AM", "26.5"],
    ["", "windy", ""],
]
merged_rows = row_merge(raw_rows)
data_rows = (row for row in merged_rows if row.date != "date")
datetime_rows = (convert_datetime(row) for row in data_rows)
legs = tuple(datetime_rows)  # Cache because later reductions need multiple passes.
assert [row.other_notes for row in legs] == ["calm", "windy"]
assert [(row.engine_off - row.engine_on).total_seconds() for row in legs] == [
    5400,
    3600,
]
# Each stage pulls from the previous stage only on demand; this is composition,
# not concurrency. JS iterable pipelines can be written with generator functions.


# 9.4 Picking a subset - three ways to filter
# ---------------------------------------------
def pass_non_date(row: CombinedRow) -> bool:
    return row.date != "date"


def skip_header_iter(source: Iterable[CombinedRow]) -> Iterator[CombinedRow]:
    for item in source:
        if pass_non_date(item):
            yield item


all_merged = list(row_merge(raw_rows))
filtered_with_yield = skip_header_iter(all_merged)
filtered_with_expression = (row for row in all_merged if pass_non_date(row))
filtered_with_builtin = filter(pass_non_date, all_merged)
assert list(filtered_with_yield) == list(filtered_with_expression)
assert list(filter(pass_non_date, all_merged)) == list(filtered_with_builtin)


def valid_float(text: str) -> bool:
    try:
        float(text)
    except ValueError:
        return False
    return True


assert list(filter(valid_float, ["3.14", "missing", "-2"])) == ["3.14", "-2"]
# A named predicate can contain try/except and tests cleanly. A generator expression
# cannot contain statements. JS filter() is eager; Python filter() remains lazy.


# 9.5 Summarizing a collection - how to reduce
# ---------------------------------------------
numbers = [2, 3, 4]
assert sum(numbers) == 9
assert min(numbers) == 2 and max(numbers) == 4
assert math.prod(numbers) == reduce(mul, numbers, 1) == 24
assert sum([]) == 0 and math.prod([]) == 1
assert any([False, True, False]) and not all([True, False])
assert reduce(mul, [], 1) == 1
# Prefer specialized reductions: they state intent and encode the right identity.
# reduce() without an initializer fails on an empty input. JS reduce() has the same
# empty-input trap; JS lacks built-in sum(), so the TS sibling supplies an identity.


# 9.6 Combining map and reduce transformations
# ---------------------------------------------
@dataclass(frozen=True)
class Leg:
    travel_hours: float
    fuel_change: float

    @property
    def fuel_per_hour(self) -> float:
        return self.fuel_change / self.travel_hours


clean_legs = tuple(
    Leg(
        (row.engine_off - row.engine_on).total_seconds() / 3600,
        row.engine_on_fuel_height - row.engine_off_fuel_height,
    )
    for row in legs
)
rates = tuple(map(lambda leg: leg.fuel_per_hour, clean_legs))
assert rates == (1.0, 1.0)
assert statistics.mean(rates) == 1.0 and statistics.stdev(rates) == 0.0

one_shot = map(lambda leg: leg.fuel_per_hour, clean_legs)
assert sum(one_shot) == 2.0 and sum(one_shot) == 0
# Cache an iterator as a tuple/list when several summaries are required. tee() can
# buffer an unbounded lag between consumers. This immutable Leg design also avoids
# the source recipe's order-dependent in-place enrichment pipeline.


# 9.7 Implementing "there exists" processing
# --------------------------------------------
def find_first[T](predicate: Callable[[T], bool], source: Iterable[T]) -> Iterator[T]:
    for item in source:
        if predicate(item):
            yield item
            break


def prime(number: int) -> bool:
    if number < 2:
        return False
    candidates = range(2, math.isqrt(number) + 1)
    return (
        next(find_first(lambda divisor: number % divisor == 0, candidates), None)
        is None
    )


assert [number for number in range(2, 20) if prime(number)] == [
    2,
    3,
    5,
    7,
    11,
    13,
    17,
    19,
]
visited: list[int] = []


def is_four(value: int) -> bool:
    visited.append(value)  # Mutates visited; append() returns None.
    return value == 4


assert any(is_four(value) for value in range(10))
assert visited == [0, 1, 2, 3, 4]
# any(), all(), and find_first() short-circuit. JS some(), every(), and find()
# provide eager-array analogues; generators generalize the idea to any iterable.


# 9.8 Creating a partial function
# ---------------------------------
def standardize(mean: float, stdev: float, value: float) -> float:
    return (value - mean) / stdev


samples = [10.0, 12.0, 14.0]
sample_mean = statistics.mean(samples)
sample_stdev = statistics.stdev(samples)
z_score = partial(standardize, sample_mean, sample_stdev)
assert [z_score(value) for value in samples] == [-1.0, 0.0, 1.0]

captured_name = 10


def late_bound(value: int) -> int:
    return value + captured_name


def captured_value(value: int, offset: int = captured_name) -> int:
    return value + offset


captured_name = 20
assert late_bound(1) == 21 and captured_value(1) == 11


def product(values: Iterable[int]) -> int:
    return reduce(mul, values, 1)


assert product([2, 3, 4]) == 24
# partial() stores argument objects immediately. Python closures resolve free names
# when called unless values are frozen as defaults. JS closures are also late-bound;
# Function.bind() is the closest standard partial-application API.


# 9.9 Recursive generator functions with yield from
# --------------------------------------------------
type JsonScalar = str | int | float | bool | None
type JsonDocument = JsonScalar | dict[str, "JsonDocument"] | list["JsonDocument"]
type NodeId = str | int


def find_value(
    value: JsonScalar,
    node: JsonDocument,
    path: tuple[NodeId, ...] = (),
) -> Iterator[tuple[NodeId, ...]]:
    if isinstance(node, dict):
        for key in sorted(node):
            yield from find_value(value, node[key], (*path, key))
    elif isinstance(node, list):
        for index, item in enumerate(node):
            yield from find_value(value, item, (*path, index))
    elif node == value:
        yield path


document: JsonDocument = {
    "field": "value1",
    "field2": "value",
    "array": [{"array_item_key1": "value"}, {"array_item_key2": "other"}],
    "object": {"attribute1": "value", "attribute2": "value2"},
}
assert list(find_value("value", document)) == [
    ("array", 0, "array_item_key1"),
    ("field2",),
    ("object", "attribute1"),
]


def factor_iter(number: int) -> Iterator[int]:
    for divisor in range(2, math.isqrt(number) + 1):
        quotient, remainder = divmod(number, divisor)
        if remainder == 0:
            yield divisor
            yield from factor_iter(quotient)
            return
    yield number


assert Counter(factor_iter(384)) == Counter({2: 7, 3: 1})
# yield from delegates every value (and more of the generator protocol) from a
# nested iterable. JavaScript's yield* is the direct syntax-level analogue.
