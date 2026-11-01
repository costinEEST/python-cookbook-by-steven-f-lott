from __future__ import annotations

import doctest
import tomllib
from collections.abc import Iterable, Mapping
from dataclasses import dataclass

# Executable notes adapted from the user-saved HTML for Modern Python Cookbook,
# Chapter 17. It contains recipes 17.1-17.5. Commands and configuration are
# represented as data; running this file does not write files or invoke tools.


# 17.1 The bare minimum: a README.rst file
@dataclass(frozen=True)
class ReadmePlan:
    audience: str
    purpose: str
    features: tuple[str, ...]
    requirements: tuple[str, ...]
    installation: str
    usage: str
    license_name: str
    contributing: str


def missing_readme_sections(plan: ReadmePlan) -> tuple[str, ...]:
    required: Mapping[str, str | tuple[str, ...]] = {
        "audience": plan.audience,
        "purpose": plan.purpose,
        "features": plan.features,
        "requirements": plan.requirements,
        "installation": plan.installation,
        "usage": plan.usage,
        "license": plan.license_name,
        "contributing": plan.contributing,
    }
    return tuple(name for name, value in required.items() if not value)


readme_plan = ReadmePlan(
    audience="Python developers learning from TypeScript",
    purpose="Provide paired executable cookbook notes.",
    features=("Python examples", "TypeScript comparisons"),
    requirements=("Python 3.12+", "Node 26+"),
    installation="uv sync --locked",
    usage="uv run --locked python chapter-17/documentation-and-style.py",
    license_name="See LICENSE",
    contributing="Run every quality check before opening a pull request.",
)
assert missing_readme_sections(readme_plan) == ()
assert missing_readme_sections(
    ReadmePlan("", "purpose", ("feature",), ("Python",), "install", "use", "MIT", "PR")
) == ("audience",)
# A README is the project's front door, not its complete manual. Lead with who,
# what, and why; then give a small working install/use path and links to details.
# Markdown is common on GitHub, while RST integrates deeply with Sphinx. As with
# an npm package README, examples should be executable so they cannot silently rot.


# 17.2 Installing Sphinx and creating documentation
SPHINX_COMMANDS = {
    "add": ("uv", "add", "--group", "docs", "sphinx"),
    "quickstart": ("uv", "run", "sphinx-quickstart", "docs"),
    "build": (
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
    ),
}
assert SPHINX_COMMANDS["build"][-3] == "html"

SPHINX_INDEX = """
Documentation and Style
=======================

.. toctree::
   :maxdepth: 2
   :caption: Contents

   installation
   usage
   design
   api
""".strip()


def toctree_documents(document: str) -> tuple[str, ...]:
    lines = iter(document.splitlines())
    for line in lines:
        if line.strip() == ".. toctree::":
            break
    else:
        return ()

    documents: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith(":"):
            continue
        if line.startswith("   "):
            documents.append(stripped)
        elif documents:
            break
    return tuple(documents)


assert toctree_documents(SPHINX_INDEX) == (
    "installation",
    "usage",
    "design",
    "api",
)
# Sphinx reads a root document, follows its toctree, and renders several output
# formats. Direct `sphinx-build` is portable across shells and CI; generated
# Makefiles are conveniences rather than requirements. TypeDoc plays a similar
# API-documentation role for TypeScript, while static-site tools organize prose.


# 17.3 Using Sphinx autodoc to create the API reference
class StatsList(list[float]):
    """A numeric list with a mean.

    >>> values = StatsList([1, 2, 3, 4])
    >>> values.mean()
    2.5
    """

    def mean(self) -> float:
        """Return the arithmetic mean.

        :returns: Sum divided by the number of values.
        :raises ValueError: If the list is empty.
        """
        if not self:
            raise ValueError("mean requires at least one value")
        return sum(self) / len(self)


