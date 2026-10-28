# Learning workflow and development tooling

This repository helps a JavaScript and TypeScript developer learn Python from Steven F. Lott's _Modern Python Cookbook, Third Edition_. Each book chapter is summarized as executable Python notes, explained from a JS/TS perspective, and paired with a TypeScript version that reproduces the same examples and assertions.

The tooling supports that learning workflow: [uv](https://docs.astral.sh/uv/) manages the Python interpreter and quality tools, while npm manages TypeScript and formatting tools. Checked-in lockfiles make the same commands reproducible from Bash, zsh, PowerShell, Windows Terminal, and CI without activating a virtual environment.

## Quick setup

Install:

1. [uv 0.12.3 or newer](https://docs.astral.sh/uv/getting-started/installation/);
2. [Node.js 23.6 or newer](https://nodejs.org/);
3. optionally, [Visual Studio Code](https://code.visualstudio.com/) and the workspace's recommended extensions.

From the repository root, prepare both locked environments:

```console
uv sync --locked
npm ci
```

Confirm the tools:

```console
uv --version
uv run python --version
uv run ruff --version
uv run ty --version
node --version
npm --version
```

These commands are intentionally shell-neutral. They do not use virtual-environment activation, POSIX environment-variable prefixes, shell-specific path syntax, or multiline continuations.

## Project structure

The Python side is deliberately a uv project that is not built or published as a package:

- `.python-version` selects Python 3.12 for uv;
- `pyproject.toml` declares the Python requirement, development tools, Ruff rules, ty scope, and `package = false`;
- `uv.lock` pins Ruff and ty across supported platforms;
- `.venv/` is uv's generated local environment and remains ignored.

The TypeScript side remains an npm project:

- `package.json` declares Node compatibility, scripts, and development tools;
- `package-lock.json` pins TypeScript, Node type definitions, and Prettier;
- `tsconfig.json` enables strict, erasable TypeScript that Node can execute directly;
- `typescript/python-compat.ts` contains dependency-free Python compatibility helpers shared by chapter files.

Commit both lockfiles. Do not commit `.venv/` or `node_modules/`.

## Why the project uses uv and ty

The project migrated from standalone `uvx` commands and Pyright/Pylance to a locked uv project with ty after Astral published [_Bringing uv and ty together_](https://astral.sh/blog/uv-ty-integration) on October 13, 2026. The article introduced first-class uv project discovery for ty and the unified `uv check` command.

This repository adopts that workflow so Python selection, development dependencies, editor analysis, and command-line type checking share the same project metadata. The integration is still experimental, so its version requirements and limitations are documented below and the lockfile is committed for reproducibility.

## Running chapter examples

### Python

Use `uv run python` instead of relying on platform-specific launcher names such as `python3` or `py`:

```console
uv run --locked python chapter-01/numbers-strings-tuples.py
uv run --locked python -m py_compile chapter-01/numbers-strings-tuples.py
```

The first command executes the examples and assertions. `py_compile` verifies compilation, but neither command replaces linting or static type checking.

### TypeScript

Node 23.6 or newer can execute the repository's erasable TypeScript directly:

```console
node chapter-01/numbers-strings-tuples.ts
npm run chapter:01:ts
```

Native execution strips types but does not check them. Use the compiler separately:

```console
npm run typecheck
```

Every Python chapter has a TypeScript sibling with the same basename, section order, examples, and assertions. Reusable Python-only behavior lives in `typescript/python-compat.ts`.

## Python quality tools

### Ruff

[Ruff](https://docs.astral.sh/ruff/) provides linting, import sorting, and formatting. It is declared in the uv development dependency group and pinned by `uv.lock`.

Apply safe fixes and formatting:

```console
uv run --locked ruff check --fix .
uv run --locked ruff format .
```

Verify without modifying files:

```console
uv run --locked ruff check .
uv run --locked ruff format --check .
```

Ruff configuration remains in `pyproject.toml`, including Python 3.12, an 88-character code width, import sorting, Bugbear, pyupgrade, simplify, and Ruff-specific rules.

### ty and uv check

[ty](https://docs.astral.sh/ty/) is the Python type checker and language server. The project uses Astral's experimental uv integration:

```console
uv check --locked
```

`uv check` prepares the environment and runs the ty version pinned in `uv.lock`. The project-wide ty source scope is configured under `[tool.ty.src]` in `pyproject.toml`.

The integration is experimental as of October 2026. `uv check` currently runs ty only; it does not replace the separate Ruff lint and format commands. The project requires uv 0.12.3 or newer, the minimum version announced for this integration.

See the [uv check CLI reference](https://docs.astral.sh/uv/reference/cli/#uv-check) and [ty configuration reference](https://docs.astral.sh/ty/configuration/) for the current command and configuration details.

## TypeScript and Markdown formatting

Prettier formats TypeScript, JSON, and Markdown. Markdown prose remains unwrapped because `.prettierrc.json` sets `proseWrap` to `never`.

```console
npm run format
npm run format:check
```

## Visual Studio Code

The workspace recommends:

- Python (`ms-python.python`);
- ty (`astral-sh.ty`);
- Ruff (`charliermarsh.ruff`);
- Prettier (`esbenp.prettier-vscode`).

The workspace selects ty instead of Pylance to avoid running two Python language servers. `ty.experimental.useUv` is set to `"on"`, enabling uv project discovery and environment preparation, and `ty.diagnosticMode` is set to `"workspace"`.

Saving Python runs Ruff formatting, safe fixes, and import sorting. TypeScript and Markdown use Prettier on save. Editor automation complements rather than replaces terminal validation.

## Running code interactively

The chapter files can be run as complete scripts, but VS Code can also execute selected lines or cell-like sections.

- [Run Python code in Visual Studio Code](https://code.visualstudio.com/docs/python/run) covers files, selections, and lines.
- [Jupyter notebooks in Visual Studio Code](https://code.visualstudio.com/docs/python/jupyter-support-py) covers interactive cells and Markdown.
- [Run Python files with a Colab-oriented VS Code workflow](https://www.technetexperts.com/vscode-colab-run-py-files-guide/) is a third-party cloud-oriented workflow.

The `.py` files remain the canonical Python notes because their assertions can be checked by normal Python, Ruff, and ty.

## Cross-platform validation workflow

Run modifying format steps first:

```console
uv run --locked ruff check --fix .
uv run --locked ruff format .
npm run format
```

Then run the non-modifying quality gate:

```console
uv lock --check
uv run --locked ruff check .
uv run --locked ruff format --check .
uv check --locked
uv run --locked python chapter-01/numbers-strings-tuples.py
uv run --locked python -m py_compile chapter-01/numbers-strings-tuples.py
uv run --locked python chapter-02/statements-and-syntax.py
uv run --locked python -m py_compile chapter-02/statements-and-syntax.py
uv run --locked python chapter-03/function-definitions.py
uv run --locked python -m py_compile chapter-03/function-definitions.py
npm run format:check
npm run typecheck
node chapter-01/numbers-strings-tuples.ts
node chapter-02/statements-and-syntax.ts
node chapter-03/function-definitions.ts
```

Enter each command separately in Bash, zsh, PowerShell, Command Prompt, or a CI step. No command depends on chaining operators such as `&&`, a POSIX-only environment assignment such as `NAME=value command`, or activating `.venv`.

Each tool proves a different property. Runtime success does not prove type safety, and a clean type check does not prove formatting or runtime behavior.

## Configuration map

| File | Purpose |
| --- | --- |
| `.python-version` | Python version selected by uv |
| `pyproject.toml` | Project metadata, uv behavior, locked development dependencies, Ruff rules, and ty scope |
| `uv.lock` | Cross-platform Python tool versions and hashes |
| `.vscode/extensions.json` | Recommended VS Code extensions |
| `.vscode/settings.json` | uv-backed ty integration plus Ruff and Prettier actions on save |
| `.agents/skills/python-cookbook-chapter-notes/SKILL.md` | Codex workflow and project-specific gotchas |
| `.prettierrc.json` | TypeScript, JSON, and Markdown formatting |
| `package.json` and `package-lock.json` | Node version, scripts, and pinned development tools |
| `tsconfig.json` | Strict erasable TypeScript checked for native Node execution |
| `typescript/python-compat.ts` | Shared dependency-free implementations of Python behavior absent from JavaScript |
