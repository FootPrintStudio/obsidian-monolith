import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["test/**/*.test.ts"],
	},
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, "packages/grimoire/test/obsidian-mock.ts"),
			"@monolith/epochs": path.resolve(__dirname, "packages/epochs/src/module.ts"),
			"@monolith/grimoire": path.resolve(__dirname, "packages/grimoire/src/module.ts"),
			"@monolith/visage": path.resolve(__dirname, "packages/visage/src/module.ts"),
		},
	},
});
