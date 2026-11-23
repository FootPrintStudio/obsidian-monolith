import { App, Component, PluginSettingTab, Setting } from "obsidian";
import { renderAugurSettings } from "../packages/augur/src/settingsUi";
import { BeaconLauncherPanel } from "../packages/beacon/src/settingsPanel";
import { renderEpochsSettings } from "../packages/epochs/src/settingsUi";
import { renderGrimoireSettings } from "../packages/grimoire/src/settingsUi";
import { renderLexiconSettings } from "../packages/lexicon/src/settingsUi";
import { renderOculusSettings } from "../packages/oculus/src/settingsUi";
import { renderOracleSettings } from "../packages/oracle/src/settingsUi";
import { renderVisageSettings } from "../packages/visage/src/settingsUi";
import type MonolithPlugin from "./main";
import {
	renderModuleDocPanel,
	renderModuleDocsTabBar,
	type ModuleDocKey,
	type ModuleDocsTabId,
} from "./moduleDocs";
import { reloadCommunityPlugin } from "./reloadPlugin";
import type { ModuleFlags } from "./types";

const SPINE_FLAGS: { key: keyof ModuleFlags; name: string; note: string }[] = [
	{ key: "grimoire", name: "Grimoire", note: "Inline `q=` (priority −101)" },
	{ key: "epochs", name: "Epochs", note: "Fantasy calendars + in-process API" },
	{ key: "visage", name: "Visage", note: "`v-card` / `v-tabs`" },
	{ key: "oculus", name: "Oculus", note: "`oculus` galleries + XIEWER" },
	{ key: "augur", name: "Augur", note: "Authoring suggest + insert commands" },
	{ key: "beacon", name: "Beacon", note: "Desktop launch (no Buttons; AS button / palette)" },
];

const OPTIONAL_FLAGS: { key: keyof ModuleFlags; name: string; note: string }[] = [
	{ key: "lexicon", name: "Lexicon Nexus", note: "Optional glossary highlights" },
	{ key: "oracle", name: "Oracle", note: "ex-NaviNote navigation panel" },
];

type ModuleInstanceKey =
	| "grimoire"
	| "epochs"
	| "visage"
	| "oculus"
	| "augur"
	| "lexicon"
	| "oracle"
	| "beacon";

export class MonolithSettingTab extends PluginSettingTab {
	plugin: MonolithPlugin;
	private reloadNeeded = false;
	private docTabs: Partial<Record<ModuleDocKey, ModuleDocsTabId>> = {};
	private docComponent = new Component();

	constructor(app: App, plugin: MonolithPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		this.docComponent.unload();
	}

	private async persist(): Promise<void> {
		await this.plugin.saveSettings();
	}

	private activeDocTab(key: ModuleDocKey): ModuleDocsTabId {
		return this.docTabs[key] ?? "settings";
	}

	private setDocTab(key: ModuleDocKey, tab: ModuleDocsTabId): void {
		this.docTabs[key] = tab;
		this.display();
	}

	private moduleLoaded(key: ModuleInstanceKey): boolean {
		return Boolean(this.plugin[key]);
	}

	private renderReloadCta(containerEl: HTMLElement): void {
		if (!this.reloadNeeded) return;
		new Setting(containerEl)
			.setName("Module flags changed")
			.setDesc(
				"Enable/disable takes effect after reload. Epochs↔Grimoire inject also binds only at load.",
			)
			.addButton((btn) =>
				btn
					.setButtonText("Reload Monolith")
					.setCta()
					.onClick(async () => {
						await reloadCommunityPlugin(this.app, this.plugin.manifest.id);
					}),
			);
	}

