import {
	coerceForConcat,
	flattenFragmentParts,
	isPqFragments,
	isPqStyled,
	isWildcardKey,
	pqFragments,
	pqStyled,
	unwrapForTruthiness,
	valueToPlainString,
	valuesEqual,
} from "./coerce";
import {
	addDateDuration,
	addDurations,
	compareValues,
	dateformat,
	durationformat,
	fnAge,
	fnDate,
	fnDur,
	isPqDate,
	isPqDuration,
	numberformat,
	pqDate,
	resolveDateKeyword,
	scaleDuration,
	subtractDateDuration,
	subtractDates,
	subtractDurations,
	toPqDate,
	toPqDuration,
} from "./dates";
import { fnConv, fnInRange, fnInRangeTernary } from "./units";
import { getFileField, resolveIdent } from "./context";
import { linkpathFromValue, listNotesFrom, readCrossMember, resolveNoteContext } from "./crossNote";
import { parseExpression, parseQuery } from "./parse";
import type { AstNode, FileMeta, QueryContext, Value } from "./types";

function isTruthy(value: Value): boolean {
	const inner = unwrapForTruthiness(value);
	if (inner === null || inner === undefined || inner === false) return false;
	if (inner === "") return false;
	if (Array.isArray(inner)) return inner.length > 0;
	return true;
}

function fnDefault(value: Value, fallback: Value): Value {
	if (!isTruthy(value)) return fallback;
	const inner = unwrapForTruthiness(value);
	if (Array.isArray(inner) && inner.length === 0) return fallback;
	return value;
}

function fnChoice(cond: Value, ifTrue: Value, ifFalse: Value): Value {
	return isTruthy(cond) ? ifTrue : ifFalse;
}

function fnAny(...args: Value[]): boolean {
	if (args.length === 0) return false;
	if (args.length === 1) return isTruthy(args[0]);
	const hay = args[0]!;
	const needles = args.slice(1);
	return needles.some((needle) => fnEcontains(hay, needle));
}

function fnContains(hay: Value, needle: Value): boolean {
	const h = unwrapForTruthiness(hay);
	const n = unwrapForTruthiness(needle);
	if (h === null || n === null) return false;
	if (typeof h === "string" && typeof n === "string") return h.includes(n);
	if (Array.isArray(h)) {
		return h.some((item) => {
			if (typeof item === "string" && typeof n === "string") return item.includes(n);
			return valuesEqual(item, n);
		});
	}
	return false;
}

function fnEcontains(hay: Value, needle: Value): boolean {
	const h = unwrapForTruthiness(hay);
	const n = unwrapForTruthiness(needle);
	if (h === null || n === null) return false;
	if (typeof h === "string" && typeof n === "string") return h.includes(n);
	if (Array.isArray(h)) return h.some((item) => valuesEqual(item, n));
	if (
		typeof h === "object" &&
		!isPqDate(h) &&
		!isPqDuration(h) &&
		!isPqStyled(h) &&
		!isPqFragments(h) &&
		typeof n === "string"
	) {
		return Object.prototype.hasOwnProperty.call(h, n);
	}
	return false;
}

function fnSlice(list: Value, start: Value, end?: Value): Value {
	const inner = unwrapForTruthiness(list);
	if (!Array.isArray(inner)) return [];
	const s = Number(start);
	const e = end === undefined ? inner.length : Number(end);
	return inner.slice(s, e);
}

function fnLength(value: Value): number {
	const inner = unwrapForTruthiness(value);
	if (inner === null) return 0;
	if (typeof inner === "string" || Array.isArray(inner)) return inner.length;
	return 0;
}

function fnCoalesce(...args: Value[]): Value {
	for (const arg of args) {
		if (isTruthy(arg)) return arg;
	}
	return null;
}

function fnJoin(list: Value, sep: Value): string {
	const inner = unwrapForTruthiness(list);
	if (!Array.isArray(inner)) return valueToPlainString(list);
	return inner.map((v) => coerceForConcat(v)).join(String(sep ?? ", "));
}

function fnLower(value: Value): Value {
	const inner = unwrapForTruthiness(value);
	if (inner === null || inner === undefined) return null;
	return valueToPlainString(inner).toLowerCase();
}

