---
name: python-cookbook-chapter-notes
description: Creates and updates paired executable Python and TypeScript study notes and the root Python-for-TypeScript reference for saved Modern Python Cookbook chapters in this repository. Use when asked to document a cookbook chapter, reconcile recipe coverage, add JS/TS comparisons, maintain the cheatsheet, or fix Ruff, ty, or TypeScript diagnostics in these notes; do not use for unrelated Python projects.
---

# Python Cookbook Chapter Notes

Produce concise, executable notes that accurately represent the supplied source and remain clean under the repository's locked uv, Ruff, and ty configuration.

## Keep the root reference synchronized

- Every time a chapter is created or materially expanded, update `python-for-typescript-developers.md` in the same change. Replace that chapter's roadmap placeholder with concise, verified syntax, semantics, terminology, TypeScript comparisons, and links to its executable Python and TypeScript notes.
- Treat Chapters 1–6 as completed and Chapters 7–17 as the planned progression until their paired files exist. Never present roadmap material as verified chapter coverage.
- Keep the reference optimized for recall: compact side-by-side idioms, small executable-looking examples, plain-language definitions, and high-value transfer warnings for TypeScript developers. Avoid duplicating the full chapter notes.
- Preserve the 17-chapter learning path and its exact chapter titles. Keep the root `readme.md` link to the reference and add new chapter file links to both files when a chapter is added.
- Use these sites as structural inspiration, not text to copy: [Programming Idioms Python/JavaScript cheatsheet](https://programming-idioms.org/cheatsheet/Python/JS) for task-oriented, side-by-side runtime comparisons, [Python Morsels terminology](https://www.pythonmorsels.com/terms/) for approachable definitions, and [Real Python learning paths](https://realpython.com/learning-paths/) for staged organization.

## Establish the source and scope

- When a request includes URLs, open each URL with the Chrome MCP before relying on its content. Inspect the rendered page and its relevant headings, tables, examples, or article body; a search result or indexed excerpt does not count as opening the URL.
- If opening a page fails because the browser profile is already in use (for example, `The browser is already running for .../.cache/chrome-devtools-mcp/chrome-profile`), recover the Chrome MCP as follows:
  1. Try `list_pages` first. If it succeeds, reuse that MCP browser and open or navigate a page instead of starting another browser instance.
  2. If the MCP cannot list or open pages, inspect only the relevant processes with `ps aux | rg 'chrome-devtools-mcp|chrome-profile'`. The sandbox may reject `ps`; if so, request approval for this exact read-only inspection with a narrow reusable `ps aux` prefix.
  3. Distinguish the current MCP process from an older orphan by start time and command line. Identify the stale `npm exec chrome-devtools-mcp...` process, its `chrome-devtools-mcp` child, and the dedicated browser main process whose command contains `--user-data-dir=.../.cache/chrome-devtools-mcp/chrome-profile`. Do not target an ordinary user browser or kill every Chrome, Edge, Node, or npm process.
  4. Request approval to send a normal termination signal to the explicit stale PIDs, for example `kill <stale-npm-pid> <stale-mcp-pid> <stale-browser-pid>`. Do not use a broad `pkill`, wildcard, command substitution, or `kill -9` as the first attempt. Retry the Chrome MCP after termination.
  5. Only when process inspection confirms that no browser uses the MCP profile, inspect `~/.cache/chrome-devtools-mcp/chrome-profile/SingletonLock`, `SingletonSocket`, and `SingletonCookie`. If stale singleton files alone remain, request approval to remove those exact files and retry. Never delete the whole `chrome-devtools-mcp` cache or profile; it may contain useful browser state.
  6. Stop once `list_pages` or `new_page` succeeds. Report whether recovery required process termination or stale singleton cleanup.
- If Chrome MCP cannot load the page, report the exact blocker and then use the best available fallback, such as a user-saved HTML file or indexed excerpt. Label fallback provenance accurately and do not imply that partial content is the complete page.
- Inspect the requested source before editing. A browser security or login page is not the book page.
- When the Chrome MCP is blocked by Cloudflare or another access control, say so plainly. Do not claim that indexed search excerpts are the complete page.
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
- Add code snippets at any point when they help explain a Python quirk, semantic edge case, implementation detail, or other inner working, even when the material is not part of the book. Integrate these snippets naturally into the most relevant chapter and mirror them in TypeScript when applicable; they do not need a supplementary-example or external-provenance label.
- Correct genuine source ambiguities and do not falsely attribute independent explanations or examples to the book.
- Keep examples deterministic and side-effect-free by default. Replace live downloads and file writes with in-memory equivalents unless external I/O is the lesson or the user requests it.

## Teach from a JavaScript and TypeScript perspective

- Assume the learner already understands modern JavaScript and TypeScript. Explain Python by connecting unfamiliar behavior to that foundation instead of reteaching general programming concepts.
- For every new Python or Markdown learning file, identify the useful JS/TS analogue and the important semantic difference for each substantive topic. Put comparisons next to the relevant example rather than in a detached appendix.
- Prioritize comparisons where transferred intuition can cause bugs: Python's numeric tower versus JavaScript `number` and `bigint`; truthiness and equality; mutability and hashing; Python type hints versus TypeScript's erased types; exceptions; iteration; async behavior; modules; regular expressions; Unicode; and bytes.
- Use exact JS/TS names and syntax in backticks, such as `Math.floor()`, template literals, `TextEncoder`, `Uint8Array`, `interface`, or tuple types. Distinguish a language feature from a library analogue.
- Follow TypeScript naming conventions in executable notes: use lower camelCase for variables, functions, methods, and properties (`easyWay`); use PascalCase for classes, interfaces, type aliases, and enums (`DicePair`); and reserve UPPER_SNAKE_CASE for genuine module-level constants. Preserve an external schema key or the original Python API spelling only when the example intentionally models it, and use the idiomatic TypeScript name in Python and Markdown commentary that refers to the TypeScript identifier.
- When a numeric literal uses a non-decimal notation such as hexadecimal, binary, or octal, give a meaningful name to a reused or algorithmically significant value. For a one-off teaching literal, add its decimal value and purpose in a nearby comment. Explain bit masks and shifts at the operation so learners do not have to infer the representation.
- At each substantive mutable-collection example, state which object is mutated and what the operation returns. Contrast it locally with any nearby non-mutating operation that returns a new collection; cover statements such as `del`, indexed assignment, slice assignment, and augmented assignment as well as methods. Demonstrate unusual return behavior with an assertion when practical, especially Python's `pop()` returning the removed item and most other mutators returning `None`.
- Explain assignment, aliasing, and copying in terms of names, references, and object graphs. Distinguish a new outer container from shared nested objects, and demonstrate shallow versus deep copying when the distinction is substantive. Do not present "stack versus heap" as a portable Python-language rule: if useful, label managed-heap objects and frame-local references as CPython implementation context and note that exact memory placement is implementation-specific.
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
- Before hand-writing Node-facing behavior, check the current official Node.js and ECMAScript documentation for a stable platform API. Prefer built-ins such as `node:util.parseArgs`, `node:readline/promises`, `Console` with writable streams, `node:child_process`, and `process.env` when they cover the recipe; write only the semantic validation or framework behavior the platform does not supply. State the supported Node baseline in `package.json` and the chapter runtime comment.
- When the supported ECMAScript baseline gains a native equivalent, migrate every caller and remove the obsolete compatibility helper. Examples for Node 26 include `Set.prototype.union()`/`intersection()`/`difference()`/`symmetricDifference()`, copying array methods such as `toReversed()`, and `using` with `Symbol.dispose` for deterministic cleanup. Do not adopt an available Node API whose official stability is still experimental or early-development without labeling and justifying it.
- Use `node:assert/strict` in TypeScript so examples are self-checking. Keep TypeScript syntax erasable so a supported Node release can run the file directly with `node chapter-name.ts`.
- Preserve runtime-versus-static distinctions. Do not claim a TypeScript type annotation provides Python-like runtime behavior unless the implementation also enforces it.

## Avoid known correctness traps

- This repository is a non-package uv project. Commit `uv.lock`, keep `.venv/` ignored, and use `uv run --locked` for Python and Ruff so every supported shell uses the locked environment without activation.
- Before adding a direct Python or TypeScript dependency, check whether the supported language/runtime or an existing dependency already provides the required behavior. When a new direct dependency is justified, document beside its declaration when the file format supports comments: what feature needs it, what it does, and why the standard library/runtime or existing dependencies are insufficient. Also update `tooling.md` with the same durable rationale and identify whether it is a runtime or development dependency. Because JSON does not support comments, explain `package.json` dependencies in `tooling.md` rather than inventing a comment mechanism. Generated lockfile entries and transitive dependencies do not require individual explanations. Keep these explanations synchronized when a dependency is replaced or removed.
- Use `uv check --locked` for project-wide Python type checking. The uv–ty integration is experimental and currently runs ty only, so retain separate Ruff lint and format checks.
- Keep documented commands portable across Bash, zsh, PowerShell, Command Prompt, and CI: use forward-slash relative paths accepted by each tool, put one command on each line, and avoid shell-specific environment assignments, activation commands, continuations, and chaining operators.
- With TypeScript `noUncheckedIndexedAccess`, values obtained through a computed object or array key may be `undefined` even when the surrounding type looks complete. Narrow or guard the lookup before using it; do not disable the option.
- A TypeScript `const` tuple can infer a union of its exact literal members, causing methods such as `includes()` to reject a different value that is valid for the broader domain. Widen the variable deliberately (for example, to `readonly string[]`) when the example tests arbitrary membership.
- TypeScript diagnostic TS2550 can mean the Node runtime supports a standardized API but the configured compiler library predates it. For a repository intentionally targeting the current Node baseline, use `target: "ESNext"` (or the narrow matching `lib`) rather than recreating the API; verify with `npm run typecheck` and direct Node execution.
- Let Ruff organize imports. `I001` means the import block is not in Ruff's canonical order; run `uv run --locked ruff check --fix .` rather than hand-sorting and guessing.
- Ruff `RUF032` rejects a float literal passed directly to `Decimal()` because it usually hides binary approximation. Use a string or integer for real decimal input. If teaching the approximation itself, name the float first and make the comparison explicit rather than suppressing the rule.
- Ruff `UP040` requires Python 3.12's `type Name = ...` statement for type aliases. Do not import or annotate with the legacy `typing.TypeAlias`; run `uv run --locked ruff check .` to catch stale aliases.
- Regex matching methods return `re.Match[str] | None`. Store each result, assert or branch on `is not None`, and only then call `group()`, `groups()`, or `groupdict()`. Do not chain member access directly from `match()`, `search()`, or `fullmatch()`.
- Python `//` floors toward negative infinity; it does not truncate toward zero. Test a negative operand when explaining the distinction.
- Construct `Decimal` from strings or integers when exact decimal intent matters. Construct `Fraction` with exact inputs rather than an already-rounded float.
- Treat floating-point examples as version-sensitive. Do not assert that built-in `sum()` must be inaccurate for a chosen input; newer Python versions may improve algorithms. Assert the mathematical property or the documented behavior of `math.fsum()` instead.
- Verify Unicode code points and names independently. `U+1F000` is MAHJONG TILE EAST WIND; `MAHJONG TILE RED DRAGON` is `U+1F004`.
- When teaching code that is intentionally invalid or guaranteed to fail static analysis, keep the invalid form in a source string or raise the representative exception explicitly. The executable notes themselves must remain clean under ty.
- Do not confuse a successful `py_compile` or runtime execution with static type safety. They answer different questions.

## Validate before handoff

1. Read `pyproject.toml`; honor its Python requirement, locked development tools, Ruff rules, and ty source scope.
2. After changing Python, run `uv run --locked ruff check --fix .` and then `uv run --locked ruff format .`. Review the changes; automatic fixes do not replace semantic verification.
3. Run clean verification passes: `uv lock --check`, `uv run --locked ruff check .`, `uv run --locked ruff format --check .`, and `uv check --locked`.
4. Require zero lint errors, formatting changes, type errors, and warnings unless the user explicitly accepts otherwise.
5. Run every changed chapter with `uv run --locked python <chapter-path>` and compile it with `uv run --locked python -m py_compile <chapter-path>`.
6. Run `npm run format:check`, `npm run typecheck`, and every sibling TypeScript chapter directly with Node. The direct runtime command is required because `tsc` does not prove Node can strip the syntax.
7. When shared TypeScript helpers change, run every chapter that imports them; a compatibility-layer edit can affect chapters beyond the one currently being written.
8. Compare the Python and TypeScript console output when the paired chapters are intended to present the same tour.
9. If behavior depends on a character name, rounding rule, inferred type, or interpreter version, add a focused executable check.
10. Report exactly which source was read, which sections were covered, and which validations passed.

Treat validation as a feedback loop: fix failures caused by the work, rerun the affected checks, and hand off only after the required checks pass. A command's success proves only the property it checks; retain both static and runtime verification.

## Learn from new diagnostics

- When Ruff, ty, TypeScript, or runtime validation reveals a new recurring or non-obvious failure mode, fix all occurrences and add a concise rule here with the diagnostic code, cause, preferred fix, and validation command.
- Do not record one-off typos or duplicate an existing rule. Generalize only as far as the evidence supports; keep this skill useful rather than exhaustive.
- Prefer fixing source code or configuration over suppressing a diagnostic. Add a narrow ignore only when the behavior is intentional, explain why beside the ignore, and verify that its scope cannot hide unrelated problems.

The ty VS Code extension and `uv check --locked` use the same `[tool.ty]` configuration. Fix source code or narrow configuration instead of hiding diagnostics with broad ignores.
