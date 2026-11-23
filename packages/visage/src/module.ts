import { MarkdownView, Plugin } from "obsidian";
import { processVisage } from "./process";
import {
	parseInternalLinkHref,
	resolvePendingTabLink,
	type PendingTabLink,
	type TabLinkTarget,
} from "./tabs/deepLink";
import { TabsBlock, createTabsBlock } from "./tabs/tabsBlock";
import { DEFAULT_SETTINGS, type VisageSettings } from "./types";

export type { VisageSettings } from "./types";
export { DEFAULT_SETTINGS as DEFAULT_VISAGE_SETTINGS } from "./types";

/**
 * Visage spine module — cards postprocessor at default priority 0;
 * `v-tabs` code-block processor. Hosted by Monolith (not a separate Plugin).
 */
export class VisageModule {
	settings: VisageSettings;
	private tabIndexCache = new Map<string, number>();
	private tabsBlocks = new Map<string, TabsBlock>();
	private pendingTabLink: PendingTabLink | null = null;
	private pendingTabTarget: TabLinkTarget | null = null;

	constructor(
		private host: Plugin,
		initial: VisageSettings = { ...DEFAULT_SETTINGS },
	) {
		this.settings = { ...DEFAULT_SETTINGS, ...initial };
	}

	get app() {
		return this.host.app;
	}

	async onload(): Promise<void> {
		this.applyCssVars();

		// After Grimoire (−101): cards at default 0.
		this.host.registerMarkdownPostProcessor((el) => {
			processVisage(el, this.settings);
		});

		this.host.registerMarkdownCodeBlockProcessor("v-tabs", (source, el, ctx) => {
			createTabsBlock(el, ctx, this, source);
		});

		this.host.registerDomEvent(
			document,
			"click",
			(event) => {
				const anchor = (event.target as HTMLElement).closest("a.internal-link");
				if (!anchor) return;
				const parsed = parseInternalLinkHref(anchor.getAttribute("href") ?? "");
				if (!parsed) return;
				this.pendingTabLink = parsed;
				window.setTimeout(() => void this.tryApplyPendingTabLink(), 120);
			},
			{ capture: true },
		);

		this.host.registerEvent(
			this.host.app.workspace.on("file-open", () => {
				window.setTimeout(() => void this.tryApplyPendingTabLink(), 120);
			}),
		);
	}

	applyCssVars(): void {
		document.body.style.setProperty("--deck-gap", this.settings.deckGap);
		document.body.style.setProperty("--deck-padding", this.settings.deckPadding);
		document.body.style.setProperty("--deck-image-height", this.settings.deckImageHeight);
	}

	clearCssVars(): void {
		document.body.style.removeProperty("--deck-gap");
		document.body.style.removeProperty("--deck-padding");
		document.body.style.removeProperty("--deck-image-height");
	}

	onunload(): void {
		this.clearCssVars();
		this.tabsBlocks.clear();
		this.tabIndexCache.clear();
		this.pendingTabLink = null;
		this.pendingTabTarget = null;
	}

	rerenderPreviews(): void {
		this.applyCssVars();
		this.host.app.workspace.iterateAllLeaves((leaf) => {
			const view = leaf.view;
			if (view instanceof MarkdownView) {
				view.previewMode?.rerender(true);
			}
		});
	}

	registerTabsBlock(blockKey: string, block: TabsBlock): void {
		this.tabsBlocks.set(blockKey, block);
		if (this.pendingTabTarget?.blockKey === blockKey || this.pendingTabLink) {
			void this.tryApplyPendingTabLink(blockKey);
		}
	}

	unregisterTabsBlock(blockKey: string): void {
		this.tabsBlocks.delete(blockKey);
	}

	async tryApplyPendingTabLink(forBlockKey?: string): Promise<void> {
		const file = this.host.app.workspace.getActiveFile();
		if (!file) return;

		let target = this.pendingTabTarget;
		if (!target && this.pendingTabLink) {
			target =
				(await resolvePendingTabLink(
					this.host.app,
					file,
					this.pendingTabLink,
					this.settings,
				)) ?? null;
			if (target) {
				this.pendingTabTarget = target;
			} else if (this.tabsBlocks.size > 0) {
				this.pendingTabLink = null;
			}
		}

		if (!target) return;
		if (forBlockKey && target.blockKey !== forBlockKey) return;

		const block = this.tabsBlocks.get(target.blockKey);
		if (!block) return;

		block.setActiveIndex(target.tabIndex);
		this.pendingTabLink = null;
		this.pendingTabTarget = null;
	}

	getCachedTabIndex(blockKey: string): number | undefined {
		return this.tabIndexCache.get(blockKey);
	}

	setCachedTabIndex(blockKey: string, index: number): void {
		this.tabIndexCache.set(blockKey, index);
	}

	applySettings(next: VisageSettings): void {
		this.settings = { ...DEFAULT_SETTINGS, ...next };
		this.rerenderPreviews();
	}
}

/** @deprecated Prefer VisageModule — kept as alias for tabsBlock type imports. */
export type VisagePlugin = VisageModule;
export default VisageModule;
