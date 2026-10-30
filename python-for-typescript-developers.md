# Python for TypeScript Developers

A syntax cheatsheet, terminology guide, and learning path for developers who already know modern TypeScript. Python examples target Python 3.12 or newer.

This is a memory aid, not a substitute for the executable notes. Chapters 1–11 summarize the material currently in this repository. Chapters 12–17 are a roadmap and will gain verified examples as their notes are added.

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

Use `with` for deterministic cleanup:

```python
with open("data.txt", encoding="utf-8") as source:
    text = source.read()
```

Modern ECMAScript explicit resource management provides the closest direct analogue: a `using` binding calls the resource's `[Symbol.dispose]()` method on normal or exceptional scope exit. Python context managers additionally receive exception details and may suppress an exception.

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

Python does not promise a useful set iteration order. Elements must be hashable, so a list cannot be a set member; TypeScript `Set` accepts objects and compares them by identity. Modern ECMAScript supplies non-mutating `union()`, `intersection()`, `difference()`, and `symmetricDifference()` methods directly on `Set`.

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

#### Chapter 6: User Inputs and Outputs

[Python notes](chapter-06/user-inputs-and-outputs.py) · [TypeScript notes](chapter-06/user-inputs-and-outputs.ts)

`print()` converts values to text, inserts `sep`, appends `end`, and writes to a text stream selected with `file`:

```python
print("date", "2024-02-29", sep="=", end=", ")
print("valid", True, sep="=")
# date=2024-02-29, valid=True
```

JavaScript's `console.log()` does not expose separator or terminator parameters. Build text with template literals or `join()`, use `Writable.write()` when newline control matters, and construct a Node `Console` with explicit `stdout`/`stderr` writable streams for Python-like output routing.

Keep acquisition, conversion, composite validation, and domain work separate. `input()` and `getpass.getpass()` return strings; conversion such as `int(text)` can raise `ValueError`, and constructing the final object can apply additional rules. Node's stable `node:readline/promises` API provides asynchronous `question()` and async line iteration. It has no built-in `getpass` equivalent: hiding terminal echo still requires TTY handling or a library, and hidden input must not enter history or logs.

Debug f-strings reproduce both an expression and its result:

```python
mean = 12.345
debug = f"{mean=:.2f}"  # "mean=12.35"
```

Template literals evaluate expressions but do not reproduce their source, so TypeScript needs an explicit label.

For command-line programs, let `argparse` provide conventional positional/options syntax, choices, conversion, help, and error exits. Pass an explicit argument list to make parsing testable, and keep the resulting UI adapter separate from reusable domain functions. Node's stable `node:util.parseArgs()` handles option aliases, defaults, strict option checking, and positionals; applications still add choices, conversion, generated help, and exit behavior.

`cmd.Cmd` builds a stateful REPL by dispatching a command such as `roll` to `do_roll()`. Method docstrings become help, and truthy returns end the loop. Node's `readline/promises` handles the stream-backed loop, prompts, async iteration, history, completion, abort signals, and disposal, but the application must provide command dispatch and help metadata. For Invoke-like wrappers, Node's `child_process.spawn()` supplies subprocess, standard-stream, and environment control.

Environment variables are string-valued, slowly changing defaults. Validate them, let explicit CLI arguments override them, and inject a mapping in tests instead of mutating global `os.environ`/`process.env`.

### Stage 2 — Interfaces and object design

Chapters with executable links are verified notes. Later summaries remain roadmap entries until their paired files are added.

#### Chapter 7: Basics of Classes and Objects

[Python notes](chapter-07/basics-of-classes-and-objects.py) · [TypeScript notes](chapter-07/basics-of-classes-and-objects.ts)

Python passes `self` explicitly to instance methods; JavaScript supplies `this` dynamically to ordinary methods. `__init__()` initializes an already-created instance. Attribute annotations and method signatures help static checkers but do not validate values at runtime, just as TypeScript types are erased.

```python
class Dice:
    def __init__(self, faces: tuple[int, int]) -> None:
        self.faces = faces

    def total(self) -> int:
        return sum(self.faces)
```

Choose class shape from behavior and mutability:

| Python design | Runtime behavior | TypeScript/JavaScript comparison |
| --- | --- | --- |
| ordinary class | mutable attributes, usually stored in `__dict__` | JS class instance; TS fields/access modifiers are mostly static constraints |
| `NamedTuple` | immutable, positional and named access, tuple ordering/hashing | no direct equivalent; a `readonly` tuple lacks named fields and runtime immutability |
| `@dataclass` | generated initialization, representation, and value equality | TS types generate no runtime methods; write a class/factory and equality explicitly |
| `@dataclass(frozen=True)` | runtime field-rebinding guard, still shallow | `readonly` is normally static; `Object.freeze()` is shallow runtime protection |
| `__slots__` | fixed attributes and usually no per-instance `__dict__` | TS declarations do not constrain runtime shape; `Object.seal()` only approximates shape restriction |