function fnUpper(value: Value): Value {
	const inner = unwrapForTruthiness(value);
	if (inner === null || inner === undefined) return null;
	return valueToPlainString(inner).toUpperCase();
}

/** Replace all non-overlapping occurrences of `needle` (literal, not regex). */
function fnReplace(hay: Value, needle: Value, replacement: Value): Value {
	const inner = unwrapForTruthiness(hay);
	if (inner === null || inner === undefined) return null;
	const h = valueToPlainString(inner);
	const n = valueToPlainString(unwrapForTruthiness(needle) ?? "");
	const r = valueToPlainString(unwrapForTruthiness(replacement) ?? "");
	if (!n) return h;
	return h.split(n).join(r);
}

function fnRound(value: Value, digits?: Value): Value {
	const num = Number(unwrapForTruthiness(value));
	if (Number.isNaN(num)) return null;
	if (digits === undefined || digits === null) return Math.round(num);
	const d = Number(unwrapForTruthiness(digits));
	if (Number.isNaN(d) || d < 0) return Math.round(num);
	const places = Math.floor(d);
	const factor = 10 ** places;
	return Math.round(num * factor) / factor;
}

function fnAbs(value: Value): Value {
	const num = Number(unwrapForTruthiness(value));
	if (Number.isNaN(num)) return null;
	return Math.abs(num);
}

function evalSelect(args: AstNode[], ctx: QueryContext): Value {
	if (args.length < 2) throw new Error("select() requires a key and at least one {key, value} pair");
	const lookup = evalNode(args[0]!, ctx);
	let fallback: Value | null = null;

	for (let i = 1; i < args.length; i++) {
		const arg = args[i]!;
		if (arg.kind !== "pair") {
			throw new Error("select() arguments after the key must be {key, value} pairs");
		}
		const pairKey = evalNode(arg.key, ctx);
		const pairValue = evalNode(arg.value, ctx);
		if (isWildcardKey(unwrapForTruthiness(pairKey))) {
			fallback = pairValue;
			continue;
		}
		if (valuesEqual(pairKey, lookup)) return pairValue;
	}
	return fallback;
}

/** Binary branch brace: `{ifTrue, ifFalse}` or true-only `{ifTrue}` (parses as pair with `""`). */
function isBinaryBranchBrace(node: AstNode): boolean {
	return node.kind === "pair";
}

function evalBinaryBranchArms(
	node: AstNode,
	ctx: QueryContext,
): { ifTrue: Value; ifFalse: Value } {
	if (node.kind !== "pair") {
		throw new Error("Expected binary branch brace {ifTrue, ifFalse} or {ifTrue}");
	}
	return {
		ifTrue: evalNode(node.key, ctx),
		ifFalse: evalNode(node.value, ctx),
	};
}

function branchOn(cond: Value, arms: { ifTrue: Value; ifFalse: Value }): Value {
	return fnChoice(cond, arms.ifTrue, arms.ifFalse);
}

/**
 * Primary: `choice(cond, {ifTrue, ifFalse})` or `choice(cond, {ifTrue})`.
 * Legacy: `choice(cond, ifTrue, ifFalse)`.
 */
function evalChoice(args: AstNode[], ctx: QueryContext): Value {
	if (args.length === 2 && isBinaryBranchBrace(args[1]!)) {
		return branchOn(evalNode(args[0]!, ctx), evalBinaryBranchArms(args[1]!, ctx));
	}
	if (args.length === 3) {
		return fnChoice(evalNode(args[0]!, ctx), evalNode(args[1]!, ctx), evalNode(args[2]!, ctx));
	}
	throw new Error(
		'choice() expects choice(cond, {ifTrue, ifFalse}), choice(cond, {ifTrue}), or legacy choice(cond, ifTrue, ifFalse)',
	);
}

/**
 * Primary: `exists(v, {ifTrue, ifFalse})` / `exists(v, {ifTrue})`.
 * Legacy: `exists(v)` → boolean.
 */
function evalExists(args: AstNode[], ctx: QueryContext): Value {
	if (args.length === 2 && isBinaryBranchBrace(args[1]!)) {
		return branchOn(isTruthy(evalNode(args[0]!, ctx)), evalBinaryBranchArms(args[1]!, ctx));
	}
	if (args.length === 1) {
		return isTruthy(evalNode(args[0]!, ctx));
	}
	throw new Error(
		'exists() expects exists(value, {ifTrue, ifFalse}), exists(value, {ifTrue}), or legacy exists(value)',
	);
}

