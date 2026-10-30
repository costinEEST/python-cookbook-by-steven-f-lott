// Run with Node 26 or newer:
// node chapter-11/input-output-physical-format-logical-layout.ts

import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Executable TypeScript parallels for all eight recipes in Modern Python
// Cookbook, Chapter 11. Python remains authoritative for pathlib, csv,
// ElementTree, and Beautiful Soup behavior.

function withTemporaryDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(path.join(tmpdir(), "chapter-11-"));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// 11.1 Using pathlib to work with filenames
// --------------------------------------------
const inputPath = "/path/to/some/file.csv";
assert.equal(
  path.format({ ...path.parse(inputPath), base: "", ext: ".out" }),
  "/path/to/some/file.out",
);
const parsedInput = path.parse(inputPath);
const outputPath = path.join(parsedInput.dir, `${parsedInput.name}_pass.csv`);
assert.equal(outputPath, "/path/to/some/file_pass.csv");

withTemporaryDirectory((directory) => {
  const older = path.join(directory, "older.csv");
  const newer = path.join(directory, "newer.csv");
  writeFileSync(older, "old", "utf8");
  writeFileSync(newer, "new", "utf8");
  assert.deepEqual(
    readdirSync(directory)
      .filter((name) => name.endsWith(".csv"))
      .sort(),
    ["newer.csv", "older.csv"],
  );
  assert.ok(statSync(newer).mtimeMs >= statSync(older).mtimeMs);
});
// pathlib combines path values and concrete filesystem methods. Node separates
// lexical node:path functions from node:fs operations; neither string joining
// nor path.join() creates a file.

// 11.2 Replacing a file while preserving the previous version
// --------------------------------------------------------------
interface Quotient {
  readonly numerator: number;
  readonly denominator: number;
}

function saveData(outputPath: string, data: Iterable<Quotient>): void {
  const rows = ["numerator,denominator"];
  for (const item of data) rows.push(`${item.numerator},${item.denominator}`);
  writeFileSync(outputPath, `${rows.join("\n")}\n`, "utf8");
}

function safeSave(outputPath: string, data: Iterable<Quotient>): void {
  const newPath = `${outputPath}.new`;
  const oldPath = `${outputPath}.old`;
  saveData(newPath, data);
  try {
    unlinkSync(oldPath);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  try {
    renameSync(outputPath, oldPath);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  try {
    renameSync(newPath, outputPath);
  } catch (error) {
    try {
      renameSync(oldPath, outputPath);
    } catch {
      // Preserve the original rename error when no backup is available.
    }
    throw error;
  }
}

withTemporaryDirectory((directory) => {
  const target = path.join(directory, "quotients.csv");
  saveData(target, [{ numerator: 1, denominator: 2 }]);
  safeSave(target, [{ numerator: 2, denominator: 3 }]);
  assert.match(readFileSync(target, "utf8"), /2,3/);
  assert.match(readFileSync(`${target}.old`, "utf8"), /1,2/);
});
// fs.renameSync(), like Path.rename(), is atomic only on one filesystem. The
// serial rename sequence is not transactional; `.old` is the recovery state.

// 11.3 Reading delimited files with the CSV module
// -------------------------------------------------
const waypointCsv = `lat,lon,date,time,notes
32.832,-79.934,2012-11-27,09:15:00,"breezy, rainy"
31.671,-80.933,2012-11-28,00:00:00,"blowing ""like stink"""
`;

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      fields.push(field);
      field = "";
    } else field += character;
  }
  if (quoted) throw new TypeError("unterminated quoted CSV field");
  fields.push(field);
  return fields;
}

function parseCsv(source: string): Record<string, string>[] {
  const [headingLine, ...lines] = source.trim().split(/\r?\n/);
  if (headingLine === undefined) return [];
  const headings = parseCsvRow(headingLine);
  return lines.map((line) => {
    const values = parseCsvRow(line);
    if (values.length !== headings.length)
      throw new TypeError("CSV row has the wrong width");
    return Object.fromEntries(
      headings.map((heading, index) => [heading, values[index] ?? ""]),
    );
  });
}

const rawRows = parseCsv(waypointCsv);
assert.equal(rawRows[0]?.notes, "breezy, rainy");
assert.equal(rawRows[1]?.notes, 'blowing "like stink"');

interface CleanRow extends Record<string, unknown> {
  readonly latLon: readonly [number, number];
  readonly timestamp: Date;
}

function cleanRow(source: Record<string, string>): CleanRow {
  const { lat, lon, date, time } = source;
  if (
    lat === undefined ||
    lon === undefined ||
    date === undefined ||
    time === undefined
  )
    throw new TypeError("waypoint columns are missing");
  return {
    ...source,
    latLon: [Number(lat), Number(lon)],
    timestamp: new Date(`${date}T${time}`),
  };
}

const cleaned = cleanRow(rawRows[0] ?? {});
assert.deepEqual(cleaned.latLon, [32.832, -79.934]);
// Python's csv module supports configurable dialects and streaming. This parser
// intentionally implements only the comma, quote, and doubled-quote rules used
// here because Node has no standard CSV API.

// 11.4 Using dataclasses to simplify working with CSV files
// ----------------------------------------------------------
interface RawRow {
  readonly lat: string;
  readonly lon: string;
  readonly date: string;
  readonly time: string;
  readonly notes: string;
}
interface Waypoint {
  readonly raw: RawRow;
  readonly latLon: readonly [number, number];
  readonly timestamp: Date;
}

