import { App, Component, PluginSettingTab } from "obsidian";
import type EpochsPlugin from "./main";
import {
	renderGuidePanel,
	renderReadmePanel,
	renderSettingsTabBar,
	type PluginSettingsTabId,
} from "./readmeTab";
import { renderEpochsSettings } from "./settingsUi";

export class EpochsSettingTab extends PluginSettingTab {
	plugin: EpochsPlugin;
	private activeTab: PluginSettingsTabId = "settings";
	private docComponent = new Component();

	constructor(app: App, plugin: EpochsPlugin) {
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

		containerEl.createEl("h2", { text: "Epochs" });

		const tabBar = containerEl.createDiv();
		renderSettingsTabBar(tabBar, this.activeTab, (tab) => {
			this.activeTab = tab;
			this.display();
		}, "epochs");

		const content = containerEl.createDiv({ cls: "epochs-settings-content" });
		const pluginDir =
			this.plugin.manifest.dir ??
			`${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;

		if (this.activeTab === "readme") {
			renderReadmePanel(this.app, content, this.docComponent, "epochs-readme-panel", pluginDir);
			return;
		}

		if (this.activeTab === "guide") {
			renderGuidePanel(this.app, content, this.docComponent, "epochs-guide-panel", pluginDir);
			return;
		}

		renderEpochsSettings(content, {
			app: this.app,
			settings: this.plugin.settings,
			persist: async () => {
				await this.plugin.saveSettings();
			},
			rebuildIndex: async () => {
				await this.plugin.rebuildIndex();
			},
			listCalendars: () => this.plugin.api.listCalendars(),
			redisplay: () => this.display(),
		});
	}
}
