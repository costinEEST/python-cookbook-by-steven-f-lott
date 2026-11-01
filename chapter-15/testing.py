from __future__ import annotations

import doctest
import json
import math
import random
import statistics
import unittest
from collections import Counter
from collections.abc import Callable, Iterator, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from io import StringIO
from string import ascii_letters
from typing import Protocol
from unittest.mock import Mock, call

import pytest

# Executable notes adapted from the user-saved HTML for Modern Python Cookbook,
# Chapter 15. It contains recipes 15.1-15.10. Tests use in-memory resources and
# injected time/randomness, so running this module has no filesystem side effects.


# 15.1 Using docstrings for testing
def binomial(n: int, k: int) -> int:
    """Return the number of combinations of *n* items taken *k* at a time.

    >>> binomial(52, 5)
    2598960
    >>> binomial(52, 0), binomial(52, 52)
    (1, 1)
    """
    if n < 0 or k < 0 or k > n:
        raise ValueError("require 0 <= k <= n")
    return math.factorial(n) // (math.factorial(k) * math.factorial(n - k))


class Summary:
    """Accumulate integer values and compute descriptive statistics.

    >>> summary = Summary()
    >>> for value in (8, 9, 9):
    ...     summary.add(value)
    >>> round(summary.mean, 2), summary.median
    (8.67, 9)
    >>> str(summary)
    'mean = 8.67; median = 9'
    """

    def __init__(self) -> None:
        self.counts: Counter[int] = Counter()

    def add(self, value: int) -> None:
        self.counts[value] += 1

    @property
    def values(self) -> list[int]:
        return list(self.counts.elements())

    @property
    def mean(self) -> float:
        return statistics.mean(self.values)

    @property
    def median(self) -> float:
        return statistics.median(self.values)

    def __str__(self) -> str:
        return f"mean = {self.mean:.2f}; median = {self.median:g}"


# doctest treats REPL-shaped examples as executable documentation. TypeScript has
# no built-in doctest convention; its sibling keeps examples in node:test cases.


# 15.2 Testing functions that raise exceptions
__test__ = {
    "invalid_binomial": """
    >>> binomial(5, 52)
    Traceback (most recent call last):
    ...
    ValueError: require 0 <= k <= n
    """,
}
# Traceback internals are ignored automatically; +ELLIPSIS and
# +IGNORE_EXCEPTION_DETAIL provide additional tolerance when messages vary.


# 15.3 Handling common doctest issues
def unique_letters(text: str) -> set[str]:
    return set(text.lower()).intersection(ascii_letters)


@dataclass(frozen=True)
class Point:
    latitude: float
    longitude: float

    @property
    def text(self) -> str:
        north_south = "S" if self.latitude < 0 else "N"
        east_west = "W" if self.longitude < 0 else "E"
        latitude_degrees, latitude_minutes = divmod(abs(self.latitude), 1.0)
        longitude_degrees, longitude_minutes = divmod(abs(self.longitude), 1.0)
        return (
            f"{latitude_degrees:02.0f}{latitude_minutes * 60:06.3f}{north_south} "
            f"{longitude_degrees:03.0f}{longitude_minutes * 60:06.3f}{east_west}"
        )


def normal_cumulative_probability(value: float) -> float:
    return (1 + math.erf(value / math.sqrt(2))) / 2


letters = unique_letters("The quick brown fox...")
assert sorted(letters) == list("bcefhiknoqrtuwx")
assert Point(36.8439, -76.2936).text == "3650.634N 07617.616W"
assert math.isclose(normal_cumulative_probability(1), 0.8413, rel_tol=1e-4)
# Sort unordered collections, define a stable repr/text view, and compare floats
# by domain-appropriate tolerance. Do not broaden tolerance until bugs can pass.


# 15.4 Unit testing with the unittest module
class SummaryTests(unittest.TestCase):
    def setUp(self) -> None:
        data = list(range(1_001))
        random.Random(42).shuffle(data)
        self.summary = Summary()
        for sample in data:
            self.summary.add(sample)

    def test_mean(self) -> None:
        self.assertEqual(self.summary.mean, 500)

    def test_median(self) -> None:
        self.assertEqual(self.summary.median, 500)


# Separate test methods produce independent diagnostics and each receives a fresh
# setUp(). This resembles beforeEach() plus separate tests in JS frameworks.


# 15.5 Combining unittest and doctest tests
def combined_suite() -> unittest.TestSuite:
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(SummaryTests)
    suite.addTests(doctest.DocTestSuite())
    return suite


# A test module can expose unittest's load_tests() protocol to merge DocTestSuite
# objects with discovered TestCase classes. Keeping this builder explicit avoids
# recursively invoking it while these executable notes validate themselves.


# 15.6 Unit testing with the pytest module
@pytest.fixture
def flat_data() -> list[int]:
    data = list(range(1_001))
    random.Random(42).shuffle(data)
    return data