function toWaypoint(row: Record<string, string>): Waypoint {
  const { lat, lon, date, time, notes } = row;
  if ([lat, lon, date, time, notes].some((value) => value === undefined))
    throw new TypeError("waypoint columns are missing");
  const raw = { lat, lon, date, time, notes } as RawRow;
  return {
    raw,
    latLon: [Number(raw.lat), Number(raw.lon)],
    timestamp: new Date(`${raw.date}T${raw.time}`),
  };
}

const waypoints = rawRows.map(toWaypoint);
assert.equal(waypoints[0]?.timestamp.getHours(), 9);
// Python dataclasses generate runtime initialization and __post_init__ hooks.
// Interfaces are erased, so TypeScript requires this explicit checked converter.

// 11.5 Reading complex formats using regular expressions
// --------------------------------------------------------
const logPattern =
  /^\[(?<date>.*?)]\s+(?<level>\w+)\s+in\s+(?<module>\S+?):\s+(?<message>.+)$/;
interface LogLine {
  readonly date: string;
  readonly level: string;
  readonly module: string;
  readonly message: string;
}

function logParser(sourceLine: string): LogLine {
  const groups = logPattern.exec(sourceLine.trim())?.groups;
  const { date, level, module, message } = groups ?? {};
  if (
    date === undefined ||
    level === undefined ||
    module === undefined ||
    message === undefined
  )
    throw new TypeError(`unexpected input: ${sourceLine}`);
  return { date, level, module, message };
}

const logLine = logParser("[2016-05-08 11:08:18,651] INFO in ch11: Sample Message One");
assert.equal(logLine.level, "INFO");
assert.throws(() => logParser("not a log line"), TypeError);

// 11.6 Reading JSON and YAML documents
// -------------------------------------
const raceJson = `{
  "legs": ["ALICANTE - CAPE TOWN", "AUCKLAND - ITAJA\\u00cd"],
  "teams": [{"name": "Team SCA", "position": [3, null]}]
}`;
const raceDocument = JSON.parse(raceJson) as {
  legs: string[];
  teams: { name: string; position: (number | null)[] }[];
};
assert.equal(raceDocument.legs[1], "AUCKLAND - ITAJAÍ");
assert.deepEqual(raceDocument.teams[0]?.position, [3, null]);

const dateDocument = { date: new Date("2014-06-07T08:09:10.000Z") };
const encoded = JSON.stringify(dateDocument, (_key, value: unknown) => value);
const decoded = JSON.parse(encoded, (key: string, value: unknown) =>
  key === "date" && typeof value === "string" ? new Date(value) : value,
) as { date: Date };
assert.equal(decoded.date.toISOString(), dateDocument.date.toISOString());
// Date.toJSON() runs before the replacer, unlike Python's default hook. JSON is
// valid YAML, but general YAML requires a third-party parser in both runtimes.

// 11.7 Reading XML documents
// ---------------------------
const raceXml = `<?xml version="1.0"?>
<results><teams><team><name>Team SCA</name><position><leg n="1">3</leg></position></team></teams>
<legs><leg n="1">ALICANTE - CAPE TOWN</leg></legs></results>`;
function requiredCapture(source: string, pattern: RegExp, label: string): string {
  const value = pattern.exec(source)?.[1]?.trim();
  if (value === undefined) throw new TypeError(`${label} is missing`);
  return value;
}
assert.equal(requiredCapture(raceXml, /<name>(.*?)<\/name>/s, "team name"), "Team SCA");
assert.equal(
  requiredCapture(raceXml, /<legs>.*?<leg n="1">(.*?)<\/leg>/s, "leg"),
  "ALICANTE - CAPE TOWN",
);
// This bounded extraction is only a parallel for known sample markup. General
// recursive or mixed-content XML needs a real parser; Node has no built-in DOM.

// 11.8 Reading HTML documents
// ----------------------------
const raceHtml = `<!doctype html><table class="ranking-list">
<thead><tr><th>Team</th><th data="ALICANTE - CAPE TOWN">LEG 1</th></tr></thead>
<tbody><tr class="ranking-item"><td class="ranking-team">Team SCA</td>
<td class="ranking-number">3</td></tr></tbody></table>`;
const legMatch = /<th data="([^"]+)">([^<]+)<\/th>/.exec(raceHtml);
const teamMatch = /class="ranking-team">([^<]+)<\/td>/.exec(raceHtml);
const positionMatch = /class="ranking-number">([^<]+)<\/td>/.exec(raceHtml);
assert.deepEqual(
  {
    legs: legMatch === null ? [] : [[legMatch[2], legMatch[1]]],
    teams:
      teamMatch === null || positionMatch === null
        ? []
        : [{ name: teamMatch[1], position: [positionMatch[1]] }],
  },
  {
    legs: [["LEG 1", "ALICANTE - CAPE TOWN"]],
    teams: [{ name: "Team SCA", position: ["3"] }],
  },
);
// Python uses Beautiful Soup because tolerant parsing and CSS queries are the
// lesson. For arbitrary HTML in TypeScript, use a maintained DOM parser or a
// browser DOM; regex is deliberately restricted to this fixed fixture.
