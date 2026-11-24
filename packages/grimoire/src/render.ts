import { App, MarkdownPostProcessorContext, MarkdownRenderChild, MarkdownRenderer, TFile } from "obsidian";
import { buildQueryContext } from "./context";
import { attachVaultBridge } from "./crossNote";
import { shieldDataviewInlineCodeFalsePositive } from "./dataviewCoexist";
import {
	classifyOutput,
	isPqFragments,
	isPqStyled,
	valueToPlainString,
	valueToStyleItems,
} from "./coerce";
import { durationformat } from "./dates";
import { evaluateExpressionSafe } from "./eval";
import { buildFragmentRun, splitSlotText, type FragmentRun } from "./fragmentRun";
import { highlightExpressionHtml, splitPrefixExpression } from "./highlight";
import { registerCrossNoteDeps } from "./refresh";
import { renderStyledValue } from "./renderStyles";
import type { PqStyled, PropertyQuerySettings, Value } from "./types";

class QueryResultRenderer extends MarkdownRenderChild {
	constructor(
		container: HTMLElement,
		private app: App,
		private body: string,
		private sourcePath: string,
		private onRendered?: () => void,
	) {
		super(container);
	}

	onload(): void {
		void MarkdownRenderer.render(this.app, this.body, this.containerEl, this.sourcePath, this).then(
			() => this.onRendered?.(),
		);
	}
}

function renderError(container: HTMLElement, message: string): void {
	container.empty();
	container.addClass("pq-error");
	container.setText(message);
}

function renderPlain(container: HTMLElement, text: string): void {
	container.empty();
	container.addClass("pq-result");
	container.setText(text);
}

function renderHtml(container: HTMLElement, html: string): void {
	container.empty();
	container.addClass("pq-result");
	container.innerHTML = html;
}

function renderMarkdownValue(
	app: App,
	container: HTMLElement,
	text: string,
	sourcePath: string,
	ctx: MarkdownPostProcessorContext,
): void {
	container.empty();
	container.addClass("pq-result");
	const child = new QueryResultRenderer(container, app, text, sourcePath);
	ctx.addChild(child);
}

export function renderValue(
	app: App,
	container: HTMLElement,
	value: Value,
	sourcePath: string,
	ctx: MarkdownPostProcessorContext,
): void {
	const kind = classifyOutput(value);
	if (kind === "empty") {
		container.empty();
		container.addClass("pq-result");
		return;
	}

	let text = valueToPlainString(value);
	if (typeof value === "object" && value !== null && "__pqDuration" in value) {
		text = durationformat(value);
	}

	switch (kind) {
		case "html":
			renderHtml(container, text);
			break;
		case "markdown":
			renderMarkdownValue(app, container, text, sourcePath, ctx);
			break;
		default:
			renderPlain(container, text);
	}
}

function renderStyledFragment(
	app: App,
	host: HTMLElement,
	value: PqStyled,
	sourcePath: string,
	ctx: MarkdownPostProcessorContext,
	settings: PropertyQuerySettings,
): HTMLElement {
	const wrap = host.createSpan({ cls: "grim-fragment grim-fragment-styled" });
	renderStyledValue(wrap, value.style, valueToStyleItems(value.value), app, sourcePath, settings, ctx);
	return wrap;
}

/** Replace slot tokens in rendered text nodes with the styled chips they stand for. */
function mountFragmentSlots(
	root: HTMLElement,
	run: FragmentRun,
	mount: (slot: PqStyled) => HTMLElement,
): void {
	const doc = root.ownerDocument;
	const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const targets: Text[] = [];
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		if (/[\uE000\uE001]/.test(node.nodeValue ?? "")) targets.push(node as Text);
	}
	for (const node of targets) {
		const parent = node.parentNode;
		if (!parent) continue;
		for (const piece of splitSlotText(node.nodeValue ?? "")) {
			if (typeof piece === "string") {
				parent.insertBefore(doc.createTextNode(piece), node);
				continue;
			}
			const slot = run.slots[piece];
			if (slot) parent.insertBefore(mount(slot), node);
		}
		parent.removeChild(node);
	}
}

/**
 * Render fragment parts as ONE markdown run (`"**" + list + "**"` pairs its markers like the
 * single-value case); styled parts are rendered as chips and swapped in at their slot tokens.
 */