/**
 * Primary: trailing branch brace — `any(v, {t,f})` or `any(hay, c…, {t,f})`.
 * Legacy: `any(...)` → boolean.
 */
function evalAny(args: AstNode[], ctx: QueryContext): Value {
	if (args.length >= 2 && isBinaryBranchBrace(args[args.length - 1]!)) {
		const subjectArgs = args.slice(0, -1).map((arg) => evalNode(arg, ctx));
		return branchOn(fnAny(...subjectArgs), evalBinaryBranchArms(args[args.length - 1]!, ctx));
	}
	return fnAny(...args.map((arg) => evalNode(arg, ctx)));
}

/**
 * Primary: `contains({hay, needle}, {ifTrue, ifFalse})`.
 * Also: `contains(hay, needle, {ifTrue, ifFalse})`.
 * Legacy: `contains(hay, needle)` → boolean.
 */
function evalContainsLike(
	args: AstNode[],
	ctx: QueryContext,
	match: (hay: Value, needle: Value) => boolean,
	name: string,
): Value {
	if (args.length === 2 && args[0]!.kind === "pair" && isBinaryBranchBrace(args[1]!)) {
		const hay = evalNode(args[0]!.key, ctx);
		const needle = evalNode(args[0]!.value, ctx);
		return branchOn(match(hay, needle), evalBinaryBranchArms(args[1]!, ctx));
	}
	if (args.length === 3 && isBinaryBranchBrace(args[2]!)) {
		return branchOn(
			match(evalNode(args[0]!, ctx), evalNode(args[1]!, ctx)),
			evalBinaryBranchArms(args[2]!, ctx),
		);
	}
	if (args.length === 2) {
		return match(evalNode(args[0]!, ctx), evalNode(args[1]!, ctx));
	}
	throw new Error(
		`${name}() expects ${name}({hay, needle}, {ifTrue, ifFalse}), ${name}(hay, needle, {ifTrue, ifFalse}), or legacy ${name}(hay, needle)`,
	);
}

/**
 * Primary: `inRange({value, low, high}, {below, inBand, above})` → three-way branch.
 * Legacy: `inRange(value, low, high)` → inclusive boolean (for `choice`).
 */
function evalInRange(args: AstNode[], ctx: QueryContext): Value {
	if (
		args.length === 2 &&
		args[0]!.kind === "tuple" &&
		args[1]!.kind === "tuple" &&
		args[0]!.elements.length === 3 &&
		args[1]!.elements.length === 3
	) {
		const [valueNode, lowNode, highNode] = args[0]!.elements;
		const [belowNode, inNode, aboveNode] = args[1]!.elements;
		return fnInRangeTernary(
			evalNode(valueNode!, ctx),
			evalNode(lowNode!, ctx),
			evalNode(highNode!, ctx),
			evalNode(belowNode!, ctx),
			evalNode(inNode!, ctx),
			evalNode(aboveNode!, ctx),
		);
	}

	if (args.length === 3) {
		return fnInRange(evalNode(args[0]!, ctx), evalNode(args[1]!, ctx), evalNode(args[2]!, ctx));
	}

	throw new Error(
		'inRange() expects inRange({value, low, high}, {below, inRange, above}) or legacy inRange(value, low, high)',
	);
}

function thisFileMeta(ctx: QueryContext): FileMeta {
	return ctx.sourceCtx?.file ?? ctx.file;
}

function isThisFileRef(node: AstNode): boolean {
	return node.kind === "member" && node.object.kind === "ident" && node.object.name === "this" && node.property === "file";
}

/** Where-brace predicate; `this.file` means "candidate is the source note". */
function evalWhereItem(node: AstNode, candidate: QueryContext, source: QueryContext): boolean {
	let negated = false;
	let body = node;
	if (body.kind === "unary" && (body.op === "!" || body.op === "not")) {
		negated = true;
		body = body.arg;
	}

	if (isThisFileRef(body)) {
		const isSource = candidate.file.path === source.file.path;
		return negated ? !isSource : isSource;
	}

	const scoped: QueryContext = { ...candidate, sourceCtx: source, deps: source.deps };
	const truth = isTruthy(evalNode(body, scoped));
	return negated ? !truth : truth;
}

