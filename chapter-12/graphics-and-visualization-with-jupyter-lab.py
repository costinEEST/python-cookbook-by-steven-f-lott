from __future__ import annotations

import json
import math
import statistics
from collections.abc import Mapping
from dataclasses import dataclass

import matplotlib
from pydantic import BaseModel

matplotlib.use("Agg")
from matplotlib import pyplot as plt

# Executable notes adapted from the user-saved HTML for Modern Python Cookbook,
# Chapter 12. It contains recipes 12.1-12.6. Data stays in memory and Agg renders
# without opening a GUI or writing an image.

ANSCOMBE_JSON = """[
{"series":"I","data":[[10,8.04],[8,6.95],[13,7.58],[9,8.81],[11,8.33],[14,9.96],[6,7.24],[4,4.26],[12,10.84],[7,4.82],[5,5.68]]},
{"series":"II","data":[[10,9.14],[8,8.14],[13,8.74],[9,8.77],[11,9.26],[14,8.10],[6,6.13],[4,3.10],[12,9.13],[7,7.26],[5,4.74]]},
{"series":"III","data":[[10,7.46],[8,6.77],[13,12.74],[9,7.11],[11,7.81],[14,8.84],[6,6.08],[4,5.39],[12,8.15],[7,6.42],[5,5.73]]},
{"series":"IV","data":[[8,6.58],[8,5.76],[8,7.71],[8,8.84],[8,8.47],[8,7.04],[8,5.25],[19,12.50],[8,5.56],[8,7.91],[8,6.89]]}
]"""


# 12.1 Starting a Notebook and creating cells with Python code
def run_cell(source: str, namespace: dict[str, object]) -> None:
    """Execute a cell in a kernel-like shared namespace."""
    exec(source, namespace)


kernel: dict[str, object] = {}
run_cell("scale = 3", kernel)
run_cell("result = scale * 7", kernel)
assert kernel["result"] == 21
# A kernel retains names between cells, like a long-lived JS REPL. Cell order
# matters; restarting the kernel and running all cells checks reproducibility.


# 12.2 Ingesting data into a notebook
class Pair(BaseModel):
    x: float
    y: float


class Series(BaseModel):
    series: str
    data: list[Pair]

    @property
    def x(self) -> list[float]:
        return [pair.x for pair in self.data]

    @property
    def y(self) -> list[float]:
        return [pair.y for pair in self.data]

    @property
    def correlation(self) -> float:
        return statistics.correlation(self.x, self.y)

    @property
    def regression(self) -> statistics.LinearRegression:
        return statistics.linear_regression(self.x, self.y)


def ingest(source: str) -> dict[str, Series]:
    document = json.loads(source)
    series = (Series.model_validate(item) for item in document)
    return {item.series: item for item in series}


quartet = ingest(ANSCOMBE_JSON)
assert list(quartet) == ["I", "II", "III", "IV"]
assert all(len(series.data) == 11 for series in quartet.values())
# BaseModel validates at runtime. A TypeScript interface alone cannot do this.


# 12.3 Using pyplot to create a scatter plot
first = quartet["I"]
plt.figure(layout="tight")
plt.scatter(first.x, first.y)
plt.title(f"Series {first.series}")
pyplot_figure = plt.gcf()
assert pyplot_figure.axes[0].get_title() == "Series I"
assert len(pyplot_figure.axes[0].collections) == 1
assert len(first.data) == 11
plt.close(pyplot_figure)
# pyplot mutates an implicit current figure and scatter() adds an Artist.


# 12.4 Using axes directly to create a scatter plot
figure = plt.figure(layout="tight")
axes = figure.subplot_mosaic([["I", "II"], ["III", "IV"]])
for name, axis in axes.items():
    series = quartet[name]
    regression = series.regression
    axis.scatter(series.x, series.y)
    axis.set_title(f"Series {name}")
    axis.text(
        0.95,
        0.05,
        rf"$r = {series.correlation:.3f}$"
        f"\n$Y = {regression.slope:.1f} \\times X + {regression.intercept:.2f}$",
        horizontalalignment="right",
        verticalalignment="bottom",
        transform=axis.transAxes,
    )
    axis.axline((0, regression.intercept), slope=regression.slope)

assert set(axes) == set(quartet)
assert all(len(axis.collections) == 1 for axis in axes.values())
assert all(len(axis.lines) == 1 for axis in axes.values())
plt.close(figure)
# Explicit Figure/Axes references avoid pyplot's hidden current-object state.


# 12.5 Adding details to markdown cells
@dataclass(frozen=True)
class Markdown:
    source: str


regression = quartet["I"].regression
summary = Markdown(
    rf"Series I has $r = {quartet['I'].correlation:.2f}$ and "
    rf"$y = {regression.slope:.1f} \times x + {regression.intercept:.1f}$."
)
assert "\\times" in summary.source and "0.82" in summary.source
# IPython.display.Markdown renders this in a notebook. Raw f-strings preserve
# LaTeX backslashes while interpolating computed values.


# 12.6 Including Unit Test Cases in a Notebook
def validate_quartet(data: Mapping[str, Series]) -> None:
    assert list(data) == ["I", "II", "III", "IV"]
    assert all(len(series.data) == 11 for series in data.values())


validate_quartet(quartet)
perfect = Series(
    series="test",
    data=[Pair(x=2, y=4), Pair(x=3, y=6), Pair(x=5, y=10)],
)
assert math.isclose(perfect.correlation, 1.0)
assert math.isclose(perfect.regression.slope, 2.0)
assert math.isclose(perfect.regression.intercept, 0.0, abs_tol=1e-12)
# Assertions replace informal inspection; isclose() is appropriate for floats.
# `jupyter execute notebook.ipynb` exits nonzero when a cell raises.
