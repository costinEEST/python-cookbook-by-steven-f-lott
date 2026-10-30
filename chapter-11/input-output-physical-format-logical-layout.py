from __future__ import annotations

import csv
import datetime as dt
import json
import re
import tempfile
import xml.etree.ElementTree as ET
from collections.abc import Iterable, Iterator
from dataclasses import asdict, dataclass, field, fields
from io import StringIO
from pathlib import Path
from typing import Any, NamedTuple

from bs4 import BeautifulSoup

# Executable notes adapted from the user-saved HTML for Modern Python Cookbook,
# Chapter 11, "Input/Output, Physical Format, and Logical Layout." The saved
# chapter contains recipes 11.1-11.8. Temporary directories keep filesystem
# examples real, deterministic, and isolated.


# 11.1 Using pathlib to work with filenames
# --------------------------------------------
input_path = Path("/path/to/some/file.csv")
assert input_path.with_suffix(".out") == Path("/path/to/some/file.out")
output_path = (input_path.parent / f"{input_path.stem}_pass").with_suffix(".csv")
assert output_path == Path("/path/to/some/file_pass.csv")
assert input_path.name == "file.csv"
assert input_path.suffix == ".csv"

with tempfile.TemporaryDirectory() as directory_name:
    directory = Path(directory_name)
    older = directory / "older.csv"
    newer = directory / "newer.csv"
    older.write_text("old", encoding="utf-8")
    newer.write_text("new", encoding="utf-8")
    older.touch()
    newer.touch()
    assert sorted(directory.glob("*.csv")) == [newer, older]
    assert newer.stat().st_mtime >= older.stat().st_mtime

# Path is an object model for paths, unlike string concatenation or Node's
# node:path functions. `/` creates a new Path; it does not touch the filesystem.
# Concrete operations such as stat(), glob(), read_text(), and write_text() do.


# 11.2 Replacing a file while preserving the previous version
# --------------------------------------------------------------
@dataclass(frozen=True)
class Quotient:
    numerator: int
    denominator: int


def save_data(output_path: Path, data: Iterable[Quotient]) -> None:
    """Write quotient rows using the dataclass fields as the CSV schema."""
    with output_path.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, [item.name for item in fields(Quotient)])
        writer.writeheader()
        writer.writerows(asdict(item) for item in data)


def safe_save(output_path: Path, data: Iterable[Quotient]) -> None:
    """Write `.new`, retain one `.old`, and install the completed file."""
    suffix = output_path.suffix
    new_path = output_path.with_suffix(f"{suffix}.new")
    old_path = output_path.with_suffix(f"{suffix}.old")
    save_data(new_path, data)
    old_path.unlink(missing_ok=True)
    if output_path.exists():
        output_path.rename(old_path)
    try:
        new_path.rename(output_path)
    except OSError:
        if old_path.exists():
            old_path.rename(output_path)
        raise


with tempfile.TemporaryDirectory() as directory_name:
    target = Path(directory_name) / "quotients.csv"
    save_data(target, [Quotient(1, 2)])
    safe_save(target, [Quotient(2, 3)])
    assert "2,3" in target.read_text(encoding="utf-8")
    assert "1,2" in target.with_suffix(".csv.old").read_text(encoding="utf-8")

# The rename is atomic only when the source and target are on the same filesystem.
# Like fs.rename() in Node, a sequence of renames is not a transaction: the `.old`
# file is the recovery point if the process stops between operations.


# 11.3 Reading delimited files with the CSV module
# -------------------------------------------------
WAYPOINT_CSV = '''lat,lon,date,time,notes
32.832,-79.934,2012-11-27,09:15:00,"breezy, rainy"
31.671,-80.933,2012-11-28,00:00:00,"blowing ""like stink"""
'''

raw_rows = list(csv.DictReader(StringIO(WAYPOINT_CSV)))
assert raw_rows[0]["notes"] == "breezy, rainy"
assert raw_rows[1]["notes"] == 'blowing "like stink"'
assert isinstance(raw_rows[0]["lat"], str)


def clean_row(source: dict[str, str]) -> dict[str, object]:
    date = dt.date.fromisoformat(source["date"])
    time = dt.time.fromisoformat(source["time"])
    return {
        **source,
        "lat_lon": (float(source["lat"]), float(source["lon"])),
        "timestamp": dt.datetime.combine(date, time),
    }


cleaned = clean_row(raw_rows[0])
assert cleaned["lat_lon"] == (32.832, -79.934)
# csv.DictReader handles dialect, delimiters, quoting, and doubled quotes, but all
# fields remain strings. JavaScript has no CSV parser in the standard runtime;
# the TypeScript sibling implements this chapter's deliberately small dialect.


# 11.4 Using dataclasses to simplify working with CSV files
# ----------------------------------------------------------
@dataclass(frozen=True)
class RawRow:
    lat: str
    lon: str
    date: str
    time: str
    notes: str


@dataclass
class Waypoint:
    raw: RawRow
    lat_lon: tuple[float, float] = field(init=False)
    timestamp: dt.datetime = field(init=False)

    def __post_init__(self) -> None:
        self.lat_lon = (float(self.raw.lat), float(self.raw.lon))
        self.timestamp = dt.datetime.combine(
            dt.date.fromisoformat(self.raw.date), dt.time.fromisoformat(self.raw.time)
        )


def waypoint_iter(rows: Iterable[dict[str, str]]) -> Iterator[Waypoint]:
    for row in rows:
        yield Waypoint(RawRow(**row))


