from __future__ import annotations

import argparse
import re
import subprocess
import sys
from abc import ABC, abstractmethod
from collections.abc import Iterable, Iterator, Mapping, Sequence
from dataclasses import dataclass, replace
from typing import Any, ClassVar, cast

# Executable notes adapted from the user-saved HTML for Modern Python Cookbook,
# Chapter 14. It contains recipes 14.1-14.5. The opaque external application is
# represented by the current Python executable, and no sample files are written.

type Sample = tuple[str, tuple[int, ...]]


# 14.1 Combining two applications into one
def generate_samples(samples: int, seed: int) -> list[Sample]:
    """Stand in for an existing generator component with a narrow interface."""
    return [
        ("Success" if (seed + index) % 3 else "Failure", (seed, index))
        for index in range(samples)
    ]


def summarize_samples(batches: Iterable[Sequence[Sample]]) -> dict[str, int]:
    """Consume many batches to bridge generator/summary cardinality."""
    summary = {"Success": 0, "Failure": 0}
    for batch in batches:
        for outcome, _chain in batch:
            summary[outcome] += 1
    return summary


def generate_and_summarize(iterations: int, samples: int) -> dict[str, int]:
    batches = (generate_samples(samples, seed + 1) for seed in range(iterations))
    return summarize_samples(batches)


combined_summary = generate_and_summarize(iterations=3, samples=4)
assert combined_summary == {"Success": 8, "Failure": 4}
assert sum(combined_summary.values()) == 12
# Import and call focused functions instead of copying code or reconfiguring each
# component's logging. The top-level application owns orchestration and logging.
# TypeScript modules support the same direct composition when components expose
# functions rather than doing work during import.


# 14.2 Combining many applications using the Command design pattern
@dataclass(frozen=True)
class CommandOptions:
    samples: int = 1_000
    seed: int = 0
    output: str = "samples.csv"
    inputs: tuple[str, ...] = ()
    summary_file: str = "summary.md"


class Command(ABC):
    """Common substitutable interface for application commands."""

    name: ClassVar[str]

    @abstractmethod
    def execute(self, options: CommandOptions) -> object:
        """Execute this command with the shared option object."""


class Generate(Command):
    name = "generate"

    def execute(self, options: CommandOptions) -> list[Sample]:
        return generate_samples(options.samples, options.seed)


class Summarize(Command):
    name = "summarize"

    def execute(self, options: CommandOptions) -> dict[str, int]:
        batches = [generate_samples(1, index) for index, _ in enumerate(options.inputs)]
        return summarize_samples(batches)


class CommandSequence(Command):
    name = "sequence"

    def __init__(self, *commands: Command) -> None:
        self.commands = commands

    def execute(self, options: CommandOptions) -> list[object]:
        return [command.execute(options) for command in self.commands]


class GenerateThenSummarize(Command):
    name = "gensumm"

    def execute(self, options: CommandOptions) -> dict[str, int]:
        intermediate = Generate().execute(options)
        return summarize_samples([intermediate])


command: Command = GenerateThenSummarize()
assert command.execute(CommandOptions(samples=5, seed=2)) == {
    "Success": 3,
    "Failure": 2,
}
sequence_results = CommandSequence(Generate(), GenerateThenSummarize()).execute(
    CommandOptions(samples=2, seed=1)
)
assert len(sequence_results) == 2
# Python enforces ABC abstract methods at instantiation time. A TypeScript
# interface checks shape only during static analysis and is erased at runtime.


# 14.3 Managing arguments and configuration in composite applications
type CommandType = type[Command]


def build_parser(environment: Mapping[str, str]) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="markov")
    subparsers = parser.add_subparsers(required=True)
    default_seed = int(environment.get("RANDOMSEED", "0"))

    generate_parser = subparsers.add_parser("generate")
    generate_parser.add_argument("-s", "--samples", type=int, default=1_000)
    generate_parser.add_argument("-o", "--output", default="samples.csv")
    generate_parser.add_argument(
        "-r", "--randomize", dest="seed", type=int, default=default_seed
    )
    generate_parser.set_defaults(command=Generate)

    summarize_parser = subparsers.add_parser("summarize")
    summarize_parser.add_argument(
        "-o", "--output", dest="summary_file", default="summary.md"
    )
    summarize_parser.add_argument("inputs", nargs="*")
    summarize_parser.set_defaults(command=Summarize)

    combined_parser = subparsers.add_parser("gensumm")
    combined_parser.add_argument("-s", "--samples", type=int, default=1_000)
    combined_parser.add_argument(
        "-r", "--randomize", dest="seed", type=int, default=default_seed
    )
    combined_parser.set_defaults(command=GenerateThenSummarize)
    return parser


