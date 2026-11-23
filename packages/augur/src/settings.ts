import { App, Component, PluginSettingTab } from "obsidian";
import type AugurPlugin from "./main";
import {
	renderGuidePanel,
	renderReadmePanel,
	renderSettingsTabBar,
	type PluginSettingsTabId,
} from "./readmeTab";
import { renderAugurSettings } from "./settingsUi";

export class AugurSettingTab extends PluginSettingTab {
	plugin: AugurPlugin;
	private activeTab: PluginSettingsTabId = "settings";
	private readmeComponent = new Component();

	constructor(app: App, plugin: AugurPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		this.readmeComponent.unload();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.readmeComponent.unload();
		this.readmeComponent = new Component();

		containerEl.createEl("h2", { text: "Augur" });

		const tabBar = containerEl.createDiv();
		renderSettingsTabBar(tabBar, this.activeTab, (tab) => {
			this.activeTab = tab;
			this.display();
		}, "augur");

		const content = containerEl.createDiv({ cls: "augur-settings-content" });
		const pluginDir =
			this.plugin.manifest.dir ?? `${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;

		if (this.activeTab === "readme") {
			renderReadmePanel(this.app, content, this.readmeComponent, "augur-readme-panel", pluginDir);
			return;
		}
		if (this.activeTab === "guide") {
			renderGuidePanel(this.app, content, this.readmeComponent, "augur-guide-panel", pluginDir);
			return;
		}

		renderAugurSettings(content, {
			settings: this.plugin.settings,
			persist: async () => {
				await this.plugin.saveSettings();
			},
		});
	}
}
