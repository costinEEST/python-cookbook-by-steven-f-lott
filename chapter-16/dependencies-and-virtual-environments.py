from __future__ import annotations

import re
import tomllib
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import PurePath, PurePosixPath, PureWindowsPath

# Executable notes adapted from the user-saved HTML for Modern Python Cookbook,
# Chapter 16. It contains recipes 16.1-16.7. Commands are represented as data;
# running this file does not create environments or install packages.


# 16.1 Creating environments using the built-in venv
@dataclass(frozen=True)
class VirtualEnvironment:
    directory: PurePath
    interpreter: PurePath
    activation: PurePath


def virtual_environment_layout(directory: str, *, windows: bool) -> VirtualEnvironment:
    path_type = PureWindowsPath if windows else PurePosixPath
    root = path_type(directory)
    scripts = root / ("Scripts" if windows else "bin")
    return VirtualEnvironment(
        directory=root,
        interpreter=scripts / ("python.exe" if windows else "python"),
        activation=scripts / ("Activate.ps1" if windows else "activate"),
    )


posix_environment = virtual_environment_layout(".venv", windows=False)
windows_environment = virtual_environment_layout(".venv", windows=True)
assert posix_environment.interpreter == PurePosixPath(".venv/bin/python")
assert windows_environment.interpreter == PureWindowsPath(".venv/Scripts/python.exe")
VENV_CREATE = ("python", "-m", "venv", ".venv")
assert VENV_CREATE[-1] == ".venv"
# A venv is disposable and must not be committed. Activation only adjusts the
# current shell; calling the environment's interpreter directly does not require
# activation. Node's node_modules is project-local package state, but it does not
# contain an isolated Node interpreter in the way a Python venv does.


# 16.2 Installing packages with a requirements.txt file
REQUIREMENT_PATTERN = re.compile(
    r"^(?P<name>[A-Za-z0-9][A-Za-z0-9._-]*)"
    r"(?:\[(?P<extras>[^]]+)\])?"
    r"(?P<constraint>(?:==|!=|>=|<=|~=|>|<).+?)?"
    r"(?:\s*;\s*(?P<marker>.+))?$"
)


@dataclass(frozen=True)
class Requirement:
    name: str
    extras: tuple[str, ...] = ()
    constraint: str | None = None
    marker: str | None = None


def parse_requirement(text: str) -> Requirement:
    match = REQUIREMENT_PATTERN.fullmatch(text.strip())
    if match is None:
        raise ValueError(f"invalid requirement: {text!r}")
    extras_text = match.group("extras")
    extras = (
        tuple(item.strip() for item in extras_text.split(",")) if extras_text else ()
    )
    return Requirement(
        name=match.group("name"),
        extras=extras,
        constraint=match.group("constraint"),
        marker=match.group("marker"),
    )


assert parse_requirement(
    "rich[jupyter]>=13.0; python_version >= '3.12'"
) == Requirement(
    name="rich",
    extras=("jupyter",),
    constraint=">=13.0",
    marker="python_version >= '3.12'",
)
assert parse_requirement("pytest").constraint is None
# requirements files are pip input, not a standardized project lockfile. Direct
# requirements express intent; a resolver also installs transitive requirements.
# package.json dependencies are closer to direct requirements, while
# package-lock.json records a resolved graph.


# 16.3 Creating a pyproject.toml file
PYPROJECT_EXAMPLE = b"""
[project]
name = "sample-project"
version = "2026.1.0"
description = "A useful description."
requires-python = ">=3.12"
dependencies = ["beautifulsoup4>=4.14", "pydantic>=2.12"]

[project.optional-dependencies]
test = ["pytest>=9", "ruff>=0.14"]

[build-system]
build-backend = "setuptools.build_meta"
requires = ["setuptools"]
"""

project_document = tomllib.loads(PYPROJECT_EXAMPLE.decode())
assert project_document["project"]["name"] == "sample-project"
assert project_document["project"]["dependencies"] == [
    "beautifulsoup4>=4.14",
    "pydantic>=2.12",
]
assert project_document["build-system"]["build-backend"] == "setuptools.build_meta"
# [project] follows PEP 621 metadata. [build-system] selects a PEP 517 backend
# only when the project builds a distribution. Tool configuration uses [tool.*]
# tables. package.json combines analogous metadata and tool-specific settings in
# JSON, but Python's build backends remain separate from installers and resolvers.


# 16.4 Using pip-tools to manage requirements
@dataclass(frozen=True)
class ResolvedRequirement:
    name: str
    version: str
    requested_by: tuple[str, ...]


def compile_requirements(
    direct: Iterable[str],
    resolved_versions: Mapping[str, str],
    dependencies: Mapping[str, tuple[str, ...]],
) -> tuple[ResolvedRequirement, ...]:
    direct_names = tuple(parse_requirement(item).name for item in direct)
    all_names = set(direct_names)
    for name in direct_names:
        all_names.update(dependencies.get(name, ()))
    return tuple(
        ResolvedRequirement(
            name=name,
            version=resolved_versions[name],
            requested_by=tuple(
                parent for parent, children in dependencies.items() if name in children
            ),
        )
        for name in sorted(all_names)
    )


