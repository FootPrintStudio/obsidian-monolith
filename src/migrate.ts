import type { App } from "obsidian";
import type { MonolithSettings } from "./types";
import { DEFAULT_SETTINGS, normalizeSettings } from "./types";

/**
 * M3 — copy-forward settings from legacy plugin data.json files on first enable.
 * Never deletes legacy files. Sets `migratedFromLegacy` when done (or nothing found).
 */

export type LegacyPluginId =
	| "grimoire"
	| "epochs"
	| "visage"
	| "oculus"
	| "augur"
	| "lexicon-nexus"
	| "navinote"
	| "system-app-launcher";

const LEGACY_MAP: {
	id: LegacyPluginId;
	section: keyof Omit<MonolithSettings, "modules" | "migratedFromLegacy">;
}[] = [
	{ id: "grimoire", section: "grimoire" },
	{ id: "epochs", section: "epochs" },
	{ id: "visage", section: "visage" },
	{ id: "oculus", section: "oculus" },
	{ id: "augur", section: "augur" },
	{ id: "lexicon-nexus", section: "lexicon" },
	{ id: "navinote", section: "oracle" },
	{ id: "system-app-launcher", section: "beacon" },
];

export interface MigrateResult {
	settings: MonolithSettings;
	imported: string[];
	skipped: string[];
}

async function readLegacyData(
	app: App,
	pluginId: string,
): Promise<Record<string, unknown> | null> {
	const adapter = app.vault.adapter;
	const path = `${app.vault.configDir}/plugins/${pluginId}/data.json`;
	try {
		if (!(await adapter.exists(path))) return null;
		const raw = await adapter.read(path);
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}

function sectionLooksEmpty(
	section: keyof Omit<MonolithSettings, "modules" | "migratedFromLegacy">,
	current: MonolithSettings,
): boolean {
	const defaults = DEFAULT_SETTINGS[section];
	const cur = current[section];
	if (section === "beacon") {
		const b = cur as MonolithSettings["beacon"];
		return !b.entries?.length;
	}
	if (section === "oracle") {
		const o = cur as MonolithSettings["oracle"];
		return (o.highLevelNavigation?.length ?? 0) === 0;
	}
	// For others: treat as empty if deep-equal-ish to defaults (JSON)
	return JSON.stringify(cur) === JSON.stringify(defaults);
}

/**
 * Import legacy settings into empty Monolith sections. Idempotent when
 * `migratedFromLegacy` is already true.
 */
export async function migrateLegacySettings(
	app: App,
	current: MonolithSettings,
): Promise<MigrateResult> {
	if (current.migratedFromLegacy) {
		return { settings: current, imported: [], skipped: LEGACY_MAP.map((m) => m.id) };
	}

	const next = normalizeSettings(current);
	const imported: string[] = [];
	const skipped: string[] = [];

	for (const { id, section } of LEGACY_MAP) {
		const data = await readLegacyData(app, id);
		if (!data) {
			skipped.push(id);
			continue;
		}
		if (!sectionLooksEmpty(section, next)) {
			skipped.push(`${id} (section already set)`);
			continue;
		}
		(next as unknown as Record<string, unknown>)[section] = {
			...(DEFAULT_SETTINGS[section] as object),
			...data,
		};
		imported.push(id);
	}

	next.migratedFromLegacy = true;
	return { settings: normalizeSettings(next), imported, skipped };
}
