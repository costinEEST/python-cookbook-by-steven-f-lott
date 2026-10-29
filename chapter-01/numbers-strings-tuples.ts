// Run with Node 26 or newer: node chapter-01/numbers-strings-tuples.ts

import assert from "node:assert/strict";

import type { WeatherData } from "../typescript/python-compat.ts";

import {
  ASCII_PUNCTUATION,
  ASCII_WHITESPACE,
  FixedDecimal,
  Rational,
  center,
  composeBinaryFloat,
  compileVerbose,
  count,
  decomposeBinaryFloat,
  debugExpressions,
  encodeAscii,
  floorDivision,
  floorDivisionWithRemainder,
  formatCharacter,
  formatInteger,
  formatPercent,
  formatPythonBytes,
  formatWeather,
  frozenTuple,
  fullMatch,
  isClose,
  makeNamedTuple,
  roundTo,
  splitSeconds,
  sqrtComplex,
  sumWithFloatingPointCompensation,
  unicodeByName,
} from "../typescript/python-compat.ts";

// 1.1 Choosing between number, FixedDecimal, and Rational
// -------------------------------------------------------
const taxRate = FixedDecimal.parse("7.25").divideByInteger(100n);
const purchaseAmount = FixedDecimal.parse("2.95");
const unroundedTotal = purchaseAmount.add(taxRate.multiply(purchaseAmount));
assert.equal(unroundedTotal.quantize(2, "half-even").toString(), "3.16");
assert.equal(unroundedTotal.quantize(2, "up").toString(), "3.17");

assert.equal(FixedDecimal.parse("0.1").toString(), "0.1");
const binaryTenth = 0.1;
assert.notEqual(
  FixedDecimal.fromNumberExact(binaryTenth).toString(),
  FixedDecimal.parse("0.1").toString(),
);

const sugarCups = Rational.fromDecimal("2.5");
const scaleFactor = new Rational(5n, 8n);
assert.equal(sugarCups.multiply(scaleFactor).toString(), "25/16");

const floatAnswer = (19 / 155) * (155 / 19);
assert.notEqual(floatAnswer, 1.0);
assert.ok(isClose(floatAnswer, 1.0));
assert.equal(roundTo(floatAnswer, 3), 1.0);

const cancellationValues = [1e16, 1.0, -1e16] as const;
assert.equal(sumWithFloatingPointCompensation(cancellationValues), 1.0);
const [mantissa, exponent] = decomposeBinaryFloat(8.066e67);
assert.equal(composeBinaryFloat(mantissa, exponent), 8.066e67);
assert.deepEqual(sqrtComplex(-2), { real: 0, imaginary: Math.sqrt(2) });

// 1.2 Choosing between true division and floor division
// -----------------------------------------------------
const totalSeconds = 7_385;
assert.deepEqual(splitSeconds(totalSeconds), [2, 3, 5]);
const [hours, remainder] = floorDivisionWithRemainder(totalSeconds, 3_600);
assert.equal(totalSeconds, 3_600 * hours + remainder);

const approximateHours = totalSeconds / 3_600;
const exactHours = new Rational(BigInt(totalSeconds), 3_600n);
assert.equal(roundTo(approximateHours, 4), 2.0514);
assert.equal(exactHours.toString(), "1477/720");
assert.equal(floorDivision(5, 2), 2);
assert.equal(floorDivision(-5, 2), -3);
assert.equal(Math.trunc(-5 / 2), -2);

// 1.3 Parsing strings with regular expressions
// ---------------------------------------------
const ingredientText = "Kumquat: 2 cups";
const basicMatch = fullMatch(/([\w\s]+):\s+(\d+)\s+(\w+)/, ingredientText);
assert.ok(basicMatch !== null);
assert.deepEqual(basicMatch.slice(1), ["Kumquat", "2", "cups"]);