function isUniqueFlag(node: AstNode): boolean {
	return node.kind === "ident" && node.name.toLowerCase() === "unique";
}

/**
 * Where-brace predicates for `filter`. Reuses pair/tuple brace AST:
 * `{pred}` → pair(pred, "") (singleton sugar); `{a, b}` → pair; `{a,b,c}` → tuple.
 * Empty-string false arm from singleton sugar is skipped.
 */
function extractFilterWherePreds(node: AstNode): AstNode[] {
	if (node.kind === "pair") {
		const preds: AstNode[] = [node.key];
		if (!(node.value.kind === "literal" && node.value.value === "")) {
			preds.push(node.value);
		}
		return preds;
	}
	if (node.kind === "tuple") return [...node.elements];
	return [node];
}

/** null → []; non-list → [x]; list-of-lists → flatten one level. */
function normalizeFilterList(list: Value): Value[] {
	const inner = unwrapForTruthiness(list);
	if (inner === null || inner === undefined) return [];
	if (!Array.isArray(inner)) return [inner];
	const hasNested = inner.some((el) => Array.isArray(unwrapForTruthiness(el)));
	if (!hasNested) return inner;
	const out: Value[] = [];
	for (const el of inner) {
		const u = unwrapForTruthiness(el);
		if (Array.isArray(u)) out.push(...u);
		else out.push(el);
	}
	return out;
}

function stableUnique(items: Value[]): Value[] {
	const out: Value[] = [];
	for (const item of items) {
		if (!out.some((kept) => valuesEqual(kept, item))) out.push(item);
	}
	return out;
}

function tryResolveListItemNote(item: Value, source: QueryContext): QueryContext | null {
	const linkpath =
		linkpathFromValue(item) ??
		(typeof unwrapForTruthiness(item) === "string"
			? (() => {
					const s = String(unwrapForTruthiness(item)).trim();
					const wiki = /^\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]$/.exec(s);
					return wiki ? wiki[1]!.trim() : null;
				})()
			: null);
	if (!linkpath) return null;
	return resolveNoteContext(source, linkpath);
}

function itemMatchesSourceFile(item: Value, source: QueryContext): boolean {
	const note = tryResolveListItemNote(item, source);
	if (note) return note.file.path === source.file.path;
	return valuesEqual(item, source.file as unknown as Value);
}

function filterItemContext(item: Value, source: QueryContext): QueryContext {
	const noteCtx = tryResolveListItemNote(item, source);
	if (noteCtx) {
		return {
			...noteCtx,
			fields: { ...noteCtx.fields, item },
			sourceCtx: source,
			deps: source.deps,
			app: source.app,
			resolveNote: source.resolveNote,
			listNotes: source.listNotes,
		};
	}
	return {
		...source,
		fields: { ...source.fields, item },
		sourceCtx: source,
	};
}

/** Filter where-brace predicate against a list item (not necessarily a page ctx). */
function evalFilterWhereItem(node: AstNode, item: Value, source: QueryContext): boolean {
	let negated = false;
	let body = node;
	if (body.kind === "unary" && (body.op === "!" || body.op === "not")) {
		negated = true;
		body = body.arg;
	}

	if (isThisFileRef(body)) {
		const match = itemMatchesSourceFile(item, source);
		return negated ? !match : match;
	}

	// Note-shaped items: bare idents = that page; `this.` = source; `item` = element.
	const scoped = filterItemContext(item, source);
	const truth = isTruthy(evalNode(body, scoped));
	return negated ? !truth : truth;
}

/**
 * `filter(LIST, unique?)` / `filter(LIST, {preds…})` / either order of unique + where.
 * Predicates AND; `!` negates; `this.` = source note; `item` = current element.
 * Dedupe is applied last when `unique` is present.
 */
