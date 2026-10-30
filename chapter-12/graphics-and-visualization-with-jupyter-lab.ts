// Run with Node 26 or newer:
// node chapter-12/graphics-and-visualization-with-jupyter-lab.ts

import assert from "node:assert/strict";

// TypeScript parallels for all six recipes. Node has no standard plotting or
// notebook API, so plotting is a checked declarative model.
const anscombeJson = `[
{"series":"I","data":[[10,8.04],[8,6.95],[13,7.58],[9,8.81],[11,8.33],[14,9.96],[6,7.24],[4,4.26],[12,10.84],[7,4.82],[5,5.68]]},
{"series":"II","data":[[10,9.14],[8,8.14],[13,8.74],[9,8.77],[11,9.26],[14,8.10],[6,6.13],[4,3.10],[12,9.13],[7,7.26],[5,4.74]]},
{"series":"III","data":[[10,7.46],[8,6.77],[13,12.74],[9,7.11],[11,7.81],[14,8.84],[6,6.08],[4,5.39],[12,8.15],[7,6.42],[5,5.73]]},
{"series":"IV","data":[[8,6.58],[8,5.76],[8,7.71],[8,8.84],[8,8.47],[8,7.04],[8,5.25],[19,12.50],[8,5.56],[8,7.91],[8,6.89]]}
]`;

// 12.1 Starting a Notebook and creating cells with Python code
const kernel = new Map<string, number>();
kernel.set("scale", 3);
kernel.set("result", (kernel.get("scale") ?? 0) * 7);
assert.equal(kernel.get("result"), 21);
// Normal modules start fresh; this map makes long-lived REPL state explicit.

// 12.2 Ingesting data into a notebook
interface Pair {
  readonly x: number;
  readonly y: number;
}
interface Regression {
  readonly slope: number;
  readonly intercept: number;
}
interface Series {
  readonly series: string;
  readonly data: readonly Pair[];
  readonly x: readonly number[];
  readonly y: readonly number[];
  readonly correlation: number;
  readonly regression: Regression;
}

function correlation(xs: readonly number[], ys: readonly number[]): number {
  const meanX = xs.reduce((total, value) => total + value, 0) / xs.length;
  const meanY = ys.reduce((total, value) => total + value, 0) / ys.length;
  const covariance = xs.reduce(
    (total, value, index) => total + (value - meanX) * ((ys[index] ?? meanY) - meanY),
    0,
  );
  const xSpread = Math.sqrt(
    xs.reduce((total, value) => total + (value - meanX) ** 2, 0),
  );
  const ySpread = Math.sqrt(
    ys.reduce((total, value) => total + (value - meanY) ** 2, 0),
  );
  return covariance / (xSpread * ySpread);
}

function linearRegression(xs: readonly number[], ys: readonly number[]): Regression {
  const meanX = xs.reduce((total, value) => total + value, 0) / xs.length;
  const meanY = ys.reduce((total, value) => total + value, 0) / ys.length;
  const numerator = xs.reduce(
    (total, value, index) => total + (value - meanX) * ((ys[index] ?? meanY) - meanY),
    0,
  );
  const denominator = xs.reduce((total, value) => total + (value - meanX) ** 2, 0);
  const slope = numerator / denominator;
  return { slope, intercept: meanY - slope * meanX };
}

function parseSeries(value: unknown): Series {
  if (typeof value !== "object" || value === null)
    throw new TypeError("series must be an object");
  const candidate = value as { series?: unknown; data?: unknown };
  if (typeof candidate.series !== "string" || !Array.isArray(candidate.data))
    throw new TypeError("invalid series fields");
  const data = candidate.data.map((pair): Pair => {
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      pair.some((item) => typeof item !== "number")
    )
      throw new TypeError("invalid pair");
    return { x: pair[0] as number, y: pair[1] as number };
  });
  const x = data.map((pair) => pair.x);
  const y = data.map((pair) => pair.y);
  return {
    series: candidate.series,
    data,
    x,
    y,
    correlation: correlation(x, y),
    regression: linearRegression(x, y),
  };
}

function ingest(source: string): Map<string, Series> {
  const document: unknown = JSON.parse(source);
  if (!Array.isArray(document)) throw new TypeError("document must be an array");
  return new Map(document.map(parseSeries).map((series) => [series.series, series]));
}

const quartet = ingest(anscombeJson);
assert.deepEqual([...quartet.keys()], ["I", "II", "III", "IV"]);
assert.ok([...quartet.values()].every((series) => series.data.length === 11));

// 12.3 Using pyplot to create a scatter plot
interface Plot {
  readonly title: string;
  readonly points: readonly Pair[];
  readonly annotation?: string;
  readonly regression?: Regression;
}
const first = quartet.get("I");
assert.ok(first);
const pyplotPlot: Plot = { title: `Series ${first.series}`, points: first.data };
assert.equal(pyplotPlot.title, "Series I");
assert.equal(pyplotPlot.points.length, 11);

// 12.4 Using axes directly to create a scatter plot
const mosaic = new Map<string, Plot>();
for (const [name, series] of quartet) {
  mosaic.set(name, {
    title: `Series ${name}`,
    points: series.data,
    annotation: `r = ${series.correlation.toFixed(3)}`,
    regression: series.regression,
  });
}
assert.deepEqual([...mosaic.keys()], ["I", "II", "III", "IV"]);
assert.ok([...mosaic.values()].every((plot) => plot.regression !== undefined));
// Rendering requires a browser canvas/SVG API or a third-party plotting library.

// 12.5 Adding details to markdown cells
const summary = `Series I has $r = ${first.correlation.toFixed(2)}$ and $y = ${first.regression.slope.toFixed(1)} \\times x + ${first.regression.intercept.toFixed(1)}$.`;
assert.match(summary, /\\times/);
assert.match(summary, /0\.82/);
// Template literals interpolate values; LaTeX backslashes need escaping.

// 12.6 Including Unit Test Cases in a Notebook
function isClose(left: number, right: number, tolerance = 1e-9): boolean {
  return (
    Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right))
  );
}
const perfectX = [2, 3, 5];
const perfectY = [4, 6, 10];
const perfectRegression = linearRegression(perfectX, perfectY);
assert.ok(isClose(correlation(perfectX, perfectY), 1));
assert.ok(isClose(perfectRegression.slope, 2));
assert.ok(isClose(perfectRegression.intercept, 0));
// Uncaught AssertionError already makes a Node process exit nonzero.
