from __future__ import annotations

import argparse
import cmd
import csv
import math
import statistics
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import date
from io import StringIO
from random import Random

# Executable notes adapted from the saved HTML for Modern Python Cookbook,
# Chapter 6, "User Inputs and Outputs." Interactive and OS-facing examples use
# injected functions, in-memory streams, explicit argv, and environment mappings.

CSV_TEXT = """\
date,engine on,fuel height on,engine off,fuel height off
10/25/13,08:24:00,29,13:15:00,27
10/26/13,09:12:00,27,18:25:00,22
10/28/13,13:21:00,22,06:25:00,14
"""


# 6.1 Using the features of print()
# ----------------------------------
fuel_use = list(csv.DictReader(StringIO(CSV_TEXT)))
output = StringIO()
for leg in fuel_use:
    change = float(leg["fuel height on"]) - float(leg["fuel height off"])
    print(
        leg["date"], leg["engine on"], leg["engine off"], change, sep=" | ", file=output
    )
assert output.getvalue().splitlines()[0] == "10/25/13 | 08:24:00 | 13:15:00 | 2.0"

# sep joins fields; end follows the final field. file redirects the text stream.
# JavaScript console.log() has no sep/end options; build a string with join() or
# template literals. Node's Console targets Writable streams, whose write() method
# provides exact newline control.
output = StringIO()
print("date", "10/25/13", sep="=", end=", ", file=output)
print("change", 2.0, sep="=", file=output)
assert output.getvalue() == "date=10/25/13, change=2.0\n"


# 6.2 Using input() and getpass() for user input
# ------------------------------------------------
type ReadText = Callable[[str], str]
type WriteText = Callable[[str], object]


def get_integer(prompt: str, read: ReadText = input, write: WriteText = print) -> int:
    """Prompt until text can be converted to an integer."""
    while True:
        try:
            return int(read(prompt))
        except ValueError as error:
            write(str(error))


def get_date(read: ReadText = input, write: WriteText = print) -> date:
    """Validate fields separately, then validate the composite date."""
    while True:
        year = get_integer("year: ", read, write)
        month = get_integer("month [1-12]: ", read, write)
        day = get_integer("day [1-31]: ", read, write)
        try:
            return date(year, month, day)
        except ValueError as error:
            write(f"invalid, {error}")


answers = iter(["oops", "2024", "2", "30", "2024", "2", "29"])
messages: list[str] = []
assert get_date(lambda _prompt: next(answers), messages.append) == date(2024, 2, 29)
assert len(messages) == 2
# getpass.getpass() has the same prompt/read role but disables terminal echo.
# Neither function makes a secret safe after reading; avoid logging/storing it.


# 6.3 Debugging with f"{value=}" strings
# ----------------------------------------
sizes = [2353, 2889, 2195, 3094, 725, 1099, 690, 1207, 926, 758, 615, 521, 1320]
mean_size = statistics.mean(sizes)
standard_deviation = statistics.stdev(sizes)
debug_line = f"{mean_size=:.2f}, {standard_deviation=:.2f}"
assert debug_line == "mean_size=1414.77, standard_deviation=901.10"
assert f"{mean_size + 2 * standard_deviation=:.2f}" == (
    "mean_size + 2 * standard_deviation=3216.97"
)
# JS/TS has no debug-expression f-string syntax; write the label explicitly.


# 6.4 Using argparse to get command-line input
# ----------------------------------------------
type Point = tuple[float, float]


def point_type(text: str) -> Point:
    try:
        latitude_text, longitude_text = text.split(",")
        return float(latitude_text), float(longitude_text)
    except ValueError as error:
        raise argparse.ArgumentTypeError(str(error)) from error


@dataclass(frozen=True)
class DistanceOptions:
    units: str
    point_1: Point
    point_2: Point


def get_options(argv: list[str]) -> DistanceOptions:
    parser = argparse.ArgumentParser(prog="distance")
    parser.add_argument("-u", "--units", choices=("NM", "MI", "KM"), default="NM")
    parser.add_argument("point_1", type=point_type)
    parser.add_argument("point_2", type=point_type)
    namespace = parser.parse_args(argv)
    return DistanceOptions(namespace.units, namespace.point_1, namespace.point_2)


options = get_options(["-u", "KM", "36.12,-86.67", "33.94,-118.40"])
assert options == DistanceOptions("KM", (36.12, -86.67), (33.94, -118.4))
# argparse supplies validation, choices, help, exit status, and conventional
# optional/positional syntax. Explicit argv makes parsing independently testable.
# Node's node:util.parseArgs covers CLI syntax but needs separate semantic checks.


