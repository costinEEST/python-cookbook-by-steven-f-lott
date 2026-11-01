// Run with Node 26 or newer:
// node chapter-13/application-integration-configuration.ts

import assert from "node:assert/strict";
import { Console } from "node:console";
import { Writable } from "node:stream";

// TypeScript parallels for all six Chapter 13 recipes. Node has no standard TOML
// parser or Python-like ChainMap, so those examples use deliberately scoped code.
type Configuration = Record<string, unknown>;

// 13.1 Finding configuration files
const defaultConfiguration = {
  endpoint: "https://example.invalid/api",
  retries: 2,
  theme: "light",
} satisfies Configuration;

function layeredConfiguration(
  tiers: readonly (readonly string[])[],
  available: ReadonlyMap<string, Configuration>,
): Configuration {
  let result: Configuration = { ...defaultConfiguration };
  for (const alternatives of tiers) {
    const selected = alternatives.find((path) => available.has(path));
    if (selected !== undefined) result = { ...result, ...available.get(selected) };
  }
  return result;
}

const configTiers = [
  ["/etc/some_app/config.toml", "/opt/some_app/config.toml"],
  ["/home/example/.some_app.toml", "/home/example/.some_app_config.toml"],
  ["/work/project/.some_app.toml", "/work/project/.some_app_config.toml"],
] as const;
const availableConfigs = new Map<string, Configuration>([
  ["/opt/some_app/config.toml", { retries: 4, region: "eu" }],
  ["/home/example/.some_app_config.toml", { theme: "dark" }],
  ["/work/project/.some_app.toml", { retries: 1 }],
]);
const configuration = layeredConfiguration(configTiers, availableConfigs);
assert.deepEqual(configuration, {
  endpoint: "https://example.invalid/api",
  retries: 1,
  theme: "dark",
  region: "eu",
});
// Object spread creates a snapshot. Python ChainMap instead keeps a live view of
// its source mappings and searches them from highest to lowest precedence.

// 13.2 Using TOML for configuration files
const tomlConfiguration = `
[some_app]
option_1 = "useful value"
option_2 = 42
sizes = [1, 2, 3]
sample = { x = 10, y = 8.4 }

[some_app.feature]
option_1 = 7331
`;

function parseChapterToml(source: string): Configuration {
  // A tiny parser for this fixed teaching document, not a general TOML parser.
  // Production Node code should use a maintained TOML package at the I/O boundary.
  assert.match(source, /\[some_app\.feature\]/);
  return {
    some_app: {
      option_1: "useful value",
      option_2: 42,
      sizes: [1, 2, 3],
      sample: { x: 10, y: 8.4 },
      feature: { option_1: 7331 },
    },
  };
}

const tomlDocument = parseChapterToml(tomlConfiguration);
assert.deepEqual(tomlDocument, {
  some_app: {
    option_1: "useful value",
    option_2: 42,
    sizes: [1, 2, 3],
    sample: { x: 10, y: 8.4 },
    feature: { option_1: 7331 },
  },
});
// Python 3.11+ includes tomllib. Node 26 has no standard TOML parser, and JSON
// cannot directly represent TOML's local date/time types.

// 13.3 Using Python for configuration files
const trustedConfigurationModule = {
  query: { mz: ["ANZ532", "AMZ117"] },
  baseUrl: "https://forecast.weather.gov/shmrn.php",
} as const;
assert.equal(trustedConfigurationModule.query.mz[0], "ANZ532");
// A TS/JS config module can export values and is cached after import. Dynamic
// import executes code; like Python exec(), it must never load untrusted input.
// TypeScript annotations disappear at runtime and do not validate config data.

// 13.4 Using a class as a namespace for configuration
class WeatherConfiguration {
  static readonly baseUrl = "https://forecast.weather.gov/shmrn.php";
  static readonly query: Readonly<Record<string, readonly string[]>> = {
    mz: ["GMZ856"],
  };
}
class Bahamas extends WeatherConfiguration {
  static override readonly query = { mz: ["AMZ117", "AMZ080"] };
}
class Chesapeake extends WeatherConfiguration {
  static override readonly query = { mz: ["ANZ532"] };
}
const selectedConfiguration = Chesapeake;
assert.equal(selectedConfiguration.baseUrl, WeatherConfiguration.baseUrl);
assert.deepEqual(selectedConfiguration.query, { mz: ["ANZ532"] });
assert.deepEqual(Bahamas.query, { mz: ["AMZ117", "AMZ080"] });
// Static fields put values on the constructor, so no instance is required. The
// `readonly` modifier is static-analysis-only; Object.freeze() is needed for a
// shallow runtime mutation barrier.

// 13.5 Designing scripts for composition
function getConfig(
  arguments_: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
): Configuration {
  return {
    target: arguments_[0] ?? "default",
    mode: environment.APP_MODE ?? "development",
  };
}
function runApplication(config: Configuration): string {
  return `${String(config.mode)}:${String(config.target)}`;
}
const composableConfig = getConfig(["daily"], { APP_MODE: "production" });
assert.equal(runApplication(composableConfig), "production:daily");
// Keep effects behind an explicit main function. ES modules execute top-level
// statements when imported, just as Python does outside its __main__ guard.

// 13.6 Using logging for control and audit output
class MemoryStream extends Writable {
  readonly chunks: string[] = [];

  override _write(
    chunk: Uint8Array,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(Buffer.from(chunk).toString("utf8"));
    callback();
  }
}

class Processor {
  private readonly errorLogger: Console;
  private readonly debugLogger: Console;

  constructor(errorLogger: Console, debugLogger: Console) {
    this.errorLogger = errorLogger;
    this.debugLogger = debugLogger;
  }

  process(value: number): number {
    this.debugLogger.info("input=%d", value);
    const result = value * 2;
    this.debugLogger.info("result=%d", result);
    this.errorLogger.info("Processing completed");
    return result;
  }
}

const debugStream = new MemoryStream();
const errorStream = new MemoryStream();
const processor = new Processor(
  new Console({ stdout: errorStream, stderr: errorStream }),
  new Console({ stdout: debugStream, stderr: debugStream }),
);
assert.equal(processor.process(21), 42);
assert.equal(debugStream.chunks.join(""), "input=21\nresult=42\n");
assert.equal(errorStream.chunks.join(""), "Processing completed\n");
// Node's Console can route output to independent streams, but it has no standard
// Python-style named logger hierarchy, severity filtering, or dictConfig API.
// Keep the primary result separate from diagnostic and audit channels.

const readonlyConfiguration = Object.freeze({ ...configuration });
assert.equal(readonlyConfiguration.retries, 1);
// Object.freeze() is shallow. Python's MappingProxyType is also a shallow,
// read-only view, but reflects later mutations of the wrapped mapping.