@pytest.fixture
def summary_object(flat_data: list[int]) -> Summary:
    summary = Summary()
    for sample in flat_data:
        summary.add(sample)
    return summary


def test_pytest_mean(summary_object: Summary) -> None:
    assert summary_object.mean == 500


def test_pytest_median(summary_object: Summary) -> None:
    assert summary_object.median == 500


def test_pytest_exception() -> None:
    with pytest.raises(ValueError, match=r"0 <= k <= n"):
        binomial(3, 4)


# Fixture parameters request reusable setup by name. Each test gets a fresh
# fixture result. Built-in assert statements receive pytest's rewritten failure
# diagnostics; unlike unittest, no TestCase subclass is required.


# 15.7 Combining pytest and doctest tests
PYTEST_COMMAND = "uv run --locked pytest --doctest-modules chapter-15/testing.py"
assert "--doctest-modules" in PYTEST_COMMAND
# pytest discovers test_* functions, unittest.TestCase subclasses, and—when this
# flag is supplied—docstring examples in one run. Node's test runner discovers
# node:test cases but has no standard doctest collector.


# 15.8 Testing things that involve dates or times
type Clock = Callable[[], datetime]


def serialize_at_time(payload: object, clock: Clock) -> tuple[str, str]:
    timestamp = clock().astimezone(UTC).strftime("extract_%Y%m%d%H%M%S.json")
    return timestamp, json.dumps(payload, indent=2)


fixed_clock = Mock(return_value=datetime(2017, 9, 10, 11, 12, 13, tzinfo=UTC))
timestamped_name, serialized_payload = serialize_at_time(
    {"primes": [2, 3, 5, 7]}, fixed_clock
)
assert timestamped_name == "extract_20170910111213.json"
assert json.loads(serialized_payload) == {"primes": [2, 3, 5, 7]}
fixed_clock.assert_called_once_with()
# Injecting a clock makes the dependency visible and avoids patching datetime at
# its import location. Jest/Vitest fake timers serve a similar purpose; node:test
# also has MockTimers, while a plain clock callback remains framework-independent.


# 15.9 Testing things that involve randomness
type Choose = Callable[[SequenceValue], int]
type SequenceValue = list[int]


def resample(population: SequenceValue, size: int, choose: Choose) -> Iterator[int]:
    for _ in range(size):
        yield choose(population)


expected_choices = [23, 29, 31, 37, 41, 43, 47, 53]
mock_choice = Mock(side_effect=expected_choices)
population = [2, 3, 5, 7, 11, 13, 17, 19]
assert list(resample(population, 8, mock_choice)) == expected_choices
assert mock_choice.mock_calls == [call(population)] * 8
# A fixed seed makes a pseudorandom sequence repeatable; injecting choice tests
# the algorithm independently of a particular generator implementation.


# 15.10 Mocking external resources
class Writer(Protocol):
    def __call__(self, path: str, content: str) -> None: ...


class MemoryFiles:
    def __init__(self, initial: Mapping[str, str]) -> None:
        self.files = dict(initial)

    def replace_atomically(self, target: str, content: str, writer: Writer) -> None:
        temporary = f"{target}.new"
        previous = self.files.get(target)
        try:
            writer(temporary, content)
            self.files[target] = self.files.pop(temporary)
        except Exception:
            if previous is not None:
                self.files[target] = previous
            self.files.pop(temporary, None)
            raise


def memory_writer(storage: MemoryFiles) -> Writer:
    def write(path: str, content: str) -> None:
        storage.files[path] = content

    return write


@pytest.mark.parametrize("failure", [OSError("disk full"), RuntimeError("serializer")])
def test_failed_write_preserves_original(failure: Exception) -> None:
    storage = MemoryFiles({"important.csv": "original"})

    def failing_writer(path: str, content: str) -> None:
        storage.files[path] = "partial"
        raise failure

    with pytest.raises(type(failure)):
        storage.replace_atomically("important.csv", "replacement", failing_writer)
    assert storage.files["important.csv"] == "original"
    assert "important.csv.new" not in storage.files


storage = MemoryFiles({"important.csv": "original"})
tracked_writer = Mock(side_effect=memory_writer(storage))
storage.replace_atomically("important.csv", "replacement", tracked_writer)
assert storage.files == {"important.csv": "replacement"}
tracked_writer.assert_called_once_with("important.csv.new", "replacement")
# Prefer an isolated real resource for the happy path and mocks for failures that
# are unsafe or difficult to reproduce. Assert observable state and important
# interactions, without coupling tests to every internal call.


if __name__ == "__main__":
    failures, attempted = doctest.testmod()
    assert failures == 0 and attempted >= 5
    output = StringIO()
    result = unittest.TextTestRunner(stream=output, verbosity=0).run(combined_suite())
    assert result.wasSuccessful()