function evalFilter(args: AstNode[], ctx: QueryContext): Value {
	if (args.length < 2 || args.length > 3) {
		throw new Error(
			'filter() expects filter(LIST, unique), filter(LIST, {preds…}), or both (either order)',
		);
	}

	let unique = false;
	let whereNode: AstNode | null = null;
	for (let i = 1; i < args.length; i++) {
		const arg = args[i]!;
		if (isUniqueFlag(arg)) {
			unique = true;
			continue;
		}
		if (arg.kind === "pair" || arg.kind === "tuple") {
			if (whereNode) {
				throw new Error("filter() accepts at most one where-brace group");
			}
			whereNode = arg;
			continue;
		}
		throw new Error(
			'filter() optional args must be `unique` and/or a where brace `{preds…}`',
		);
	}
	if (!unique && !whereNode) {
		throw new Error(
			'filter() expects filter(LIST, unique), filter(LIST, {preds…}), or both (either order)',
		);
	}

	// List eval uses ambient ctx; where `this.` / !this.file use authoring source
	// (same lock as `@` map — sourceCtx when nested).
	const authoring = ctx.sourceCtx ?? ctx;
	let items = normalizeFilterList(evalNode(args[0]!, ctx));
	if (whereNode) {
		const preds = extractFilterWherePreds(whereNode);
		items = items.filter((item) =>
			preds.every((p) => evalFilterWhereItem(p, item, authoring)),
		);
	}
	if (unique) items = stableUnique(items);
	return items;
}

function evalAtQuery(
	node: Extract<AstNode, { kind: "atQuery" }>,
	source: QueryContext,
): Value {
	const fromRaw = evalNode(node.fromArg, source);
	const fromArg = String(unwrapForTruthiness(fromRaw) ?? "").trim();
	if (!fromArg) return [];

	const pages = listNotesFrom(source, fromArg);
	const filtered = pages.filter((page) =>
		node.where.every((item) => evalWhereItem(item, page, source)),
	);

	if (!node.map) {
		// Page-handle list (wiki strings) when no map brace.
		return filtered.map((page) => `[[${page.file.name}]]`);
	}

	const out: Value[] = [];
	for (const page of filtered) {
		const scoped: QueryContext = {
			...page,
			sourceCtx: source,
			deps: source.deps,
			app: source.app,
			resolveNote: source.resolveNote,
			listNotes: source.listNotes,
		};
		out.push(evalNode(node.map, scoped));
	}
	return out;
}

function resolveMemberNode(node: AstNode, ctx: QueryContext): Value {
	if (node.kind === "ident") {
		if (node.name === "file") return ctx.file as unknown as Value;
		return resolveIdent(node.name, ctx);
	}
	if (node.kind === "wiki") {
		const noteCtx = resolveNoteContext(ctx, node.path);
		if (!noteCtx) return null;
		return `[[${node.path}]]`;
	}
	if (node.kind === "member") {
		if (node.object.kind === "ident" && node.object.name === "this" && node.property === "file") {
			return thisFileMeta(ctx) as unknown as Value;
		}
		if (node.object.kind === "ident" && node.object.name === "file") {
			return getFileField(ctx.file, node.property);
		}
		if (
			node.object.kind === "member" &&
			node.object.object.kind === "ident" &&
			node.object.object.name === "this" &&
			node.object.property === "file"
		) {
			return getFileField(thisFileMeta(ctx), node.property);
		}
		// Bare wiki page member: [[Note]].field / [[Note]].file.mtime
		if (node.object.kind === "wiki") {
			const noteCtx = resolveNoteContext(ctx, node.object.path);
			if (!noteCtx) return null;
			if (node.property === "file") return noteCtx.file as unknown as Value;
			return resolveIdent(node.property, noteCtx);
		}
		const base = evalNode(node.object, ctx);
		return readCrossMember(base, node.property, ctx);
	}
	return evalNode(node, ctx);
}

function hasStyledOrFragments(value: Value): boolean {
	return isPqStyled(value) || isPqFragments(value);
}

/** Prefer branded dates; otherwise fantasy coerce via Epochs (`date()` / frontmatter objects). */
function asPqDate(value: Value): ReturnType<typeof toPqDate> {
	return toPqDate(value) ?? fnDate(value);
}