	private renderModuleShell(
		containerEl: HTMLElement,
		opts: {
			title: string;
			docKey: ModuleDocKey;
			instanceKey: ModuleInstanceKey;
			enabled: boolean;
			renderSettings: (content: HTMLElement) => void;
		},
	): void {
		if (!opts.enabled) return;

		const section = containerEl.createDiv({ cls: "monolith-settings-section" });
		section.createEl("h3", { text: opts.title });

		if (!this.moduleLoaded(opts.instanceKey)) {
			section.createEl("p", {
				cls: "monolith-notice",
				text: `${opts.title} is enabled — reload Monolith to load the module and edit settings.`,
			});
			return;
		}

		const tabBar = section.createDiv();
		const active = this.activeDocTab(opts.docKey);
		renderModuleDocsTabBar(tabBar, opts.docKey, active, (tab) => this.setDocTab(opts.docKey, tab));

		const content = section.createDiv({ cls: "monolith-module-settings-content" });
		if (active === "readme" || active === "guide") {
			renderModuleDocPanel(this.app, content, this.docComponent, opts.docKey, active);
			return;
		}
		opts.renderSettings(content);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		this.docComponent.unload();
		this.docComponent = new Component();

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
						this.reloadNeeded = true;
						await this.persist();
						this.display();
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
						this.reloadNeeded = true;
						await this.persist();
						this.display();
					});
				});
		}

		this.renderReloadCta(containerEl);

		const flags = this.plugin.settings.modules;
		const redisplay = () => this.display();

		this.renderModuleShell(containerEl, {
			title: "Grimoire",
			docKey: "grimoire",
			instanceKey: "grimoire",
			enabled: flags.grimoire,
			renderSettings: (content) => {
				content.createEl("p", {
					cls: "monolith-notice",
					text: "Epochs fantasy-date API injects into Grimoire only at load — enable both, then Reload Monolith.",
				});
				renderGrimoireSettings(content, {
					settings: this.plugin.settings.grimoire,
					persist: async () => {
						await this.persist();
						this.plugin.grimoire?.applySettings(this.plugin.settings.grimoire);
					},
				});
			},
		});

		this.renderModuleShell(containerEl, {
			title: "Epochs",
			docKey: "epochs",
			instanceKey: "epochs",
			enabled: flags.epochs,
			renderSettings: (content) => {
				renderEpochsSettings(content, {
					app: this.app,
					settings: this.plugin.settings.epochs,
					persist: async () => {
						await this.persist();
						this.plugin.epochs?.applySettings(this.plugin.settings.epochs);
					},
					rebuildIndex: async () => {
						await this.plugin.epochs?.rebuildIndex();
					},
					listCalendars: () => {
						const list = this.plugin.epochs?.api.listCalendars() ?? [];
						return list.map((cal) => ({ id: cal.id, name: cal.name, path: cal.path }));
					},
					redisplay,
				});
			},
		});

		this.renderModuleShell(containerEl, {
			title: "Visage",
			docKey: "visage",
			instanceKey: "visage",
			enabled: flags.visage,
			renderSettings: (content) => {
				renderVisageSettings(content, {
					settings: this.plugin.settings.visage,
					persist: async () => {
						await this.persist();
						this.plugin.visage?.applySettings(this.plugin.settings.visage);
					},
				});
			},
		});

		this.renderModuleShell(containerEl, {
			title: "Oculus",
			docKey: "oculus",
			instanceKey: "oculus",
			enabled: flags.oculus,
			renderSettings: (content) => {
				renderOculusSettings(content, {
					app: this.app,
					settings: this.plugin.settings.oculus,
					persist: async () => {
						await this.persist();
						this.plugin.oculus?.applySettings(this.plugin.settings.oculus);
					},
					redisplay,
				});
			},
		});

		this.renderModuleShell(containerEl, {
			title: "Augur",
			docKey: "augur",
			instanceKey: "augur",
			enabled: flags.augur,
			renderSettings: (content) => {
				renderAugurSettings(content, {
					settings: this.plugin.settings.augur,
					persist: async () => {
						await this.persist();
						this.plugin.augur?.applySettings(this.plugin.settings.augur);
					},
				});
			},
		});

		this.renderModuleShell(containerEl, {
			title: "Lexicon Nexus",
			docKey: "lexicon",
			instanceKey: "lexicon",
			enabled: flags.lexicon,
			renderSettings: (content) => {
				const lexicon = this.plugin.lexicon!;
				renderLexiconSettings(content, {
					settings: this.plugin.settings.lexicon,
					persist: async () => {
						await this.persist();
						this.plugin.lexicon?.applySettings(this.plugin.settings.lexicon);
					},
					globalIndex: lexicon.globalIndex,
					warnings: lexicon.warnings,
					refreshIndex: async () => {
						await lexicon.refreshIndex();
					},
					redisplay,
				});
			},
		});

		this.renderModuleShell(containerEl, {
			title: "Oracle",
			docKey: "oracle",
			instanceKey: "oracle",
			enabled: flags.oracle,
			renderSettings: (content) => {
				renderOracleSettings(content, {
					app: this.app,
					settings: this.plugin.settings.oracle,
					persist: async () => {
						await this.persist();
						this.plugin.oracle?.applySettings(this.plugin.settings.oracle);
					},
					redisplay,
				});
			},
		});

		this.renderModuleShell(containerEl, {
			title: "Beacon",
			docKey: "beacon",
			instanceKey: "beacon",
			enabled: flags.beacon,
			renderSettings: (content) => {
				new BeaconLauncherPanel(this.app, this.plugin.beacon!, {
					persist: async () => {
						this.plugin.settings.beacon = this.plugin.beacon!.settings;
						await this.persist();
					},
					redisplay,
				}).render(content);
			},
		});

		new Setting(containerEl)
			.setName("Legacy settings migrate (M3)")
			.setDesc(
				this.plugin.settings.migratedFromLegacy
					? "Already ran (legacy data.json files were not deleted)."
					: "Will copy-forward from legacy plugin folders on next load if sections are empty.",
			)
			.setDisabled(true);
	}
}
