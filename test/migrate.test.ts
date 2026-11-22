import { describe, expect, it } from "vitest";
import { normalizeSettings } from "../src/types";
import { migrateLegacySettings } from "../src/migrate";

function mockApp(files: Record<string, string>) {
	return {
		vault: {
			configDir: ".obsidian",
			adapter: {
				exists: async (path: string) => path in files,
				read: async (path: string) => {
					if (!(path in files)) throw new Error("missing");
					return files[path]!;
				},
			},
		},
	} as never;
}

describe("migrateLegacySettings", () => {
	it("is no-op when already migrated", async () => {
		const current = normalizeSettings({ migratedFromLegacy: true });
		const result = await migrateLegacySettings(mockApp({}), current);
		expect(result.imported).toEqual([]);
		expect(result.settings.migratedFromLegacy).toBe(true);
	});

	it("imports empty sections from legacy data.json", async () => {
		const files = {
			".obsidian/plugins/grimoire/data.json": JSON.stringify({ inlinePrefix: "pq=" }),
			".obsidian/plugins/epochs/data.json": JSON.stringify({ calendarsFolder: "Cals" }),
		};
		const result = await migrateLegacySettings(mockApp(files), normalizeSettings(null));
		expect(result.imported).toContain("grimoire");
		expect(result.imported).toContain("epochs");
		expect(result.settings.grimoire.inlinePrefix).toBe("pq=");
		expect(result.settings.epochs.calendarsFolder).toBe("Cals");
		expect(result.settings.migratedFromLegacy).toBe(true);
	});

	it("does not clobber non-empty beacon entries", async () => {
		const files = {
			".obsidian/plugins/system-app-launcher/data.json": JSON.stringify({
				entries: [{ id: "legacy", kind: "shell", name: "X", command: "true", enabled: true }],
			}),
		};
		const current = normalizeSettings({
			beacon: {
				commandNamePrefix: "Launch App: ",
				entries: [
					{ id: "keep", kind: "shell", name: "Keep", command: "echo", enabled: true },
				],
				collectionXiewerSeedApplied: true,
			},
		});
		const result = await migrateLegacySettings(mockApp(files), current);
		expect(result.imported).not.toContain("system-app-launcher");
		expect(result.settings.beacon.entries[0]?.id).toBe("keep");
	});
});
