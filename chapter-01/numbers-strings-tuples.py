from __future__ import annotations

import cmath
import decimal
import math
import re
import string
from decimal import Decimal
from fractions import Fraction
from typing import NamedTuple

# 1.1 Choosing between float, Decimal, and Fraction
# -------------------------------------------------
# Decimal: currency/fixed places. Fraction: exact ratios. float: fast
# approximations for measurements, roots, logarithms, pi, and similar work.
# Avoid float for money and exact rational calculations.
#
# JS/TS lens: JavaScript's `number` is the same general IEEE-754 binary64 idea
# as Python `float`. Python additionally ships exact `Decimal` and `Fraction`
# classes; TypeScript types do not change JavaScript's runtime number model.
# The sibling TS file supplies `FixedDecimal` and `Rational` equivalents.

tax_rate = Decimal("7.25") / Decimal(100)
purchase_amount = Decimal("2.95")
unrounded_total = purchase_amount + tax_rate * purchase_amount
penny = Decimal("0.01")
assert unrounded_total.quantize(penny) == Decimal("3.16")  # ROUND_HALF_EVEN
assert unrounded_total.quantize(penny, decimal.ROUND_UP) == Decimal("3.17")

# Construct Decimal from str or int, not from an approximate float.
assert Decimal("0.1") == Decimal(1) / Decimal(10)
binary_tenth = 0.1
assert Decimal(binary_tenth) != Decimal("0.1")

sugar_cups = Fraction("2.5")
scale_factor = Fraction(5, 8)  # Exact numerator/denominator intent.
assert sugar_cups * scale_factor == Fraction(25, 16)

# Binary floating point is approximate in Python and JavaScript alike.
float_answer = (19 / 155) * (155 / 19)
assert float_answer != 1.0
assert math.isclose(float_answer, 1.0)
assert round(float_answer, 3) == 1.0  # For display, not proof of equality.

# fsum() is designed for an accurate floating-point sum. (Recent Python
# versions also improved built-in sum(), so don't rely on it being inaccurate
# for a particular input.) A float is a binary significand plus an exponent;
# frexp() exposes these components and ldexp() recombines them. The TS file uses
# the descriptive helpers `sumWithFloatingPointCompensation()`,
# `decomposeBinaryFloat()`, and `composeBinaryFloat()`.
cancellation_values = [1e16, 1.0, -1e16]
assert math.fsum(cancellation_values) == 1.0
mantissa, exponent = math.frexp(8.066e67)
assert math.ldexp(mantissa, exponent) == 8.066e67

# math handles real-valued operations; cmath handles complex-valued ones.
# JavaScript has no built-in complex-number primitive or standard-library peer;
# the TS equivalent is `sqrtComplex()`.
assert cmath.sqrt(-2) == complex(0, math.sqrt(2))


# 1.2 Choosing between true division and floor division
# -----------------------------------------------------
# Use div-mod to split units or convert bases, `/` for an approximate quotient,
# and Fraction for an exact rational quotient. TypeScript uses
# `floorDivisionWithRemainder()`, `floorDivision()`, and `Rational` because
# JavaScript has no direct equivalents.


def split_seconds(total_seconds: int) -> tuple[int, int, int]:
    """Split a duration using quotient/remainder pairs."""
    hours, remaining_seconds = divmod(total_seconds, 60 * 60)
    minutes, seconds = divmod(remaining_seconds, 60)
    return hours, minutes, seconds


total_seconds = 7_385
assert split_seconds(total_seconds) == (2, 3, 5)
hours, remainder = divmod(total_seconds, 3_600)
assert total_seconds == 3_600 * hours + remainder  # Division invariant.

approximate_hours = total_seconds / 3_600
exact_hours = Fraction(total_seconds) / 3_600
assert round(approximate_hours, 4) == 2.0514
assert exact_hours == Fraction(1_477, 720)

# `/` returns float for ints. `//` floors rather than truncating toward zero.
# JavaScript's rough analogues are `/` and Math.floor(a / b).
# JS `BigInt` division instead truncates toward zero, so `-5n / 2n === -2n`.
assert isinstance(5 / 2, float)
assert 5 // 2 == 2
assert -5 // 2 == -3
assert int(-5 / 2) == -2  # int(float) truncates, so it differs here.
assert 7_358.0 // 3_600.0 == 2.0  # A float operand gives a float result.


