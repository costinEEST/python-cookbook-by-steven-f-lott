// Run with Node 26 or newer: node chapter-06/user-inputs-and-outputs.ts

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Console } from "node:console";
import { once } from "node:events";
import { Readable, Writable } from "node:stream";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

// Executable TypeScript parallels for Modern Python Cookbook, Chapter 6.
// Node-facing inputs are represented by injected readers, explicit argv arrays,
// in-memory output arrays, and environment records to keep this tour deterministic.

// 6.1 Using the features of print()
// ----------------------------------
const CSV_TEXT = `date,engine on,fuel height on,engine off,fuel height off
10/25/13,08:24:00,29,13:15:00,27
10/26/13,09:12:00,27,18:25:00,22
10/28/13,13:21:00,22,06:25:00,14`;

// ECMAScript and Node core have no CSV parser. Splitting is correct only for this
// deliberately quote-free sample; production CSV needs a standards-aware parser.
const [, ...fuelLines] = CSV_TEXT.split("\n");
const fuelUse = fuelLines.map((line) => {
  const [day, engineOn, fuelOnText, engineOff, fuelOffText] = line.split(",");
  if (
    day === undefined ||
    engineOn === undefined ||
    fuelOnText === undefined ||
    engineOff === undefined ||
    fuelOffText === undefined
  )
    throw new SyntaxError(`incomplete fuel row: ${line}`);
  return [day, engineOn, engineOff, Number(fuelOnText) - Number(fuelOffText)] as const;
});
const tableOutput = fuelUse.map((row) => row.join(" | ")).join("\n") + "\n";
assert.equal(tableOutput.split("\n")[0], "10/25/13 | 08:24:00 | 13:15:00 | 2");

class MemoryWritable extends Writable {
  readonly chunks: string[] = [];

  override _write(
    chunk: Uint8Array | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(chunk.toString());
    callback();
  }

  toString(): string {
    return this.chunks.join("");
  }
}

// Console is Node's direct analogue for print(file=...): it targets arbitrary
// Writable streams. console.log() adds a newline, while Writable.write() gives
// exact control over Python's sep/end behavior.
const standardOutput = new MemoryWritable();
const standardError = new MemoryWritable();
const chapterConsole = new Console({ stdout: standardOutput, stderr: standardError });
standardOutput.write(["date", "10/25/13"].join("="));
standardOutput.write(", ");
chapterConsole.log(["change", 2].join("="));
chapterConsole.error("Red Alert!");
assert.equal(standardOutput.toString(), "date=10/25/13, change=2\n");
assert.equal(standardError.toString(), "Red Alert!\n");

// 6.2 Using input() and getpass() for user input
// ------------------------------------------------
type ReadText = (prompt: string) => Promise<string>;
type WriteText = (message: string) => void;

async function getInteger(
  prompt: string,
  read: ReadText,
  write: WriteText,
): Promise<number> {
  while (true) {
    const text = await read(prompt);
    if (/^[+-]?\d+$/.test(text)) return Number(text);
    write(`invalid integer: ${text}`);
  }
}

async function getDate(read: ReadText, write: WriteText): Promise<string> {
  while (true) {
    const year = await getInteger("year: ", read, write);
    const month = await getInteger("month [1-12]: ", read, write);
    const day = await getInteger("day [1-31]: ", read, write);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (
      candidate.getUTCFullYear() === year &&
      candidate.getUTCMonth() === month - 1 &&
      candidate.getUTCDate() === day
    )
      return candidate.toISOString().slice(0, 10);
    write("invalid date");
  }
}

const answers = ["oops", "2024", "2", "30", "2024", "2", "29"];
const inputMessages: string[] = [];
assert.equal(
  await getDate(
    async () => answers.shift()!,
    (message) => inputMessages.push(message),
  ),
  "2024-02-29",
);
assert.equal(inputMessages.length, 2);
// Production input uses the stable promise API:
// const terminal = createInterface({ input: process.stdin, output: process.stdout });
// await getDate((prompt) => terminal.question(prompt), console.error);
// terminal[Symbol.dispose]();
// Node still has no getpass analogue. readline can read terminal input, but hiding
// echo requires TTY control or a library; secrets must not enter history or logs.

