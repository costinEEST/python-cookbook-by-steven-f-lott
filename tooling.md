# Development tooling

This project keeps its Python examples executable, consistently formatted, lint-clean, and type-safe. Only Python is required to run the examples. The other tools support development and validation.

## Quick setup

1. Install Python 3.12 or newer.
2. Install [Visual Studio Code](https://code.visualstudio.com/) and accept the workspace's recommended extensions.
3. Install [uv](https://docs.astral.sh/uv/getting-started/installation/) if you want to run the documented `uvx` terminal commands.
4. Install a recent [Node.js](https://nodejs.org/) release if you want to run the official Pyright CLI through `npx`.

On macOS with Homebrew, the command-line prerequisites can be installed with:

```console
brew install uv node
uv python install 3.12
```

If Python 3.12 or newer and Node.js are already installed, only `uv` is missing. Confirm the setup with:

```console
python3 --version
uv --version
node --version
npx pyright --version
uvx ruff --version
```

Do not commit a virtual environment. The repository's `.gitignore` excludes `.venv`, and `uvx` runs tools in isolated environments outside the project.

## What each tool does

### Python

Python runs and compiles the chapter examples. The project targets Python 3.12 or newer, as declared independently in the Ruff and Pyright configurations.

```console
python3 chapter-01/numbers-strings-tuples.py
python3 -m py_compile chapter-01/numbers-strings-tuples.py
```

The first command exercises the examples and assertions. `py_compile` checks that the module can be compiled, but neither command performs static type checking or linting.

### TypeScript

Every Python chapter has a TypeScript sibling with the same basename, section order, examples, and assertions. Reusable Python-only behavior lives in `typescript/python-compat.ts`; chapters import and exercise it rather than copying implementations. Chapter-specific presentation code may remain local.

Node 23.6 or newer can run erasable TypeScript syntax directly. This project declares ESM mode in `package.json` and enables `erasableSyntaxOnly` in `tsconfig.json`, so no build step is needed:

```console
node chapter-01/numbers-strings-tuples.ts
npm run chapter:01:ts
```

Native Node execution strips types but does not type-check them. Install the development dependencies once and run the compiler separately:

```console
npm install
npm run typecheck
```

### Prettier

Prettier formats TypeScript, JSON, and Markdown. Markdown prose remains unwrapped because `.prettierrc.json` sets `proseWrap` to `never`.

```console
npm run format
npm run format:check
```

### Running code interactively

The chapter files can be run as complete scripts, but VS Code can also execute selected lines or cell-like sections without leaving the editor. Markdown and notebook workflows are useful when explanatory prose and executable Python need to appear together.

- [Run Python code in Visual Studio Code](https://code.visualstudio.com/docs/python/run) explains running a file, selection, or line from a Python editor.
- [Jupyter notebooks in Visual Studio Code](https://code.visualstudio.com/docs/python/jupyter-support-py) explains interactive cells and notebook-style execution alongside formatted Markdown.
- [Run Python files with a Colab-oriented VS Code workflow](https://www.technetexperts.com/vscode-colab-run-py-files-guide/) is a third-party guide for executing `.py` files in a notebook/cloud-oriented workflow.

For this repository, the `.py` files remain the canonical notes because their assertions can be checked by normal Python, Ruff, and Pyright. Interactive execution is a convenience for exploring one example at a time.

### uv and uvx

[`uv`](https://docs.astral.sh/uv/) is a Python tool and environment manager. `uvx` is an alias for `uv tool run`; it downloads and runs a command-line tool in an isolated environment without adding that tool to this repository.

This project uses `uvx` to run Ruff:

```console
uvx ruff check .
uvx ruff format --check .
```

Installing `uv` is therefore necessary for these exact commands, but it is not necessary for running the cookbook examples or using the VS Code extensions. For frequent use, Ruff can instead be installed persistently:

```console
uv tool install ruff
ruff check .
```

See the official [uv installation guide](https://docs.astral.sh/uv/getting-started/installation/), [uv tool guide](https://docs.astral.sh/uv/guides/tools/), and [Ruff installation guide](https://docs.astral.sh/ruff/installation/).

### Ruff

[Ruff](https://docs.astral.sh/ruff/) provides three jobs for this project:

- linting for correctness and maintainability;
- import sorting, including diagnostic `I001`;
- deterministic code formatting.

Its configuration is in [`pyproject.toml`](pyproject.toml). The important settings are:

- `target-version = "py312"`;
- line length of 88;
- core pycodestyle and Pyflakes checks;
- import sorting (`I`), Bugbear (`B`), pyupgrade (`UP`), simplify (`SIM`), and Ruff-specific (`RUF`) rules;
- formatting of code examples inside docstrings.

Apply safe fixes and formatting with:

```console
uvx ruff check --fix .
uvx ruff format .
```

Then verify without modifying files:

```console
uvx ruff check .
uvx ruff format --check .
```

### Pylance and Pyright

[Pylance](https://marketplace.visualstudio.com/items?itemName=ms-python.vscode-pylance) is the recommended VS Code language server. It uses Microsoft's Pyright type checker and reports problems while editing.

[Pyright](https://github.com/microsoft/pyright) is the command-line type checker. The official CLI is distributed through npm and can be run without a global installation:

```console
npx pyright
```

Node.js/npm is needed only for this CLI command. If work is performed entirely inside VS Code, Pylance can provide editor diagnostics without a separate Pyright CLI installation. The CLI remains the reproducible final check.

The shared project configuration is [`pyrightconfig.json`](pyrightconfig.json):

- all `chapter-*` directories are included;
- Python 3.12 is the target;
- strict type checking is enabled;
- caches, virtual environments, and Git internals are excluded.

Because Pylance and Pyright consume this project configuration, editor and terminal diagnostics should agree. See Microsoft's [Pyright installation guide](https://github.com/microsoft/pyright/blob/main/docs/installation.md) and [configuration reference](https://github.com/microsoft/pyright/blob/main/docs/configuration.md).

### VS Code extensions

The recommendations in [`.vscode/extensions.json`](.vscode/extensions.json) are:

- Python (`ms-python.python`);
- Pylance (`ms-python.vscode-pylance`);
- Ruff (`charliermarsh.ruff`);
- Prettier (`esbenp.prettier-vscode`).

Workspace behavior is configured in [`.vscode/settings.json`](.vscode/settings.json). For Python files, saving runs Ruff formatting, safe fixes, and import sorting. TypeScript and Markdown use Prettier on save. Pylance supplies Python type diagnostics, while `tsc` performs the TypeScript check from the terminal. These editor automations complement rather than replace the terminal validation commands.

## Validation workflow

After changing Python code, run the modifying steps first:

```console
uvx ruff check --fix .
uvx ruff format .
```

Then run the complete non-modifying quality gate:

```console
uvx ruff check .
uvx ruff format --check .
npx pyright
python3 chapter-01/numbers-strings-tuples.py
python3 -m py_compile chapter-01/numbers-strings-tuples.py
npm run format:check
npm run typecheck
node chapter-01/numbers-strings-tuples.ts
```

Each tool catches a different class of problem. A successful runtime does not prove type safety, and clean type checking does not prove formatting or runtime behavior.

## Configuration map

| File | Purpose |
| --- | --- |
| `pyproject.toml` | Ruff lint and format rules |
| `pyrightconfig.json` | Shared strict Pyright/Pylance analysis rules |
| `.vscode/extensions.json` | Recommended VS Code extensions |
| `.vscode/settings.json` | Pylance selection plus Ruff and Prettier actions on save |
| `.agents/skills/python-cookbook-chapter-notes/SKILL.md` | Codex workflow and project-specific gotchas |
| `.prettierrc.json` | TypeScript, JSON, and Markdown formatting |
| `package.json` and `package-lock.json` | Node version, scripts, and pinned development tools |
| `tsconfig.json` | Strict erasable TypeScript checked for native Node execution |
| `typescript/python-compat.ts` | Shared dependency-free implementations of Python behavior absent from JavaScript |
