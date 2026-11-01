// Run with Node 26 or newer:
// node chapter-14/application-integration-combination.ts

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

// TypeScript parallels for all five Chapter 14 recipes. Subprocess examples use
// the current Node executable as a deterministic stand-in for an opaque binary.
type Sample = readonly [outcome: "Success" | "Failure", chain: readonly number[]];

// 14.1 Combining two applications into one
function generateSamples(samples: number, seed: number): Sample[] {
  return Array.from({ length: samples }, (_, index) => [
    (seed + index) % 3 === 0 ? "Failure" : "Success",
    [seed, index],
  ]);
}

function summarizeSamples(
  batches: Iterable<readonly Sample[]>,
): Record<string, number> {
  const summary: Record<string, number> = { Success: 0, Failure: 0 };
  for (const batch of batches) {
    for (const [outcome] of batch) summary[outcome] = (summary[outcome] ?? 0) + 1;
  }
  return summary;
}

function generateAndSummarize(
  iterations: number,
  samples: number,
): Record<string, number> {
  const batches = Array.from({ length: iterations }, (_, seed) =>
    generateSamples(samples, seed + 1),
  );
  return summarizeSamples(batches);
}

const combinedSummary = generateAndSummarize(3, 4);
assert.deepEqual(combinedSummary, { Success: 8, Failure: 4 });
assert.equal(
  Object.values(combinedSummary).reduce((total, value) => total + value),
  12,
);
// Import focused functions rather than copying their implementations. The root
// application owns orchestration and cross-component logging configuration.

// 14.2 Combining many applications using the Command design pattern
interface CommandOptions {
  readonly samples: number;
  readonly seed: number;
  readonly output: string;
  readonly inputs: readonly string[];
  readonly summaryFile: string;
}

const defaultOptions: CommandOptions = {
  samples: 1_000,
  seed: 0,
  output: "samples.csv",
  inputs: [],
  summaryFile: "summary.md",
};

interface Command {
  execute(options: CommandOptions): unknown;
}

class Generate implements Command {
  execute(options: CommandOptions): Sample[] {
    return generateSamples(options.samples, options.seed);
  }
}

class Summarize implements Command {
  execute(options: CommandOptions): Record<string, number> {
    const batches = options.inputs.map((_, index) => generateSamples(1, index));
    return summarizeSamples(batches);
  }
}

class CommandSequence implements Command {
  private readonly commands: readonly Command[];

  constructor(...commands: readonly Command[]) {
    this.commands = commands;
  }

  execute(options: CommandOptions): unknown[] {
    return this.commands.map((command) => command.execute(options));
  }
}

class GenerateThenSummarize implements Command {
  execute(options: CommandOptions): Record<string, number> {
    return summarizeSamples([new Generate().execute(options)]);
  }
}

const command: Command = new GenerateThenSummarize();
assert.deepEqual(command.execute({ ...defaultOptions, samples: 5, seed: 2 }), {
  Success: 3,
  Failure: 2,
});
assert.equal(
  new CommandSequence(new Generate(), new GenerateThenSummarize()).execute({
    ...defaultOptions,
    samples: 2,
    seed: 1,
  }).length,
  2,
);
// The interface supports static substitution but vanishes at runtime. Python's
// ABC prevents instantiation until abstract methods have concrete implementations.

// 14.3 Managing arguments and configuration in composite applications
type CommandConstructor = new () => Command;

