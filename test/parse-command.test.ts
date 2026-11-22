import { describe, expect, it } from "vitest";
import { parseCommandTarget, parseLink } from "../packages/grimoire/src/parseLink";

describe("parseCommandTarget", () => {
	it("parses cmd: and command:", () => {
		expect(parseCommandTarget("cmd:monolith:monolith-beacon-launch-x")).toBe(
			"monolith:monolith-beacon-launch-x",
		);
		expect(parseCommandTarget("command:foo:bar")).toBe("foo:bar");
	});

	it("returns null for normal links", () => {
		expect(parseCommandTarget("[[Note]]")).toBeNull();
		expect(parseCommandTarget("https://example.com")).toBeNull();
	});
});

describe("parseLink command buttons", () => {
	it("detects markdown cmd links", () => {
		const p = parseLink('[Launch](cmd:monolith:monolith-beacon-launch-x)');
		expect(p.commandId).toBe("monolith:monolith-beacon-launch-x");
		expect(p.displayText).toBe("Launch");
		expect(p.isUrl).toBe(false);
	});

	it("keeps https as url", () => {
		const p = parseLink("https://example.com");
		expect(p.commandId).toBeNull();
		expect(p.isUrl).toBe(true);
	});
});
