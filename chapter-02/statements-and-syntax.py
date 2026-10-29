from __future__ import annotations

import csv
import math
from collections.abc import Callable
from io import StringIO
from typing import Literal

# 2.1 Writing Python script and module files - syntax basics
# ----------------------------------------------------------
# Python source is normally UTF-8 and uses four-space indentation. A shebang
# matters only for direct POSIX execution; uv-run commands are cross-platform.
# Unlike JS/TS package metadata, Python needs no module declaration boilerplate.
script_template = '''#!/usr/bin/env python3
"""Calculate an approximation of pi."""

π = 355 / 113
print(π)
'''
compile(script_template, "example.py", "exec")
assert script_template.encode().decode() == script_template
assert "π" in script_template


# 2.2 Writing long lines of code
# -------------------------------
# A logical Python line may span physical lines inside (), [], or {}. Prefer
# this implicit joining to a fragile trailing backslash. JS/TS also allows line
# breaks in grouped expressions, but does not join adjacent string literals.
example_value_one_line = (63 / 25) * (17 + 15 * math.sqrt(5)) / (7 + 15 * math.sqrt(5))
example_value_grouped = (63 / 25) * ((17 + 15 * math.sqrt(5)) / (7 + 15 * math.sqrt(5)))
common_term = 15 * math.sqrt(5)
scale = 63 / 25
numerator = 17 + common_term
denominator = 7 + common_term
example_value_named = scale * numerator / denominator

mantissa_fraction, exponent = math.frexp(example_value_one_line)
mantissa_whole = int(mantissa_fraction * 2**53)
message_text = (
    f"the internal representation is {mantissa_whole:d}/2**53*2**{exponent:d}"
)
assert example_value_grouped == example_value_one_line
assert example_value_named == example_value_one_line
assert message_text == ("the internal representation is 7074237752514592/2**53*2**2")


# 2.3 Including descriptions and documentation
# ----------------------------------------------
# A script docstring tells an operator what it does and how to run it; a library
# docstring tells a programmer what it exposes. Python preserves docstrings at
# runtime in __doc__; ordinary JS comments disappear and JSDoc serves editors.
script_documentation = """
Download and decode the current marine warning.

SYNOPSIS
========
Run the warning downloader.

DESCRIPTION
===========
Fetch and decode the latest warning.

FILES
=====
Writes warning.html.

EXAMPLES
========
Run the module from the project root.
"""
library_documentation = """
Provide parsing helpers for marine warnings.

DESCRIPTION
===========
Parse downloaded warning text.

MODULE CONTENTS
===============
parse_warning(text) returns structured warning data.

EXAMPLES
========
Call parse_warning() with decoded text.
"""
assert all(
    heading in script_documentation
    for heading in ("SYNOPSIS", "DESCRIPTION", "FILES", "EXAMPLES")
)
assert all(
    heading in library_documentation
    for heading in ("DESCRIPTION", "MODULE CONTENTS", "EXAMPLES")
)


# 2.4 Writing better docstrings with RST markup
# ----------------------------------------------
# RST derives heading levels from consistent underlines. Blank lines separate
# paragraphs, :: starts literal blocks, and .. name:: starts directives.
# TypeScript has no runtime documentation string; JSDoc is its closest analogue.
code_ticks = chr(96) * 2
rst_documentation = f"""
Marine Warning Parser
=====================

Parse a warning document into structured fields.

Usage
-----

Call the parser with decoded text::

    warning = parse_warning(document)

.. important::
   Decode bytes before parsing.

Use *UTF-8* text, keep **validation** enabled, and pass {code_ticks}str{code_ticks}.
"""
assert "Marine Warning Parser\n=====================" in rst_documentation
assert "::\n\n    warning" in rst_documentation
assert ".. important::" in rst_documentation
assert "*UTF-8*" in rst_documentation
assert "**validation**" in rst_documentation
assert f"{code_ticks}str{code_ticks}" in rst_documentation


# 2.5 Designing complex if...elif chains
# -----------------------------------------
# Enumerate the complete input universe and make impossible remainders fail
# loudly. This Else-Raise pattern resembles an exhaustive TypeScript switch.
CrapsOutcome = Literal["craps", "winner", "point"]


def classify_come_out_roll(total: int) -> tuple[CrapsOutcome, int | None]:
    """Classify every possible total from rolling two six-sided dice."""
    if total in (2, 3, 12):
        return "craps", None
    if total in (7, 11):
        return "winner", None
    if total in (4, 5, 6, 8, 9, 10):
        return "point", total
    raise ValueError(f"Design problem: impossible dice total {total}")


# range(start, stop) is a lazy integer sequence whose stop is excluded. It does
# not allocate a list. JS/TS has no built-in range object; the sibling uses
# ordinary for loops, which preserve the same lazy iteration behavior. Use
# Array.from() in TypeScript only when an actual array of values is required.
all_dice_totals = {left + right for left in range(1, 7) for right in range(1, 7)}
assert all_dice_totals == set(range(2, 13))
assert classify_come_out_roll(2) == ("craps", None)
assert classify_come_out_roll(7) == ("winner", None)
assert classify_come_out_roll(8) == ("point", 8)
try:
    classify_come_out_roll(13)
