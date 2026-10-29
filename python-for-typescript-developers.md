# Python for TypeScript Developers

A syntax cheatsheet, terminology guide, and learning path for developers who already know modern TypeScript. Python examples target Python 3.12 or newer.

This is a memory aid, not a substitute for the executable notes. Chapters 1–5 summarize the material currently in this repository. Chapters 6–17 are a roadmap and will gain verified examples as their notes are added.

## How to use this reference

1. Start with the translation table when you know the TypeScript spelling but not Python's.
2. Read the completed chapter summaries in order for the semantic differences that cause bugs.
3. Run each linked Python and TypeScript file; their assertions make the examples self-checking.
4. Use the glossary to refresh Python-specific vocabulary.

## At a glance: TypeScript to Python

| Intent | TypeScript | Python |
| --- | --- | --- |
| Bind a value | `const name = "Ada"` | `name = "Ada"` |
| Mutable binding | `let count = 0` | `count = 0` |
| Constant convention | `const MAX = 10` | `MAX = 10` |
| No value | `null` / `undefined` | `None` |
| Boolean | `true`, `false` | `True`, `False` |
| Print a value | `console.log(value)` | `print(value)` |
| String interpolation | `` `Hi ${name}` `` | `f"Hi {name}"` |
| Length | `items.length` | `len(items)` |
| Membership | `items.includes(x)` | `x in items` |
| Identity | `a === b` for objects | `a is b` |
| Value equality | `a === b` | `a == b` |
| Logical operators | `&&`, `\|\|`, `!` | `and`, `or`, `not` |
| Conditional | `if (ready) { ... }` | `if ready:` plus indentation |
| Else-if | `else if` | `elif` |
| Counted range | `for (let i = 0; i < 3; i++)` | `for i in range(3):` |
| Iterate values | `for (const item of items)` | `for item in items:` |
| Iterate index and value | `items.entries()` | `enumerate(items)` |
| Iterate key and value | `map.entries()` | `mapping.items()` |
| Function | `function add(a: number): number` | `def add(a: int) -> int:` |
| Arrow/lambda | `(x) => x * 2` | `lambda x: x * 2` |
| Rest parameters | `(...items: number[])` | `(*items: int)` |
| Options/rest object | `({ limit }: Options)` / `...rest` | keyword args / `**kwargs` |
| Array | `number[]` | `list[int]` |
| Readonly fixed tuple | `readonly [string, number]` | `tuple[str, int]` |
| Set | `Set<string>` | `set[str]` |
| Map | `Map<string, number>` | `dict[str, int]` |
| Object shape | `interface User { name: string }` | `class User(TypedDict): ...` |
| Comprehension | `xs.filter(p).map(f)` | `[f(x) for x in xs if p(x)]` |
| Slice copy | `xs.slice(1, 3)` | `xs[1:3]` |
| Last item | `xs.at(-1)` | `xs[-1]` |
| Reverse in place | `xs.reverse()` | `xs.reverse()` |
| Swap values | `[a, b] = [b, a]` | `a, b = b, a` |
| Parse base-10 integer | `Number.parseInt(text, 10)` | `int(text, 10)` |
| Exception | `throw new Error()` | `raise ValueError()` |
| Handle exception | `try { } catch (error) { }` | `try: ... except ValueError as error:` |
| Guaranteed cleanup | `try { } finally { }` | `try: ... finally:` or `with` |
| Entry-point check | `if (import.meta.main)` | `if __name__ == "__main__":` |

> Python has no `let`/`const` distinction. Uppercase names communicate “constant” by convention; the runtime does not freeze them.

## Learning path

### Stage 1 — Core language and collections

#### Chapter 1: Numbers, Strings, and Tuples

[Python notes](chapter-01/numbers-strings-tuples.py) · [TypeScript notes](chapter-01/numbers-strings-tuples.ts)

Choose numeric types by meaning:

```python
from decimal import Decimal
from fractions import Fraction

measurement = 0.1  # float: IEEE-754 binary64, like JS number
price = Decimal("19.99")  # exact decimal; construct from text
ratio = Fraction(2, 3)  # exact rational number
quotient = 5 / 2  # 2.5
floor_quotient = -5 // 2  # -3, floors toward negative infinity
remainder = -5 % 2  # 1
```

Python `int` has arbitrary precision, closer to JavaScript `bigint` than `number`, but mixes naturally with `float` in many expressions. Python has built-in complex numbers; JavaScript does not.

Strings are immutable Unicode sequences:

```python
name = "Ada"
message = f"{name=}, {len(name)=}"  # "name='Ada', len(name)=3"
first, *middle, last = "Python"
utf8 = "🐍".encode("utf-8")
text = utf8.decode("utf-8")
```

Python indexes Unicode code points, while JavaScript indexes UTF-16 code units. `len("🐍") == 1`, but `"🐍".length === 2`.

Tuples are immutable runtime sequences:

```python
point = (10, 20)
singleton = (10,)  # the comma creates the tuple
x, y = point
```

A TypeScript tuple is still a JavaScript array at runtime and is mutable unless separately protected. Python tuple immutability is shallow: a tuple may still refer to a mutable list.

#### Chapter 2: Statements and Syntax

[Python notes](chapter-02/statements-and-syntax.py) · [TypeScript notes](chapter-02/statements-and-syntax.ts)

Blocks use a colon and indentation, not braces:

```python
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
else:
    grade = "C"
```

Expressions continue safely inside `()`, `[]`, and `{}`. Adjacent string literals concatenate implicitly, unlike TypeScript.

```python
labels = "first second"  # "first second"
```

Loops and exceptions have Python-specific clauses:

```python
for item in items:
    if matches(item):
        result = item
        break
else:
    result = None  # runs only when no break occurred

try:
    load()
except FileNotFoundError as error:
    recover(error)
except Exception:
    raise  # re-raise unexpected failures
```

Catch specific exceptions before broad ones. A bare `except:` also catches shutdown-style exceptions such as `KeyboardInterrupt`; usually catch `Exception` instead.

The walrus operator `:=` binds and returns a value inside an expression. Ordinary `=` remains a statement, unlike JavaScript assignment.

```python
while chunk := stream.read(1024):
    consume(chunk)
```

Use `with` for deterministic cleanup—the role often served by `try/finally` in TypeScript:

```python
with open("data.txt", encoding="utf-8") as source:
    text = source.read()
```

#### Chapter 3: Function Definitions

[Python notes](chapter-03/function-definitions.py) · [TypeScript notes](chapter-03/function-definitions.ts)

```python
def greet(name: str, punctuation: str = "!") -> str:
    """Return a greeting; annotations do not enforce types at runtime."""
    return f"Hello, {name}{punctuation}"


greet("Ada")
greet(name="Ada", punctuation=".")  # keyword arguments
```

Parameter markers control call syntax:

```python
def example(position_only, /, normal, *, keyword_only=False): ...
```

- Before `/`: positional only.
- Between `/` and `*`: positional or keyword.
- After `*`: keyword only; an options object is the closest TypeScript idiom.
- `*args`: extra positional arguments collected as a tuple.
- `**kwargs`: extra keyword arguments collected as a dictionary.

Defaults are evaluated once when `def` executes. Never use a mutable default for per-call state:

```python
def append_item(item: str, items: list[str] | None = None) -> list[str]:
    if items is None:
        items = []
    items.append(item)
    return items
```

Decorators wrap or transform functions. `functools.partial()` pre-binds arguments. Generators use `yield` to produce values lazily. Prefer iteration to deep recursion because Python does not optimize tail calls.

#### Chapter 4: Built-In Data Structures Part 1: Lists and Sets

[Python notes](chapter-04/lists-and-sets.py) · [TypeScript notes](chapter-04/lists-and-sets.ts)

Lists are mutable sequences:

```python
values = [10, 20, 30]
values.append(40)  # mutates; returns None
removed = values.pop()  # mutates; returns 40
copy = values[:]  # new outer list, shallow copy
evens = [x * 2 for x in values if x % 2 == 0]
values[1:2] = [21, 22]  # slice assignment mutates
```

Unlike JavaScript `push()`, Python `append()` returns `None`. `+`, slicing, and comprehensions return new lists; `append()`, `extend()`, `insert()`, `remove()`, `reverse()`, and `sort()` mutate and normally return `None`.

Sets store unique hashable values and optimize membership:

```python
left = {1, 2, 3}
right = {3, 4}
union = left | right  # {1, 2, 3, 4}, new set
common = left & right  # {3}
only_left = left - right  # {1, 2}
left.add(5)  # mutates; returns None
empty = set()  # {} would be an empty dict
```

Python does not promise a useful set iteration order. Elements must be hashable, so a list cannot be a set member; TypeScript `Set` accepts objects and compares them by identity.

Assignment creates aliases. A shallow copy creates a new outer collection but shares nested objects; `copy.deepcopy()` recursively copies an object graph when that is actually needed.