Use `field(default_factory=list)` for a fresh mutable default per dataclass instance. Freezing is shallow: a frozen field can still refer to a mutable list. Use `ClassVar[T]` for class-level configuration that must not become a dataclass field.

Composition wraps data with processing; inheritance specializes a storage type. An eager wrapper computes once but becomes stale when aliased source data changes. A property computes lazily and preserves attribute syntax:

```python
class Statistics:
    def __init__(self, values: list[float]) -> None:
        self.values = values

    @property
    def mean(self) -> float:
        return sum(self.values) / len(self.values)
```

JavaScript `get mean()` is the close analogue. Cached properties need an invalidation strategy when mutable input changes.

Specialized standard-library collections encode useful performance and missing-value behavior: `deque` for efficient operations at both ends, `defaultdict` for generated missing values, `Counter` for multisets, and `ChainMap` for ordered mapping overlays. JavaScript `Map` requires these behaviors to be built explicitly; `Array.shift()` is not an efficient long-lived FIFO.

Context managers put acquisition and guaranteed cleanup around a scope. `__enter__()` may return the object used after `as`; `__exit__()` receives exception details and may suppress the exception by returning true. A compound `with` enters managers left-to-right and exits them right-to-left. Node 26 `using` plus `Symbol.dispose` gives deterministic reverse-order cleanup, but disposal has no Python-style exception-suppression return value.

#### Chapter 8: More Advanced Class Design

[Python notes](chapter-08/more-advanced-class-design.py) · [TypeScript notes](chapter-08/more-advanced-class-design.ts)

Choose inheritance only for a genuine substitutable **is-a** relationship. A `list` subclass inherits indexing, slicing, iteration, and every mutator; a wrapper with a list field exposes only the intended **has-a** API. JavaScript has the same tradeoff between `extends Array` and composition.

Modern JavaScript `class` semantics are not merely alternate spelling for manually connecting ES5 function prototypes. A derived built-in such as `class Deck extends Array {}` participates in built-in subclass allocation; inherited copying methods use `Symbol.species` and normally preserve `Deck`. Class constructors require `new`, class methods are non-enumerable and non-constructible, `super` has dedicated semantics, and `#private` fields enforce runtime brands. These details matter when comparing JavaScript inheritance with Python rather than reducing either model to prototype lookup. See Andrea Giammarchi's [JS classes are not “just syntactic sugar”](https://webreflection.medium.com/js-classes-are-not-just-syntactic-sugar-28690fedf078) for the supplemental JavaScript examples.

Python multiple inheritance combines behavior according to the class's method resolution order (`SomeClass.mro()`). Keep mixins small and concern-specific. A `Protocol` describes the minimum structural shape a consumer needs without forcing implementations into a hierarchy:

```python
class Dice(Protocol):
    def roll(self) -> tuple[int, ...]: ...


def sample(dice: Dice) -> tuple[int, ...]:
    return dice.roll()
```

This is close to a TypeScript `interface`: both enable static structural checking and disappear at runtime. Python still performs ordinary duck-typed attribute lookup at runtime; inheriting a protocol is not required for a compatible class.

Module variables and class variables are shared objects. Imports cache a module in `sys.modules`, while `ClassVar[T]` documents state stored on the class rather than each instance. These are useful for narrow registries, logging, or counters, but explicit dependency injection gives tests and callers independent state more easily. ES modules and `static` fields have similar lifetime and coupling concerns.

Use `defaultdict(list)` for a map of lists when missing-key access should install a fresh list. Access mutates the mapping, then `append()` mutates that list and returns `None`; JavaScript `Map` requires explicit get-or-create logic.

Ordering operators call rich-comparison methods such as `__lt__()` and `__le__()`. Comparing `(self.rank, self.suit)` tuples is a compact lexicographic key; `@dataclass(order=True)` or `functools.total_ordering` can generate methods. JavaScript objects cannot customize `<` this way, so pass a comparator to `toSorted()`/`sort()`.

When deleting matching list items in place, do not advance the index after `del items[index]`: the next item shifts into that index. A comprehension is usually simpler and faster when a new outer list is acceptable, but it is shallow and retains references to the same nested objects. The corresponding JavaScript distinction is in-place `splice()` versus copying `filter()`.

### Stage 3 — Functional and typed Python

#### Chapter 9: Functional Programming Features

[Python notes](chapter-09/functional-programming-features.py) · [TypeScript notes](chapter-09/functional-programming-features.ts)

A generator function contains `yield`; calling it creates a lazy, one-shot iterator. Work happens only when `next()`, a `for` loop, or a consumer asks for a value. Generator expressions, `map()`, and `filter()` are lazy too:

```python
squares = (value * value for value in source if value >= 0)
parsed = map(parse_row, rows)
valid = filter(is_valid, parsed)
```

JavaScript generator functions share the one-shot, demand-driven model, and `yield*` corresponds to Python's `yield from`. JavaScript `Array.map()` and `Array.filter()` are eager, however; use generator helpers when laziness matters.

