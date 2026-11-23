import { App, Component, PluginSettingTab } from "obsidian";
import type NaviNotePlugin from "./main";
import { renderReadmePanel, renderSettingsTabBar, type PluginSettingsTabId } from "./readmeTab";
import { renderOracleSettings } from "./settingsUi";

export class NaviNoteSettingTab extends PluginSettingTab {
	plugin: NaviNotePlugin;
	private activeTab: PluginSettingsTabId = "settings";
	private readmeComponent = new Component();

	constructor(app: App, plugin: NaviNotePlugin) {
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

		containerEl.createEl("h2", { text: "NaviNote" });

		const tabBar = containerEl.createDiv();
		renderSettingsTabBar(tabBar, this.activeTab, (tab) => {
			this.activeTab = tab;
			this.display();
		}, "navinote");

		const content = containerEl.createDiv({ cls: "navinote-settings-content" });

		if (this.activeTab === "readme") {
			const pluginDir =
				this.plugin.manifest.dir ??
				`${this.app.vault.configDir}/plugins/${this.plugin.manifest.id}`;
			renderReadmePanel(this.app, content, this.readmeComponent, "navinote-readme-panel", pluginDir);
			return;
		}

		renderOracleSettings(content, {
			app: this.app,
			settings: this.plugin.settings,
			persist: async () => {
				await this.plugin.saveSettings();
			},
			redisplay: () => this.display(),
		});
	}
}
