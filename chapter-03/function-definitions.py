from __future__ import annotations

import csv
import warnings
from collections.abc import Callable, Iterable, Iterator
from functools import cache, partial
from io import StringIO
from math import asin, cos, prod, radians, sin, sqrt
from pathlib import Path
from random import Random
from typing import NamedTuple, TextIO


# 3.1 Function parameters and type hints
# ---------------------------------------
# Python hints are optional runtime metadata checked by external tools such as
# ty. Like TypeScript types, they are primarily static and do not coerce input.
def hex_to_rgb(hexadecimal: int | str) -> tuple[int, int, int]:
    """Split a 24-bit integer or hexadecimal string into red, green, and blue."""
    if isinstance(hexadecimal, str):
        hexadecimal = int(hexadecimal.removeprefix("#"), 16)
    return (
        (hexadecimal >> 16) & 0xFF,
        (hexadecimal >> 8) & 0xFF,
        hexadecimal & 0xFF,
    )


assert hex_to_rgb("#C62D42") == (198, 45, 66)
assert hex_to_rgb("C62D42") == (198, 45, 66)
assert hex_to_rgb(0xC62D42) == (198, 45, 66)

# A type alias gives a repeated shape a name but creates no runtime type. This
# resembles a TypeScript type alias. NamedTuple creates a tuple subclass with
# readable attributes; the TS sibling uses a readonly object type instead.
type RGBTuple = tuple[int, int, int]
type HSLTuple = tuple[float, float, float]


class RGB(NamedTuple):
    red: int
    green: int
    blue: int


def rgb_tuple_to_hsl(color: RGBTuple) -> HSLTuple:
    """Return a deliberately small HSL example used to exercise named hints."""
    red, green, blue = (component / 255 for component in color)
    lightness = (max(red, green, blue) + min(red, green, blue)) / 2
    return (0.0, 0.0, lightness)


assert RGB(*hex_to_rgb("C62D42")) == RGB(red=198, green=45, blue=66)
assert rgb_tuple_to_hsl((128, 128, 128)) == (0.0, 0.0, 128 / 255)


# 3.2 Designing functions with optional parameters
# ------------------------------------------------
# A default makes a parameter optional. Unlike TypeScript overload signatures,
# Python has one runtime implementation; calls bind positional arguments first,
# keyword arguments second, and defaults last.
def roll_dice(
    count: int = 2,
    *,
    roll_one: Callable[[], int],
) -> tuple[int, ...]:
    return tuple(roll_one() for _ in range(count))


seeded_random = Random(7)
craps_roll = roll_dice(roll_one=lambda: seeded_random.randint(1, 6))
zonk_roll = roll_dice(6, roll_one=lambda: seeded_random.randint(1, 6))
assert craps_roll == (3, 2)
assert zonk_roll == (4, 6, 1, 1, 5, 1)


def craps(roll_one: Callable[[], int]) -> tuple[int, ...]:
    """Specialize the general dice function for Craps."""
    return roll_dice(2, roll_one=roll_one)


def zonk(roll_one: Callable[[], int]) -> tuple[int, ...]:
    """Specialize the general dice function for Zonk's first roll."""
    return roll_dice(6, roll_one=roll_one)


assert craps(lambda: 4) == (4, 4)
assert zonk(lambda: 5) == (5, 5, 5, 5, 5, 5)


# 3.3 Using super-flexible keyword parameters
# ------------------------------------------------
# Explicit optional parameters preserve spelling checks and editor discovery.
# **kwargs resembles a JS rest object, but accepts only named arguments and can
# silently collect misspellings unless the implementation rejects extra keys.
type RTDResult = dict[str, float | None]


def solve_rate_time_distance(
    distance: float | None = None,
    rate: float | None = None,
    time: float | None = None,
) -> RTDResult:
    if distance is None and rate is not None and time is not None:
        distance = rate * time
    elif rate is None and distance is not None and time is not None:
        rate = distance / time
    elif time is None and distance is not None and rate is not None:
        time = distance / rate
    else:
        warnings.warn("Exactly one value must be unknown", stacklevel=2)
    return {"distance": distance, "rate": rate, "time": time}


journey = solve_rate_time_distance(distance=31.2, rate=6)
assert journey == {"distance": 31.2, "rate": 6, "time": 5.2}
assert "At {rate}kt, it takes {time}hrs to cover {distance}nm".format_map(journey) == (
    "At 6kt, it takes 5.2hrs to cover 31.2nm"
)