# 1.3 Parsing strings with regular expressions
# ------------------------------------------------
# Generalize first: (ingredient words): (amount digits) (unit word). Raw
# strings keep Python from interpreting regex backslashes before re sees them.
# JS/TS lens: a regex literal like `/\d+/` avoids string escaping in another
# way. Python `fullmatch()` has no direct JS method; the TS file implements
# `fullMatch()` by anchoring the pattern.
ingredient_text = "Kumquat: 2 cups"
basic_pattern = re.compile(r"([\w\s]+):\s+(\d+)\s+(\w+)")
basic_match = basic_pattern.fullmatch(ingredient_text)
assert basic_match is not None
assert basic_match.groups() == ("Kumquat", "2", "cups")
assert basic_match.group(1) == "Kumquat"

# \w/\d/\s mean word/digit/whitespace; uppercase versions mean "not." The
# quantifiers +, *, ? mean one-or-more, zero-or-more, zero-or-one. Dot matches
# any character. Escape metacharacters (for example, \+ or \.) to match them.
key_value_pattern = re.compile(r"(?P<name>\w+)\s*[=:]\s*(?P<value>.*)")
size_match = key_value_pattern.fullmatch("size = 12")
assert size_match is not None
assert size_match.groupdict() == {
    "name": "size",
    "value": "12",
}
weight_match = key_value_pattern.fullmatch("weight: 14")
assert weight_match is not None
assert weight_match.groups() == ("weight", "14")

# Named groups avoid fragile numeric positions. Adjacent literals concatenate,
# allowing comments beside clauses. re.VERBOSE allows comments within a regex.
# Python spells a named group `(?P<name>...)`; JavaScript uses `(?<name>...)`.
# JavaScript also lacks `re.VERBOSE`; the paired example uses `compileVerbose()`.
ingredient_pattern = re.compile(
    r"(?P<ingredient>[\w\s]+):\s+"  # name before colon
    r"(?P<amount>\d+)\s+"  # amount
    r"(?P<unit>\w+)"  # unit
)
ingredient_match = ingredient_pattern.fullmatch(ingredient_text)
assert ingredient_match is not None
assert ingredient_match.groupdict() == {
    "ingredient": "Kumquat",
    "amount": "2",
    "unit": "cups",
}

verbose_ingredient_pattern = re.compile(
    r"""
    (?P<ingredient>[\w\s]+):\s+  # name before colon
    (?P<amount>\d+)\s+            # amount
    (?P<unit>\w+)                 # unit
    """,
    re.VERBOSE,
)
verbose_ingredient_match = verbose_ingredient_pattern.fullmatch(ingredient_text)
assert verbose_ingredient_match is not None
assert verbose_ingredient_match.groupdict() == ingredient_match.groupdict()
# Regex is not a general parser for nested HTML, XML, or JSON; use a parser.


# 1.4 Building complicated strings with f-strings
# ------------------------------------------------
# JS/TS lens: f-strings interpolate like template literals (`${value}`), but
# Python's format mini-language also handles width, alignment, bases, signs,
# precision, and debug output without calling separate formatting methods. The
# TS file makes these operations explicit with `formatInteger()`,
# `formatFloat()`, `formatPercent()`, `center()`, and `debugExpressions()`.
airport_id = "IAD"
location = "Dulles Intl Airport"
max_temp = 32
min_temp = 13
precipitation = 0.4
weather = (
    f"{airport_id:3s} : {location:19s} : "
    f"{max_temp:3d} / {min_temp:3d} / {precipitation:5.2f}"
)
assert weather == "IAD : Dulles Intl Airport :  32 /  13 /  0.40"

# Types: b/o/x/X binary/octal/hex, d integer, c character, e/E scientific,
# f/F fixed point, g/G general, n locale-aware, s string, and % percentage.
assert f"{13:b} {13:#o} {13:#06x}" == "1101 0o15 0x000d"
assert f"{0.125:.1%}" == "12.5%"
assert f"{0x2665:c}" == "♥"

# Width/fill/alignment use <, >, ^. Numeric signs use +, -, or space.
assert f"{'Python':*^10s}" == "**Python**"
assert f"{12:+4d}" == " +12"

# !r/!s/!a apply repr()/str()/ascii(). A trailing = is useful for debugging.
value = 2**12 - 1
assert f"{value=} {2**7+1=}" == "value=4095 2**7+1=129"