function parseCommand(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
): readonly [Command, CommandOptions] {
  const [subcommand, ...subcommandArgs] = argv;
  const defaultSeed = Number.parseInt(environment.RANDOMSEED ?? "0", 10);
  if (subcommand === "generate" || subcommand === "gensumm") {
    const { values } = parseArgs({
      args: subcommandArgs,
      options: {
        samples: { type: "string", short: "s", default: "1000" },
        output: { type: "string", short: "o", default: "samples.csv" },
        randomize: { type: "string", short: "r", default: String(defaultSeed) },
      },
      strict: true,
    });
    const commandType: CommandConstructor =
      subcommand === "generate" ? Generate : GenerateThenSummarize;
    return [
      new commandType(),
      {
        ...defaultOptions,
        samples: Number.parseInt(values.samples, 10),
        seed: Number.parseInt(values.randomize, 10),
        output: values.output,
      },
    ];
  }
  if (subcommand === "summarize") {
    const { values, positionals } = parseArgs({
      args: subcommandArgs,
      options: { output: { type: "string", short: "o", default: "summary.md" } },
      allowPositionals: true,
      strict: true,
    });
    return [
      new Summarize(),
      { ...defaultOptions, inputs: positionals, summaryFile: values.output },
    ];
  }
  throw new TypeError("select generate, summarize, or gensumm");
}

const [parsedCommand, parsedOptions] = parseCommand(
  ["generate", "--samples", "7", "--output", "x.csv"],
  { RANDOMSEED: "42" },
);
assert.ok(parsedCommand instanceof Generate);
assert.deepEqual(parsedOptions, {
  ...defaultOptions,
  samples: 7,
  seed: 42,
  output: "x.csv",
});
// Node's stable util.parseArgs() handles options and positionals but has no
// built-in argparse-style subparser; dispatch on the first positional explicitly.

// 14.4 Wrapping and combining CLI applications
function* externalCommands(files: number): IterableIterator<readonly string[]> {
  for (let index = 0; index < files; index += 1) {
    yield ["--eval", `process.exit(0); // stand-in for sample_${index}.csv`];
  }
}

function runExternalCommands(commands: Iterable<readonly string[]>): number {
  let completed = 0;
  for (const arguments_ of commands) {
    execFileSync(process.execPath, arguments_, { stdio: "ignore" });
    completed += 1;
  }
  return completed;
}

assert.equal(runExternalCommands(externalCommands(3)), 3);
// execFileSync invokes the executable directly without a shell and throws on a
// nonzero exit. It blocks the event loop, so asynchronous execFile/spawn is a
// better fit for servers or independent concurrent jobs.

// 14.5 Wrapping a program and checking the output
const outputPattern = /^#\s*([^\s=]+)\s*=\s*(.*?)\s*$/;

function* outputCommands(
  options: CommandOptions,
  iterations: number,
): IterableIterator<string[]> {
  for (let index = 0; index < iterations; index += 1) {
    const filename = `sample_${index}.csv`;
    const script = [
      `console.log("# file = '${filename}'")`,
      `console.log("# samples = ${options.samples}")`,
      `console.log("# randomize = ${index + 1}")`,
    ].join(";");
    yield ["--eval", script];
  }
}

function commandOutput(arguments_: readonly string[]): string {
  return execFileSync(process.execPath, arguments_, { encoding: "utf8" });
}

function parseOutput(result: string): Record<string, string> {
  const summary: Record<string, string> = {};
  for (const line of result.split(/\r?\n/)) {
    const match = outputPattern.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined)
      summary[match[1]] = match[2];
  }
  return summary;
}

function* outputSummaries(
  options: CommandOptions,
  iterations: number,
): IterableIterator<Record<string, string>> {
  for (const arguments_ of outputCommands(options, iterations)) {
    yield parseOutput(commandOutput(arguments_));
  }
}

const captured = [...outputSummaries({ ...defaultOptions, samples: 5 }, 3)];
assert.deepEqual(captured[0], {
  file: "'sample_0.csv'",
  samples: "5",
  randomize: "1",
});
assert.equal(
  captured.reduce(
    (total, summary) => total + Number.parseInt(summary.samples ?? "0", 10),
    0,
  ),
  15,
);
// execFileSync buffers output and has a maxBuffer limit. Use spawn() and consume
// its streams for large or progressive output. Keep parsing and numeric conversion
// at explicit boundaries so malformed output cannot silently enter the core.

const adaptedOptions = { ...defaultOptions, samples: 10, output: "temporary.csv" };
assert.equal(adaptedOptions.output, "temporary.csv");
