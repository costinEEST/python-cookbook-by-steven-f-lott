from __future__ import annotations

import csv
import datetime
import math
import re
from ast import literal_eval
from collections.abc import Iterable, Iterator, Mapping
from dataclasses import dataclass
from enum import StrEnum
from io import StringIO
from pathlib import Path
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, Field, PlainValidator, ValidationError

# Executable notes adapted from the user-saved HTML for Modern Python Cookbook,
# Chapter 10, "Working with Type Matching and Annotations." The saved chapter
# contains recipes 10.1-10.6. Examples use in-memory data for determinism.


# 10.1 Designing with type hints
# --------------------------------
@dataclass(frozen=True)
class Referenced:
    """A data file and the source files that refer to it."""

    datafile: Path
    recipes: list[Path]


type Unreferenced = Path
type Content = Unreferenced | Referenced


def classify_files(
    datafiles: Iterable[Path], references: Mapping[str, list[Path]]
) -> Iterator[Content]:
    """Yield a Path or richer Referenced value according to known references."""
    for path in datafiles:
        used_by = references.get(path.name, [])
        if used_by:
            yield Referenced(path, used_by.copy())
        else:
            yield path


classified = list(
    classify_files(
        [Path("unused.csv"), Path("used.json")],
        {"used.json": [Path("chapter-11/reader.py")]},
    )
)
assert isinstance(classified[0], Path)
assert isinstance(classified[1], Referenced)
# Type-first and code-first designs can converge on the same union. Hints guide
# static tools and readers but add no runtime validation or dispatch. TypeScript
# annotations and interfaces are likewise erased; both languages can adopt types
# gradually. Unlike a distinct TS type alias, Unreferenced is exactly Path at runtime.


# 10.2 Using the built-in type matching functions
# -------------------------------------------------
def analyze_with_isinstance(
    source: Iterable[Content],
) -> tuple[list[Path], list[Referenced]]:
    deleted: list[Path] = []
    kept: list[Referenced] = []
    for item in source:
        if isinstance(item, Path):
            deleted.append(item)
        elif isinstance(item, Referenced):
            kept.append(item)
        else:
            raise TypeError(f"unexpected type: {type(item).__name__}")
    return deleted, kept


deleted, kept = analyze_with_isinstance(classified)
assert deleted == [Path("unused.csv")]
assert [item.datafile for item in kept] == [Path("used.json")]
assert issubclass(type(Path("sample")), Path)
# isinstance() checks runtime inheritance (including subclasses); issubclass()
# checks class objects. TypeScript uses instanceof only for runtime classes, while
# interfaces need structural guards because they do not exist at runtime.


# 10.3 Using the match statement
# --------------------------------
def analyze_with_match(
    source: Iterable[Content],
) -> tuple[list[Path], list[Referenced]]:
    deleted: list[Path] = []
    kept: list[Referenced] = []
    for item in source:
        match item:
            case Referenced(_, [Path()]) as single:
                kept.append(single)
            case Referenced() as multiple:
                kept.append(multiple)
            case Path() as unreferenced:
                deleted.append(unreferenced)
            case _:
                raise TypeError(f"unexpected type: {type(item).__name__}")
    return deleted, kept


assert analyze_with_match(classified) == (deleted, kept)


def describe_payload(value: object) -> str:
    match value:
        case {"kind": "point", "lat": float(lat), "lon": float(lon)}:
            return f"point {lat},{lon}"
        case [str(first), *rest] if rest:
            return f"non-empty string sequence beginning {first!r}"
        case _:
            return "unknown"


assert describe_payload({"kind": "point", "lat": 1.5, "lon": 2.5}) == "point 1.5,2.5"
assert describe_payload(["a", "b"]) == "non-empty string sequence beginning 'a'"
# Patterns test shape and bind names; they do not construct Referenced or float.
# Cases are ordered, so specific shapes precede general classes and the wildcard.
# TypeScript has no built-in structural match statement; its sibling uses guards.


# 10.4 Handling type conversions
# --------------------------------
type Point = tuple[float, float] | str | Mapping[str, float]


def parse_point(item: Point) -> tuple[float, float]:
    match item:
        case [float(lat), float(lon)]:
            return lat, lon
        case {"lat": float(lat), "lon": float(lon)}:
            return lat, lon
        case str(text):
            parsed = literal_eval(text)
            match parsed:
                case [int() | float() as lat, int() | float() as lon]:
                    return float(lat), float(lon)
            raise ValueError(f"not a coordinate pair: {text!r}")
        case _:
            raise ValueError(f"unexpected point: {item!r}")