# format_map() applies a reusable, non-f-string template to a mapping.
weather_data = dict(
    id=airport_id,
    location=location,
    max_temp=max_temp,
    min_temp=min_temp,
    precipitation=precipitation,
)
weather_template = (
    "{id:3s} : {location:19s} : {max_temp:3d} / {min_temp:3d} / {precipitation:5.2f}"
)
assert weather_template.format_map(weather_data) == weather


# 1.5 Building complicated strings from lists of strings
# -------------------------------------------------------
# Strings are immutable. A list is a mutable intermediate representation when
# a transformation is easiest as a series of character changes.
# JS strings are immutable too; Python `list[str]` plays the mutable role that
# a JavaScript character array plus `join("")` would play. The book's ASCII
# constants are reproduced as `asciiWhitespace` and `asciiPunctuation` in TS.
title = "Recipe 5: Rewriting an Immutable String"
title_list = list(title)
colon_position = title_list.index(":")
del title_list[: colon_position + 1]
for position in range(len(title_list)):
    if title_list[position] in string.whitespace + string.punctuation:
        title_list[position] = "_"
rewritten_title = "".join(title_list)
assert rewritten_title == "_Rewriting_an_Immutable_String"

# Strings and lists both support indexing, slicing, and negative indexes.
# Strings are hashable dict keys/set items; mutable lists are not hashable.
# JS arrays can be Map keys by identity; Python dict keys require a stable hash.
assert rewritten_title[-1] == title_list[-1] == "g"


# 1.6 Using Unicode characters that are not on the keyboard
# ----------------------------------------------------------
# Python str is Unicode. Use 4-digit \u, 8-digit \U, or a Unicode name.
# JS/TS lens: both languages expose Unicode text, but JavaScript strings are
# indexed as UTF-16 code units. Python indexes Unicode code points, so a
# non-BMP character such as this Mahjong tile has length 1 instead of JS's 2.
# JavaScript has no Unicode-name escape, so TS uses `unicodeByName()`.
die_face_one = "\u2680"
mahjong_tile = "\U0001f000"
named_red_dragon = "\N{MAHJONG TILE RED DRAGON}"
# U+1F000 is MAHJONG TILE EAST WIND; RED DRAGON is U+1F004. The chapter uses
# the two forms as separate escape examples, not as interchangeable values.
assert ord(mahjong_tile) == 0x1F000
assert ord(named_red_dragon) == 0x1F004
assert f"You rolled {die_face_one}" == "You rolled ⚀"

# Keyboard text is Unicode too: "H" is U+0048. Use \\ for a literal slash.
assert "HELLO" == "\u0048\u0045\u004c\u004c\u004f"
regex_source = r"\w+"
assert regex_source == "\\w+"

# A font must supply the glyph. Old Windows terminals may require code page
# 65001; current macOS/Linux terminals generally support Unicode directly.


# 1.7 Encoding strings: creating ASCII and UTF-8 bytes
# -----------------------------------------------------
# Text is Unicode; files and network transfers contain bytes. Prefer UTF-8
# unless a protocol specifies otherwise.
# JS/TS lens: Python `bytes` is closest to a read-only byte sequence; browser
# and Node APIs commonly use `Uint8Array`. `TextEncoder` performs UTF-8 encoding;
# the TS file adds `encodeAscii()` for Python's strict ASCII failure behavior.
unicode_text = f"You drew {mahjong_tile}"
utf8_bytes = unicode_text.encode("utf-8")
assert utf8_bytes == b"You drew \xf0\x9f\x80\x80"
assert len(mahjong_tile) == 1
assert len(mahjong_tile.encode("utf-8")) == 4

# ASCII covers U+0000..U+007F and cannot encode the Mahjong character.
try:
    unicode_text.encode("ascii")
except UnicodeEncodeError:
    pass
else:  # pragma: no cover
    raise AssertionError("ASCII unexpectedly encoded a non-ASCII character")

# Real files: open(path, "w", encoding="utf-8"). Binary mode ("wb") requires
# bytes. PYTHONIOENCODING controls standard streams. UTF-16/32 and legacy
# Latin-1, Mac Roman, and CP1252 exist; use them only when data requires them.


