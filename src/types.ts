import {
	DEFAULT_SETTINGS as DEFAULT_EPOCHS_SETTINGS,
	type EpochsSettings,
} from "../packages/epochs/src/types";
import {
	DEFAULT_SETTINGS as DEFAULT_GRIMOIRE_SETTINGS,
	type PropertyQuerySettings,
} from "../packages/grimoire/src/types";
import {
	DEFAULT_SETTINGS as DEFAULT_VISAGE_SETTINGS,
	type VisageSettings,
} from "../packages/visage/src/types";

/** Shape A — enable flags in one BRAT bundle (not shape D installer). */
export interface ModuleFlags {
	grimoire: boolean;
	epochs: boolean;
	visage: boolean;
	/** P8.2+ stubs — present in settings, not loaded in P8.1. */
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
}

export const DEFAULT_MODULE_FLAGS: ModuleFlags = {
	grimoire: true,
	epochs: true,
	visage: true,
	oculus: false,
	augur: false,
	beacon: false,
	lexicon: false,
	oracle: false,
};

export const DEFAULT_SETTINGS: MonolithSettings = {
	modules: { ...DEFAULT_MODULE_FLAGS },
	grimoire: { ...DEFAULT_GRIMOIRE_SETTINGS },
	epochs: { ...DEFAULT_EPOCHS_SETTINGS },
	visage: { ...DEFAULT_VISAGE_SETTINGS },
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
	};
}
