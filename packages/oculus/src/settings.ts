import { App, Component, PluginSettingTab } from "obsidian";
import type OculusPlugin from "./main";
import {
	renderGuidePanel,
	renderReadmePanel,
	renderSettingsTabBar,
	type PluginSettingsTabId,
} from "./readmeTab";
import { renderOculusSettings } from "./settingsUi";

export class MediaGallerySettingTab extends PluginSettingTab {
	plugin: OculusPlugin;
	private activeTab: PluginSettingsTabId = "settings";
	private readmeComponent = new Component();

	constructor(app: App, plugin: OculusPlugin) {
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

		containerEl.createEl("h2", { text: "Oculus" });

		const tabBar = containerEl.createDiv();
		renderSettingsTabBar(tabBar, this.activeTab, (tab) => {
			this.activeTab = tab;
			this.display();
		}, "mg");

		const content = containerEl.createDiv({ cls: "mg-settings-content" });
		const pluginDir =
			this.plugin.manifest.dir ??
			`${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;

		if (this.activeTab === "readme") {
			renderReadmePanel(this.app, content, this.readmeComponent, "mg-readme-panel", pluginDir);
			return;
		}

		if (this.activeTab === "guide") {
			renderGuidePanel(this.app, content, this.readmeComponent, "mg-guide-panel", pluginDir);
			return;
		}

		renderOculusSettings(content, {
			app: this.app,
			settings: this.plugin.settings,
			persist: async () => {
				await this.plugin.saveSettings();
			},
			redisplay: () => this.display(),
		});
	}
}