def solve_rate_time_distance_keywords(**keywords: float) -> RTDResult:
    """Validate a flexible keyword bag before delegating to the explicit API."""
    unexpected = keywords.keys() - {"distance", "rate", "time"}
    if unexpected:
        raise TypeError(f"Invalid keyword parameter: {', '.join(sorted(unexpected))}")
    return solve_rate_time_distance(
        distance=keywords.get("distance"),
        rate=keywords.get("rate"),
        time=keywords.get("time"),
    )


assert solve_rate_time_distance_keywords(distance=31.2, rate=6) == journey
try:
    solve_rate_time_distance_keywords(distnace=31.2, rate=6)
except TypeError as error:
    assert "distnace" in str(error)
else:  # pragma: no cover
    raise AssertionError("Unknown keywords must be rejected")


# 3.4 Forcing keyword-only arguments with the * separator
# --------------------------------------------------------
def wind_chill_temperature(temperature_c: float, wind_kph: float) -> float:
    """Compute apparent temperature using the metric wind-chill formula."""
    if wind_kph < 4.8 or temperature_c > 10:
        raise ValueError(
            "wind speed must be at least 4.8 kph and temperature at most 10C"
        )
    return (
        13.12
        + 0.6215 * temperature_c
        - 11.37 * wind_kph**0.16
        + 0.3965 * temperature_c * wind_kph**0.16
    )


def write_wind_chill_table(
    *,
    start_temperature: int,
    stop_temperature: int,
    temperature_step: int,
    start_wind: int,
    stop_wind: int,
    wind_step: int,
    target: TextIO,
) -> None:
    """Write a table; all seven arguments require descriptive keyword names."""
    temperatures = range(start_temperature, stop_temperature, temperature_step)
    writer = csv.writer(target, lineterminator="\n")
    writer.writerow([""] + [str(value) for value in temperatures])
    for wind in range(start_wind, stop_wind, wind_step):
        writer.writerow(
            [float(wind)]
            + [
                wind_chill_temperature(temperature, wind)
                for temperature in temperatures
            ]
        )


wind_table = StringIO()
write_wind_chill_table(
    start_temperature=0,
    stop_temperature=-11,
    temperature_step=-5,
    start_wind=5,
    stop_wind=11,
    wind_step=5,
    target=wind_table,
)
assert wind_table.getvalue().splitlines()[0] == ",0,-5,-10"


# 3.5 Defining position-only parameters with the / separator
# -----------------------------------------------------------
# Parameters before / cannot be supplied by name. TypeScript has no equivalent:
# parameter names never participate in JS call binding, so every call is positional.
def fahrenheit_from_celsius(celsius: float, /) -> float:
    return 32 + 9 * celsius / 5


def celsius_from_fahrenheit(
    fahrenheit: float,
    /,
    truncate: bool = False,
) -> float:
    celsius = 5 * (fahrenheit - 32) / 9
    return round(celsius, 0) if truncate else celsius


assert fahrenheit_from_celsius(100) == 212
assert celsius_from_fahrenheit(72) == 22.22222222222222
assert celsius_from_fahrenheit(72, truncate=True) == 22.0
assert celsius_from_fahrenheit(72, True) == 22.0


# 3.6 Picking an order for parameters based on partial functions
# ----------------------------------------------------------------
MILES_RADIUS = 3959.0
NAUTICAL_MILES_RADIUS = 3440.0
KILOMETERS_RADIUS = 6372.0


def haversine_distance(
    latitude_1: float,
    longitude_1: float,
    latitude_2: float,
    longitude_2: float,
    *,
    radius: float,
) -> float:
    """Return great-circle distance using the supplied sphere radius."""
    latitude_delta = radians(latitude_2 - latitude_1)
    longitude_delta = radians(longitude_2 - longitude_1)
    latitude_1_radians = radians(latitude_1)
    latitude_2_radians = radians(latitude_2)
    chord = sqrt(
        sin(latitude_delta / 2) ** 2
        + cos(latitude_1_radians)
        * cos(latitude_2_radians)
        * sin(longitude_delta / 2) ** 2
    )
    return radius * 2 * asin(chord)


def nautical_haversine_wrapper(*coordinates: float) -> float:
    """A wrapper is the explicit-function form of partial application."""
    if len(coordinates) != 4:
        raise TypeError("Four coordinates are required")
    return haversine_distance(*coordinates, radius=NAUTICAL_MILES_RADIUS)