def parse_command(
    argv: Sequence[str], environment: Mapping[str, str]
) -> tuple[Command, CommandOptions]:
    namespace = build_parser(environment).parse_args(argv)
    values: dict[str, Any] = vars(namespace)
    command_type = cast("CommandType", values.pop("command"))
    options = CommandOptions(
        samples=cast(int, values.get("samples", 1_000)),
        seed=cast(int, values.get("seed", 0)),
        output=cast(str, values.get("output", "samples.csv")),
        inputs=tuple(cast(list[str], values.get("inputs", []))),
        summary_file=cast(str, values.get("summary_file", "summary.md")),
    )
    return command_type(), options


parsed_command, parsed_options = parse_command(
    ["generate", "--samples", "7", "--output", "x.csv"],
    {"RANDOMSEED": "42"},
)
assert isinstance(parsed_command, Generate)
assert parsed_options == CommandOptions(samples=7, seed=42, output="x.csv")
# argparse validates at runtime and can attach the selected command class with
# set_defaults(). Node's util.parseArgs() parses options but subcommand dispatch
# remains application code.


# 14.4 Wrapping and combining CLI applications
def external_commands(files: int) -> Iterator[list[str]]:
    for index in range(files):
        yield [
            sys.executable,
            "-c",
            f"raise SystemExit(0)  # stand-in for sample_{index}.csv",
        ]


def run_external_commands(commands: Iterable[Sequence[str]]) -> int:
    completed = 0
    for external_command in commands:
        subprocess.run(external_command, check=True, stdout=subprocess.DEVNULL)
        completed += 1
    return completed


assert run_external_commands(external_commands(3)) == 3
# Passing an argument sequence with shell=False (the default) avoids shell
# interpolation. check=True turns a nonzero status into CalledProcessError.
# Node's execFile/execFileSync similarly launches an executable without a shell.


# 14.5 Wrapping a program and checking the output
OUTPUT_PATTERN = re.compile(r"^#\s*([^\s=]+)\s*=\s*(.*?)\s*$")


def output_commands(options: CommandOptions, iterations: int) -> Iterator[list[str]]:
    for index in range(iterations):
        filename = f"sample_{index}.csv"
        script = (
            f'print("# file = {filename!r}")\n'
            f'print("# samples = {options.samples}")\n'
            f'print("# randomize = {index + 1}")'
        )
        yield [sys.executable, "-c", script]


def command_output(command_line: Sequence[str]) -> str:
    process = subprocess.run(
        command_line,
        check=True,
        capture_output=True,
        text=True,
    )
    return process.stdout


def parse_output(result: str) -> dict[str, str]:
    matches = (OUTPUT_PATTERN.match(line) for line in result.splitlines())
    return {match.group(1): match.group(2) for match in matches if match is not None}


def output_summaries(
    options: CommandOptions, iterations: int
) -> Iterator[dict[str, str]]:
    for command_line in output_commands(options, iterations):
        yield parse_output(command_output(command_line))


captured = list(output_summaries(CommandOptions(samples=5), iterations=3))
assert captured[0] == {
    "file": "'sample_0.csv'",
    "samples": "5",
    "randomize": "1",
}
assert sum(int(summary["samples"]) for summary in captured) == 15
# capture_output buffers stdout and stderr in memory; redirect to a temporary
# file or stream large output when its size is not bounded. The parser discards
# unrelated lines and preserves raw values until an explicit conversion boundary.

# A composite can adapt options without mutating the caller's frozen dataclass.
adapted_options = replace(CommandOptions(samples=10), output="temporary.csv")
assert adapted_options.output == "temporary.csv"