# 1.8 Decoding bytes: recovering proper characters
# -------------------------------------------------
# Decode is encode's inverse. Learn the charset from XML declarations, HTTP
# Content-Type, or HTML meta tags. Guessing UTF-8/Latin-1 is a last resort.
# JS/TS uses `new TextDecoder("utf-8").decode(bytes)` for the same boundary.
document_bytes = (
    b'<?xml version="1.0" encoding="UTF-8"?>\n' + "Forecast: café ⚀".encode()
)
document = document_bytes.decode("utf-8")
assert isinstance(document_bytes, bytes)
assert isinstance(document, str)
assert "Forecast: café ⚀" in document

# urllib response.read(), subprocess binary output, and binary files provide
# bytes. Decode before text work. Use an HTML/XML parser for nested documents.
# DOTALL lets . span lines; MULTILINE changes the behavior of ^ and $.
sample_page = "header\n// CONTENT STARTS\nNo warnings\n// CONTENT ENDS\nfooter"
content_pattern = re.compile(
    r"// CONTENT STARTS(.*?)// CONTENT ENDS",
    re.MULTILINE | re.DOTALL,
)
content_match = content_pattern.search(sample_page)
assert content_match is not None
assert content_match.group(1).strip() == "No warnings"


# 1.9 Using tuples of items
# -------------------------
# A tuple is an immutable fixed-size grouping: (x, y), (r, g, b), etc. The
# tuple cannot replace, add, or remove its references after construction. The
# comma creates it, which is why a singleton requires a trailing comma.
# JS has no tuple runtime primitive. A TypeScript tuple such as `[string,
# number]` describes a JavaScript array and is mutable unless declared readonly;
# `frozenTuple()` supplies the Python-like runtime immutability in the TS file.
ingredient_tuple = ("Rice", Fraction(1, 4), "cups")
singleton = ("item",)
assert len(singleton) == 1
assert tuple([355]) == (355,)

# Extract by zero-based index or, more readably, unpack with assignment.
assert ingredient_tuple[1] == Fraction(1, 4)
ingredient_name, ingredient_amount, ingredient_unit = ingredient_tuple
assert (ingredient_name, ingredient_unit) == ("Rice", "cups")

# Tuples support len(), count(), index(), membership, indexing, and slicing.
# index() raises ValueError when the item is absent.
t = ("Kumquat", "2", "cups")
assert len(t) == 3
assert t.count("2") == 1
assert t.index("cups") == 2
assert "Rice" not in t

# Tuple immutability is shallow: a tuple may refer to a mutable object. The
# tuple still points to the same list when that list changes. Assignment binds
# names to objects; it does not recursively copy the object graph.
mutable_ingredients = ["Rice"]
menu = ("Dinner", mutable_ingredients)
assert mutable_ingredients.append("Beans") is None
assert menu == ("Dinner", ["Rice", "Beans"])


# 1.10 Using NamedTuple to simplify item access
# ----------------------------------------------
# JS/TS lens: `NamedTuple` resembles a small `readonly` interface/object in
# readability, but at runtime it is still an immutable tuple with numeric
# positions as well as named attributes. Python type hints, like TS types, do
# not automatically convert input values or enforce them at runtime. The TS
# implementation uses `makeNamedTuple()` to reproduce both access styles.
class Ingredient(NamedTuple):
    """A tuple whose positions also have meaningful attribute names."""

    ingredient: str
    amount: str
    unit: str


item = Ingredient("Kumquat", "2", "cups")
assert item.ingredient == item[0]
assert Fraction(item.amount) == Fraction(2, 1)
assert f"Use {item.amount} {item.unit} fresh {item.ingredient}" == (
    "Use 2 cups fresh Kumquat"
)


class IngredientF(NamedTuple):
    """A named tuple with an exact, arithmetic-ready amount."""

    ingredient: str
    amount: Fraction
    unit: str


# Convert strings before construction; type hints are not runtime casts.
# Static tools such as mypy can check these annotations.
exact_item = IngredientF("Kumquat", Fraction("2"), "cups")
assert f"{exact_item.ingredient} doubled: {exact_item.amount * 2}" == (
    "Kumquat doubled: 4"
)
# NamedTuple stays immutable and suits tiny, fixed groups of related data.


def main() -> None:
    """Print a small tour; the assertions above are executable examples."""
    print(f"Currency total: {unrounded_total.quantize(penny)}")
    print(f"Recipe amount: {sugar_cups * scale_factor} cups")
    print(f"{total_seconds:,} seconds: {split_seconds(total_seconds)}")
    print(weather)
    print(rewritten_title)
    print(unicode_text, utf8_bytes)
    print(f"Named ingredient: {exact_item}")


if __name__ == "__main__":
    main()