const keyValuePattern = /(?<name>\w+)\s*[=:]\s*(?<value>.*)/;
const sizeMatch = fullMatch(keyValuePattern, "size = 12");
assert.ok(sizeMatch?.groups !== undefined);
assert.deepEqual({ ...sizeMatch.groups }, { name: "size", value: "12" });
const weightMatch = fullMatch(keyValuePattern, "weight: 14");
assert.ok(weightMatch !== null);
assert.deepEqual(weightMatch.slice(1), ["weight", "14"]);

const ingredientPattern = /(?<ingredient>[\w\s]+):\s+(?<amount>\d+)\s+(?<unit>\w+)/;
const ingredientMatch = fullMatch(ingredientPattern, ingredientText);
assert.ok(ingredientMatch?.groups !== undefined);
assert.deepEqual(
  { ...ingredientMatch.groups },
  { ingredient: "Kumquat", amount: "2", unit: "cups" },
);

const verboseIngredientPattern = compileVerbose(String.raw`
  (?<ingredient>[\w\s]+):\s+ # name before colon
  (?<amount>\d+)\s+           # amount
  (?<unit>\w+)                # unit
`);
const verboseIngredientMatch = fullMatch(verboseIngredientPattern, ingredientText);
assert.ok(verboseIngredientMatch?.groups !== undefined);
assert.deepEqual({ ...verboseIngredientMatch.groups }, { ...ingredientMatch.groups });

// 1.4 Building complicated strings with formatting helpers
// ---------------------------------------------------------
const weatherData: WeatherData = {
  id: "IAD",
  location: "Dulles Intl Airport",
  maxTemp: 32,
  minTemp: 13,
  precipitation: 0.4,
};
const weather = formatWeather(weatherData);
assert.equal(weather, "IAD : Dulles Intl Airport :  32 /  13 /  0.40");
assert.equal(
  `${formatInteger(13, "b")} ${formatInteger(13, "#o")} ${formatInteger(13, "#06x")}`,
  "1101 0o15 0x000d",
);
assert.equal(formatPercent(0.125, 1), "12.5%");
assert.equal(formatCharacter(0x2665), "♥");
assert.equal(center("Python", 10, "*"), "**Python**");
assert.equal(formatInteger(12, "+4d"), " +12");
const value = 2 ** 12 - 1;
assert.equal(
  debugExpressions({ value, "2**7+1": 2 ** 7 + 1 }),
  "value=4095 2**7+1=129",
);
assert.equal(formatWeather(weatherData), weather);

// 1.5 Building complicated strings from arrays of strings
// --------------------------------------------------------
const title = "Recipe 5: Rewriting an Immutable String";
const titleList = [...title];
const colonPosition = titleList.indexOf(":");
titleList.splice(0, colonPosition + 1);
for (let index = 0; index < titleList.length; index += 1) {
  const character = titleList[index];
  assert.ok(character !== undefined);
  if (ASCII_WHITESPACE.includes(character) || ASCII_PUNCTUATION.includes(character)) {
    titleList[index] = "_";
  }
}
const rewrittenTitle = titleList.join("");
assert.equal(rewrittenTitle, "_Rewriting_an_Immutable_String");
assert.equal(rewrittenTitle.at(-1), titleList.at(-1));

// 1.6 Using Unicode characters that are not on the keyboard
// ----------------------------------------------------------
const dieFaceOne = "\u2680";
const mahjongTile = "\u{1f000}";
const namedRedDragon = unicodeByName("MAHJONG TILE RED DRAGON");
assert.equal(mahjongTile.codePointAt(0), 0x1f000);
assert.equal(namedRedDragon.codePointAt(0), 0x1f004);
assert.equal(`You rolled ${dieFaceOne}`, "You rolled ⚀");
assert.equal([...mahjongTile].length, 1);
assert.equal(mahjongTile.length, 2); // UTF-16 code units, unlike Python len().