// 6.3 Debugging with f"{value=}" strings
// ----------------------------------------
const sizes = [2353, 2889, 2195, 3094, 725, 1099, 690, 1207, 926, 758, 615, 521, 1320];
const meanSize = sizes.reduce((sum, value) => sum + value, 0) / sizes.length;
const squaredDifferences = sizes.map((value) => (value - meanSize) ** 2);
const standardDeviation = Math.sqrt(
  squaredDifferences.reduce((sum, value) => sum + value, 0) / (sizes.length - 1),
);
const debugLine = `meanSize=${meanSize.toFixed(2)}, standardDeviation=${standardDeviation.toFixed(2)}`;
assert.equal(debugLine, "meanSize=1414.77, standardDeviation=901.10");
// Template literals evaluate expressions but do not reproduce their source text;
// TypeScript requires writing a debug label explicitly.

// 6.4 Using argparse to get command-line input
// ----------------------------------------------
type Point = readonly [latitude: number, longitude: number];
interface DistanceOptions {
  readonly units: "KM" | "MI" | "NM";
  readonly point1: Point;
  readonly point2: Point;
}

function parsePoint(text: string): Point {
  const parts = text.split(",");
  if (parts.length !== 2) throw new TypeError(`expected latitude,longitude: ${text}`);
  const latitude = Number(parts[0]);
  const longitude = Number(parts[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
    throw new TypeError(`invalid point: ${text}`);
  return [latitude, longitude];
}

function parseDistanceArguments(
  argv: readonly string[],
  defaults: { readonly units?: string; readonly point2?: string | undefined } = {},
): DistanceOptions {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      units: { type: "string", short: "u", default: defaults.units ?? "NM" },
    },
  });
  const units = values.units;
  if (units !== "KM" && units !== "MI" && units !== "NM")
    throw new TypeError(`invalid units: ${units}`);
  const [point1Text, explicitPoint2] = positionals;
  const point2Text = explicitPoint2 ?? defaults.point2;
  if (point1Text === undefined || point2Text === undefined)
    throw new TypeError("two points are required");
  if (positionals.length > 2) throw new TypeError("at most two points are allowed");
  return { units, point1: parsePoint(point1Text), point2: parsePoint(point2Text) };
}

assert.deepEqual(
  parseDistanceArguments(["-u", "KM", "36.12,-86.67", "33.94,-118.40"]),
  {
    units: "KM",
    point1: [36.12, -86.67],
    point2: [33.94, -118.4],
  },
);
// Node's stable util.parseArgs() handles option aliases, defaults, strict unknown-
// option checking, and positionals. Unlike argparse, it does not apply converters,
// choices, generated help, or automatic error exits; parsePoint supplies semantics.

// 6.5 Using Invoke to get command-line input
// --------------------------------------------
const RADII = { KM: 6372, MI: 3958.8, NM: 3440.1 } as const;

function haversine(point1: Point, point2: Point, radius: number): number {
  const radians = (degrees: number): number => (degrees * Math.PI) / 180;
  const [latitude1, longitude1] = point1.map(radians) as [number, number];
  const [latitude2, longitude2] = point2.map(radians) as [number, number];
  const deltaLatitude = latitude2 - latitude1;
  const deltaLongitude = longitude2 - longitude1;
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  return radius * 2 * Math.asin(Math.sqrt(a));
}

function distanceTask(
  point1Text: string,
  point2Text: string,
  units: keyof typeof RADII = "KM",
) {
  return haversine(parsePoint(point1Text), parsePoint(point2Text), RADII[units]);
}
assert.equal(
  Math.round(distanceTask("36.12,-86.67", "33.94,-118.40", "KM") * 100) / 100,
  2886.9,
);