# 6.5 Using Invoke to get command-line input
# --------------------------------------------
def haversine(point_1: Point, point_2: Point, radius: float) -> float:
    lat_1, lon_1, lat_2, lon_2 = map(math.radians, (*point_1, *point_2))
    delta_latitude = lat_2 - lat_1
    delta_longitude = lon_2 - lon_1
    a = (
        math.sin(delta_latitude / 2) ** 2
        + math.cos(lat_1) * math.cos(lat_2) * math.sin(delta_longitude / 2) ** 2
    )
    return radius * 2 * math.asin(math.sqrt(a))


RADII = {"KM": 6372.0, "MI": 3958.8, "NM": 3440.1}


def distance_task(point_1_text: str, point_2_text: str, units: str = "KM") -> float:
    """Validate task strings, then delegate to reusable domain logic."""
    if units not in RADII:
        raise ValueError(f"unknown units: {units}")
    return haversine(point_type(point_1_text), point_type(point_2_text), RADII[units])


assert round(distance_task("36.12,-86.67", "33.94,-118.40", "KM"), 2) == 2886.90
# The third-party Invoke package decorates an adapter like distance_task with
# @task, derives CLI flags from its signature, and provides Context.run() for
# subprocess wrappers. Node's child_process.spawn() provides the subprocess,
# stream, and environment portion. Separate domain logic remains reusable/testable.


# 6.6 Using cmd to create command-line applications
# --------------------------------------------------
class DiceCLI(cmd.Cmd):
    """A deterministic-testable example of cmd.Cmd's stateful REPL dispatch."""

    prompt = "] "
    intro = "A dice rolling tool. ? for help."

    def __init__(self, random: Random, stdout: StringIO) -> None:
        super().__init__(stdout=stdout)
        self.random = random
        self.number_of_dice = 6
        self.dice: list[int] | None = None

    def do_dice(self, argument: str) -> bool:
        """Set the number of dice to roll."""
        try:
            number_of_dice = int(argument)
            if number_of_dice < 1:
                raise ValueError("use a positive number")
        except ValueError as error:
            print(f"{argument!r} is invalid: {error}", file=self.stdout)
            return False
        self.number_of_dice = number_of_dice
        self.dice = None
        print(f"Rolling {number_of_dice} dice", file=self.stdout)
        return False

    def do_roll(self, _argument: str) -> bool:
        """Roll the configured dice."""
        self.dice = [self.random.randint(1, 6) for _ in range(self.number_of_dice)]
        print(self.dice, file=self.stdout)
        return False

    def do_quit(self, _argument: str) -> bool:
        """End the command loop."""
        return True


command_output = StringIO()
game = DiceCLI(Random(7), command_output)
assert game.onecmd("dice 3") is False
assert game.onecmd("roll") is False
assert game.dice == [3, 2, 4]
assert game.onecmd("quit") is True
# cmd.Cmd discovers do_* methods at runtime and uses their docstrings for help.
# Node's readline/promises supplies the loop but no reflection-driven dispatcher.


# 6.7 Using OS environment settings
# -----------------------------------
def get_environment_options(
    argv: list[str], environment: Mapping[str, str]
) -> DistanceOptions:
    parser = argparse.ArgumentParser(prog="distance")
    default_units = environment.get("UNITS", "KM")
    if default_units not in RADII:
        parser.error(f"invalid UNITS: {default_units!r}")
    parser.add_argument("-u", "--units", choices=tuple(RADII), default=default_units)
    parser.add_argument("point_1", type=point_type)
    parser.add_argument("point_2", nargs="?", type=point_type)
    namespace = parser.parse_args(argv)
    point_2 = namespace.point_2
    if point_2 is None:
        home_port = environment.get("HOME_PORT")
        if home_port is None:
            parser.error("neither HOME_PORT nor point_2 was provided")
        point_2 = point_type(home_port)
    return DistanceOptions(namespace.units, namespace.point_1, point_2)


environment_options = get_environment_options(
    ["36.12,-86.67"], {"UNITS": "NM", "HOME_PORT": "36.842952,-76.300171"}
)
assert environment_options.units == "NM"
assert environment_options.point_2 == (36.842952, -76.300171)
# Environment values are always strings. CLI values override these slowly
# changing defaults. Passing a mapping avoids mutating or depending on os.environ.
