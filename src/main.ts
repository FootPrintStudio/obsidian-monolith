import { Notice, Plugin } from "obsidian";
import { EpochsModule } from "@monolith/epochs";
import { GrimoireModule } from "@monolith/grimoire";
import { VisageModule } from "@monolith/visage";
import { MonolithSettingTab } from "./settings";
import { DEFAULT_SETTINGS, normalizeSettings, type MonolithSettings } from "./types";

/**
 * Monolith P8.1 — single BRAT artifact (shape A/C).
 * Processor order: Epochs API → Grimoire (−101) → Visage (0 + v-tabs).
 */
export default class MonolithPlugin extends Plugin {
	settings: MonolithSettings = normalizeSettings(DEFAULT_SETTINGS);
	epochs: EpochsModule | null = null;
	grimoire: GrimoireModule | null = null;
	visage: VisageModule | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new MonolithSettingTab(this.app, this));
		this.warnIfLegacyEnabled();
		await this.registerCoreProcessors();
	}

	onunload(): void {
		this.grimoire?.onunload();
		this.epochs = null;
		this.grimoire = null;
		this.visage = null;
	}

	/**
	 * Explicit registration sequence matching P5 matrix:
	 * Grimoire postprocessor −101, Visage cards 0, Visage v-tabs code-block.
	 */
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
	}

	private warnIfLegacyEnabled(): void {
		const plugins = (
			this.app as Plugin["app"] & {
				plugins?: { enabledPlugins?: Set<string>; plugins?: Record<string, unknown> };
			}
		).plugins;
		const enabled = plugins?.enabledPlugins;
		if (!enabled) return;
		const legacy = ["grimoire", "epochs", "visage"].filter((id) => enabled.has(id));
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
