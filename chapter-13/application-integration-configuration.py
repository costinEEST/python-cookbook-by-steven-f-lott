from __future__ import annotations

import logging
import logging.config
import tomllib
from collections import ChainMap
from collections.abc import Mapping, Sequence
from io import StringIO
from pathlib import Path
from types import MappingProxyType
from typing import Any, ClassVar, Protocol, cast

# Executable notes adapted from the user-saved HTML for Modern Python Cookbook,
# Chapter 13. It contains recipes 13.1-13.6. Examples stay in memory so running
# this file neither searches the host machine nor writes configuration or logs.

type Configuration = dict[str, Any]


# 13.1 Finding configuration files
DEFAULT_CONFIGURATION: Configuration = {
    "endpoint": "https://example.invalid/api",
    "retries": 2,
    "theme": "light",
}


def layered_configuration(
    tiers: Sequence[Sequence[Path]],
    available: Mapping[Path, Configuration],
) -> ChainMap[str, Any]:
    """Load the first available alternative in each increasingly local tier."""
    loaded = [DEFAULT_CONFIGURATION]
    for alternatives in tiers:
        if selected := next((path for path in alternatives if path in available), None):
            loaded.append(available[selected])
    return ChainMap(*reversed(loaded))


home = Path("/home/example")
cwd = Path("/work/project")
config_tiers = [
    [Path("/etc/some_app/config.toml"), Path("/opt/some_app/config.toml")],
    [home / ".some_app.toml", home / ".some_app_config.toml"],
    [cwd / ".some_app.toml", cwd / ".some_app_config.toml"],
]
available_configs = {
    Path("/opt/some_app/config.toml"): {"retries": 4, "region": "eu"},
    home / ".some_app_config.toml": {"theme": "dark"},
    cwd / ".some_app.toml": {"retries": 1},
}
configuration = layered_configuration(config_tiers, available_configs)
assert configuration["retries"] == 1
assert configuration["theme"] == "dark"
assert configuration["region"] == "eu"
assert configuration["endpoint"] == DEFAULT_CONFIGURATION["endpoint"]
# ChainMap is a live layered view: local mappings override earlier tiers without
# copying them. JavaScript has no built-in equivalent; the TS sibling merges
# fresh objects in precedence order.


# 13.2 Using TOML for configuration files
TOML_CONFIGURATION = """
[some_app]
option_1 = "useful value"
option_2 = 42
sizes = [1, 2, 3]
sample = { x = 10, y = 8.4 }

[some_app.feature]
option_1 = 7331
"""


def load_toml_configuration(source: str) -> Configuration:
    """Parse TOML text; tomllib.load() instead requires a binary file object."""
    return tomllib.loads(source)


toml_document = load_toml_configuration(TOML_CONFIGURATION)
some_app = toml_document["some_app"]
assert some_app["option_1"] == "useful value"
assert some_app["option_2"] == 42
assert some_app["sizes"] == [1, 2, 3]
assert some_app["sample"] == {"x": 10, "y": 8.4}
assert some_app["feature"]["option_1"] == 7331
# Dotted keys and [tables] become nested dictionaries. Unlike JSON, TOML also
# has native local date/time values. Node 26 has no standard TOML parser.


# 13.3 Using Python for configuration files
PYTHON_CONFIGURATION = """
query = {"mz": ["ANZ532", "AMZ117"]}
base_url = "https://forecast.weather.gov/shmrn.php"
"""


def load_python_configuration(
    source: str, filename: str = "<configuration>"
) -> Configuration:
    """Execute trusted configuration code and return its assigned names."""
    code = compile(source, filename, "exec")
    local_namespace: Configuration = {}
    exec(code, {"__builtins__": {}}, local_namespace)
    return local_namespace


python_configuration = load_python_configuration(PYTHON_CONFIGURATION)
assert python_configuration == {
    "query": {"mz": ["ANZ532", "AMZ117"]},
    "base_url": "https://forecast.weather.gov/shmrn.php",
}
# compile()+exec() is code execution, not data parsing. An empty builtins mapping
# narrows this example but is not a security sandbox; never run untrusted input.
# A Python module is cached in sys.modules, but this explicit namespace is not.


