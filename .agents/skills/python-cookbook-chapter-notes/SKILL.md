---
name: python-cookbook-chapter-notes
description: Create or update executable Python study notes from saved Modern Python Cookbook HTML in this repository. Use for chapter coverage, example adaptation, source reconciliation, or Pyright/Pylance cleanup of the cookbook notes; do not use for unrelated Python projects.
---

# Python Cookbook Chapter Notes

Produce concise, executable notes that accurately represent the supplied source and remain clean under the repository's Pyright configuration.

## Establish the source and scope

- Inspect the requested source before editing. A browser security or login page is not the book page.
- When an MCP browser is blocked by Cloudflare, say so plainly. Do not claim that indexed search excerpts are the complete page.
- Prefer a user-saved HTML file when available. A `file://` URL may be opened through the browser MCP when direct page access is blocked.
- Inventory the saved document's recipe-level headings before writing. Distinguish one linked section from an entire saved chapter.
- Interpret “all topics” as every substantive recipe in the supplied artifact, including its preparation, examples, explanation, and supplementary material. Navigation, advertising, and duplicated interface text are not content.
- State the provenance accurately in the resulting notes and handoff: direct live page, saved HTML, or indexed excerpt.

## Write executable learning notes

- Adapt and summarize; do not transcribe the chapter. Preserve the concepts, representative examples, and important caveats.
- Keep a `.py` file when runnable assertions materially improve learning. Use Markdown only when execution would add little value or the user requests it.
- Keep Markdown prose unwrapped: use one source line per logical paragraph or list item, while preserving headings, blank lines, code fences, and tables. Do not impose a prose column limit.
- Organize content in source order and make coverage auditable with section labels matching the chapter recipes.
- Use comments and docstrings for theory, runnable statements for demonstrations, and assertions for stable invariants.
- Add JavaScript comparisons only when they clarify a real semantic difference, such as Python floor division versus truncation.
- Label clarifications that go beyond the source. Correct genuine source ambiguities without silently attributing the correction to the book.
- Keep examples deterministic and side-effect-free by default. Replace live downloads and file writes with in-memory equivalents unless external I/O is the lesson or the user requests it.

## Avoid known correctness traps

- Use `uvx` for standalone development tools in this repository. Do not substitute `uv run`: because the repository does not use uv for project dependency management, `uv run` can create an unintended `.venv` and `uv.lock`. Remove such generated residue before handoff if a tool creates it.
- Let Ruff organize imports. `I001` means the import block is not in Ruff's canonical order; run `ruff check --fix` rather than hand-sorting and guessing.
- Ruff `RUF032` rejects a float literal passed directly to `Decimal()` because it usually hides binary approximation. Use a string or integer for real decimal input. If teaching the approximation itself, name the float first and make the comparison explicit rather than suppressing the rule.
- Regex matching methods return `re.Match[str] | None`. Store each result, assert or branch on `is not None`, and only then call `group()`, `groups()`, or `groupdict()`. Do not chain member access directly from `match()`, `search()`, or `fullmatch()`.
- Python `//` floors toward negative infinity; it does not truncate toward zero. Test a negative operand when explaining the distinction.
- Construct `Decimal` from strings or integers when exact decimal intent matters. Construct `Fraction` with exact inputs rather than an already-rounded float.
- Treat floating-point examples as version-sensitive. Do not assert that built-in `sum()` must be inaccurate for a chosen input; newer Python versions may improve algorithms. Assert the mathematical property or the documented behavior of `math.fsum()` instead.
- Verify Unicode code points and names independently. `U+1F000` is MAHJONG TILE EAST WIND; `MAHJONG TILE RED DRAGON` is `U+1F004`.
- Do not confuse a successful `py_compile` or runtime execution with static type safety. They answer different questions.

## Validate before handoff

1. Read `pyproject.toml` and `pyrightconfig.json`; honor their target version, selected rules, included paths, and checking mode.
2. After changing Python, run `ruff check --fix .` and then `ruff format .`. Review the changes; automatic fixes do not replace semantic verification.
3. Run clean verification passes: `ruff check .`, `ruff format --check .`, and project-wide Pyright. Prefer installed commands; `uvx ruff` and `npx pyright` are documented fallbacks.
4. Require zero lint errors, formatting changes, type errors, and warnings unless the user explicitly accepts otherwise.
5. Run every changed chapter script and `python3 -m py_compile` on it.
6. If behavior depends on a character name, rounding rule, inferred type, or interpreter version, add a focused executable check.
7. Report exactly which source was read, which sections were covered, and which validations passed.

## Learn from new diagnostics

- When Ruff, Pyright, Pylance, or runtime validation reveals a new recurring or non-obvious failure mode, fix all occurrences and add a concise rule here with the diagnostic code, cause, preferred fix, and validation command.
- Do not record one-off typos or duplicate an existing rule. Generalize only as far as the evidence supports; keep this skill useful rather than exhaustive.
- Prefer fixing source code or configuration over suppressing a diagnostic. Add a narrow ignore only when the behavior is intentional, explain why beside the ignore, and verify that its scope cannot hide unrelated problems.

Pylance and the Pyright CLI share the Pyright analysis engine and the checked-in `pyrightconfig.json`. Fix the code rather than hiding diagnostics with broad ignores or weakening strict mode.