compiled = compile_requirements(
    ["alpha>=1", "beta"],
    {"alpha": "1.4.0", "beta": "2.1.0", "shared": "3.0.2"},
    {"alpha": ("shared",), "beta": ("shared",)},
)
assert [(item.name, item.version) for item in compiled] == [
    ("alpha", "1.4.0"),
    ("beta", "2.1.0"),
    ("shared", "3.0.2"),
]
assert compiled[-1].requested_by == ("alpha", "beta")
UV_PROJECT_COMMANDS = {
    "add": ("uv", "add", "package-name"),
    "check_lock": ("uv", "lock", "--check"),
    "sync": ("uv", "sync", "--locked"),
    "run": ("uv", "run", "--locked", "python", "script.py"),
    "upgrade_one": ("uv", "lock", "--upgrade-package", "package-name"),
    "export_standard": ("uv", "export", "--format", "pylock.toml"),
}
assert UV_PROJECT_COMMANDS["sync"] == ("uv", "sync", "--locked")
assert UV_PROJECT_COMMANDS["export_standard"][-1] == "pylock.toml"
PIP_EXPERIMENTAL_LOCK = ("python", "-m", "pip", "lock", "-o", "pylock.toml", ".")
assert PIP_EXPERIMENTAL_LOCK[3] == "lock"
# pip-compile turns broad inputs into pinned output; pip-sync reconciles an
# environment with that output. pip 26.2 also has an experimental `pip lock`, but
# its result is guaranteed only for the current Python and platform. PEP 751's
# pylock.toml is a standardized interchange format, not this project's canonical
# lock. This repository keeps broad constraints in pyproject.toml and exact,
# universal resolutions in uv.lock, then uses `uv sync --locked` or
# `uv run --locked` without editing the lockfile by hand.


# 16.5 Using Anaconda and conda
CONDA_CREATE = ("conda", "create", "--name", "cookbook", "python=3.12")
CONDA_RUN = ("conda", "run", "--name", "cookbook", "python", "script.py")
CONDA_LOCK = ("conda", "export", "--name", "cookbook", "--file", "conda-lock.yaml")
assert CONDA_CREATE[2:4] == ("--name", "cookbook")
assert CONDA_RUN[:4] == ("conda", "run", "--name", "cookbook")
assert CONDA_LOCK[-1] == "conda-lock.yaml"
# conda resolves Python plus non-Python binaries and channels, and its activation
# can run package activation scripts. Modern conda also supports multi-platform
# lockfiles; a plain exported environment.yml may still contain broad constraints.
# Use conda when its binary ecosystem is a requirement, not as an extra layer by
# default on top of another environment manager.


# 16.6 Using Poetry
POETRY_COMMANDS = {
    "create": ("poetry", "new", "sample-project"),
    "add": ("poetry", "add", "pydantic", "beautifulsoup4"),
    "run": ("poetry", "run", "pytest"),
    "activate": ("poetry", "env", "activate"),
    "update_one": ("poetry", "update", "pydantic"),
}
assert POETRY_COMMANDS["run"] == ("poetry", "run", "pytest")
assert POETRY_COMMANDS["activate"] == ("poetry", "env", "activate")
# Poetry 2.x supports PEP 621 [project] dependencies and creates poetry.lock.
# `poetry shell` moved to an optional plugin; `poetry run` is shell-neutral, while
# `poetry env activate` prints a shell-specific activation command.


# 16.7 Coping with changes in dependencies
@dataclass(frozen=True)
class VersionRange:
    minimum: tuple[int, ...] | None = None
    maximum_exclusive: tuple[int, ...] | None = None

    def accepts(self, version: tuple[int, ...]) -> bool:
        return (self.minimum is None or version >= self.minimum) and (
            self.maximum_exclusive is None or version < self.maximum_exclusive
        )


def compatible_versions(
    available: Iterable[tuple[int, ...]], constraints: Iterable[VersionRange]
) -> list[tuple[int, ...]]:
    rules = tuple(constraints)
    return [
        version for version in available if all(rule.accepts(version) for rule in rules)
    ]


shared_versions = [(1, 8), (2, 0), (2, 1)]
assert (
    compatible_versions(
        shared_versions,
        [VersionRange(maximum_exclusive=(2, 0)), VersionRange(minimum=(2, 0))],
    )
    == []
)
assert compatible_versions(
    shared_versions,
    [VersionRange(minimum=(1, 8)), VersionRange(maximum_exclusive=(2, 0))],
) == [(1, 8)]
# When an upgrade fails: reproduce from the lockfile, change one dependency at a
# time, identify whether the failure is code/API or resolution, and record the
# root cause. A temporary pin buys investigation time; it is not a permanent fix.
# Adapt, report/fix upstream, replace the dependency, or revise a constraint—then
# run the complete test and static-analysis gates before updating the lockfile.
