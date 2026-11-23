import type { App } from "obsidian";

type AppPlugins = {
	disablePlugin: (id: string) => Promise<void>;
	enablePlugin: (id: string) => Promise<void>;
};

/** Soft-reload a Community Plugin by id (disable → enable). */
export async function reloadCommunityPlugin(app: App, pluginId: string): Promise<void> {
	const plugins = (app as App & { plugins: AppPlugins }).plugins;
	await plugins.disablePlugin(pluginId);
	await plugins.enablePlugin(pluginId);
}
