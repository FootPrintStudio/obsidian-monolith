import { describe, expect, it } from "vitest";
import { classifyOutput, isPqFragments, pqFragments, pqStyled, valueToPlainString } from "../src/coerce";
import { createTestContext, evaluateExpression } from "../src/eval";
import { SLOT_CLOSE, SLOT_OPEN, buildFragmentRun, splitSlotText } from "../src/fragmentRun";
import type { Value } from "../src/types";

const ctx = createTestContext({
	fields: {
		one: "x",
		many: ["a", "b", "c"],
		nums: [1, 2, 3],
		links: ["[[Alpha]]", "[[Beta]]"],
		oneLink: "[[Alpha]]",
		none: [],
	},
});

/** Markdown text a result renders as: strings as-is; fragments collapse into one run. */
function runText(expr: string): string {
	const v = evaluateExpression(expr, ctx);
	if (isPqFragments(v)) return buildFragmentRun(v.parts).text;
	return valueToPlainString(v);
}

const slot = (i: number) => `${SLOT_OPEN}${i}${SLOT_CLOSE}`;

describe("fragment run: single value vs list (Carl: bold with list)", () => {
	it("single value stays one markdown string", () => {
		expect(runText('"**" + one + "**"')).toBe("**x**");
	});

	it("list becomes one run so ** pairs around all elements", () => {
		const v = evaluateExpression('"**" + many + "**"', ctx);
		expect(isPqFragments(v)).toBe(true);
		const run = buildFragmentRun((v as { parts: Value[] }).parts);
		expect(run.text).toBe("**a b c**");
		expect(run.slots).toHaveLength(0);
		expect(classifyOutput(run.text)).toBe("markdown");
	});

	it("handles italics, bold-italics, and inline code markers", () => {
		expect(runText('"*" + many + "*"')).toBe("*a b c*");
		expect(runText('"***" + many + "***"')).toBe("***a b c***");
		expect(runText('"_" + many + "_"')).toBe("_a b c_");
		expect(runText('"==" + many + "=="')).toBe("==a b c==");
	});

	it("handles markdown links wrapped around a list", () => {
		expect(runText('"[" + many + "](https://example.com)"')).toBe("[a b c](https://example.com)");
	});

	it("handles numbers in lists", () => {
		expect(runText('"**" + nums + "**"')).toBe("**1 2 3**");
	});

	it("keeps surrounding literals on both sides of a list", () => {
		expect(runText('"**Tags:** " + many + " (end)"')).toBe("**Tags:** a b c (end)");
	});
});

describe("fragment run: lists of links", () => {
	it("keeps wikilinks inside the bold run", () => {
		expect(runText('"**" + links + "**"')).toBe("**[[Alpha]] [[Beta]]**");
	});

	it("single link matches list-of-one shape", () => {
		expect(runText('"**" + oneLink + "**"')).toBe("**[[Alpha]]**");
	});
});

describe("fragment run: empty list", () => {
	it("matches the empty single-value case", () => {
		expect(runText('"**" + none + "**"')).toBe(runText('"**" + "" + "**"'));
		expect(runText('"**" + none + "**"')).toBe("****");
	});

	it("empty and null parts add nothing", () => {
		expect(buildFragmentRun(["a", "", null, "b"]).text).toBe("ab");
	});
});

describe("fragment run: nested styling (AS)", () => {
	it("keeps a single styled value as a slot inside the bold markers", () => {
		const v = evaluateExpression('"**" + (one AS badge) + "**"', ctx);
		expect(isPqFragments(v)).toBe(true);
		const run = buildFragmentRun((v as { parts: Value[] }).parts);
		expect(run.text).toBe(`**${slot(0)}**`);
		expect(run.slots).toHaveLength(1);
		expect(run.slots[0]!.style).toBe("badge");
	});

	it("keeps each styled list element as its own slot, space separated", () => {
		const v = evaluateExpression('"**" + (many AS badge) + "**"', ctx);
		const parts = isPqFragments(v) ? v.parts : [v];
		const run = buildFragmentRun(parts);
		// Either one list-valued chip or one chip per item — both stay inside one bold run.
		expect(run.text.startsWith("**")).toBe(true);
		expect(run.text.endsWith("**")).toBe(true);
		expect(run.slots.length).toBeGreaterThan(0);
		expect(run.slots.every((s) => s.style === "badge")).toBe(true);
	});

	it("keeps rich join() output in one run with separators", () => {
		const v = evaluateExpression('"**" + join(links, " | ") + "**"', ctx);
		expect(buildFragmentRun(isPqFragments(v) ? v.parts : [v]).text).toBe("**[[Alpha]] | [[Beta]]**");
	});

	it("flattens nested fragments and rich lists with single-space chip gaps", () => {
		const a = pqStyled("A", "badge");
		const b = pqStyled("B", "badge");
		const run = buildFragmentRun([
			"**",
			pqFragments(["x ", a]),
			[a, [b, "tail"]],
			"**",
		]);
		expect(run.text).toBe(`**x ${slot(0)}${slot(1)} ${slot(2)} tail**`);
		expect(run.slots).toEqual([a, a, b]);
	});

	it("strips stray slot delimiters from plain text", () => {
		const run = buildFragmentRun([`a${SLOT_OPEN}0${SLOT_CLOSE}b`]);
		expect(run.text).toBe("a0b");
		expect(run.slots).toHaveLength(0);
	});
});

describe("splitSlotText", () => {
	it("splits literals and slot indexes in order", () => {
		expect(splitSlotText(`**${slot(0)} and ${slot(1)}**`)).toEqual(["**", 0, " and ", 1, "**"]);
		expect(splitSlotText("plain")).toEqual(["plain"]);
		expect(splitSlotText(slot(12))).toEqual([12]);
	});
});
