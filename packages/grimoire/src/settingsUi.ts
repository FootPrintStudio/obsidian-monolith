import { Setting } from "obsidian";
import { DEFAULT_SETTINGS, type PropertyQuerySettings } from "./types";

export interface GrimoireSettingsUiCtx {
	settings: PropertyQuerySettings;
	persist: () => Promise<void>;
}

/** Package-owned Grimoire settings fields — single source for host + standalone tab. */
export function renderGrimoireSettings(containerEl: HTMLElement, ctx: GrimoireSettingsUiCtx): void {
	const { settings } = ctx;

	containerEl.createEl("p", {
		text: "Evaluate inline Grimoire expressions in Reading view. See the Guide tab for the full language reference.",
	});

	new Setting(containerEl)
		.setName("Inline prefix")
		.setDesc('Prefix inside inline code, e.g. "q=" for `q= title`.')
		.addText((text) =>
			text.setValue(settings.inlinePrefix).onChange(async (value) => {
				settings.inlinePrefix = value.trim() || DEFAULT_SETTINGS.inlinePrefix;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Enable in Reading view")
		.setDesc("Evaluate Grimoire expressions when notes render in Reading view.")
		.addToggle((toggle) =>
			toggle.setValue(settings.enableInReadingView).onChange(async (value) => {
				settings.enableInReadingView = value;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Syntax highlight inline queries")
		.setDesc(
			"Colorize `q=` expressions in the editor (Source and Live Preview) and in Reading view when evaluation is off.",
		)
		.addToggle((toggle) =>
			toggle.setValue(settings.enableSyntaxHighlight).onChange(async (value) => {
				settings.enableSyntaxHighlight = value;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Refresh on metadata change")
		.setDesc(
			"Re-render Reading views when frontmatter or embedded note metadata changes, so query results update live. May reset scroll position in split-pane workflows — leave off if that is disruptive.",
		)
		.addToggle((toggle) =>
			toggle.setValue(settings.refreshOnMetadataChange).onChange(async (value) => {
				settings.refreshOnMetadataChange = value;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Button link open")
		.setDesc("Default pane when clicking AS button links. Ctrl/Cmd and middle-click still override.")
		.addDropdown((dropdown) => {
			dropdown
				.addOption("default", "Same as Obsidian links")
				.addOption("current", "Current pane")
				.addOption("tab", "New tab")
				.addOption("split", "Split pane")
				.addOption("window", "New window")
				.setValue(settings.linkOpenBehavior)
				.onChange(async (value) => {
					settings.linkOpenBehavior = value as typeof settings.linkOpenBehavior;
					await ctx.persist();
				});
		});

	containerEl.createEl("h3", { text: "AS badge / pill tones" });
	containerEl.createEl("p", {
		cls: "setting-item-description",
		text: "Comma-separated whole-word matches (case-insensitive). Checked in order: danger → warn → success → muted. Example: dead matches Dead but not Undead.",
	});

	new Setting(containerEl)
		.setName("Success triggers")
		.setDesc("Values containing any of these map to the success (green) badge tone.")
		.addTextArea((text) =>
			text
				.setPlaceholder(DEFAULT_SETTINGS.badgeSuccessTriggers)
				.setValue(settings.badgeSuccessTriggers)
				.onChange(async (value) => {
					settings.badgeSuccessTriggers = value.trim() || DEFAULT_SETTINGS.badgeSuccessTriggers;
					await ctx.persist();
				}),
		);

	new Setting(containerEl)
		.setName("Warn triggers")
		.setDesc("Values containing any of these map to the warn (amber) badge tone.")
		.addTextArea((text) =>
			text
				.setPlaceholder(DEFAULT_SETTINGS.badgeWarnTriggers)
				.setValue(settings.badgeWarnTriggers)
				.onChange(async (value) => {
					settings.badgeWarnTriggers = value.trim() || DEFAULT_SETTINGS.badgeWarnTriggers;
					await ctx.persist();
				}),
		);

	new Setting(containerEl)
		.setName("Danger triggers")
		.setDesc("Values containing any of these map to the danger (red) badge tone.")
		.addTextArea((text) =>
			text
				.setPlaceholder(DEFAULT_SETTINGS.badgeDangerTriggers)
				.setValue(settings.badgeDangerTriggers)
				.onChange(async (value) => {
					settings.badgeDangerTriggers = value.trim() || DEFAULT_SETTINGS.badgeDangerTriggers;
					await ctx.persist();
				}),
		);

	containerEl.createEl("h3", { text: "AS meter / stars" });

	new Setting(containerEl)
		.setName("Filled character")
		.setDesc("Glyph used for filled meter slots (first character if more than one is entered).")
		.addText((text) =>
			text
				.setPlaceholder(DEFAULT_SETTINGS.meterFilledChar)
				.setValue(settings.meterFilledChar)
				.onChange(async (value) => {
					settings.meterFilledChar = value.trim() || DEFAULT_SETTINGS.meterFilledChar;
					await ctx.persist();
				}),
		);

	new Setting(containerEl)
		.setName("Empty character")
		.setDesc("Glyph used for empty meter slots (first character if more than one is entered).")
		.addText((text) =>
			text
				.setPlaceholder(DEFAULT_SETTINGS.meterEmptyChar)
				.setValue(settings.meterEmptyChar)
				.onChange(async (value) => {
					settings.meterEmptyChar = value.trim() || DEFAULT_SETTINGS.meterEmptyChar;
					await ctx.persist();
				}),
		);

	new Setting(containerEl)
		.setName("Debug mode")
		.setDesc("Show full parse/evaluation errors inline instead of a generic message.")
		.addToggle((toggle) =>
			toggle.setValue(settings.debugMode).onChange(async (value) => {
				settings.debugMode = value;
				await ctx.persist();
			}),
		);
}