#### Chapter 5: Built-In Data Structures Part 2: Dictionaries

[Python notes](chapter-05/dictionaries.py) · [TypeScript notes](chapter-05/dictionaries.ts)

Dictionaries are insertion-ordered mappings with hashable keys:

```python
scores = {"Ada": 10, "Grace": 12}
scores["Linus"] = 8  # insert or replace
ada = scores.get("Ada", 0)  # default without insertion
removed = scores.pop("Linus")  # mutates and returns the value

for name, score in scores.items():
    print(name, score)

squares = {n: n * n for n in range(4)}
merged = scores | {"Ada": 11}  # new dict; right side wins
```

`in` checks keys, not values. A Python `dict` is often like a JavaScript `Map`; a string-keyed object is also a useful analogy, but Python keys are not coerced to strings.

Use specialized mapping shapes deliberately:

```python
from collections import Counter, defaultdict
from typing import TypedDict

counts = Counter("mississippi")
groups: defaultdict[str, list[int]] = defaultdict(list)
groups["odd"].append(1)  # missing lookup inserts a list


class User(TypedDict):
    name: str
    active: bool
```

`TypedDict` describes a fixed dictionary shape to static checkers, similarly to a TypeScript interface. It creates no runtime validator or new dictionary class.

### Stage 2 — Interfaces and object design

The following chapters are roadmap entries. Their summaries will be replaced with verified syntax and TypeScript comparisons when their paired notes are added.

#### Chapter 6: User Inputs and Outputs

Planned focus: `input()`, `print()`, format specifications, command-line arguments, text streams, and the boundary between Unicode text and bytes.

#### Chapter 7: Basics of Classes and Objects

Planned focus: class syntax, instances, `self`, `__init__`, attributes, methods, properties, inheritance, composition, and comparison with JavaScript prototypes and TypeScript access modifiers.

#### Chapter 8: More Advanced Class Design

Planned focus: dataclasses, named tuples, protocols, abstract base classes, descriptors, special methods, immutability, hashing, and object construction patterns.

### Stage 3 — Functional and typed Python

#### Chapter 9: Functional Programming Features

Planned focus: first-class callables, iterators, generators, comprehensions, `map()`, `filter()`, reductions, closures, decorators, and `functools`/`itertools` tools.

#### Chapter 10: Working with Type Matching and Annotations

Planned focus: structural pattern matching, unions, narrowing, generics, protocols, `Callable`, `TypeVar`, and what Python annotations do—and do not do—at runtime.

### Stage 4 — Data, visualization, and applications

#### Chapter 11: Input/Output, Physical Format, and Logical Layout

Planned focus: paths, files, context managers, CSV, JSON, serialization, logical records, encodings, and safe resource handling.

#### Chapter 12: Graphics and Visualization with Jupyter Lab

Planned focus: notebook execution, cells and kernel state, reproducibility, tabular data, plotting, visualization choices, and exporting results.

#### Chapter 13: Application Integration: Configuration

Planned focus: environment variables, command-line options, configuration files, defaults, validation, logging configuration, and secret-handling boundaries.

#### Chapter 14: Application Integration: Combination

Planned focus: application composition, modules and packages, dependency boundaries, pipelines, services, concurrency choices, and integrating earlier recipes.

### Stage 5 — Shipping reliable Python

#### Chapter 15: Testing

Planned focus: assertions, unit tests, fixtures, parameterization, mocks, doctests, property-based thinking, coverage, and parallels with Vitest/Jest.

#### Chapter 16: Dependencies and Virtual Environments

Planned focus: `pyproject.toml`, uv, lockfiles, virtual environments, packages, imports, dependency groups, reproducible commands, and parallels with `package.json`.

#### Chapter 17: Documentation and Style

Planned focus: docstrings, type annotations, PEP 8, Ruff, API documentation, examples, project documentation, and balancing Python idioms with readability.

## Essential terminology

### Name and object

A **name** (often called a variable) refers to an object. Assignment binds a name; it does not copy the object.

```python
first = [1, 2]
second = first
second.append(3)
assert first == [1, 2, 3]  # both names refer to the same list
```

Use `==` for value equality and `is` for identity. The common identity check is `value is None`.

### Stack, heap, and CPython

Python's portable language model is **names referring to objects**. “This value is on the stack” or “that value is on the heap” is not a Python language guarantee, so use names, references, identity, mutation, and object graphs when reasoning about program behavior.

