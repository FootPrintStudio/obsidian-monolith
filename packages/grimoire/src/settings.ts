import { App, Component, PluginSettingTab } from "obsidian";
import type GrimoirePlugin from "./main";
import {
	renderGuidePanel,
	renderReadmePanel,
	renderSettingsTabBar,
	type PluginSettingsTabId,
} from "./readmeTab";
import { renderGrimoireSettings } from "./settingsUi";

export class PropertyQuerySettingTab extends PluginSettingTab {
	plugin: GrimoirePlugin;
	private activeTab: PluginSettingsTabId = "settings";
	private docComponent = new Component();

	constructor(app: App, plugin: GrimoirePlugin) {
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

		containerEl.createEl("h2", { text: "Grimoire" });

		const tabBar = containerEl.createDiv();
		renderSettingsTabBar(tabBar, this.activeTab, (tab) => {
			this.activeTab = tab;
			this.display();
		}, "pq");

		const content = containerEl.createDiv({ cls: "pq-settings-content" });
		const pluginDir =
			this.plugin.manifest.dir ??
			`${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;

		if (this.activeTab === "readme") {
			renderReadmePanel(this.app, content, this.docComponent, "pq-readme-panel", pluginDir);
			return;
		}

		if (this.activeTab === "guide") {
			renderGuidePanel(this.app, content, this.docComponent, "pq-guide-panel", pluginDir);
			return;
		}

		renderGrimoireSettings(content, {
			settings: this.plugin.settings,
			persist: async () => {
				await this.plugin.saveSettings();
			},
		});
	}
}
