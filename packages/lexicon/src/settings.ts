import { App, Component, PluginSettingTab } from "obsidian";
import type LexiconNexusPlugin from "./main";
import {
	renderGuidePanel,
	renderReadmePanel,
	renderSettingsTabBar,
	type PluginSettingsTabId,
} from "./readmeTab";
import { renderLexiconSettings } from "./settingsUi";

export class LexiconNexusSettingTab extends PluginSettingTab {
	plugin: LexiconNexusPlugin;
	private activeTab: PluginSettingsTabId = "settings";
	private docComponent = new Component();

	constructor(app: App, plugin: LexiconNexusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		this.docComponent.unload();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.docComponent.unload();
		this.docComponent = new Component();

		containerEl.createEl("h2", { text: "Lexicon Nexus" });

		const tabBar = containerEl.createDiv();
		renderSettingsTabBar(tabBar, this.activeTab, (tab) => {
			this.activeTab = tab;
			this.display();
		}, "lxn");

		const content = containerEl.createDiv({ cls: "lxn-settings-content" });
		const pluginDir =
			this.plugin.manifest.dir ??
			`${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;

		if (this.activeTab === "readme") {
			renderReadmePanel(this.app, content, this.docComponent, "lxn-readme-panel", pluginDir);
			return;
		}

		if (this.activeTab === "guide") {
			renderGuidePanel(this.app, content, this.docComponent, "lxn-guide-panel", pluginDir);
			return;
		}

		renderLexiconSettings(content, {
			settings: this.plugin.settings,
			persist: async () => {
				await this.plugin.saveSettings();
			},
			globalIndex: this.plugin.globalIndex,
			warnings: this.plugin.warnings,
			refreshIndex: async () => {
				await this.plugin.refreshIndex();
			},
			redisplay: () => this.display(),
		});
	}
}
