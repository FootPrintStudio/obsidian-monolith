import { Setting } from "obsidian";
import { indexSizeMessage } from "./performance";
import { DEFAULT_SETTINGS, type DefinitionIndex, type LexiconNexusSettings, type ParseWarning } from "./types";

export interface LexiconSettingsUiCtx {
	settings: LexiconNexusSettings;
	persist: () => Promise<void>;
	globalIndex: DefinitionIndex;
	warnings: ParseWarning[];
	refreshIndex: () => Promise<void>;
	redisplay?: () => void;
}

function parseLimit(value: string, fallback: number): number {
	const n = Number(value.trim());
	if (!Number.isFinite(n) || n < 0) return fallback;
	return Math.floor(n);
}

/** Package-owned Lexicon settings fields — single source for host + standalone tab. */
export function renderLexiconSettings(containerEl: HTMLElement, ctx: LexiconSettingsUiCtx): void {
	const { settings } = ctx;

	containerEl.createEl("p", {
		text: "Vault glossary from markdown files in your dictionary folder. See the Guide tab for entry format and optional requirements.",
	});

	const indexInfo = containerEl.createDiv({ cls: "lxn-index-info" });
	indexInfo.createEl("strong", { text: "Index: " });
	indexInfo.createSpan({ text: indexSizeMessage(ctx.globalIndex) });

	if (ctx.warnings.length > 0) {
		const warnBox = containerEl.createDiv({ cls: "lxn-warnings-box" });
		warnBox.createEl("strong", { text: `${ctx.warnings.length} index warning(s):` });
		const list = warnBox.createEl("ul", { cls: "lxn-warnings-list" });
		const shown = ctx.warnings.slice(0, 12);
		for (const w of shown) {
			const loc = w.line ? `${w.file}:${w.line}` : w.file;
			list.createEl("li", { text: `${loc} — ${w.message}` });
		}
		if (ctx.warnings.length > shown.length) {
			list.createEl("li", {
				text: `… and ${ctx.warnings.length - shown.length} more (enable Debug mode for console log)`,
			});
		}
	}

	new Setting(containerEl)
		.setName("Dictionary folder")
		.setDesc("All .md files under this folder are indexed as Lexicon entries.")
		.addText((text) =>
			text.setValue(settings.dictionaryFolder).onChange(async (value) => {
				settings.dictionaryFolder = value.trim() || DEFAULT_SETTINGS.dictionaryFolder;
				await ctx.persist();
				await ctx.refreshIndex();
				ctx.redisplay?.();
			}),
		);

	new Setting(containerEl)
		.setName("Enable in Reading view")
		.setDesc("Highlight defined terms and show popovers when notes render in Reading view.")
		.addToggle((toggle) =>
			toggle.setValue(settings.enableInReadingView).onChange(async (value) => {
				settings.enableInReadingView = value;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Popover trigger")
		.setDesc("How popovers open on highlighted terms. Use Click on touch devices.")
		.addDropdown((drop) =>
			drop
				.addOptions({ both: "Hover and click", hover: "Hover only", click: "Click only" })
				.setValue(settings.popoverTrigger)
				.onChange(async (value) => {
					settings.popoverTrigger = value as typeof DEFAULT_SETTINGS.popoverTrigger;
					await ctx.persist();
				}),
		);

	new Setting(containerEl)
		.setName("Case-sensitive matching (global)")
		.setDesc("When off, terms match regardless of case unless an entry has the Case requirement.")
		.addToggle((toggle) =>
			toggle.setValue(settings.caseSensitive).onChange(async (value) => {
				settings.caseSensitive = value;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Show source file in popover")
		.setDesc("Display the dictionary filename above the definition (hidden when entry has Plain requirement).")
		.addToggle((toggle) =>
			toggle.setValue(settings.showSourceFile).onChange(async (value) => {
				settings.showSourceFile = value;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Refresh on metadata change")
		.setDesc(
			"Re-render a note's Reading view when its frontmatter changes (e.g. lexicon-context). May reset scroll position — leave off if disruptive.",
		)
		.addToggle((toggle) =>
			toggle.setValue(settings.refreshOnMetadataChange).onChange(async (value) => {
				settings.refreshOnMetadataChange = value;
				await ctx.persist();
			}),
		);

	containerEl.createEl("h3", { text: "Performance" });

	new Setting(containerEl)
		.setName("Max match forms for highlighting")
		.setDesc("Reading-view highlights pause when the index exceeds this count. 0 = unlimited.")
		.addText((text) =>
			text.setValue(String(settings.maxHighlightForms)).onChange(async (value) => {
				settings.maxHighlightForms = parseLimit(value, DEFAULT_SETTINGS.maxHighlightForms);
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Max text node length")
		.setDesc("Skip scanning individual text nodes longer than this (characters). 0 = unlimited.")
		.addText((text) =>
			text.setValue(String(settings.maxTextNodeLength)).onChange(async (value) => {
				settings.maxTextNodeLength = parseLimit(value, DEFAULT_SETTINGS.maxTextNodeLength);
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Debug mode")
		.setDesc("Log index warnings and post-processor errors to the console.")
		.addToggle((toggle) =>
			toggle.setValue(settings.debugMode).onChange(async (value) => {
				settings.debugMode = value;
				await ctx.persist();
			}),
		);
}
