import { Component, PluginSettingTab } from "obsidian";
import type VisagePlugin from "./main";
import {
	renderGuidePanel,
	renderReadmePanel,
	renderSettingsTabBar,
	type PluginSettingsTabId,
} from "./readmeTab";
import { renderVisageSettings } from "./settingsUi";

export class VisageSettingTab extends PluginSettingTab {
	plugin: VisagePlugin;
	private activeTab: PluginSettingsTabId = "settings";
	private readmeComponent = new Component();

	constructor(app: VisagePlugin["app"], plugin: VisagePlugin) {
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

		containerEl.createEl("h2", { text: "Visage" });

		const tabBar = containerEl.createDiv();
		renderSettingsTabBar(tabBar, this.activeTab, (tab) => {
			this.activeTab = tab;
			this.display();
		}, "visage");

		const content = containerEl.createDiv({ cls: "visage-settings-content" });
		const pluginDir =
			this.plugin.manifest.dir ??
			`${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;

		if (this.activeTab === "readme") {
			renderReadmePanel(this.app, content, this.readmeComponent, "visage-readme-panel", pluginDir);
			return;
		}

		if (this.activeTab === "guide") {
			renderGuidePanel(this.app, content, this.readmeComponent, "visage-guide-panel", pluginDir);
			return;
		}

		renderVisageSettings(content, {
			settings: this.plugin.settings,
			persist: async () => {
				await this.plugin.saveSettings();
			},
		});
	}
}