except ValueError as error:
    assert "impossible dice total" in str(error)
else:  # pragma: no cover
    raise AssertionError("An impossible total must fail")


# 2.6 Saving intermediate results with the := “walrus” operator
# --------------------------------------------------------------
# := assigns and yields a value inside an expression. JavaScript's ordinary =
# assignment is already an expression; Python keeps = statements distinct.
threshold = 0.000_000_001
series_total = 0.0
term = 0.0
for n in range(20_000):
    if (term := (1 / (2 * n + 1)) ** 2) >= threshold:
        series_total += term
    else:
        break
assert n == 15_811
assert term < threshold

data = [11, 13, 17, 19, 23, 29]
running_total = 0
running_sums = [(running_total := running_total + value) for value in data]
assert running_total == 112
assert running_sums == [11, 24, 41, 60, 83, 112]


# 2.7 Avoiding a potential problem with break statements
# -------------------------------------------------------
# break creates two postconditions: a match was found, or input was exhausted.
# Initialize state and handle both. Python for...else runs else only without a
# break; JS/TS has no direct loop-else syntax.
def split_property(text: str) -> tuple[str | None, str | None]:
    """Split at the first ':' or '=' while preserving no-value edge cases."""
    separator_position: int | None = None
    for position, character in enumerate(text):
        if character in "=:":
            separator_position = position
            break
    if separator_position is None:
        return (text, None) if text else (None, None)
    return text[:separator_position], text[separator_position + 1 :]


assert split_property("some_name = the_value") == ("some_name ", " the_value")
assert split_property("name_only") == ("name_only", None)
assert split_property("") == (None, None)
assert split_property("name:value=rest") == ("name", "value=rest")


# 2.8 Leveraging exception matching rules
# ----------------------------------------
# Python checks except clauses in order and matches subclasses. Put a specific
# recoverable exception before broader classes. JS/TS instead uses ordered
# instanceof checks inside its single catch block.
def copy_with_missing_parent_recovery(
    copy_operation: Callable[[], str],
    create_parent: Callable[[], None],
) -> str:
    """Retry once after a missing-parent failure."""
    try:
        return copy_operation()
    except FileNotFoundError:
        create_parent()
        return copy_operation()
    except OSError as error:
        return f"copy error: {error}"


parent_exists = False


def simulated_copy() -> str:
    if not parent_exists:
        raise FileNotFoundError("missing target directory")
    return "copied"


def create_simulated_parent() -> None:
    # Assignment normally makes a name local to a Python function. The global
    # declaration redirects this assignment to the module-level binding.
    # TypeScript uses lexical scope: a closure assigns directly to an outer let.
    global parent_exists
    parent_exists = True


assert (
    copy_with_missing_parent_recovery(simulated_copy, create_simulated_parent)
    == "copied"
)
assert parent_exists


# 2.9 Avoiding a potential problem with an except: clause
# -------------------------------------------------------
# A bare except catches BaseException, including KeyboardInterrupt, SystemExit,
# and GeneratorExit. Catch Exception only where recovery is meaningful. A JS
# catch receives any value, so TypeScript narrows unknown and rethrows others.
assert issubclass(ValueError, Exception)
assert not issubclass(KeyboardInterrupt, Exception)
assert not issubclass(SystemExit, Exception)


def recover_application_error(operation: Callable[[], str]) -> str:
    try:
        return operation()
    except Exception as error:
        return f"recovered: {error}"


def raise_value_error() -> str:
    raise ValueError("bad")


assert recover_application_error(raise_value_error) == "recovered: bad"


# 2.10 Concealing an exception root cause
# ----------------------------------------
# raise NewError from None hides irrelevant context from display while retaining
# it internally. Preserve useful causes with raise NewError from error.
# JavaScript Error has an optional cause; omitting it conceals the cause.
class MyAppError(Exception):
    """A stable application-facing error."""


def translate_attribute_error() -> None:
    try:
        raise AttributeError("'NoneType' object has no attribute 'some_method'")
    except AttributeError:
        raise MyAppError("Some Known Problem") from None


try:
    translate_attribute_error()
except MyAppError as error:
    assert error.__cause__ is None
    assert isinstance(error.__context__, AttributeError)
    assert error.__suppress_context__ is True
else:  # pragma: no cover
    raise AssertionError("The translated error must be raised")


# 2.11 Managing a context using the with statement
# -------------------------------------------------
# Context managers guarantee cleanup after normal or exceptional exit. Modern
# ECMAScript `using` calls Symbol.dispose at scope exit for the same guarantee.
target = StringIO()
written_csv = ""
try:
    with target as target_file:
        writer = csv.writer(target_file, lineterminator="\n")
        writer.writerow(["column", "data", "heading"])
        writer.writerows([[2, 3, 5], [7, 11, 13], [17, 19, 23]])
        written_csv = target_file.getvalue()
        raise RuntimeError("Testing")
except RuntimeError as error:
    assert str(error) == "Testing"

assert target.closed
assert written_csv == ("column,data,heading\n2,3,5\n7,11,13\n17,19,23\n")


print(f"Classified dice totals: {len(all_dice_totals)}")
print(f"Series stopped at n={n:,}")
print(f"Property split: {split_property('name:value')}")
print(f"Context resource closed: {target.closed}")