Keep mapping and filtering rules as small named functions when they need type hints, tests, or statements such as `try`/`except`. Stack iterators into pipelines, but remember that consuming an iterator exhausts it. Materialize a `tuple` or `list` before multiple summaries; `itertools.tee()` may retain a large buffer when consumers advance unevenly.

Use specialized reductions such as `sum()`, `min()`, `max()`, `math.prod()`, `any()`, and `all()` when possible. Identity values make empty inputs well-defined: `sum([]) == 0` and `math.prod([]) == 1`. `any()` and `all()` short-circuit like JavaScript `some()` and `every()`.

`functools.partial()` binds supplied argument objects immediately. A closure normally resolves a free name when called; capture the current Python value with a default argument when that distinction matters:

```python
fixed = partial(standardize, mean, stdev)
frozen = lambda value, offset=offset: value + offset
```

`Function.bind()` is JavaScript's closest built-in partial-application tool. Recursive generators use `yield from` to delegate values without building intermediate lists, which is useful for depth-first traversal of nested JSON-like structures.

#### Chapter 10: Working with Type Matching and Annotations

[Python notes](chapter-10/type-matching-and-annotations.py) · [TypeScript notes](chapter-10/type-matching-and-annotations.ts)

Python annotations are optional metadata used by static analyzers; they do not validate arguments or change runtime dispatch. This resembles TypeScript's erased types. Use a Python 3.12 `type` statement for a readable alias and `|` for a union:

```python
type Content = Path | Referenced
```

`isinstance(value, Class)` narrows an object at runtime and includes subclasses; `issubclass(Child, Parent)` examines class objects. TypeScript normally narrows with `typeof`, `instanceof`, property checks, or a discriminant field.

Python's `match` performs structural pattern matching. Class, sequence, mapping, literal, wildcard, and guarded patterns can validate shape and bind names in one operation. Cases run top to bottom, so put specific patterns before general ones:

```python
match item:
    case Referenced(_, [Path()]) as single:
        handle_single(single)
    case Referenced() as referenced:
        handle_referenced(referenced)
    case _:
        raise TypeError(item)
```

JavaScript/TypeScript has no equivalent built-in structural `match`; use explicit guards. Python patterns do not call constructors: `case Referenced()` tests the class and `case float(value)` both tests and binds.

Keep conversion at a boundary and computation in a typed core. `float()` parses numeric strings; `ast.literal_eval()` accepts Python literal structures but is unnecessary when a simpler format-specific parser will do. Validate the resulting shape as well as the syntax.

Pydantic `BaseModel` uses annotations at runtime to convert and validate external data, and can emit JSON and JSON Schema. A standard `@dataclass` does neither automatically. This is closer to a TypeScript schema validator than to an `interface`: an `interface` disappears at runtime, so TypeScript needs explicit parsing and validation for untrusted values.

### Stage 4 — Data, visualization, and applications

#### Chapter 11: Input/Output, Physical Format, and Logical Layout

[Python notes](chapter-11/input-output-physical-format-logical-layout.py) · [TypeScript notes](chapter-11/input-output-physical-format-logical-layout.ts)

Use `pathlib.Path` for lexical path transformations and concrete filesystem work:

```python
source = Path("data/waypoints.csv")
target = (source.parent / f"{source.stem}_clean").with_suffix(".csv")
matches = sorted(source.parent.glob("*.csv"))
```

Node splits these responsibilities between `node:path` and `node:fs`. Building a path in either language does not create the resource. For failure-safe replacement, completely write and close a sibling temporary file before renaming; a backup file is the recovery point because several renames are not one transaction.

Physical format and logical layout are separate concerns. `csv.DictReader` handles delimiters, quoting, and doubled quotes, but returns strings; a second boundary step converts columns into useful types. A raw dataclass can mirror the external schema while an application dataclass computes coordinates and timestamps. TypeScript interfaces are erased, so equivalent conversion needs explicit runtime checks.

```python
rows = csv.DictReader(source_file)
waypoints = (Waypoint(RawRow(**row)) for row in rows)
```

Named regex groups plus `groupdict()` make irregular-but-flat log records resemble dictionary rows. Reject a non-match explicitly. Use format-aware tree parsers—not regex—for recursive XML and tolerant HTML: ElementTree supplies an XPath subset, while Beautiful Soup supplies the searchable tree and CSS-query API over an explicitly selected parsing backend. The Chapter 11 example uses the standard-library `html.parser`; changing backends can change the repaired tree for malformed HTML.

`json.loads()` maps objects, arrays, strings, numbers, booleans, and `null` to Python values; JavaScript's `JSON.parse()` returns the native equivalents directly. Python's `default` and `object_hook` callbacks can encode and restore tagged complex values. JavaScript `Date.toJSON()` runs before a `JSON.stringify()` replacer, an important ordering difference. JSON is valid YAML, but general YAML needs a separate parser.

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
