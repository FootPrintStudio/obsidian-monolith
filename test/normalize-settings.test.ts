import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/types";

describe("normalizeSettings", () => {
	it("fills defaults for empty data", () => {
		const s = normalizeSettings(null);
		expect(s.modules.grimoire).toBe(true);
		expect(s.modules.epochs).toBe(true);
		expect(s.modules.visage).toBe(true);
		expect(s.modules.oculus).toBe(true);
		expect(s.modules.augur).toBe(true);
		expect(s.modules.oracle).toBe(false);
		expect(s.oculus.collectionXiewerBaseUrl).toContain("127.0.0.1");
		expect(s.grimoire.inlinePrefix).toBe(DEFAULT_SETTINGS.grimoire.inlinePrefix);
	});

	it("merges partial module flags", () => {
		const s = normalizeSettings({
			modules: { visage: false } as never,
		});
		expect(s.modules.visage).toBe(false);
		expect(s.modules.grimoire).toBe(true);
	});
});
