// Run with Node 26 or newer:
// node chapter-16/dependencies-and-virtual-environments.ts

import assert from "node:assert/strict";
import { posix, win32 } from "node:path";

// TypeScript parallels for all seven Chapter 16 recipes. Commands are modeled as
// data and no package manager, environment, or filesystem state is changed.

// 16.1 Creating environments using the built-in venv
interface VirtualEnvironment {
  readonly directory: string;
  readonly interpreter: string;
  readonly activation: string;
}

function virtualEnvironmentLayout(
  directory: string,
  windows: boolean,
): VirtualEnvironment {
  const pathApi = windows ? win32 : posix;
  const scripts = pathApi.join(directory, windows ? "Scripts" : "bin");
  return {
    directory,
    interpreter: pathApi.join(scripts, windows ? "python.exe" : "python"),
    activation: pathApi.join(scripts, windows ? "Activate.ps1" : "activate"),
  };
}

assert.equal(virtualEnvironmentLayout(".venv", false).interpreter, ".venv/bin/python");
assert.equal(
  virtualEnvironmentLayout(".venv", true).interpreter,
  ".venv\\Scripts\\python.exe",
);
const venvCreate = ["python", "-m", "venv", ".venv"] as const;
assert.equal(venvCreate.at(-1), ".venv");
// node_modules isolates packages at resolution time but does not contain an
// isolated Node interpreter. Python venvs contain interpreter entry points and
// their own site-packages; both generated directories should remain uncommitted.

// 16.2 Installing packages with a requirements.txt file
interface Requirement {
  readonly name: string;
  readonly extras: readonly string[];
  readonly constraint?: string;
  readonly marker?: string;
}

const requirementPattern =
  /^(?<name>[A-Za-z0-9][A-Za-z0-9._-]*)(?:\[(?<extras>[^\]]+)\])?(?<constraint>(?:==|!=|>=|<=|~=|>|<).+?)?(?:\s*;\s*(?<marker>.+))?$/;

function parseRequirement(text: string): Requirement {
  const match = requirementPattern.exec(text.trim());
  if (match?.groups?.name === undefined)
    throw new TypeError(`invalid requirement: ${text}`);
  return {
    name: match.groups.name,
    extras: match.groups.extras?.split(",").map((item) => item.trim()) ?? [],
    ...(match.groups.constraint === undefined
      ? {}
      : { constraint: match.groups.constraint }),
    ...(match.groups.marker === undefined ? {} : { marker: match.groups.marker }),
  };
}

assert.deepEqual(parseRequirement("rich[jupyter]>=13.0; python_version >= '3.12'"), {
  name: "rich",
  extras: ["jupyter"],
  constraint: ">=13.0",
  marker: "python_version >= '3.12'",
});
// package.json dependencies express direct intent; package-lock.json captures
// the resolved transitive graph. requirements.txt can serve either role, so its
// provenance—handwritten input versus generated pins—must be explicit.

// 16.3 Creating a pyproject.toml file
const projectDocument = {
  project: {
    name: "sample-project",
    version: "2026.1.0",
    "requires-python": ">=3.12",
    dependencies: ["beautifulsoup4>=4.14", "pydantic>=2.12"],
    "optional-dependencies": { test: ["pytest>=9", "ruff>=0.14"] },
  },
  "build-system": {
    "build-backend": "setuptools.build_meta",
    requires: ["setuptools"],
  },
} as const;
assert.equal(projectDocument.project.name, "sample-project");
assert.deepEqual(projectDocument.project.dependencies, [
  "beautifulsoup4>=4.14",
  "pydantic>=2.12",
]);
assert.equal(projectDocument["build-system"]["build-backend"], "setuptools.build_meta");
// Node reads package.json natively; it has no standard TOML parser. Python's
// tomllib validates TOML syntax but does not validate the PEP 621 schema.

// 16.4 Using pip-tools to manage requirements
interface ResolvedRequirement {
  readonly name: string;
  readonly version: string;
  readonly requestedBy: readonly string[];
}

function compileRequirements(
  direct: readonly string[],
  versions: Readonly<Record<string, string>>,
  dependencies: Readonly<Record<string, readonly string[]>>,
): ResolvedRequirement[] {
  const directNames = direct.map((item) => parseRequirement(item).name);
  const names = new Set(directNames);
  for (const name of directNames) {
    for (const child of dependencies[name] ?? []) names.add(child);
  }
  return [...names].toSorted().map((name) => {
    const version = versions[name];
    if (version === undefined) throw new TypeError(`missing resolution for ${name}`);
    return {
      name,
      version,
      requestedBy: Object.entries(dependencies)
        .filter(([, children]) => children.includes(name))
        .map(([parent]) => parent),
    };
  });
}