def haversine(
    lat1: float, lon1: float, lat2: float, lon2: float, *, radius: float
) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def distance(first: Point, second: Point, *, radius: float = 6372.8) -> float:
    lat1, lon1 = parse_point(first)
    lat2, lon2 = parse_point(second)
    return haversine(lat1, lon1, lat2, lon2, radius=radius)


expected_distance = 2887.26
assert math.isclose(
    distance((36.12, -86.67), "33.94,-118.40"), expected_distance, abs_tol=0.01
)
assert math.isclose(
    distance({"lat": 36.12, "lon": -86.67}, (33.94, -118.40)),
    expected_distance,
    abs_tol=0.01,
)
# Conversion stays at the boundary; haversine() receives only floats. JS Number()
# is broader than float(); the TS sibling rejects empty strings and validates shape.


# 10.5 Implementing stricter type checks with Pydantic
# ------------------------------------------------------
class Level(StrEnum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


class LogData(BaseModel):
    date: datetime.datetime
    level: Level
    module: Annotated[str, Field(pattern=r"^\w+$")]
    message: str


LOG_PATTERN = re.compile(
    r"\[(?P<date>.*?)]\s+(?P<level>\w+)\s+in\s+"
    r"(?P<module>.+?):\s+(?P<message>.+)"
)


def logdata_iter(source: Iterable[str]) -> Iterator[LogData]:
    for row in source:
        if match := LOG_PATTERN.fullmatch(row):
            yield LogData.model_validate(match.groupdict())


log = next(logdata_iter(["[2016-06-15 17:57:54,715] INFO in ch10: Sample message"]))
assert log.date == datetime.datetime(2016, 6, 15, 17, 57, 54, 715000)
assert log.level is Level.INFO
assert '"level":"INFO"' in log.model_dump_json()
assert LogData.model_json_schema()["properties"]["module"]["pattern"] == r"^\w+$"
# BaseModel reads annotations at runtime, converts external data, validates fields,
# and emits JSON Schema. @dataclass and TS interface do none of these automatically;
# the closer TS analogue is a runtime schema library or explicit validation code.


# 10.6 Including run-time valid value checks
# --------------------------------------------
class HighLow(StrEnum):
    HIGH = "H"
    LOW = "L"


def validate_date(value: Any) -> datetime.date:
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, str):
        return datetime.datetime.strptime(value, "%Y/%m/%d").date()
    raise TypeError(f"cannot validate date from {value!r}")


def require_daylight(value: datetime.time) -> datetime.time:
    if not datetime.time(10) <= value <= datetime.time(17):
        raise ValueError("tide is outside the daylight window")
    return value


def require_high(value: HighLow) -> HighLow:
    if value is not HighLow.HIGH:
        raise ValueError("low tide rejected")
    return value


class HighTide(BaseModel):
    date: Annotated[
        datetime.date,
        Field(validation_alias="Date"),
        PlainValidator(validate_date),
    ]
    time: Annotated[
        datetime.time,
        Field(validation_alias="Time"),
        AfterValidator(require_daylight),
    ]
    prediction: Annotated[float, Field(validation_alias="Pred", ge=1.5)]
    high_low: Annotated[
        HighLow,
        Field(validation_alias="High/Low"),
        AfterValidator(require_high),
    ]


def tide_table_reader(source: StringIO) -> Iterator[dict[str, str]]:
    line_iter = iter(source)
    for line in line_iter:
        if not line.rstrip():
            break
    reader = csv.DictReader(line_iter, delimiter="\t")
    yield from reader


tide_text = "metadata\n\nDate\tTime\tPred\tHigh/Low\n2024/04/07\t15:42\t1.55\tH\n"
tide_row = next(tide_table_reader(StringIO(tide_text)))
high_tide = HighTide.model_validate(tide_row)
assert high_tide.date == datetime.date(2024, 4, 7)
assert high_tide.high_low is HighLow.HIGH

try:
    HighTide.model_validate(
        {"Date": "2024/04/07", "Time": "08:00", "Pred": "1.2", "High/Low": "L"}
    )
except ValidationError as error:
    rejected_fields = {item["loc"][0] for item in error.errors()}
    assert rejected_fields == {"Time", "Pred", "High/Low"}
else:
    raise AssertionError("invalid tide data should be rejected")
# Field aliases map external schema names; validators then narrow valid values after
# conversion. This is runtime behavior, unlike ordinary Python or TS annotations.

print("Chapter 10 Python examples passed.")