function addValues(a: Value, b: Value): Value {
	if (hasStyledOrFragments(a) || hasStyledOrFragments(b)) {
		return pqFragments([...flattenFragmentParts(a), ...flattenFragmentParts(b)]);
	}

	const da = asPqDate(a);
	const dura = toPqDuration(a);
	const durb = toPqDuration(b);

	if (da && durb) return addDateDuration(da, durb);
	if (dura && durb) return addDurations(dura, durb);
	if (typeof a === "string" || typeof b === "string") {
		return coerceForConcat(a) + coerceForConcat(b);
	}
	if (typeof a === "number" && typeof b === "number") return a + b;
	return coerceForConcat(a) + coerceForConcat(b);
}

function subtractValues(a: Value, b: Value): Value {
	const ua = unwrapForTruthiness(a);
	const ub = unwrapForTruthiness(b);
	const da = asPqDate(ua);
	const db = asPqDate(ub);
	const dura = toPqDuration(ua);
	const durb = toPqDuration(ub);

	if (da && db) return subtractDates(da, db);
	if (da && durb) return subtractDateDuration(da, durb);
	if (dura && durb) return subtractDurations(dura, durb);
	return (Number(ua) || 0) - (Number(ub) || 0);
}

function multiplyValues(a: Value, b: Value): Value {
	const ua = unwrapForTruthiness(a);
	const ub = unwrapForTruthiness(b);
	const dura = toPqDuration(ua);
	const durb = toPqDuration(ub);
	if (dura && typeof ub === "number") return scaleDuration(dura, ub);
	if (durb && typeof ua === "number") return scaleDuration(durb, ua);
	return (Number(ua) || 0) * (Number(ub) || 0);
}

function divideValues(a: Value, b: Value): Value {
	const ua = unwrapForTruthiness(a);
	const ub = unwrapForTruthiness(b);
	const dura = toPqDuration(ua);
	if (dura && typeof ub === "number" && ub !== 0) return scaleDuration(dura, 1 / ub);
	return (Number(ua) || 0) / (Number(ub) || 1);
}

function compareOp(op: string, left: Value, right: Value): Value {
	const cmp = compareValues(unwrapForTruthiness(left), unwrapForTruthiness(right));
	switch (op) {
		case "==":
			return valuesEqual(left, right);
		case "!=":
			return !valuesEqual(left, right);
		case "<":
			return cmp < 0;
		case ">":
			return cmp > 0;
		case "<=":
			return cmp <= 0;
		case ">=":
			return cmp >= 0;
		default:
			return false;
	}
}

function evalNode(node: AstNode, ctx: QueryContext): Value {
	switch (node.kind) {
		case "literal":
			return node.value;
		case "pair":
			return evalNode(node.value, ctx);
		case "tuple":
			return node.elements.map((el) => evalNode(el, ctx));
		case "ident":
			return resolveIdent(node.name, ctx);
		case "wiki": {
			const noteCtx = resolveNoteContext(ctx, node.path);
			if (!noteCtx) return null;
			return `[[${node.path}]]`;
		}
		case "member":
			return resolveMemberNode(node, ctx);
		case "index": {
			const base = evalNode(node.object, ctx);
			const indexVal = evalNode(node.index, ctx);
			const inner = unwrapForTruthiness(base);
			if (!Array.isArray(inner)) return null;
			const pick = (raw: Value): Value => {
				const idx = Number(unwrapForTruthiness(raw));
				return !Number.isNaN(idx) ? (inner[idx] ?? null) : null;
			};
			// Multi-index `[0,4,5]` — tuple eval yields a list of index values.
			if (Array.isArray(indexVal)) {
				return indexVal.map((v) => pick(v));
			}
			return pick(indexVal);
		}
		case "styled":
			return pqStyled(evalNode(node.expr, ctx), node.style);
		case "atQuery":
			return evalAtQuery(node, ctx);
		case "unary": {
			const v = evalNode(node.arg, ctx);
			if (node.op === "not" || node.op === "!") return !isTruthy(v);
			if (node.op === "-") return -(Number(unwrapForTruthiness(v)) || 0);
			return null;
		}
		case "binary": {
			const left = evalNode(node.left, ctx);
			const right = evalNode(node.right, ctx);
			switch (node.op) {
				case "+":
					return addValues(left, right);
				case "-":
					return subtractValues(left, right);
				case "*":
					return multiplyValues(left, right);
				case "/":
					return divideValues(left, right);
				case "%":
					return (Number(unwrapForTruthiness(left)) || 0) % (Number(unwrapForTruthiness(right)) || 1);
				case "==":
				case "!=":
				case "<":
				case ">":
				case "<=":
				case ">=":
					return compareOp(node.op, left, right);
				case "and":
				case "&&":
					return isTruthy(left) && isTruthy(right);
				case "or":
				case "||":
					return isTruthy(left) || isTruthy(right);
				default:
					return null;
			}
		}
		case "call": {
			const name = node.callee.toLowerCase();
			if (name === "select") return evalSelect(node.args, ctx);
			if (name === "inrange") return evalInRange(node.args, ctx);
			if (name === "choice") return evalChoice(node.args, ctx);
			if (name === "exists") return evalExists(node.args, ctx);
			if (name === "any") return evalAny(node.args, ctx);
			if (name === "contains") return evalContainsLike(node.args, ctx, fnContains, "contains");
			if (name === "econtains") return evalContainsLike(node.args, ctx, fnEcontains, "econtains");
			if (name === "filter") return evalFilter(node.args, ctx);
			const args = node.args.map((arg) => evalNode(arg, ctx));
			const fn = FUNCTION_MAP[name];
			if (!fn) throw new Error(`Unknown function "${node.callee}"`);
			return fn(args, node.args);
		}
		default:
			return null;
	}
}