# 13.4 Using a class as a namespace for configuration
class ConfigurationNamespace(Protocol):
    base_url: ClassVar[str]
    query: ClassVar[dict[str, list[str]]]


type ConfigurationClass = type[ConfigurationNamespace]


CLASS_CONFIGURATION = """
class Configuration:
    base_url = "https://forecast.weather.gov/shmrn.php"
    query = {"mz": ["GMZ856"]}

class Bahamas(Configuration):
    query = {"mz": ["AMZ117", "AMZ080"]}

class Chesapeake(Configuration):
    query = {"mz": ["ANZ532"]}
"""


def load_configuration_class(source: str, class_name: str) -> ConfigurationClass:
    """Execute trusted definitions and select one configuration class."""
    local_namespace: dict[str, Any] = {}
    exec(compile(source, "<configuration-classes>", "exec"), {}, local_namespace)
    result = local_namespace[class_name]
    if not isinstance(result, type):
        raise TypeError(f"{class_name!r} is not a class")
    if not all(hasattr(result, name) for name in ("base_url", "query")):
        raise TypeError(f"{class_name!r} does not define the configuration contract")
    return cast("ConfigurationClass", result)


chesapeake = load_configuration_class(CLASS_CONFIGURATION, "Chesapeake")
assert chesapeake.base_url == "https://forecast.weather.gov/shmrn.php"
assert chesapeake.query == {"mz": ["ANZ532"]}
# The class is the namespace; no instance is created. Attribute lookup follows
# runtime inheritance. A TypeScript class's `static` fields can approximate this,
# although TS types themselves are erased.


# 13.5 Designing scripts for composition
def get_config(
    arguments: Sequence[str], environment: Mapping[str, str]
) -> Configuration:
    """Gather runtime inputs at the boundary instead of reading global state."""
    return {
        "target": arguments[0] if arguments else "default",
        "mode": environment.get("APP_MODE", "development"),
    }


def run_application(config: Mapping[str, Any]) -> str:
    """Perform useful work from explicit inputs and return the result."""
    return f"{config['mode']}:{config['target']}"


composable_config = get_config(["daily"], {"APP_MODE": "production"})
assert run_application(composable_config) == "production:daily"
# Real scripts call main() only under `if __name__ == "__main__"`. Keeping work
# out of module import makes functions testable and lets another app compose them.
# ES modules execute top-level statements when imported, so TS needs the same
# discipline even though its main-module detection differs.


# 13.6 Using logging for control and audit output
class Processor:
    def __init__(self) -> None:
        self.error_logger = logging.getLogger(f"error.{type(self).__name__}")
        self.debug_logger = logging.getLogger(f"debug.{type(self).__name__}")

    def process(self, value: int) -> int:
        self.debug_logger.info("input=%r", value)
        result = value * 2
        self.debug_logger.info("result=%r", result)
        self.error_logger.info("Processing completed")
        return result


log_output = StringIO()
logging.config.dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {"format": "{levelname}:{name}:{message}", "style": "{"}
        },
        "handlers": {
            "memory": {
                "class": "logging.StreamHandler",
                "stream": log_output,
                "formatter": "default",
            }
        },
        "loggers": {
            "debug": {"handlers": ["memory"], "level": "INFO", "propagate": False},
            "error": {"handlers": ["memory"], "level": "INFO", "propagate": False},
        },
    }
)
assert Processor().process(21) == 42
logged_lines = log_output.getvalue().splitlines()
assert logged_lines == [
    "INFO:debug.Processor:input=21",
    "INFO:debug.Processor:result=42",
    "INFO:error.Processor:Processing completed",
]
logging.shutdown()
# Logger names form a dot-separated hierarchy. %-style arguments defer message
# interpolation until a handler needs the record. Console output and logging are
# ancillary channels; the application's primary result remains a return value.

# Expose a read-only view when downstream code should consume, not mutate, a
# finalized configuration. MappingProxyType reflects later source changes; it is
# not a deep-frozen copy, much like Object.freeze() is shallow in JavaScript.
readonly_configuration = MappingProxyType(dict(configuration))
assert readonly_configuration["retries"] == 1
