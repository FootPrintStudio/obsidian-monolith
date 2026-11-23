import {
	DEFAULT_SETTINGS as DEFAULT_AUGUR_SETTINGS,
	type AugurSettings,
} from "../packages/augur/src/types";
import {
	DEFAULT_SETTINGS as DEFAULT_BEACON_SETTINGS,
	type PluginSettings as BeaconSettings,
} from "../packages/beacon/src/types";
import {
	DEFAULT_SETTINGS as DEFAULT_EPOCHS_SETTINGS,
	type EpochsSettings,
} from "../packages/epochs/src/types";
import {
	DEFAULT_SETTINGS as DEFAULT_GRIMOIRE_SETTINGS,
	type PropertyQuerySettings,
} from "../packages/grimoire/src/types";
import {
	DEFAULT_SETTINGS as DEFAULT_LEXICON_SETTINGS,
	type LexiconNexusSettings,
} from "../packages/lexicon/src/types";
import {
	DEFAULT_SETTINGS as DEFAULT_OCULUS_SETTINGS,
	type MediaGallerySettings,
} from "../packages/oculus/src/types";
import {
	DEFAULT_SETTINGS as DEFAULT_ORACLE_SETTINGS,
	type NaviNoteSettings,
} from "../packages/oracle/src/types";
import {
	DEFAULT_SETTINGS as DEFAULT_VISAGE_SETTINGS,
	type VisageSettings,
} from "../packages/visage/src/types";

/** Shape A — enable flags in one BRAT bundle. */
export interface ModuleFlags {
	grimoire: boolean;
	epochs: boolean;
	visage: boolean;
	oculus: boolean;
	augur: boolean;
	beacon: boolean;
	lexicon: boolean;
	oracle: boolean;
}

export interface MonolithSettings {
	modules: ModuleFlags;
	grimoire: PropertyQuerySettings;
	epochs: EpochsSettings;
	visage: VisageSettings;
	oculus: MediaGallerySettings;
	augur: AugurSettings;
	beacon: BeaconSettings;
	lexicon: LexiconNexusSettings;
	oracle: NaviNoteSettings;
	/** M3: true after first-run copy-forward from legacy plugin data.json files. */
	migratedFromLegacy: boolean;
}

export const DEFAULT_MODULE_FLAGS: ModuleFlags = {
	grimoire: true,
	epochs: true,
	visage: true,
	oculus: true,
	augur: true,
	beacon: true,
	lexicon: false,
	oracle: false,
};

export const DEFAULT_SETTINGS: MonolithSettings = {
	modules: { ...DEFAULT_MODULE_FLAGS },
	grimoire: { ...DEFAULT_GRIMOIRE_SETTINGS },
	epochs: { ...DEFAULT_EPOCHS_SETTINGS },
	visage: { ...DEFAULT_VISAGE_SETTINGS },
	oculus: { ...DEFAULT_OCULUS_SETTINGS },
	augur: { ...DEFAULT_AUGUR_SETTINGS },
	beacon: { ...DEFAULT_BEACON_SETTINGS },
	lexicon: { ...DEFAULT_LEXICON_SETTINGS },
	oracle: { ...DEFAULT_ORACLE_SETTINGS },
	migratedFromLegacy: false,
};

export function normalizeSettings(
	data: Partial<MonolithSettings> | null | undefined,
): MonolithSettings {
	const raw = data ?? {};
	return {
		modules: { ...DEFAULT_MODULE_FLAGS, ...(raw.modules ?? {}) },
		grimoire: { ...DEFAULT_GRIMOIRE_SETTINGS, ...(raw.grimoire ?? {}) },
		epochs: { ...DEFAULT_EPOCHS_SETTINGS, ...(raw.epochs ?? {}) },
		visage: { ...DEFAULT_VISAGE_SETTINGS, ...(raw.visage ?? {}) },
		oculus: { ...DEFAULT_OCULUS_SETTINGS, ...(raw.oculus ?? {}) },
		augur: { ...DEFAULT_AUGUR_SETTINGS, ...(raw.augur ?? {}) },
		beacon: { ...DEFAULT_BEACON_SETTINGS, ...(raw.beacon ?? {}) },
		lexicon: { ...DEFAULT_LEXICON_SETTINGS, ...(raw.lexicon ?? {}) },
		oracle: { ...DEFAULT_ORACLE_SETTINGS, ...(raw.oracle ?? {}) },
		migratedFromLegacy: Boolean(raw.migratedFromLegacy),
	};
}
