import { App, PluginSettingTab, Setting } from "obsidian";
import { VIEW_TYPES, MEDIA_FILTERS } from "../packages/augur/src/types";
import { BeaconLauncherPanel } from "../packages/beacon/src/settingsPanel";
import { TAB_ALIGNS, TAB_POSITIONS } from "../packages/visage/src/tabs/types";
import { parseHighLevelNavigation } from "../packages/oracle/src/types";
import type MonolithPlugin from "./main";
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

export class MonolithSettingTab extends PluginSettingTab {
	plugin: MonolithPlugin;

	constructor(app: App, plugin: MonolithPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private async persist(): Promise<void> {
		await this.plugin.saveSettings();
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
						await this.persist();
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
						await this.persist();
					});
				});
		}

		if (this.plugin.settings.modules.grimoire) this.renderGrimoire(containerEl);
		if (this.plugin.settings.modules.epochs) this.renderEpochs(containerEl);
		if (this.plugin.settings.modules.visage) this.renderVisage(containerEl);
		if (this.plugin.settings.modules.oculus) this.renderOculus(containerEl);
		if (this.plugin.settings.modules.augur) this.renderAugur(containerEl);
		if (this.plugin.settings.modules.lexicon) this.renderLexicon(containerEl);
		if (this.plugin.settings.modules.oracle) this.renderOracle(containerEl);

		if (this.plugin.settings.modules.beacon && this.plugin.beacon) {
			const section = containerEl.createDiv({ cls: "monolith-settings-section" });
			section.createEl("h3", { text: "Beacon" });
			new BeaconLauncherPanel(this.app, this.plugin.beacon, {
				persist: async () => {
					this.plugin.settings.beacon = this.plugin.beacon!.settings;
					await this.persist();
				},
				redisplay: () => this.display(),
			}).render(section);
		} else if (this.plugin.settings.modules.beacon) {
			const section = containerEl.createDiv({ cls: "monolith-settings-section" });
			section.createEl("h3", { text: "Beacon" });
			section.createEl("p", {
				cls: "monolith-notice",
				text: "Beacon is enabled — reload the plugin to edit launchers.",
			});
		}

		new Setting(containerEl)
			.setName("Legacy settings migrate (M3)")
			.setDesc(
				this.plugin.settings.migratedFromLegacy
					? "Already ran (legacy data.json files were not deleted)."
					: "Will copy-forward from legacy plugin folders on next load if sections are empty.",
			)
			.setDisabled(true);
	}

	private renderGrimoire(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "monolith-settings-section" });
		section.createEl("h3", { text: "Grimoire" });
		const g = this.plugin.settings.grimoire;
		const apply = async () => {
			await this.persist();
			this.plugin.grimoire?.applySettings(g);
		};
		new Setting(section).setName("Inline prefix").addText((t) => {
			t.setValue(g.inlinePrefix).onChange(async (v) => {
				g.inlinePrefix = v || "q=";
				await apply();
			});
		});
		new Setting(section).setName("Enable in Reading view").addToggle((t) => {
			t.setValue(g.enableInReadingView).onChange(async (v) => {
				g.enableInReadingView = v;
				await apply();
			});
		});
		new Setting(section).setName("Syntax highlight").addToggle((t) => {
			t.setValue(g.enableSyntaxHighlight).onChange(async (v) => {
				g.enableSyntaxHighlight = v;
				await apply();
			});
		});
		new Setting(section).setName("Refresh on metadata change").addToggle((t) => {
			t.setValue(g.refreshOnMetadataChange).onChange(async (v) => {
				g.refreshOnMetadataChange = v;
				await apply();
			});
		});
		new Setting(section).setName("Debug mode").addToggle((t) => {
			t.setValue(g.debugMode).onChange(async (v) => {
				g.debugMode = v;
				await apply();
			});
		});
		new Setting(section)
			.setName("Button link open")
			.setDesc("Default pane for AS button wiki links")
			.addDropdown((d) => {
				d.addOptions({
					default: "Same as Obsidian links",
					current: "Current pane",
					tab: "New tab",
					split: "Split",
					window: "New window",
				});
				d.setValue(g.linkOpenBehavior).onChange(async (v) => {
					g.linkOpenBehavior = v as typeof g.linkOpenBehavior;
					await apply();
				});
			});
		new Setting(section).setName("Badge success triggers").addText((t) => {
			t.setValue(g.badgeSuccessTriggers).onChange(async (v) => {
				g.badgeSuccessTriggers = v;
				await apply();
			});
		});
		new Setting(section).setName("Badge warn triggers").addText((t) => {
			t.setValue(g.badgeWarnTriggers).onChange(async (v) => {
				g.badgeWarnTriggers = v;
				await apply();
			});
		});
		new Setting(section).setName("Badge danger triggers").addText((t) => {
			t.setValue(g.badgeDangerTriggers).onChange(async (v) => {
				g.badgeDangerTriggers = v;
				await apply();
			});
		});
		new Setting(section).setName("Meter filled char").addText((t) => {
			t.setValue(g.meterFilledChar).onChange(async (v) => {
				g.meterFilledChar = v || "★";
				await apply();
			});
		});
		new Setting(section).setName("Meter empty char").addText((t) => {
			t.setValue(g.meterEmptyChar).onChange(async (v) => {
				g.meterEmptyChar = v || "☆";
				await apply();
			});
		});
	}

	private renderEpochs(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "monolith-settings-section" });
		section.createEl("h3", { text: "Epochs" });
		const e = this.plugin.settings.epochs;
		new Setting(section).setName("Calendars folder").addText((t) => {
			t.setValue(e.calendarsFolder).onChange(async (v) => {
				e.calendarsFolder = v.trim() || "Epoch Calendars";
				await this.persist();
				this.plugin.epochs?.applySettings(e);
			});
		});
		new Setting(section).setName("Default calendar id").addText((t) => {
			t.setValue(e.defaultCalendarId).onChange(async (v) => {
				e.defaultCalendarId = v.trim();
				await this.persist();
				this.plugin.epochs?.applySettings(e);
			});
		});
		section.createEl("p", {
			cls: "monolith-notice",
			text: "Create / rebuild calendars via Command Palette: Epochs: Create calendar · Epochs: Rebuild calendar index.",
		});
	}

	private renderVisage(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "monolith-settings-section" });
		section.createEl("h3", { text: "Visage" });
		const v = this.plugin.settings.visage;
		const apply = async () => {
			await this.persist();
			this.plugin.visage?.applySettings(v);
		};
		new Setting(section).setName("Deck gap").addText((t) => {
			t.setValue(v.deckGap).onChange(async (val) => {
				v.deckGap = val || "0.35rem";
				await apply();
			});
		});
		new Setting(section).setName("Deck padding").addText((t) => {
			t.setValue(v.deckPadding).onChange(async (val) => {
				v.deckPadding = val || "0.65em";
				await apply();
			});
		});
		new Setting(section).setName("Deck image height").addText((t) => {
			t.setValue(v.deckImageHeight).onChange(async (val) => {
				v.deckImageHeight = val || "800px";
				await apply();
			});
		});
		new Setting(section).setName("Default tab position").addDropdown((d) => {
			for (const p of TAB_POSITIONS) d.addOption(p, p);
			d.setValue(v.defaultPosition).onChange(async (val) => {
				v.defaultPosition = val as typeof v.defaultPosition;
				await apply();
			});
		});
		new Setting(section).setName("Default tab align").addDropdown((d) => {
			for (const a of TAB_ALIGNS) d.addOption(a, a);
			d.setValue(v.defaultAlign).onChange(async (val) => {
				v.defaultAlign = val as typeof v.defaultAlign;
				await apply();
			});
		});
		new Setting(section).setName("Remember active tab").addToggle((t) => {
			t.setValue(v.rememberActiveTab).onChange(async (val) => {
				v.rememberActiveTab = val;
				await apply();
			});
		});
		new Setting(section).setName("Default tab title 1").addText((t) => {
			t.setValue(v.defaultTabTitle1).onChange(async (val) => {
				v.defaultTabTitle1 = val || "Tab 1";
				await apply();
			});
		});
		new Setting(section).setName("Default tab title 2").addText((t) => {
			t.setValue(v.defaultTabTitle2).onChange(async (val) => {
				v.defaultTabTitle2 = val || "Tab 2";
				await apply();
			});
		});
	}

	private renderOculus(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "monolith-settings-section" });
		section.createEl("h3", { text: "Oculus" });
		const o = this.plugin.settings.oculus;
		const apply = async () => {
			await this.persist();
			this.plugin.oculus?.applySettings(o);
		};
		new Setting(section).setName("CollectionXiewer API URL").addText((t) => {
			t.setValue(o.collectionXiewerBaseUrl).onChange(async (v) => {
				o.collectionXiewerBaseUrl = v.trim() || "http://127.0.0.1:47821";
				await apply();
			});
		});
		new Setting(section).setName("Allow remote media").addToggle((t) => {
			t.setValue(o.allowRemoteImages).onChange(async (v) => {
				o.allowRemoteImages = v;
				await apply();
			});
		});
		new Setting(section).setName("Validate remote Content-Type").addToggle((t) => {
			t.setValue(o.validateRemoteContentType).onChange(async (v) => {
				o.validateRemoteContentType = v;
				await apply();
			});
		});
		new Setting(section).setName("Remote request timeout (ms)").addText((t) => {
			t.setValue(String(o.remoteLoadTimeoutMs)).onChange(async (v) => {
				const n = Number(v);
				if (!Number.isFinite(n) || n < 0) return;
				o.remoteLoadTimeoutMs = n;
				await apply();
			});
		});
		new Setting(section).setName("Show captions").addToggle((t) => {
			t.setValue(o.showCaptions).onChange(async (v) => {
				o.showCaptions = v;
				await apply();
			});
		});
		new Setting(section).setName("Caption max lines").addText((t) => {
			t.setValue(String(o.captionMaxLines)).onChange(async (v) => {
				const n = Number(v);
				if (!Number.isFinite(n) || n < 1) return;
				o.captionMaxLines = n;
				await apply();
			});
		});
		new Setting(section).setName("Use Media Extended for videos").addToggle((t) => {
			t.setValue(o.useMediaExtendedPlayback).onChange(async (v) => {
				o.useMediaExtendedPlayback = v;
				await apply();
			});
		});
		new Setting(section).setName("Lightbox note images").addToggle((t) => {
			t.setValue(o.lightboxMarkdownImages).onChange(async (v) => {
				o.lightboxMarkdownImages = v;
				await apply();
			});
		});
		new Setting(section).setName("Default view").addDropdown((d) => {
			for (const view of VIEW_TYPES) d.addOption(view, view);
			d.setValue(o.defaultView).onChange(async (v) => {
				o.defaultView = v as typeof o.defaultView;
				await apply();
			});
		});
		new Setting(section).setName("Default filter").addDropdown((d) => {
			for (const f of MEDIA_FILTERS) d.addOption(f, f);
			d.setValue(o.defaultFilter).onChange(async (v) => {
				o.defaultFilter = v as typeof o.defaultFilter;
				await apply();
			});
		});
	}

	private renderAugur(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "monolith-settings-section" });
		section.createEl("h3", { text: "Augur" });
		const a = this.plugin.settings.augur;
		const apply = async () => {
			await this.persist();
			this.plugin.augur?.applySettings(a);
		};
		new Setting(section).setName("Default Oculus view").addDropdown((d) => {
			for (const view of VIEW_TYPES) d.addOption(view, view);
			d.setValue(a.defaultView).onChange(async (v) => {
				a.defaultView = v as typeof a.defaultView;
				await apply();
			});
		});
		new Setting(section).setName("Default Oculus filter").addDropdown((d) => {
			for (const f of MEDIA_FILTERS) d.addOption(f, f);
			d.setValue(a.defaultFilter).onChange(async (v) => {
				a.defaultFilter = v as typeof a.defaultFilter;
				await apply();
			});
		});
		new Setting(section).setName("Default tab position").addDropdown((d) => {
			for (const p of TAB_POSITIONS) d.addOption(p, p);
			d.setValue(a.defaultTabPosition).onChange(async (v) => {
				a.defaultTabPosition = v as typeof a.defaultTabPosition;
				await apply();
			});
		});
		new Setting(section).setName("Default tab align").addDropdown((d) => {
			for (const al of TAB_ALIGNS) d.addOption(al, al);
			d.setValue(a.defaultTabAlign).onChange(async (v) => {
				a.defaultTabAlign = v as typeof a.defaultTabAlign;
				await apply();
			});
		});
		new Setting(section).setName("Default tab title 1").addText((t) => {
			t.setValue(a.defaultTabTitle1).onChange(async (v) => {
				a.defaultTabTitle1 = v || "Tab 1";
				await apply();
			});
		});
		new Setting(section).setName("Default tab title 2").addText((t) => {
			t.setValue(a.defaultTabTitle2).onChange(async (v) => {
				a.defaultTabTitle2 = v || "Tab 2";
				await apply();
			});
		});
		new Setting(section).setName("Grimoire prefix (fallback)").addText((t) => {
			t.setValue(a.grimoirePrefix).onChange(async (v) => {
				a.grimoirePrefix = v || "q=";
				await apply();
			});
		});
		new Setting(section).setName("Lexicon folder (fallback)").addText((t) => {
			t.setValue(a.lexiconFolder).onChange(async (v) => {
				a.lexiconFolder = v.trim() || "Dictionary";
				await apply();
			});
		});
	}

	private renderLexicon(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "monolith-settings-section" });
		section.createEl("h3", { text: "Lexicon Nexus" });
		const L = this.plugin.settings.lexicon;
		const apply = async () => {
			await this.persist();
			this.plugin.lexicon?.applySettings(L);
		};
		new Setting(section).setName("Dictionary folder").addText((t) => {
			t.setValue(L.dictionaryFolder).onChange(async (v) => {
				L.dictionaryFolder = v.trim() || "Dictionary";
				await apply();
			});
		});
		new Setting(section).setName("Enable in Reading view").addToggle((t) => {
			t.setValue(L.enableInReadingView).onChange(async (v) => {
				L.enableInReadingView = v;
				await apply();
			});
		});
		new Setting(section).setName("Popover trigger").addDropdown((d) => {
			d.addOptions({ hover: "Hover", click: "Click", both: "Both" });
			d.setValue(L.popoverTrigger).onChange(async (v) => {
				L.popoverTrigger = v as typeof L.popoverTrigger;
				await apply();
			});
		});
		new Setting(section).setName("Case-sensitive matching").addToggle((t) => {
			t.setValue(L.caseSensitive).onChange(async (v) => {
				L.caseSensitive = v;
				await apply();
			});
		});
		new Setting(section).setName("Show source file in popover").addToggle((t) => {
			t.setValue(L.showSourceFile).onChange(async (v) => {
				L.showSourceFile = v;
				await apply();
			});
		});
		new Setting(section).setName("Refresh on metadata change").addToggle((t) => {
			t.setValue(L.refreshOnMetadataChange).onChange(async (v) => {
				L.refreshOnMetadataChange = v;
				await apply();
			});
		});
		new Setting(section).setName("Max highlight forms").addText((t) => {
			t.setValue(String(L.maxHighlightForms)).onChange(async (v) => {
				const n = Number(v);
				if (!Number.isFinite(n) || n < 0) return;
				L.maxHighlightForms = n;
				await apply();
			});
		});
		new Setting(section).setName("Max text node length").addText((t) => {
			t.setValue(String(L.maxTextNodeLength)).onChange(async (v) => {
				const n = Number(v);
				if (!Number.isFinite(n) || n < 0) return;
				L.maxTextNodeLength = n;
				await apply();
			});
		});
		new Setting(section).setName("Debug mode").addToggle((t) => {
			t.setValue(L.debugMode).onChange(async (v) => {
				L.debugMode = v;
				await apply();
			});
		});
		if (this.plugin.lexicon) {
			const idx = this.plugin.lexicon.globalIndex;
			const warnCount = this.plugin.lexicon.warnings.length;
			const formCount = idx.entries?.size ?? 0;
			new Setting(section)
				.setName("Index status")
				.setDesc(
					`${formCount} highlight form${formCount === 1 ? "" : "s"} · ${warnCount} warning${warnCount === 1 ? "" : "s"}. Use Lexicon: Refresh lexicon index after folder changes.`,
				)
				.setDisabled(true);
			if (warnCount > 0) {
				const warnBox = section.createEl("pre", {
					cls: "monolith-notice",
					text: this.plugin.lexicon.warnings
						.slice(0, 12)
						.map((w) => `${w.file}${w.line != null ? `:${w.line}` : ""}: ${w.message}`)
						.join("\n"),
				});
				warnBox.style.maxHeight = "8rem";
				warnBox.style.overflow = "auto";
			}
		}
	}

	private renderOracle(containerEl: HTMLElement): void {
		const section = containerEl.createDiv({ cls: "monolith-settings-section" });
		section.createEl("h3", { text: "Oracle" });
		const o = this.plugin.settings.oracle;
		const apply = async () => {
			await this.persist();
			this.plugin.oracle?.applySettings(o);
		};
		new Setting(section)
			.setName("High level navigation")
			.setDesc("Comma-separated vault paths shown in the center nav row")
			.addTextArea((t) => {
				t.setValue(o.highLevelNavigation.join(", ")).onChange(async (v) => {
					o.highLevelNavigation = parseHighLevelNavigation(v);
					await apply();
				});
			});
		new Setting(section)
			.setName("Back button field")
			.setDesc("Frontmatter field used for ↑ Back")
			.addText((t) => {
				t.setValue(o.backButtonField).onChange(async (v) => {
					o.backButtonField = v.trim() || "pageParent";
					await apply();
				});
			});
		new Setting(section)
			.setName("Folder navigation rules")
			.setDesc("JSON object of folder path → note path (advanced). Invalid JSON is ignored.")
			.addTextArea((t) => {
				t.setValue(JSON.stringify(o.folderNavigation, null, 2)).onChange(async (v) => {
					try {
						const parsed = JSON.parse(v) as unknown;
						if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
							o.folderNavigation = parsed as Record<string, string>;
							await apply();
						}
					} catch {
						/* ignore while typing */
					}
				});
			});
	}
}
