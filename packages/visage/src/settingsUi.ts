import { Setting } from "obsidian";
import { TAB_ALIGNS, TAB_POSITIONS } from "./tabs/types";
import { DEFAULT_SETTINGS, type VisageSettings } from "./types";

export interface VisageSettingsUiCtx {
	settings: VisageSettings;
	persist: () => Promise<void>;
}

/** Package-owned Visage settings fields — single source for host + standalone tab. */
export function renderVisageSettings(containerEl: HTMLElement, ctx: VisageSettingsUiCtx): void {
	const { settings } = ctx;

	containerEl.createEl("p", {
		text: "Reading view only. Cards use a leading `v-card` token on list items. Tabs use a `v-tabs` fence. Disable the ListDecks CSS snippet on notes that use Visage cards so styles do not double-apply. Disable the Content Tabs plugin — tabs now live in Visage.",
	});

	new Setting(containerEl)
		.setName("Card gap")
		.setDesc("Space between cards (`--deck-gap`). Default 0.35rem.")
		.addText((text) =>
			text
				.setPlaceholder("0.35rem")
				.setValue(settings.deckGap)
				.onChange(async (value) => {
					settings.deckGap = value.trim() || "0.35rem";
					await ctx.persist();
				}),
		);

	new Setting(containerEl)
		.setName("Card padding")
		.setDesc("Inner padding scale (`--deck-padding`). Default 0.65em.")
		.addText((text) =>
			text
				.setPlaceholder("0.65em")
				.setValue(settings.deckPadding)
				.onChange(async (value) => {
					settings.deckPadding = value.trim() || "0.65em";
					await ctx.persist();
				}),
		);

	new Setting(containerEl)
		.setName("Image height")
		.setDesc("Max image height inside cards (`--deck-image-height`). Default 800px.")
		.addText((text) =>
			text
				.setPlaceholder("800px")
				.setValue(settings.deckImageHeight)
				.onChange(async (value) => {
					settings.deckImageHeight = value.trim() || "800px";
					await ctx.persist();
				}),
		);

	containerEl.createEl("h3", { text: "Tabs" });

	new Setting(containerEl)
		.setName("Default tab position")
		.setDesc("Used when POSITION is omitted from a `v-tabs` block.")
		.addDropdown((dropdown) => {
			for (const position of TAB_POSITIONS) dropdown.addOption(position, position);
			dropdown.setValue(settings.defaultPosition).onChange(async (value) => {
				settings.defaultPosition = value as typeof DEFAULT_SETTINGS.defaultPosition;
				await ctx.persist();
			});
		});

	new Setting(containerEl)
		.setName("Default tab align")
		.setDesc("Used when ALIGN is omitted. Applies to top and bottom nav only.")
		.addDropdown((dropdown) => {
			for (const align of TAB_ALIGNS) dropdown.addOption(align, align);
			dropdown.setValue(settings.defaultAlign).onChange(async (value) => {
				settings.defaultAlign = value as typeof DEFAULT_SETTINGS.defaultAlign;
				await ctx.persist();
			});
		});

	new Setting(containerEl)
		.setName("Remember active tab")
		.setDesc("Restore the last selected tab when reopening a note (session memory).")
		.addToggle((toggle) =>
			toggle.setValue(settings.rememberActiveTab).onChange(async (value) => {
				settings.rememberActiveTab = value;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Default tab 1 title")
		.setDesc("Title for the first tab in the insert template.")
		.addText((text) =>
			text.setValue(settings.defaultTabTitle1).onChange(async (value) => {
				settings.defaultTabTitle1 = value.trim() || DEFAULT_SETTINGS.defaultTabTitle1;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Default tab 2 title")
		.setDesc("Title for the second tab in the insert template.")
		.addText((text) =>
			text.setValue(settings.defaultTabTitle2).onChange(async (value) => {
				settings.defaultTabTitle2 = value.trim() || DEFAULT_SETTINGS.defaultTabTitle2;
				await ctx.persist();
			}),
		);
}