**CPython** is the most widely used implementation of the Python language. As CPython implementation context—not a rule for every Python implementation—objects generally live in a managed heap, while an executing function has a frame containing its local-name references and evaluation state. CPython manages object lifetimes primarily with reference counting plus a cyclic garbage collector.

```python
def add_label() -> list[str]:
    labels = ["new"]
    alias = labels
    alias.append("sale")
    return labels


assert add_label() == ["new", "sale"]
```

The portable explanation is that `labels` and `alias` refer to the same mutable list. You do not need its physical memory location to predict the mutation. This resembles JavaScript's object-reference behavior; JavaScript engine stack/heap descriptions are likewise implementation models rather than TypeScript type-system guarantees.

### Mutable and immutable

A **mutable** object can change while keeping its identity (`list`, `dict`, `set`). An **immutable** object cannot (`int`, `str`, `tuple`, `frozenset`). `const` in TypeScript prevents rebinding but does not make an array immutable; Python mutability belongs to the object too.

Immutability is shallow. An immutable tuple cannot replace its element references, but it may refer to a mutable object that can still change:

```python
items = (["a"], "fixed")
items[0].append("b")

assert items == (["a", "b"], "fixed")
```

### Hashable

A **hashable** object has a stable hash and equality behavior, allowing it to be a dictionary key or set member. Most immutable built-ins are hashable. A tuple is hashable only when all its elements are hashable.

### Iterable, iterator, and generator

- An **iterable** can produce an iterator; `for` can loop over it.
- An **iterator** tracks progress and yields one value at a time through `next()`.
- A **generator function** contains `yield`; calling it returns a lazy generator iterator.

This is similar to JavaScript's iterable/iterator protocols, though method names and generator syntax differ.

### Sequence and mapping

A **sequence** is ordered, has a length, and supports integer indexing; strings, lists, and tuples are sequences. A **mapping** associates keys with values; `dict` is the standard mutable mapping.

### Comprehension

A **comprehension** is compact syntax that iterates, optionally filters, transforms, and builds a new list, set, or dictionary.

```python
labels = {number: f"item-{number}" for number in range(5) if number % 2}
```

### Truthiness

Every object has a truth value. `None`, numeric zero, and empty collections are falsey; most other objects are truthy. Unlike JavaScript, empty lists and dictionaries are falsey, while strings such as `"0"` remain truthy.

### Positional and keyword arguments

A **positional argument** binds by call order. A **keyword argument** binds by parameter name. TypeScript has only positional call binding, so a typed options object is its usual keyword-like pattern.

### Dunder

“Dunder” means double underscore. Methods such as `__init__`, `__len__`, and `__iter__` connect objects to Python syntax and protocols. Prefer invoking the syntax (`len(value)`) instead of calling `value.__len__()` directly.

### EAFP and LBYL

**EAFP** means “try the operation and handle the expected exception.” **LBYL** means “check before the operation.” Python often favors EAFP when the operation itself is authoritative and race-free.

```python
try:
    value = mapping[key]
except KeyError:
    value = default
```

## Transfer warnings for TypeScript developers

- Indentation is syntax; braces do not define blocks.
- `and` and `or` return operands, not necessarily booleans, much like `&&` and `||`.
- `//` floors; `Math.trunc()` and `bigint` division truncate toward zero.
- Negative indexes and full slice syntax are built in.
- Most collection mutators return `None`, so do not chain them.
- Default argument expressions run once at function definition time.
- Type annotations normally do not validate or convert runtime values.
- `is` is identity, not Python's spelling of strict equality.
- Dictionary and set keys require hashability; equality and hashing work together.
- Copying a collection is usually shallow.
- A tuple is immutable at runtime; a TypeScript tuple is mainly a static array shape.
- Importing a module executes its top-level code once and caches the module.
- Exceptions are matched by class, from specific handlers to broader handlers.

## Further reading and inspiration

- [Programming Idioms Python/JavaScript cheatsheet](https://programming-idioms.org/cheatsheet/Python/JS) — inspiration for naming a task, briefly stating its intent, and placing runtime-language implementations side by side.
- [Python Morsels terminology](https://www.pythonmorsels.com/terms/) — inspiration for approachable definitions of Python vocabulary.
- [Real Python learning paths](https://realpython.com/learning-paths/) — inspiration for organizing material from fundamentals through applied topics.
- [Official Python documentation](https://docs.python.org/3/) — authoritative language and standard-library reference.

The explanations and examples here are original summaries tailored to this repository; the linked sites are organizational inspiration and further reading.