// 1.7 Encoding strings: creating ASCII and UTF-8 bytes
// -----------------------------------------------------
const unicodeText = `You drew ${mahjongTile}`;
const utf8Bytes = new TextEncoder().encode(unicodeText);
assert.deepEqual(
  [...utf8Bytes],
  [...new TextEncoder().encode("You drew "), 0xf0, 0x9f, 0x80, 0x80],
);
assert.equal(new TextEncoder().encode(mahjongTile).length, 4);
assert.throws(() => encodeAscii(unicodeText), TypeError);

// 1.8 Decoding bytes: recovering proper characters
// -------------------------------------------------
const documentBytes = new TextEncoder().encode(
  '<?xml version="1.0" encoding="UTF-8"?>\nForecast: café ⚀',
);
const document = new TextDecoder("utf-8", { fatal: true }).decode(documentBytes);
assert.ok(document.includes("Forecast: café ⚀"));
const samplePage = "header\n// CONTENT STARTS\nNo warnings\n// CONTENT ENDS\nfooter";
const contentMatch = /\/\/ CONTENT STARTS(.*?)\/\/ CONTENT ENDS/s.exec(samplePage);
assert.equal(contentMatch?.[1]?.trim(), "No warnings");

// 1.9 Using tuples of items
// -------------------------
const ingredientTuple = frozenTuple("Rice", new Rational(1n, 4n), "cups");
const singleton = frozenTuple("item");
assert.equal(singleton.length, 1);
assert.equal(ingredientTuple[1].toString(), "1/4");
const [ingredientName, ingredientAmount, ingredientUnit] = ingredientTuple;
assert.equal(ingredientName, "Rice");
assert.equal(ingredientAmount.toString(), "1/4");
assert.equal(ingredientUnit, "cups");
const tuple: readonly string[] = frozenTuple("Kumquat", "2", "cups");
assert.equal(tuple.length, 3);
assert.equal(count(tuple, "2"), 1);
assert.equal(tuple.indexOf("cups"), 2);
assert.equal(tuple.includes("Rice"), false);
assert.throws(() => {
  (tuple as unknown as string[]).push("mutable");
}, TypeError);

// 1.10 Using named tuples to simplify item access
// ------------------------------------------------
type IngredientFields = Readonly<{
  ingredient: string;
  amount: string;
  unit: string;
}>;
const item = makeNamedTuple<readonly [string, string, string], IngredientFields>(
  ["Kumquat", "2", "cups"],
  { ingredient: 0, amount: 1, unit: 2 },
);
assert.equal(item.ingredient, item[0]);
assert.equal(Rational.fromDecimal(item.amount).toString(), "2");
assert.equal(
  `Use ${item.amount} ${item.unit} fresh ${item.ingredient}`,
  "Use 2 cups fresh Kumquat",
);

type IngredientExactFields = Readonly<{
  ingredient: string;
  amount: Rational;
  unit: string;
}>;
const exactItem = makeNamedTuple<
  readonly [string, Rational, string],
  IngredientExactFields
>(["Kumquat", Rational.fromDecimal("2"), "cups"], {
  ingredient: 0,
  amount: 1,
  unit: 2,
});
assert.equal(
  `${exactItem.ingredient} doubled: ${exactItem.amount.multiply(new Rational(2n))}`,
  "Kumquat doubled: 4",
);

function main(): void {
  console.log(`Currency total: ${unroundedTotal.quantize(2, "half-even")}`);
  console.log(`Recipe amount: ${sugarCups.multiply(scaleFactor)} cups`);
  console.log(`7,385 seconds: (${splitSeconds(totalSeconds).join(", ")})`);
  console.log(weather);
  console.log(rewrittenTitle);
  console.log(`You drew ${mahjongTile} ${formatPythonBytes(utf8Bytes)}`);
  console.log(
    `Named ingredient: IngredientF(ingredient='${exactItem.ingredient}', amount=Fraction(${exactItem.amount.numerator}, ${exactItem.amount.denominator}), unit='${exactItem.unit}')`,
  );
}

main();