async function runNodeTaskWithEnvironment(
  environment: NodeJS.ProcessEnv,
): Promise<string> {
  const child = spawn(
    process.execPath,
    ["-e", "process.stdout.write(process.env.APP_UNITS ?? '')"],
    {
      env: { ...process.env, ...environment },
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  child.stdout.setEncoding("utf8");
  let output = "";
  child.stdout.on("data", (chunk: string) => {
    output += chunk;
  });
  const [exitCode] = await once(child, "close");
  if (exitCode !== 0) throw new Error(`task exited with status ${String(exitCode)}`);
  return output;
}

assert.equal(await runNodeTaskWithEnvironment({ APP_UNITS: "NM" }), "NM");
// Invoke's @task signature-to-CLI feature has no Node core equivalent; npm scripts
// name tasks, util.parseArgs() parses their options, and child_process.spawn()
// provides Context.run()-style subprocess, stdio, and environment control.

// 6.6 Using cmd to create command-line applications
// --------------------------------------------------
class DiceCLI {
  numberOfDice = 6;
  dice: number[] | undefined;
  readonly output: string[] = [];
  private readonly nextDie: () => number;
  private readonly writeLine: (message: string) => void;

  constructor(nextDie: () => number, writeLine?: (message: string) => void) {
    this.nextDie = nextDie;
    this.writeLine = writeLine ?? ((message) => this.output.push(message));
  }

  execute(line: string): boolean {
    const [command, ...arguments_] = line.trim().split(/\s+/);
    const argument = arguments_.join(" ");
    if (command === "dice") {
      const count = Number(argument);
      if (!Number.isInteger(count) || count < 1) {
        this.writeLine(`${JSON.stringify(argument)} is invalid`);
        return false;
      }
      this.numberOfDice = count;
      this.dice = undefined;
      this.writeLine(`Rolling ${count} dice`);
      return false;
    }
    if (command === "roll") {
      this.dice = Array.from({ length: this.numberOfDice }, this.nextDie);
      this.writeLine(JSON.stringify(this.dice));
      return false;
    }
    return command === "quit";
  }
}

const rolls = [3, 2, 4];
const game = new DiceCLI(() => rolls.shift()!);
assert.equal(game.execute("dice 3"), false);
assert.equal(game.execute("roll"), false);
assert.deepEqual(game.dice, [3, 2, 4]);
assert.equal(game.execute("quit"), true);

async function runDiceCli(
  input: Readable,
  output: Writable,
  commandProcessor: DiceCLI,
): Promise<void> {
  const lines = createInterface({ input, output, terminal: false, prompt: "] " });
  output.write("A dice rolling tool. Type quit to exit.\n");
  for await (const line of lines) {
    if (commandProcessor.execute(line)) break;
  }
}

const loopOutput = new MemoryWritable();
const loopRolls = [6, 1];
const loopGame = new DiceCLI(
  () => loopRolls.shift()!,
  (message) => loopOutput.write(`${message}\n`),
);
await runDiceCli(Readable.from(["dice 2\nroll\nquit\n"]), loopOutput, loopGame);
assert.deepEqual(loopGame.dice, [6, 1]);
assert.match(loopOutput.toString(), /^A dice rolling tool\./);
assert.match(loopOutput.toString(), /Rolling 2 dice\n\[6,1\]\n/);

// Python cmd.Cmd supplies do_* discovery and docstring help. Node's stable
// readline/promises API supplies the real stream-backed loop, prompts, async line
// iteration, history, completion, abort signals, and Symbol.dispose cleanup; the
// application still owns command dispatch and help metadata.

// 6.7 Using OS environment settings
// -----------------------------------
function parseEnvironmentOptions(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
): DistanceOptions {
  const defaultUnits = environment.UNITS ?? "KM";
  if (defaultUnits !== "KM" && defaultUnits !== "MI" && defaultUnits !== "NM")
    throw new TypeError(`invalid UNITS: ${defaultUnits}`);
  return parseDistanceArguments(argv, {
    units: defaultUnits,
    point2: environment.HOME_PORT,
  });
}

assert.deepEqual(
  parseEnvironmentOptions(["36.12,-86.67"], {
    UNITS: "NM",
    HOME_PORT: "36.842952,-76.300171",
  }),
  { units: "NM", point1: [36.12, -86.67], point2: [36.842952, -76.300171] },
);
// process.env values are strings or undefined, like os.environ values. Explicit
// CLI arguments override environment defaults; injected records keep tests isolated.
