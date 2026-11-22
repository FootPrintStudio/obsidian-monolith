import { App, PluginSettingTab, Setting } from "obsidian";
import type MonolithPlugin from "./main";
import type { ModuleFlags } from "./types";

const SPINE_FLAGS: { key: keyof ModuleFlags; name: string; note: string }[] = [
	{ key: "grimoire", name: "Grimoire", note: "Inline `q=` expressions (priority −101)" },
	{ key: "epochs", name: "Epochs", note: "Fantasy calendars + in-process API" },
	{ key: "visage", name: "Visage", note: "Reading `v-card` / `v-tabs`" },
	{ key: "oculus", name: "Oculus", note: "`oculus` galleries + XIEWER client" },
	{ key: "augur", name: "Augur", note: "Authoring suggest + insert commands" },
];

const OPTIONAL_FLAGS: { key: keyof ModuleFlags; name: string; note: string }[] = [
	{ key: "beacon", name: "Beacon (P8.4)", note: "Desktop launch via Grimoire AS button — not loaded yet" },
	{ key: "lexicon", name: "Lexicon Nexus (P8.5)", note: "Optional dictionary — not loaded yet" },
	{ key: "oracle", name: "Oracle (P8.5)", note: "ex-NaviNote — not loaded yet" },
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
			text: "Shape A — single BRAT artifact with module flags. Disable legacy FPS plugins while testing. CollectionXiewer stays external.",
		});

		containerEl.createEl("h3", { text: "Spine modules" });
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

		containerEl.createEl("h3", { text: "Optional / later" });
		for (const row of OPTIONAL_FLAGS) {
			new Setting(containerEl)
				.setName(row.name)
				.setDesc(row.note)
				.addToggle((toggle) => {
					toggle.setValue(this.plugin.settings.modules[row.key]).setDisabled(true);
				});
		}

		if (this.plugin.settings.modules.grimoire) {
			const section = containerEl.createDiv({ cls: "monolith-settings-section" });
			section.createEl("h3", { text: "Grimoire" });
			new Setting(section)
				.setName("Inline prefix")
				.addText((text) => {
					text.setValue(this.plugin.settings.grimoire.inlinePrefix).onChange(async (value) => {
						this.plugin.settings.grimoire.inlinePrefix = value || "q=";
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
		}

		if (this.plugin.settings.modules.oculus) {
			const section = containerEl.createDiv({ cls: "monolith-settings-section" });
			section.createEl("h3", { text: "Oculus" });
			new Setting(section)
				.setName("CollectionXiewer base URL")
				.setDesc("Loopback API (no trailing slash). Xiewer stays external.")
				.addText((text) => {
					text
						.setValue(this.plugin.settings.oculus.collectionXiewerBaseUrl)
						.onChange(async (value) => {
							this.plugin.settings.oculus.collectionXiewerBaseUrl =
								value.trim() || "http://127.0.0.1:47821";
							await this.plugin.saveSettings();
							this.plugin.oculus?.applySettings(this.plugin.settings.oculus);
						});
				});
			new Setting(section)
				.setName("Lightbox markdown images")
				.addToggle((toggle) => {
					toggle
						.setValue(this.plugin.settings.oculus.lightboxMarkdownImages)
						.onChange(async (value) => {
							this.plugin.settings.oculus.lightboxMarkdownImages = value;
							await this.plugin.saveSettings();
							this.plugin.oculus?.applySettings(this.plugin.settings.oculus);
						});
				});
		}

		if (this.plugin.settings.modules.augur) {
			const section = containerEl.createDiv({ cls: "monolith-settings-section" });
			section.createEl("h3", { text: "Augur" });
			new Setting(section)
				.setName("Grimoire prefix (fallback)")
				.setDesc("Used when Grimoire module settings are unavailable")
				.addText((text) => {
					text.setValue(this.plugin.settings.augur.grimoirePrefix).onChange(async (value) => {
						this.plugin.settings.augur.grimoirePrefix = value || "q=";
						await this.plugin.saveSettings();
						this.plugin.augur?.applySettings(this.plugin.settings.augur);
					});
				});
		}
	}
}