const compiled = compileRequirements(
  ["alpha>=1", "beta"],
  { alpha: "1.4.0", beta: "2.1.0", shared: "3.0.2" },
  { alpha: ["shared"], beta: ["shared"] },
);
assert.deepEqual(
  compiled.map(({ name, version }) => [name, version]),
  [
    ["alpha", "1.4.0"],
    ["beta", "2.1.0"],
    ["shared", "3.0.2"],
  ],
);
assert.deepEqual(compiled.at(-1)?.requestedBy, ["alpha", "beta"]);
const uvProjectCommands = {
  add: ["uv", "add", "package-name"],
  checkLock: ["uv", "lock", "--check"],
  sync: ["uv", "sync", "--locked"],
  run: ["uv", "run", "--locked", "python", "script.py"],
  upgradeOne: ["uv", "lock", "--upgrade-package", "package-name"],
  exportStandard: ["uv", "export", "--format", "pylock.toml"],
} as const;
assert.deepEqual(uvProjectCommands.sync, ["uv", "sync", "--locked"]);
assert.equal(uvProjectCommands.exportStandard.at(-1), "pylock.toml");
const pipExperimentalLock = [
  "python",
  "-m",
  "pip",
  "lock",
  "-o",
  "pylock.toml",
  ".",
] as const;
assert.equal(pipExperimentalLock[3], "lock");
// pip-compile and npm install resolve broad constraints into pinned graphs. pip
// 26.2's `pip lock` is experimental and platform-specific. PEP 751 pylock.toml is
// a standard interchange format; uv.lock remains uv's universal project state.

// 16.5 Using Anaconda and conda
const condaCreate = ["conda", "create", "--name", "cookbook", "python=3.12"] as const;
const condaRun = ["conda", "run", "--name", "cookbook", "python", "script.py"] as const;
const condaLock = [
  "conda",
  "export",
  "--name",
  "cookbook",
  "--file",
  "conda-lock.yaml",
] as const;
assert.deepEqual(condaCreate.slice(2, 4), ["--name", "cookbook"]);
assert.deepEqual(condaRun.slice(0, 4), ["conda", "run", "--name", "cookbook"]);
assert.equal(condaLock.at(-1), "conda-lock.yaml");
// conda manages non-Python binaries and channels in addition to Python packages;
// npm focuses on the Node package ecosystem and uses platform-specific artifacts
// inside packages rather than treating the whole environment as a solved unit.

// 16.6 Using Poetry
const poetryCommands = {
  create: ["poetry", "new", "sample-project"],
  add: ["poetry", "add", "pydantic", "beautifulsoup4"],
  run: ["poetry", "run", "pytest"],
  activate: ["poetry", "env", "activate"],
  updateOne: ["poetry", "update", "pydantic"],
} as const;
assert.deepEqual(poetryCommands.run, ["poetry", "run", "pytest"]);
assert.deepEqual(poetryCommands.activate, ["poetry", "env", "activate"]);
// Poetry 2.x supports PEP 621 metadata and owns poetry.lock. Its environment and
// lockfile should not be mixed casually with a second Python project manager.

// 16.7 Coping with changes in dependencies
interface VersionRange {
  readonly minimum?: readonly number[];
  readonly maximumExclusive?: readonly number[];
}

function compareVersions(left: readonly number[], right: readonly number[]): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

function compatibleVersions(
  available: readonly (readonly number[])[],
  constraints: readonly VersionRange[],
): readonly (readonly number[])[] {
  return available.filter((version) =>
    constraints.every(
      (rule) =>
        (rule.minimum === undefined || compareVersions(version, rule.minimum) >= 0) &&
        (rule.maximumExclusive === undefined ||
          compareVersions(version, rule.maximumExclusive) < 0),
    ),
  );
}

const sharedVersions = [
  [1, 8],
  [2, 0],
  [2, 1],
] as const;
assert.deepEqual(
  compatibleVersions(sharedVersions, [
    { maximumExclusive: [2, 0] },
    { minimum: [2, 0] },
  ]),
  [],
);
assert.deepEqual(
  compatibleVersions(sharedVersions, [
    { minimum: [1, 8] },
    { maximumExclusive: [2, 0] },
  ]),
  [[1, 8]],
);
// Reproduce from the lockfile, change one dependency at a time, find the root
// cause, and test the full graph. A temporary pin is a risk-control measure, not
// a substitute for adapting, fixing upstream, or replacing the dependency.