waypoints = list(waypoint_iter(raw_rows))
assert waypoints[0].timestamp == dt.datetime(2012, 11, 27, 9, 15)
# RawRow mirrors the external schema; Waypoint owns application-ready values.
# Python dataclasses generate runtime constructors. A TS interface is erased, so
# its sibling uses an explicit conversion function and validates at the boundary.


# 11.5 Reading complex formats using regular expressions
# --------------------------------------------------------
LOG_PATTERN = re.compile(
    r"\[(?P<date>.*?)]\s+(?P<level>\w+)\s+in\s+"
    r"(?P<module>\S+?):\s+(?P<message>.+)"
)


class LogLine(NamedTuple):
    date: str
    level: str
    module: str
    message: str


def log_parser(source_line: str) -> LogLine:
    match = LOG_PATTERN.fullmatch(source_line.strip())
    if match is None:
        raise ValueError(f"unexpected input: {source_line!r}")
    return LogLine(**match.groupdict())


log_line = log_parser("[2016-05-08 11:08:18,651] INFO in ch11: Sample Message One")
assert log_line.level == "INFO" and log_line.module == "ch11"
try:
    log_parser("not a log line")
except ValueError:
    pass
else:
    raise AssertionError("invalid log input must fail")
# Named groups become groupdict() keys. JavaScript named captures live under
# match.groups and remain optional to the type checker, so TS must guard them.


# 11.6 Reading JSON and YAML documents
# -------------------------------------
RACE_JSON = """{
  "legs": ["ALICANTE - CAPE TOWN", "AUCKLAND - ITAJA\\u00cd"],
  "teams": [{"name": "Team SCA", "position": [3, null]}]
}"""
race_document = json.loads(RACE_JSON)
assert race_document["legs"][1] == "AUCKLAND - ITAJAÍ"
assert race_document["teams"][0]["position"] == [3, None]


def json_default(value: object) -> object:
    if isinstance(value, dt.datetime):
        return {"$date$": value.isoformat()}
    raise TypeError(f"cannot serialize {type(value).__name__}")


def json_object_hook(value: dict[str, Any]) -> object:
    if set(value) == {"$date$"}:
        return dt.datetime.fromisoformat(value["$date$"])
    return value


date_document = {"date": dt.datetime(2014, 6, 7, 8, 9, 10)}
encoded = json.dumps(date_document, default=json_default)
assert json.loads(encoded, object_hook=json_object_hook) == date_document
# JSON maps directly to JS values; Python maps null to None. JSON is valid YAML,
# but YAML has a larger syntax and needs a third-party parser such as PyYAML.
# Tagged date objects are an application convention, not part of either format.


# 11.7 Reading XML documents
# ---------------------------
RACE_XML = """<?xml version="1.0"?>
<results>
  <teams><team><name>Team SCA</name><position><leg n="1">3</leg></position></team></teams>
  <legs><leg n="1">ALICANTE - CAPE TOWN</leg></legs>
</results>"""
xml_document = ET.fromstring(RACE_XML)
leg = xml_document.find("legs/leg[@n='1']")
team_name = xml_document.find("teams/team/name")
position = xml_document.find("teams/team/position/leg[@n='1']")
assert leg is not None and leg.text == "ALICANTE - CAPE TOWN"
assert team_name is not None and team_name.text == "Team SCA"
assert position is not None and position.text == "3"
# XML is a tree with tag text, string-valued attributes, children, and tail text.
# Do not parse recursive markup with regex. ElementTree offers a useful XPath
# subset; Node has no built-in XML DOM, so the TS sibling uses a scoped example.


# 11.8 Reading HTML documents
# ----------------------------
RACE_HTML = """<!doctype html>
<table class="ranking-list">
  <thead><tr><th>Team</th><th data="ALICANTE - CAPE TOWN">LEG 1</th></tr></thead>
  <tbody><tr class="ranking-item"><td class="ranking-team">Team SCA</td>
    <td class="ranking-number">3</td></tr></tbody>
</table>"""


def race_extract(source: str) -> dict[str, object]:
    # Beautiful Soup provides the searchable tree and CSS selectors;
    # html.parser is the standard-library parsing backend selected explicitly.
    soup = BeautifulSoup(source, "html.parser")
    table = soup.find("table", class_="ranking-list")
    if table is None:
        raise ValueError("ranking table is missing")
    headings = table.select("thead th[data]")
    rows = table.select("tbody tr.ranking-item")
    teams: list[dict[str, object]] = []
    for row in rows:
        name_cell = row.select_one(".ranking-team")
        if name_cell is None:
            continue
        teams.append(
            {
                "name": name_cell.get_text(strip=True),
                "position": [
                    cell.get_text(strip=True) for cell in row.select(".ranking-number")
                ],
            }
        )
    return {
        "legs": [(tag.get_text(strip=True), tag.get("data")) for tag in headings],
        "teams": teams,
    }


html_document = race_extract(RACE_HTML)
assert html_document == {
    "legs": [("LEG 1", "ALICANTE - CAPE TOWN")],
    "teams": [{"name": "Team SCA", "position": ["3"]}],
}
# Beautiful Soup tolerates imperfect HTML and provides DOM-like CSS queries.
# Parser backends can repair malformed markup differently, so choosing one is
# observable runtime behavior. Browsers also construct a DOM that may differ
# from the original source text.