type Fn = (args: Value[], rawArgs?: AstNode[]) => Value;

const FUNCTION_MAP: Record<string, Fn> = {
	default: ([a, b]) => fnDefault(a, b),
	// choice / any / exists / contains / econtains / inRange / filter: raw-AST dispatch above
	slice: ([list, start, end]) => fnSlice(list, start, end),
	dateformat: ([d, fmt]) => dateformat(d, String(fmt ?? "")),
	durationformat: ([d, fmt]) => durationformat(d, fmt === undefined ? undefined : String(fmt)),
	age: ([d, fmt]) => fnAge(d, fmt === undefined || fmt === null ? undefined : String(fmt)),
	numberformat: ([n, fmt]) => numberformat(n, String(fmt ?? "0")),
	conv: (args, rawArgs) => {
		const unitArg = (evaluated: Value, raw: AstNode | undefined): string => {
			if (raw?.kind === "ident") return raw.name;
			return String(evaluated ?? "");
		};
		return fnConv(args[0] ?? null, unitArg(args[1] ?? null, rawArgs?.[1]), unitArg(args[2] ?? null, rawArgs?.[2]));
	},
	length: ([v]) => fnLength(v),
	coalesce: (args) => fnCoalesce(...args),
	join: ([list, sep]) => fnJoin(list, sep),
	lower: ([v]) => fnLower(v),
	upper: ([v]) => fnUpper(v),
	replace: ([hay, needle, replacement]) => fnReplace(hay, needle ?? "", replacement ?? ""),
	round: ([n, digits]) => fnRound(n, digits),
	abs: ([n]) => fnAbs(n),
	date: (args, rawArgs) => {
		const raw = rawArgs?.[0];
		if (raw?.kind === "ident") {
			const keyword = resolveDateKeyword(raw.name);
			if (keyword) return keyword;
		}
		return fnDate(args[0] ?? null) ?? null;
	},
	dur: (args) => fnDur(args) ?? null,
};

export function evaluateExpression(source: string, ctx: QueryContext): Value {
	return evalNode(parseExpression(source), ctx);
}

export function evaluateExpressionSafe(
	source: string,
	ctx: QueryContext,
): { ok: true; value: Value } | { ok: false; error: string } {
	try {
		const ast = parseQuery(source);
		return { ok: true, value: evalNode(ast, ctx) };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

export function createTestContext(
	overrides: Partial<QueryContext> & { fields?: Record<string, Value> } = {},
): QueryContext {
	const now = pqDate(Date.now());
	const file: FileMeta = {
		name: "Test",
		path: "Test.md",
		folder: "",
		mtime: now,
		ctime: now,
		size: 0,
		tags: [],
		...overrides.file,
	};
	return {
		fields: overrides.fields ?? {},
		file,
		sourcePath: overrides.sourcePath ?? file.path,
		app: overrides.app,
		deps: overrides.deps,
		resolveNote: overrides.resolveNote,
		listNotes: overrides.listNotes,
		sourceCtx: overrides.sourceCtx,
	};
}
