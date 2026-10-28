---
name: python-cookbook-chapter-notes
description: Creates and updates paired executable Python and TypeScript study notes for JavaScript and TypeScript developers learning from saved Modern Python Cookbook HTML in this repository. Use when asked to document a cookbook chapter, reconcile recipe coverage, add JS/TS comparisons or sibling examples, or fix Ruff, Pyright, Pylance, or TypeScript diagnostics in these notes; do not use for unrelated Python projects.
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
- Label clarifications that go beyond the source. Correct genuine source ambiguities without silently attributing the correction to the book.
- Keep examples deterministic and side-effect-free by default. Replace live downloads and file writes with in-memory equivalents unless external I/O is the lesson or the user requests it.

## Teach from a JavaScript and TypeScript perspective

- Assume the learner already understands modern JavaScript and TypeScript. Explain Python by connecting unfamiliar behavior to that foundation instead of reteaching general programming concepts.
- For every new Python or Markdown learning file, identify the useful JS/TS analogue and the important semantic difference for each substantive topic. Put comparisons next to the relevant example rather than in a detached appendix.
- Prioritize comparisons where transferred intuition can cause bugs: Python's numeric tower versus JavaScript `number` and `bigint`; truthiness and equality; mutability and hashing; Python type hints versus TypeScript's erased types; exceptions; iteration; async behavior; modules; regular expressions; Unicode; and bytes.
- Use exact JS/TS names and syntax in backticks, such as `Math.floor()`, template literals, `TextEncoder`, `Uint8Array`, `interface`, or tuple types. Distinguish a language feature from a library analogue.
- State whether a difference exists at runtime, only in static analysis, or both. For example, Python tuples are immutable runtime objects, while a TypeScript tuple is primarily a compile-time description of a JavaScript array unless made `readonly`.
- Do not force shallow comparisons when semantics are effectively identical. Prefer one precise contrast or gotcha over several obvious similarities.
- Every Python chapter file must have a sibling `.ts` file with the same basename and section order. Reproduce the same examples, expected results, edge cases, and assertions in TypeScript.
- Implement Python-only behavior from scratch rather than hiding the comparison behind a third-party compatibility package. Put reusable implementations in `typescript/python-compat.ts` and import them with an explicit `.ts` extension from every chapter that needs them.
- Before implementing a TypeScript helper, search `typescript/python-compat.ts`. Extend or generalize an existing helper when its semantics overlap; never copy an implementation into a new chapter. Keep a helper chapter-local only when it is presentation code or is inseparable from that single example. Promote it to the shared module as soon as it is generally useful.
- Keep the compatibility layer dependency-free and organized by Python concept. Use the single `typescript/python-compat.ts` module while it remains readable. Only introduce a `python-compat/` directory and barrel `index.ts` after the implementation is genuinely split into focused modules such as `numeric.ts`, `formatting.ts`, and `collections.ts`; do not add directory nesting speculatively.
- Give every exported TypeScript helper, type, class, and public class method JSDoc that explains what Python behavior it reproduces, every parameter, the return value, relevant thrown errors, and any deliberate semantic limitation. Documentation must explain intent, not merely restate the TypeScript signature.
- Add a concise JSDoc `@example` when it materially clarifies non-obvious semantics, such as exact arithmetic, negative floor division, Unicode escapes, byte rendering, or tuple/object dual access. Do not add examples mechanically to self-explanatory helpers; the chapter assertions remain the comprehensive executable examples.
- Prefer descriptive public names over unexplained abbreviations: use `greatestCommonDivisor` rather than `gcd`, `floorDivisionWithRemainder` rather than `divmodFloor`, `sumWithFloatingPointCompensation` rather than `accurateSum`, and `decomposeBinaryFloat`/`composeBinaryFloat` rather than exposing Python's `frexp`/`ldexp` names. Preserve the original Python API name in JSDoc so learners can connect the descriptive TypeScript helper to the chapter.
- Keep imports as narrow as their consumers require. After moving or renaming a shared helper, remove stale imports and run `npm run typecheck`; TypeScript diagnostic TS6133 means a declaration or import is present but never read.
- In the Python comments, name the corresponding TypeScript helper whenever JavaScript has no built-in equivalent. When a standard JS API exists, name that API instead.
- Keep both versions executable. Python remains authoritative for Python semantics; the TypeScript version must state where emulation is approximate, deliberately scoped, or impossible to make identical.
- Use `node:assert/strict` in TypeScript so examples are self-checking. Keep TypeScript syntax erasable so a supported Node release can run the file directly with `node chapter-name.ts`.
- Preserve runtime-versus-static distinctions. Do not claim a TypeScript type annotation provides Python-like runtime behavior unless the implementation also enforces it.

## Avoid known correctness traps

- Use `uvx` for standalone development tools in this repository. Do not substitute `uv run`: because the repository does not use uv for project dependency management, `uv run` can create an unintended `.venv` and `uv.lock`. Remove such generated residue before handoff if a tool creates it.
- With TypeScript `noUncheckedIndexedAccess`, values obtained through a computed object or array key may be `undefined` even when the surrounding type looks complete. Narrow or guard the lookup before using it; do not disable the option.
- A TypeScript `const` tuple can infer a union of its exact literal members, causing methods such as `includes()` to reject a different value that is valid for the broader domain. Widen the variable deliberately (for example, to `readonly string[]`) when the example tests arbitrary membership.
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
6. Run every sibling TypeScript chapter directly with Node and run `npm run typecheck`. The direct runtime command is required because `tsc` does not prove Node can strip the syntax.
7. When shared TypeScript helpers change, run every chapter that imports them; a compatibility-layer edit can affect chapters beyond the one currently being written.
8. Compare the Python and TypeScript console output when the paired chapters are intended to present the same tour.
9. If behavior depends on a character name, rounding rule, inferred type, or interpreter version, add a focused executable check.
10. Report exactly which source was read, which sections were covered, and which validations passed.

Treat validation as a feedback loop: fix failures caused by the work, rerun the affected checks, and hand off only after the required checks pass. A command's success proves only the property it checks; retain both static and runtime verification.

## Learn from new diagnostics

- When Ruff, Pyright, Pylance, or runtime validation reveals a new recurring or non-obvious failure mode, fix all occurrences and add a concise rule here with the diagnostic code, cause, preferred fix, and validation command.
- Do not record one-off typos or duplicate an existing rule. Generalize only as far as the evidence supports; keep this skill useful rather than exhaustive.
- Prefer fixing source code or configuration over suppressing a diagnostic. Add a narrow ignore only when the behavior is intentional, explain why beside the ignore, and verify that its scope cannot hide unrelated problems.

Pylance and the Pyright CLI share the Pyright analysis engine and the checked-in `pyrightconfig.json`. Fix the code rather than hiding diagnostics with broad ignores or weakening strict mode.
