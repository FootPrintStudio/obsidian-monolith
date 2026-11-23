import { Notice, Plugin } from "obsidian";
import { AugurModule } from "@monolith/augur";
import { BeaconModule } from "@monolith/beacon";
import { EpochsModule } from "@monolith/epochs";
import { GrimoireModule } from "@monolith/grimoire";
import { LexiconModule } from "@monolith/lexicon";
import { OculusModule } from "@monolith/oculus";
import { OracleModule } from "@monolith/oracle";
import { VisageModule } from "@monolith/visage";
import { migrateLegacySettings } from "./migrate";
import { MonolithSettingTab } from "./settings";
import { DEFAULT_SETTINGS, normalizeSettings, type MonolithSettings } from "./types";

/**
 * Monolith — single BRAT artifact (shape A/C).
 * Spine default-on: Grimoire, Epochs, Visage, Oculus, Augur, Beacon.
 * Optional: Lexicon, Oracle.
 */
export default class MonolithPlugin extends Plugin {
	settings: MonolithSettings = normalizeSettings(DEFAULT_SETTINGS);
	epochs: EpochsModule | null = null;
	grimoire: GrimoireModule | null = null;
	visage: VisageModule | null = null;
	oculus: OculusModule | null = null;
	augur: AugurModule | null = null;
	beacon: BeaconModule | null = null;
	lexicon: LexiconModule | null = null;
	oracle: OracleModule | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();
		await this.runLegacyMigrate();
		this.addSettingTab(new MonolithSettingTab(this.app, this));
		this.warnIfLegacyEnabled();
		await this.registerCoreProcessors();
	}

	/** M3 — copy-forward from legacy data.json once; never deletes old files. */
	private async runLegacyMigrate(): Promise<void> {
		const result = await migrateLegacySettings(this.app, this.settings);
		if (result.imported.length > 0 || !this.settings.migratedFromLegacy) {
			this.settings = result.settings;
			await this.saveSettings();
		}
		if (result.imported.length > 0) {
			new Notice(
				`Monolith: imported settings from ${result.imported.join(", ")} (legacy files kept).`,
				8000,
			);
		}
	}

	onunload(): void {
		this.augur?.onunload();
		this.oculus?.onunload();
		this.lexicon?.onunload();
		this.oracle?.onunload();
		this.beacon?.onunload();
		this.grimoire?.onunload();
		this.visage?.onunload();
		this.epochs = null;
		this.grimoire = null;
		this.visage = null;
		this.oculus = null;
		this.augur = null;
		this.beacon = null;
		this.lexicon = null;
		this.oracle = null;
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

		if (modules.lexicon) {
			this.lexicon = new LexiconModule(this, this.settings.lexicon);
			await this.lexicon.onload();
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
				lexicon: { dictionaryFolder: this.settings.lexicon.dictionaryFolder },
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

		if (modules.oracle) {
			this.oracle = new OracleModule(this, this.settings.oracle);
			await this.oracle.onload();
		}

		if (modules.beacon) {
			const beaconBefore = JSON.stringify(this.settings.beacon);
			this.beacon = new BeaconModule(this, this.settings.beacon);
			await this.beacon.onload();
			// Seed mutates module settings in-memory — persist so the flag sticks.
			this.settings.beacon = this.beacon.settings;
			if (JSON.stringify(this.settings.beacon) !== beaconBefore) {
				await this.saveSettings();
			}
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
		const legacy = [
			"grimoire",
			"epochs",
			"visage",
			"oculus",
			"augur",
			"lexicon-nexus",
			"navinote",
			"system-app-launcher",
		].filter((id) => enabled.has(id));
		if (legacy.length === 0) return;
		new Notice(
			`Monolith: disable legacy plugin(s) while testing: ${legacy.join(", ")}`,
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
