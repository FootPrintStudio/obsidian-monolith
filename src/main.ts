import { Notice, Plugin } from "obsidian";
import { AugurModule } from "@monolith/augur";
import { EpochsModule } from "@monolith/epochs";
import { GrimoireModule } from "@monolith/grimoire";
import { OculusModule } from "@monolith/oculus";
import { VisageModule } from "@monolith/visage";
import { MonolithSettingTab } from "./settings";
import { DEFAULT_SETTINGS, normalizeSettings, type MonolithSettings } from "./types";

/**
 * Monolith — single BRAT artifact (shape A/C).
 * Order: Epochs → Grimoire (−101) → Visage (0 / v-tabs) → Oculus (oculus fence) → Augur suggest.
 */
export default class MonolithPlugin extends Plugin {
	settings: MonolithSettings = normalizeSettings(DEFAULT_SETTINGS);
	epochs: EpochsModule | null = null;
	grimoire: GrimoireModule | null = null;
	visage: VisageModule | null = null;
	oculus: OculusModule | null = null;
	augur: AugurModule | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new MonolithSettingTab(this.app, this));
		this.warnIfLegacyEnabled();
		await this.registerCoreProcessors();
	}

	onunload(): void {
		this.augur?.onunload();
		this.oculus?.onunload();
		this.grimoire?.onunload();
		this.epochs = null;
		this.grimoire = null;
		this.visage = null;
		this.oculus = null;
		this.augur = null;
	}

	async registerCoreProcessors(): Promise<void> {
		const { modules } = this.settings;

		if (modules.epochs) {
			this.epochs = new EpochsModule(this, this.settings.epochs);
			await this.epochs.onload();
		}

		if (modules.grimoire) {
			this.grimoire = new GrimoireModule(this, this.settings.grimoire);
			await this.grimoire.onload(this.epochs?.api ?? null);
		}

		if (modules.visage) {
			this.visage = new VisageModule(this, this.settings.visage);
			await this.visage.onload();
		}

		if (modules.oculus) {
			this.oculus = new OculusModule(this, this.settings.oculus);
			await this.oculus.onload();
		}

		if (modules.augur) {
			this.augur = new AugurModule(this, this.settings.augur);
			await this.augur.onload({
				modules: {
					grimoire: modules.grimoire,
					epochs: modules.epochs,
					visage: modules.visage,
					oculus: modules.oculus,
					lexicon: modules.lexicon,
				},
				grimoire: this.settings.grimoire,
				visage: this.settings.visage,
				oculus: this.settings.oculus,
				listEpochsCalendars: () => {
					const list = this.epochs?.api.listCalendars() ?? [];
					return list.map((cal) => ({
						id: cal.id,
						name: cal.name,
						path: cal.path,
						hasMonths: Array.isArray(cal.months) && cal.months.length > 0,
					}));
				},
			});
		}
	}

	private warnIfLegacyEnabled(): void {
		const plugins = (
			this.app as Plugin["app"] & {
				plugins?: { enabledPlugins?: Set<string> };
			}
		).plugins;
		const enabled = plugins?.enabledPlugins;
		if (!enabled) return;
		const legacy = ["grimoire", "epochs", "visage", "oculus", "augur"].filter((id) =>
			enabled.has(id),
		);
		if (legacy.length === 0) return;
		new Notice(
			`Monolith: disable legacy plugin(s) while testing: ${legacy.join(", ")} (double processors unsupported).`,
			8000,
		);
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<MonolithSettings> | null;
		this.settings = normalizeSettings(data);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
