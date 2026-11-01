// Run with Node 26 or newer:
// node chapter-17/documentation-and-style.ts

import assert from "node:assert/strict";
import { parseArgs } from "node:util";

// TypeScript parallels for all five Chapter 17 recipes. Commands and
// configuration are modeled as data; this file performs no external I/O.

// 17.1 The bare minimum: a README.rst file
interface ReadmePlan {
  readonly audience: string;
  readonly purpose: string;
  readonly features: readonly string[];
  readonly requirements: readonly string[];
  readonly installation: string;
  readonly usage: string;
  readonly licenseName: string;
  readonly contributing: string;
}

function missingReadmeSections(plan: ReadmePlan): string[] {
  const sections: Readonly<Record<string, string | readonly string[]>> = {
    audience: plan.audience,
    purpose: plan.purpose,
    features: plan.features,
    requirements: plan.requirements,
    installation: plan.installation,
    usage: plan.usage,
    license: plan.licenseName,
    contributing: plan.contributing,
  };
  return Object.entries(sections)
    .filter(([, value]) => value.length === 0)
    .map(([name]) => name);
}

const readmePlan: ReadmePlan = {
  audience: "Python developers learning from TypeScript",
  purpose: "Provide paired executable cookbook notes.",
  features: ["Python examples", "TypeScript comparisons"],
  requirements: ["Python 3.12+", "Node 26+"],
  installation: "uv sync --locked",
  usage: "node chapter-17/documentation-and-style.ts",
  licenseName: "See LICENSE",
  contributing: "Run every quality check before opening a pull request.",
};
assert.deepEqual(missingReadmeSections(readmePlan), []);
assert.deepEqual(missingReadmeSections({ ...readmePlan, audience: "" }), ["audience"]);

// 17.2 Installing Sphinx and creating documentation
const sphinxCommands = {
  add: ["uv", "add", "--group", "docs", "sphinx"],
  quickstart: ["uv", "run", "sphinx-quickstart", "docs"],
  build: [
    "uv",
    "run",
    "sphinx-build",
    "--fail-on-warning",
    "--keep-going",
    "--nitpicky",
    "-M",
    "html",
    "docs",
    "docs/_build",
  ],
} as const;
assert.equal(sphinxCommands.build.at(-3), "html");

const sphinxIndex = `
Documentation and Style
=======================

.. toctree::
   :maxdepth: 2
   :caption: Contents

   installation
   usage
   design
   api
`.trim();

function toctreeDocuments(document: string): string[] {
  const lines = document.split("\n");
  const start = lines.findIndex((line) => line.trim() === ".. toctree::");
  if (start < 0) return [];
  const documents: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const stripped = line.trim();
    if (stripped === "" || stripped.startsWith(":")) continue;
    if (line.startsWith("   ")) documents.push(stripped);
    else if (documents.length > 0) break;
  }
  return documents;
}

assert.deepEqual(toctreeDocuments(sphinxIndex), [
  "installation",
  "usage",
  "design",
  "api",
]);

// 17.3 Using Sphinx autodoc to create the API reference
class StatsList extends Array<number> {
  /** Return the arithmetic mean.
   *
   * @returns The sum divided by the number of values.
   * @throws {RangeError} If the list is empty.
   */
  mean(): number {
    if (this.length === 0) throw new RangeError("mean requires at least one value");
    return this.reduce((total, value) => total + value, 0) / this.length;
  }
}

assert.equal(new StatsList(1, 2, 3, 4).mean(), 2.5);
assert.throws(() => new StatsList().mean(), RangeError);
const autodocConfig = {
  extensions: ["sphinx.ext.autodoc"],
  directive: ".. automodule:: package.module\n   :members:\n   :undoc-members:",
} as const;
assert.ok(autodocConfig.extensions.includes("sphinx.ext.autodoc"));
// Python docstrings survive at runtime and autodoc imports modules to inspect
// them. PEP 257 defines their high-level structure, while RST, Google, and NumPy
// styles describe markup. TypeScript JSDoc is source metadata rather than a
// runtime string.

// 17.4 Identifying other CI/CD tools in pyproject.toml
const dependencyDocument = {
  project: {
    dependencies: ["pydantic>=2.12"],
    optionalDependencies: { email: ["email-validator>=2"] },
  },
  dependencyGroups: {
    test: ["pytest>=9"],
    docs: ["sphinx>=8"],
    quality: ["ruff>=0.14", "ty>=0.0.1"],
  },
} as const;
assert.deepEqual(dependencyDocument.project.dependencies, ["pydantic>=2.12"]);
assert.deepEqual(Object.keys(dependencyDocument.dependencyGroups).toSorted(), [
  "docs",
  "quality",
  "test",
]);
// PEP 735 dependency groups are analogous to package.json devDependencies, but
// named groups allow narrower workflows. Published optional dependencies are
// consumer-facing feature extras and are closer to optional peer dependencies.

// 17.5 Using tox to run comprehensive quality checks
const toxConfiguration = {
  tool: {
    tox: {
      requires: ["tox>=4.64"],
      envList: ["py312", "quality", "docs"],
      envRunBase: { package: "skip", commands: [["pytest"]] },
      env: {
        quality: {
          commands: [
            ["ruff", "format", "--check", "."],
            ["ruff", "check", "."],
            ["ty", "check"],
          ],
        },
        docs: { commands: [sphinxCommands.build.slice(2)] },
      },
    },
  },
} as const;

assert.deepEqual(toxConfiguration.tool.tox.envList, ["py312", "quality", "docs"]);
assert.deepEqual(toxConfiguration.tool.tox.env.quality.commands[0], [
  "ruff",
  "format",
  "--check",
  ".",
]);
// tox is an isolated environment matrix and task orchestrator, similar to npm
// scripts combined with a CI matrix. Native [tool.tox] TOML is current; tox.ini
// is deprecated. Add tox when variants justify it; one locked environment can
// stay simpler.

// parseArgs is a stable Node API and demonstrates that this executable chapter
// accepts no hidden runtime configuration.
assert.deepEqual(Object.keys(parseArgs({ args: [], options: {} }).values), []);
