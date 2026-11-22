import { App, PluginSettingTab, Setting } from "obsidian";
import type MonolithPlugin from "./main";
import type { ModuleFlags } from "./types";

const SPINE_FLAGS: { key: keyof ModuleFlags; name: string; note: string }[] = [
	{ key: "grimoire", name: "Grimoire", note: "Inline `q=` expressions (priority −101)" },
	{ key: "epochs", name: "Epochs", note: "Fantasy calendars + in-process API for Grimoire" },
	{ key: "visage", name: "Visage", note: "Reading `v-card` / `v-tabs`" },
];

const FUTURE_FLAGS: { key: keyof ModuleFlags; name: string }[] = [
	{ key: "oculus", name: "Oculus (P8.2)" },
	{ key: "augur", name: "Augur (P8.3)" },
	{ key: "beacon", name: "Beacon (P8.4)" },
	{ key: "lexicon", name: "Lexicon Nexus (P8.5 optional)" },
	{ key: "oracle", name: "Oracle / ex-NaviNote (P8.5 optional)" },
];

export class MonolithSettingTab extends PluginSettingTab {
	plugin: MonolithPlugin;

	constructor(app: App, plugin: MonolithPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Monolith" });
		containerEl.createEl("p", {
			cls: "monolith-notice",
			text: "P8.1 trial — single BRAT artifact (shape A). Disable legacy Grimoire, Epochs, and Visage while testing. CollectionXiewer stays external.",
		});

		containerEl.createEl("h3", { text: "Spine modules (P8.1)" });
		const flagBox = containerEl.createDiv({ cls: "monolith-module-flags" });
		for (const row of SPINE_FLAGS) {
			new Setting(flagBox)
				.setName(row.name)
				.setDesc(`${row.note}. Toggle requires reload.`)
				.addToggle((toggle) => {
					toggle.setValue(this.plugin.settings.modules[row.key]).onChange(async (value) => {
						this.plugin.settings.modules[row.key] = value;
						await this.plugin.saveSettings();
					});
				});
		}

		containerEl.createEl("h3", { text: "Later modules (stubs)" });
		for (const row of FUTURE_FLAGS) {
			new Setting(containerEl)
				.setName(row.name)
				.setDesc("Not loaded in P8.1 — flag reserved.")
				.addToggle((toggle) => {
					toggle.setValue(this.plugin.settings.modules[row.key]).setDisabled(true);
				});
		}

		if (this.plugin.settings.modules.grimoire) {
			const section = containerEl.createDiv({ cls: "monolith-settings-section" });
			section.createEl("h3", { text: "Grimoire" });
			new Setting(section)
				.setName("Inline prefix")
				.setDesc("Prefix inside backticks, e.g. q=")
				.addText((text) => {
					text.setValue(this.plugin.settings.grimoire.inlinePrefix).onChange(async (value) => {
						this.plugin.settings.grimoire.inlinePrefix = value || "q=";
						await this.plugin.saveSettings();
						this.plugin.grimoire?.applySettings(this.plugin.settings.grimoire);
					});
				});
			new Setting(section)
				.setName("Enable in Reading view")
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.grimoire.enableInReadingView)
						.onChange(async (value) => {
							this.plugin.settings.grimoire.enableInReadingView = value;
							await this.plugin.saveSettings();
							this.plugin.grimoire?.applySettings(this.plugin.settings.grimoire);
						});
				});
		}

		if (this.plugin.settings.modules.epochs) {
			const section = containerEl.createDiv({ cls: "monolith-settings-section" });
			section.createEl("h3", { text: "Epochs" });
			new Setting(section)
				.setName("Calendars folder")
				.setDesc("Vault folder for calendar notes")
				.addText((text) => {
					text.setValue(this.plugin.settings.epochs.calendarsFolder).onChange(async (value) => {
						this.plugin.settings.epochs.calendarsFolder = value.trim() || "Epoch Calendars";
						await this.plugin.saveSettings();
						this.plugin.epochs?.applySettings(this.plugin.settings.epochs);
					});
				});
		}

		if (this.plugin.settings.modules.visage) {
			const section = containerEl.createDiv({ cls: "monolith-settings-section" });
			section.createEl("h3", { text: "Visage" });
			new Setting(section)
				.setName("Deck gap")
				.addText((text) => {
					text.setValue(this.plugin.settings.visage.deckGap).onChange(async (value) => {
						this.plugin.settings.visage.deckGap = value || "0.35rem";
						await this.plugin.saveSettings();
						this.plugin.visage?.applySettings(this.plugin.settings.visage);
					});
				});
			new Setting(section)
				.setName("Remember active tab")
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.visage.rememberActiveTab)
						.onChange(async (value) => {
							this.plugin.settings.visage.rememberActiveTab = value;
							await this.plugin.saveSettings();
							this.plugin.visage?.applySettings(this.plugin.settings.visage);
						});
				});
		}
	}
}