nautical_haversine = partial(haversine_distance, radius=NAUTICAL_MILES_RADIUS)
kilometer_haversine = partial(haversine_distance, radius=KILOMETERS_RADIUS)
coordinates = (36.12, -86.67, 33.94, -118.40)
assert round(kilometer_haversine(*coordinates), 2) == 2886.90
assert round(nautical_haversine(*coordinates), 2) == 1558.53
assert nautical_haversine_wrapper(*coordinates) == nautical_haversine(*coordinates)


def radius_first_haversine(
    radius: float,
    latitude_1: float,
    longitude_1: float,
    latitude_2: float,
    longitude_2: float,
) -> float:
    """Put stable context first so positional partial() can bind it."""
    return haversine_distance(
        latitude_1,
        longitude_1,
        latitude_2,
        longitude_2,
        radius=radius,
    )


nautical_haversine_positional = partial(radius_first_haversine, NAUTICAL_MILES_RADIUS)
assert nautical_haversine_positional(*coordinates) == nautical_haversine(*coordinates)


# 3.7 Writing clear documentation strings with RST markup
# --------------------------------------------------------
# RST roles let Sphinx structure parameters, results, errors, math, links, and
# doctests. JSDoc is the TS documentation analogue, but it uses different tags.
def documented_wind_chill(temperature_c: float, wind_kph: float) -> float:
    """Compute the wind-chill temperature.

    The wind chill, :math:`T_{wc}`, is based on air temperature and wind speed.

    :param temperature_c: Air temperature in degrees Celsius.
    :param wind_kph: Wind speed in kilometers per hour.
    :returns: Wind-chill temperature in degrees Celsius.
    :raises ValueError: If wind is under 4.8 kph or temperature is above 10 C.

    >>> round(documented_wind_chill(-10, 25), 1)
    -18.8

    See https://en.wikipedia.org/wiki/Wind_chill.
    """
    return wind_chill_temperature(temperature_c, wind_kph)


assert round(documented_wind_chill(-10, 25), 1) == -18.8
assert ":raises ValueError:" in (documented_wind_chill.__doc__ or "")


# 3.8 Designing recursive functions around Python's stack limits
# ----------------------------------------------------------------
def recursive_factorial(number: int) -> int:
    if number < 0:
        raise ValueError("factorial requires a non-negative integer")
    if number == 0:
        return 1
    return number * recursive_factorial(number - 1)


def product_of_integers(values: Iterable[int]) -> int:
    result = 1
    for value in values:
        result *= value
    return result


def iterative_factorial(number: int) -> int:
    if number < 0:
        raise ValueError("factorial requires a non-negative integer")
    return prod(range(1, number + 1))


assert recursive_factorial(5) == product_of_integers(range(1, 6)) == 120
assert iterative_factorial(1000) == prod(range(1, 1001))


@cache
def cached_fibonacci(number: int) -> int:
    """Memoize overlapping recursive calls; stack depth still remains finite."""
    if number < 2:
        return 1
    return cached_fibonacci(number - 1) + cached_fibonacci(number - 2)


def fibonacci_numbers() -> Iterator[int]:
    """Yield the book's 1, 1, 2, 3 sequence lazily and without recursion."""
    previous, current = 1, 1
    yield previous
    while True:
        yield current
        previous, current = current, previous + current


def iterative_fibonacci(number: int) -> int:
    for index, value in enumerate(fibonacci_numbers()):
        if index == number:
            return value
    raise AssertionError("The infinite iterator cannot be exhausted")


assert cached_fibonacci(10) == iterative_fibonacci(10) == 89


# 3.9 Writing testable scripts with the script-library switch
# ------------------------------------------------------------
# Import executes a Python module from top to bottom. __name__ is "__main__"
# only for direct execution, so this guard keeps actions out of imports. ES
# modules use import.meta.main in modern Node for the corresponding distinction.
def waypoint_distances(source: TextIO) -> list[float]:
    reader = csv.DictReader(source)
    start = next(reader, None)
    if start is None:
        return []
    distances: list[float] = []
    for point in reader:
        distances.append(
            nautical_haversine(
                float(start["lat"]),
                float(start["lon"]),
                float(point["lat"]),
                float(point["lon"]),
            )
        )
        start = point
    return distances


def distances_from_path(
    source_path: Path = Path("data/waypoints.csv"),
) -> list[float]:
    """Keep the path configurable so callers and tests control external I/O."""
    with source_path.open(encoding="utf-8", newline="") as source:
        return waypoint_distances(source)


def main() -> None:
    sample = StringIO("lat,lon\n36.12,-86.67\n33.94,-118.40\n")
    assert [round(distance, 2) for distance in waypoint_distances(sample)] == [1558.53]


if __name__ == "__main__":
    main()
