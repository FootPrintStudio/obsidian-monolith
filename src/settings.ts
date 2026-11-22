import { App, PluginSettingTab, Setting } from "obsidian";
import type MonolithPlugin from "./main";
import type { ModuleFlags } from "./types";

const SPINE_FLAGS: { key: keyof ModuleFlags; name: string; note: string }[] = [
	{ key: "grimoire", name: "Grimoire", note: "Inline `q=` (priority −101)" },
	{ key: "epochs", name: "Epochs", note: "Fantasy calendars + in-process API" },
	{ key: "visage", name: "Visage", note: "`v-card` / `v-tabs`" },
	{ key: "oculus", name: "Oculus", note: "`oculus` galleries + XIEWER" },
	{ key: "augur", name: "Augur", note: "Authoring suggest + insert commands" },
	{ key: "beacon", name: "Beacon", note: "Desktop launch commands (no Buttons; use Command Palette / AS button)" },
];

const OPTIONAL_FLAGS: { key: keyof ModuleFlags; name: string; note: string }[] = [
	{ key: "lexicon", name: "Lexicon Nexus", note: "Optional glossary highlights" },
	{ key: "oracle", name: "Oracle", note: "ex-NaviNote navigation panel" },
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
			text: "Shape A — one BRAT artifact, module enable flags. Disable legacy FPS plugins while testing. CollectionXiewer stays external.",
		});

		containerEl.createEl("h3", { text: "Spine (default on)" });
		for (const row of SPINE_FLAGS) {
			new Setting(containerEl)
				.setName(row.name)
				.setDesc(`${row.note}. Toggle requires reload.`)
				.addToggle((toggle) => {
					toggle.setValue(this.plugin.settings.modules[row.key]).onChange(async (value) => {
						this.plugin.settings.modules[row.key] = value;
						await this.plugin.saveSettings();
					});
				});
		}

		containerEl.createEl("h3", { text: "Optional modules" });
		for (const row of OPTIONAL_FLAGS) {
			new Setting(containerEl)
				.setName(row.name)
				.setDesc(`${row.note}. Toggle requires reload.`)
				.addToggle((toggle) => {
					toggle.setValue(this.plugin.settings.modules[row.key]).onChange(async (value) => {
						this.plugin.settings.modules[row.key] = value;
						await this.plugin.saveSettings();
					});
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

		if (this.plugin.settings.modules.oculus) {
			const section = containerEl.createDiv({ cls: "monolith-settings-section" });
			section.createEl("h3", { text: "Oculus" });
			new Setting(section)
				.setName("CollectionXiewer base URL")
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
		}

		if (this.plugin.settings.modules.lexicon) {
			const section = containerEl.createDiv({ cls: "monolith-settings-section" });
			section.createEl("h3", { text: "Lexicon Nexus" });
			new Setting(section)
				.setName("Dictionary folder")
				.addText((text) => {
					text.setValue(this.plugin.settings.lexicon.dictionaryFolder).onChange(async (value) => {
						this.plugin.settings.lexicon.dictionaryFolder = value.trim() || "Dictionary";
						await this.plugin.saveSettings();
						this.plugin.lexicon?.applySettings(this.plugin.settings.lexicon);
					});
				});
		}

		if (this.plugin.settings.modules.beacon) {
			const section = containerEl.createDiv({ cls: "monolith-settings-section" });
			section.createEl("h3", { text: "Beacon" });
			new Setting(section)
				.setName("Command name prefix")
				.setDesc("Obsidian command names; invoke via Command Palette or Grimoire AS button (no Buttons plugin).")
				.addText((text) => {
					text.setValue(this.plugin.settings.beacon.commandNamePrefix).onChange(async (value) => {
						this.plugin.settings.beacon.commandNamePrefix = value || "Launch App: ";
						await this.plugin.saveSettings();
						this.plugin.beacon?.applySettings(this.plugin.settings.beacon);
					});
				});
			new Setting(section)
				.setName(`Launcher entries (${this.plugin.settings.beacon.entries.length})`)
				.setDesc("Edit entries in a future settings slice; Decision C CollectionXiewer seed is opt-in once.")
				.setDisabled(true);
		}
	}
}
