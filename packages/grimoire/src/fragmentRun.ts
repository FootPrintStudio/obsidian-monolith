import { isPqFragments, isPqStyled, valueToPlainString } from "./coerce";
import type { PqStyled, Value } from "./types";

/** Private-use delimiters marking where a styled chip sits inside a merged markdown run. */
export const SLOT_OPEN = "\uE000";
export const SLOT_CLOSE = "\uE001";

const SLOT_STRIP = /[\uE000\uE001]/g;
const SLOT_SPLIT = /\uE000(\d+)\uE001/g;

export interface FragmentRun {
	/** Plain parts joined into one markdown string; styled parts appear as slot tokens. */
	text: string;
	/** Styled (`AS`) parts in token order — rendered as elements and swapped in after markdown. */
	slots: PqStyled[];
}

function isEmptyPart(value: Value): boolean {
	return value === null || value === undefined || value === "";
}

function listHasRichParts(value: Value): boolean {
	if (!Array.isArray(value)) return false;
	return value.some((item) => isPqStyled(item) || isPqFragments(item) || listHasRichParts(item));
}

/**
 * Collapse fragment parts into a single markdown run so inline markers in surrounding
 * string literals (`"**" + list + "**"`) pair across list elements, matching the
 * single-value case. Styled parts become slots to be re-attached after rendering.
 */
export function buildFragmentRun(parts: readonly Value[]): FragmentRun {
	const slots: PqStyled[] = [];
	let text = "";

	const append = (part: Value): void => {
		if (isEmptyPart(part)) return;
		if (isPqFragments(part)) {
			for (const inner of part.parts) append(inner);
			return;
		}
		if (isPqStyled(part)) {
			text += `${SLOT_OPEN}${slots.length}${SLOT_CLOSE}`;
			slots.push(part);
			return;
		}
		if (Array.isArray(part) && listHasRichParts(part)) {
			let first = true;
			for (const item of part) {
				if (isEmptyPart(item)) continue;
				if (!first) text += " ";
				first = false;
				append(item);
			}
			return;
		}
		text += valueToPlainString(part).replace(SLOT_STRIP, "");
	};

	for (const part of parts) append(part);
	return { text, slots };
}

/** Split rendered text into literal strings and slot indexes (in order). */
export function splitSlotText(text: string): Array<string | number> {
	const out: Array<string | number> = [];
	let last = 0;
	for (const match of text.matchAll(SLOT_SPLIT)) {
		const at = match.index ?? 0;
		if (at > last) out.push(text.slice(last, at));
		out.push(Number(match[1]));
		last = at + match[0].length;
	}
	if (last < text.length) out.push(text.slice(last));
	return out;
}
