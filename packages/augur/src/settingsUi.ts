import { Setting } from "obsidian";
import {
	DEFAULT_SETTINGS,
	MEDIA_FILTERS,
	TAB_ALIGNS,
	TAB_POSITIONS,
	VIEW_TYPES,
	type AugurSettings,
} from "./types";

export interface AugurSettingsUiCtx {
	settings: AugurSettings;
	persist: () => Promise<void>;
}

/** Package-owned Augur settings fields — single source for host + standalone tab. */
export function renderAugurSettings(containerEl: HTMLElement, ctx: AugurSettingsUiCtx): void {
	const { settings } = ctx;

	containerEl.createEl("p", {
		text: "Fallbacks used when Grimoire, Oculus, Visage, or Lexicon Nexus are not enabled. Live companion settings win when those modules are loaded.",
	});

	new Setting(containerEl)
		.setName("Default Oculus view")
		.addDropdown((dropdown) => {
			for (const view of VIEW_TYPES) dropdown.addOption(view, view);
			dropdown.setValue(settings.defaultView).onChange(async (value) => {
				settings.defaultView = value as typeof DEFAULT_SETTINGS.defaultView;
				await ctx.persist();
			});
		});

	new Setting(containerEl)
		.setName("Default Oculus filter")
		.addDropdown((dropdown) => {
			for (const filter of MEDIA_FILTERS) dropdown.addOption(filter, filter);
			dropdown.setValue(settings.defaultFilter).onChange(async (value) => {
				settings.defaultFilter = value as typeof DEFAULT_SETTINGS.defaultFilter;
				await ctx.persist();
			});
		});

	new Setting(containerEl)
		.setName("Default Visage tab position")
		.addDropdown((dropdown) => {
			for (const value of TAB_POSITIONS) dropdown.addOption(value, value);
			dropdown.setValue(settings.defaultTabPosition).onChange(async (value) => {
				settings.defaultTabPosition = value as typeof DEFAULT_SETTINGS.defaultTabPosition;
				await ctx.persist();
			});
		});

	new Setting(containerEl)
		.setName("Default Visage tab align")
		.addDropdown((dropdown) => {
			for (const value of TAB_ALIGNS) dropdown.addOption(value, value);
			dropdown.setValue(settings.defaultTabAlign).onChange(async (value) => {
				settings.defaultTabAlign = value as typeof DEFAULT_SETTINGS.defaultTabAlign;
				await ctx.persist();
			});
		});

	new Setting(containerEl)
		.setName("Default first tab title")
		.addText((text) =>
			text.setValue(settings.defaultTabTitle1).onChange(async (value) => {
				settings.defaultTabTitle1 = value.trim() || DEFAULT_SETTINGS.defaultTabTitle1;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Default second tab title")
		.addText((text) =>
			text.setValue(settings.defaultTabTitle2).onChange(async (value) => {
				settings.defaultTabTitle2 = value.trim() || DEFAULT_SETTINGS.defaultTabTitle2;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Grimoire prefix fallback")
		.setDesc("Used for autocomplete when Grimoire is not enabled.")
		.addText((text) =>
			text.setValue(settings.grimoirePrefix).onChange(async (value) => {
				settings.grimoirePrefix = value || DEFAULT_SETTINGS.grimoirePrefix;
				await ctx.persist();
			}),
		);

	new Setting(containerEl)
		.setName("Lexicon folder fallback")
		.setDesc("Used for dictionary autocomplete when Lexicon Nexus is not enabled.")
		.addText((text) =>
			text.setValue(settings.lexiconFolder).onChange(async (value) => {
				settings.lexiconFolder = value.trim() || DEFAULT_SETTINGS.lexiconFolder;
				await ctx.persist();
			}),
		);
}