doctest_result = doctest.testmod(optionflags=doctest.ELLIPSIS)
assert doctest_result.failed == 0
assert StatsList([2.0, 4.0]).mean() == 3.0

AUTODOC_CONFIG = {
    "extensions": ("sphinx.ext.autodoc",),
    "directive": ".. automodule:: package.module\n   :members:\n   :undoc-members:",
}
assert "sphinx.ext.autodoc" in AUTODOC_CONFIG["extensions"]
# autodoc imports modules, so import-time side effects can break a documentation
# build. Keep modules import-safe and make the source package importable through
# installation or `sys.path`. Python docstrings exist at runtime; TypeScript JSDoc
# is source metadata consumed by editors and documentation generators. PEP 257
# defines high-level docstring structure rather than a Sphinx markup style: use an
# imperative summary, a blank line before details, and document public behavior,
# parameters, returns, side effects, exceptions, and constraints where relevant.


# 17.4 Identifying other CI/CD tools in pyproject.toml
DEPENDENCY_GROUPS = b"""
[project]
name = "documented-project"
version = "1.0.0"
dependencies = ["pydantic>=2.12"]

[project.optional-dependencies]
email = ["email-validator>=2"]

[dependency-groups]
test = ["pytest>=9"]
docs = ["sphinx>=8"]
quality = ["ruff>=0.14", "ty>=0.0.1"]
"""

dependency_document = tomllib.loads(DEPENDENCY_GROUPS.decode())
assert dependency_document["project"]["dependencies"] == ["pydantic>=2.12"]
assert dependency_document["project"]["optional-dependencies"]["email"] == [
    "email-validator>=2"
]
assert set(dependency_document["dependency-groups"]) == {"test", "docs", "quality"}
# Runtime dependencies are installed with the project. Optional dependencies are
# publishable features for consumers. PEP 735 dependency groups hold internal
# development workflows and are not package metadata. This parallels separating
# package.json dependencies from devDependencies, with named Python groups adding
# finer-grained selection.


# 17.5 Using tox to run comprehensive quality checks
TOX_CONFIGURATION = b"""
[tool.tox]
requires = ["tox>=4.64"]
env_list = ["py312", "quality", "docs"]

[tool.tox.env_run_base]
package = "skip"
commands = [["pytest"]]

[tool.tox.env.quality]
commands = [
    ["ruff", "format", "--check", "."],
    ["ruff", "check", "."],
    ["ty", "check"],
]

[tool.tox.env.docs]
commands = [["sphinx-build", "--fail-on-warning", "--keep-going", "--nitpicky", "-M", "html", "docs", "docs/_build"]]
"""


def tox_environments(configuration: bytes) -> tuple[str, ...]:
    document = tomllib.loads(configuration.decode())
    return tuple(document["tool"]["tox"]["env_list"])


assert tox_environments(TOX_CONFIGURATION) == ("py312", "quality", "docs")


def quality_commands(configuration: bytes) -> tuple[tuple[str, ...], ...]:
    document = tomllib.loads(configuration.decode())
    commands = document["tool"]["tox"]["env"]["quality"]["commands"]
    return tuple(tuple(command) for command in commands)


assert quality_commands(TOX_CONFIGURATION) == (
    ("ruff", "format", "--check", "."),
    ("ruff", "check", "."),
    ("ty", "check"),
)
# tox creates isolated environments and runs a declarative matrix; nox expresses
# sessions in Python. They resemble a task runner plus CI matrix more than a test
# framework. Native TOML under [tool.tox] is current; tox.ini and legacy_tox_ini
# are deprecated. This repository has one supported Python and uses locked uv
# commands directly; introduce tox when multiple interpreter or dependency
# variants make the isolation valuable.


def complete_sections(sections: Iterable[str]) -> bool:
    return set(sections) == {"readme", "sphinx", "autodoc", "dependencies", "tox"}


assert complete_sections(("readme", "sphinx", "autodoc", "dependencies", "tox"))