function renderFragmentRun(
	app: App,
	host: HTMLElement,
	run: FragmentRun,
	sourcePath: string,
	ctx: MarkdownPostProcessorContext,
	settings: PropertyQuerySettings,
): void {
	if (!run.text) return;
	const wrap = host.createSpan({ cls: "grim-fragment grim-fragment-plain" });
	const finish = (): void => {
		if (run.slots.length === 0) return;
		mountFragmentSlots(wrap, run, (slot) =>
			renderStyledFragment(app, wrap, slot, sourcePath, ctx, settings),
		);
	};

	const kind = classifyOutput(run.text);
	if (kind === "html") {
		wrap.innerHTML = run.text;
		finish();
	} else if (kind === "markdown") {
		ctx.addChild(new QueryResultRenderer(wrap, app, run.text, sourcePath, finish));
	} else {
		wrap.setText(run.text);
		finish();
	}
}

/** True when a list (e.g. `@` map of `status AS pill`) holds styled/fragment parts. */
function listHasRichParts(value: Value): boolean {
	if (!Array.isArray(value)) return false;
	return value.some((item) => isPqStyled(item) || isPqFragments(item) || listHasRichParts(item));
}

function renderQueryResult(
	app: App,
	host: HTMLElement,
	value: Value,
	sourcePath: string,
	ctx: MarkdownPostProcessorContext,
	settings: PropertyQuerySettings,
): void {
	if (isPqStyled(value)) {
		renderStyledValue(
			host,
			value.style,
			valueToStyleItems(value.value),
			app,
			sourcePath,
			settings,
			ctx,
		);
		return;
	}

	// Fragments and `@(…, (x AS pill))` lists: one markdown run + styled chips, not per-part spans.
	if (isPqFragments(value) || listHasRichParts(value)) {
		host.empty();
		host.addClass("pq-result");
		host.addClass("grim-fragments");
		const parts = isPqFragments(value) ? value.parts : [value];
		renderFragmentRun(app, host, buildFragmentRun(parts), sourcePath, ctx, settings);
		return;
	}

	renderValue(app, host, value, sourcePath, ctx);
}

function extractExpression(codeText: string, prefix: string): string | null {
	const trimmed = codeText.trim();
	if (!trimmed.startsWith(prefix)) return null;
	return trimmed.slice(prefix.length).trim();
}

function processInlineCodeElement(
	app: App,
	codeEl: HTMLElement,
	sourcePath: string,
	prefix: string,
	ctx: MarkdownPostProcessorContext,
	settings: PropertyQuerySettings,
): void {
	if (codeEl.dataset.pqProcessed === "1") return;
	if (codeEl.closest("pre")) return;

	const expr = extractExpression(codeEl.innerText ?? "", prefix);
	if (expr === null) return;

	const file = app.vault.getAbstractFileByPath(sourcePath);
	if (!(file instanceof TFile)) return;

	codeEl.dataset.pqProcessed = "1";

	const deps = new Set<string>();
	const queryCtx = attachVaultBridge(buildQueryContext(app, file), app, sourcePath, deps);
	const result = evaluateExpressionSafe(expr, queryCtx);
	if (deps.size > 0) registerCrossNoteDeps(sourcePath, deps);

	const host = document.createElement("span");
	host.className = "pq-inline";
	codeEl.replaceWith(host);

	if (!result.ok) {
		renderError(host, settings.debugMode ? result.error : "Grimoire error");
		return;
	}
	renderQueryResult(app, host, result.value, sourcePath, ctx, settings);
}

function highlightInlineCodeElement(codeEl: HTMLElement, prefix: string): void {
	if (codeEl.dataset.pqHighlighted === "1" || codeEl.dataset.pqProcessed === "1") return;
	if (codeEl.closest("pre")) return;

	const codeText = codeEl.innerText ?? "";
	const split = splitPrefixExpression(codeText, prefix);
	if (!split) return;

	codeEl.addClass("pq-query-source");
	codeEl.innerHTML = highlightExpressionHtml(split.prefixPart, split.expr);
	codeEl.dataset.pqHighlighted = "1";
}

export function processPropertyQueriesInElement(
	app: App,
	element: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	settings: PropertyQuerySettings,
): void {
	if (!settings.enableInReadingView && !settings.enableSyntaxHighlight) return;

	const prefix = settings.inlinePrefix;
	for (const codeEl of element.findAll("code")) {
		if (codeEl.closest("pre")) continue;
		if (shieldDataviewInlineCodeFalsePositive(codeEl, prefix)) continue;

		if (settings.enableInReadingView) {
			processInlineCodeElement(app, codeEl, ctx.sourcePath, prefix, ctx, settings);
		} else if (settings.enableSyntaxHighlight) {
			highlightInlineCodeElement(codeEl, prefix);
		}
	}
}
